"""
CNN-based food quality assessment module.
==========================================
Priority order:
  1. Trained Keras model  (models/food_quality_model.keras)  ← after running train_model.py
  2. PyTorch MobileNetV2 pretrained on ImageNet              ← if torch installed
  3. Colour-heuristic fallback                               ← always available

After training run:
  python train_model.py
"""

import io, json, pathlib
import numpy as np
from PIL import Image

# ── paths ─────────────────────────────────────────────────────────────────────
_BASE      = pathlib.Path(__file__).parent
_MODEL_PATH = _BASE / "food_quality_model.keras"
_META_PATH  = _BASE / "model_meta.json"

# ── labels ────────────────────────────────────────────────────────────────────
QUALITY_LABELS = ["Fresh", "Slightly Spoiled", "Spoiled"]
QUALITY_SCORES = {"Fresh": 1.0, "Slightly Spoiled": 0.5, "Spoiled": 0.0}

_IMG_SIZE = 224


# ── helpers ───────────────────────────────────────────────────────────────────
def _load_pil(image_bytes: bytes) -> Image.Image:
    return Image.open(io.BytesIO(image_bytes)).convert("RGB")


# ═══════════════════════════════════════════════════════════════════════════════
# PATH 1 — Trained Keras model
# ═══════════════════════════════════════════════════════════════════════════════
_keras_model   = None
_keras_classes = None
_KERAS_AVAILABLE = False

try:
    import tensorflow as tf
    _TF_AVAILABLE = True
except ImportError:
    _TF_AVAILABLE = False

if _TF_AVAILABLE and _MODEL_PATH.exists():
    try:
        _keras_model = tf.keras.models.load_model(str(_MODEL_PATH))
        if _META_PATH.exists():
            _meta = json.loads(_META_PATH.read_text())
            _keras_classes = _meta.get("classes", QUALITY_LABELS)
            _IMG_SIZE      = _meta.get("img_size", 224)
        else:
            _keras_classes = QUALITY_LABELS
        _KERAS_AVAILABLE = True
        print(f"[CNN] Loaded trained Keras model from {_MODEL_PATH}")
    except Exception as e:
        print(f"[CNN] Could not load Keras model: {e}")


def _infer_keras(img: Image.Image) -> dict:
    img_resized = img.resize((_IMG_SIZE, _IMG_SIZE))
    arr = np.array(img_resized, dtype=np.float32)[np.newaxis]  # (1,H,W,3)
    probs = _keras_model.predict(arr, verbose=0)[0]             # (3,)
    idx   = int(np.argmax(probs))
    label = _keras_classes[idx]
    return {
        "quality_label":  label,
        "quality_score":  QUALITY_SCORES.get(label, 0.5),
        "probabilities":  {_keras_classes[i]: round(float(probs[i]), 4) for i in range(len(_keras_classes))},
        "inference_mode": "Trained CNN (MobileNetV2 fine-tuned on food freshness dataset)",
    }


# ═══════════════════════════════════════════════════════════════════════════════
# PATH 2 — PyTorch MobileNetV2 (ImageNet weights, no fine-tuning)
# ═══════════════════════════════════════════════════════════════════════════════
_TORCH_AVAILABLE = False
try:
    import torch
    import torch.nn as nn
    import torchvision.transforms as T
    import torchvision.models as models
    _TORCH_AVAILABLE = True
except ImportError:
    pass

_torch_model = None
_transform   = None

if _TORCH_AVAILABLE and not _KERAS_AVAILABLE:
    _transform = T.Compose([
        T.Resize((_IMG_SIZE, _IMG_SIZE)),
        T.ToTensor(),
        T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])


def _get_torch_model():
    global _torch_model
    if _torch_model is not None:
        return _torch_model
    base = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.DEFAULT)
    in_features = base.classifier[1].in_features
    base.classifier[1] = nn.Linear(in_features, 3)
    base.eval()
    _torch_model = base
    return _torch_model


def _infer_torch(img: Image.Image) -> dict:
    model  = _get_torch_model()
    tensor = _transform(img).unsqueeze(0)
    with torch.no_grad():
        logits = model(tensor)
        probs  = torch.softmax(logits, dim=1).squeeze().tolist()
    idx   = int(np.argmax(probs))
    label = QUALITY_LABELS[idx]
    return {
        "quality_label":  label,
        "quality_score":  QUALITY_SCORES[label],
        "probabilities":  {QUALITY_LABELS[i]: round(probs[i], 4) for i in range(3)},
        "inference_mode": "CNN (MobileNetV2 ImageNet weights — run train_model.py to fine-tune)",
    }


# ═══════════════════════════════════════════════════════════════════════════════
# PATH 3 — Colour heuristic fallback
# ═══════════════════════════════════════════════════════════════════════════════
def _infer_heuristic(img: Image.Image) -> dict:
    img_r = img.resize((_IMG_SIZE, _IMG_SIZE))
    arr   = np.array(img_r, dtype=np.float32) / 255.0
    r, g, b  = arr[:,:,0], arr[:,:,1], arr[:,:,2]
    cmax     = np.maximum(np.maximum(r, g), b)
    cmin     = np.minimum(np.minimum(r, g), b)
    delta    = cmax - cmin + 1e-9
    sat      = np.where(cmax > 0, delta / cmax, 0.0)
    mean_sat = float(sat.mean())
    mean_bri = float(cmax.mean())

    if mean_sat > 0.30 and mean_bri > 0.35:
        label = "Fresh";           probs = [0.80, 0.15, 0.05]
    elif mean_sat > 0.15 or mean_bri > 0.25:
        label = "Slightly Spoiled"; probs = [0.20, 0.65, 0.15]
    else:
        label = "Spoiled";          probs = [0.05, 0.20, 0.75]

    return {
        "quality_label":  label,
        "quality_score":  QUALITY_SCORES[label],
        "probabilities":  {QUALITY_LABELS[i]: round(probs[i], 4) for i in range(3)},
        "inference_mode": "Heuristic (colour analysis — run train_model.py for real CNN)",
        "debug": {
            "mean_saturation": round(mean_sat, 3),
            "mean_brightness": round(mean_bri, 3),
        },
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Public API
# ═══════════════════════════════════════════════════════════════════════════════
def assess_food_quality(image_bytes: bytes) -> dict:
    """
    Accepts raw image bytes.
    Returns dict with quality_label, quality_score, probabilities, inference_mode.
    """
    try:
        img = _load_pil(image_bytes)
    except Exception as e:
        return {
            "quality_label": "Unknown", "quality_score": 0.5,
            "probabilities": {}, "inference_mode": "Error", "error": str(e),
        }

    if _KERAS_AVAILABLE:
        return _infer_keras(img)
    if _TORCH_AVAILABLE:
        return _infer_torch(img)
    return _infer_heuristic(img)
