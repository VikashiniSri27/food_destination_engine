"""
train_model.py
==============
Trains a MobileNetV2 food freshness classifier on the downloaded dataset.

Dataset structure (already downloaded):
  dataset/Fruit Freshness Dataset/Fruit Freshness Dataset/
    Apple/Fresh/      Apple/Rotten/
    Banana/Fresh/     Banana/Rotten/
    Strawberry/Fresh/ Strawberry/Rotten/

Maps to 3 classes:
  Fresh           <- all Fresh folders
  Slightly Spoiled <- 40% of Rotten images (randomly sampled)
  Spoiled          <- 60% of Rotten images

Run:
  python train_model.py
"""

import os, sys, shutil, json, pathlib, random
import numpy as np

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

try:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers
    print(f"TensorFlow {tf.__version__} ready.")
except ImportError:
    print("ERROR: TensorFlow not installed. Run: pip install tensorflow")
    sys.exit(1)

# ── paths ─────────────────────────────────────────────────────────────────────
BASE_DIR   = pathlib.Path(__file__).parent
DATA_ROOT1 = BASE_DIR / "dataset" / "Fruit Freshness Dataset" / "Fruit Freshness Dataset"
DATA_ROOT2 = BASE_DIR / "dataset" / "fruitsquality" / "Quality Dataset"
PREPARED   = BASE_DIR / "dataset" / "prepared_v2"
MODEL_PATH = BASE_DIR / "models" / "food_quality_model.keras"
META_PATH  = BASE_DIR / "models" / "model_meta.json"

CLASSES    = ["Fresh", "Slightly Spoiled", "Spoiled"]
IMG_SIZE   = 224
BATCH_SIZE = 16
EPOCHS     = 20

random.seed(42)
np.random.seed(42)
tf.random.set_seed(42)


# ── Step 1: organise into 3-class flat structure ──────────────────────────────
def build_prepared():
    if PREPARED.exists():
        print("[1/4] Prepared dataset already exists, skipping.")
        return

    print("[1/4] Combining datasets into Fresh / Slightly Spoiled / Spoiled ...")

    # Collect from Dataset 1 (Apple/Banana/Strawberry Fresh & Rotten)
    fresh_imgs  = list(DATA_ROOT1.rglob("*/Fresh/*.[jJpP][pPnN][gG]*"))
    fresh_imgs += list(DATA_ROOT1.rglob("*/Fresh/*.jpeg"))
    rotten_imgs  = list(DATA_ROOT1.rglob("*/Rotten/*.[jJpP][pPnN][gG]*"))
    rotten_imgs += list(DATA_ROOT1.rglob("*/Rotten/*.jpeg"))

    # Collect from Dataset 2 (mixed fruits quality - fresh/rotten)
    fresh_imgs  += list(DATA_ROOT2.rglob("*/fresh/*.[jJpP][pPnN][gG]*"))
    fresh_imgs  += list(DATA_ROOT2.rglob("*/fresh/*.jpeg"))
    rotten_imgs += list(DATA_ROOT2.rglob("*/rotten/*.[jJpP][pPnN][gG]*"))
    rotten_imgs += list(DATA_ROOT2.rglob("*/rotten/*.jpeg"))

    # Remove duplicates
    fresh_imgs  = list(set(fresh_imgs))
    rotten_imgs = list(set(rotten_imgs))

    random.shuffle(fresh_imgs)
    random.shuffle(rotten_imgs)

    # Split rotten: 60% Spoiled, 40% Slightly Spoiled
    split = int(len(rotten_imgs) * 0.60)
    spoiled_imgs  = rotten_imgs[:split]
    moderate_imgs = rotten_imgs[split:]

    # Oversample minority classes to balance with Fresh
    target = len(fresh_imgs)
    while len(spoiled_imgs) < target // 3:
        spoiled_imgs += spoiled_imgs
    spoiled_imgs = spoiled_imgs[:target // 3]
    while len(moderate_imgs) < target // 3:
        moderate_imgs += moderate_imgs
    moderate_imgs = moderate_imgs[:target // 3]
    # Trim fresh to keep balance
    fresh_imgs = fresh_imgs[:target]

    print(f"  After balancing:")
    print(f"  Fresh: {len(fresh_imgs)} | Slightly Spoiled: {len(moderate_imgs)} | Spoiled: {len(spoiled_imgs)}")
    print(f"  Total: {len(fresh_imgs)+len(moderate_imgs)+len(spoiled_imgs)} images")

    def split_train_val(imgs, ratio=0.85):
        n = int(len(imgs) * ratio)
        return imgs[:n], imgs[n:]

    fresh_tr,  fresh_val  = split_train_val(fresh_imgs)
    mod_tr,    mod_val    = split_train_val(moderate_imgs)
    spoil_tr,  spoil_val  = split_train_val(spoiled_imgs)

    mapping = {
        "train": {"Fresh": fresh_tr, "Slightly Spoiled": mod_tr, "Spoiled": spoil_tr},
        "val":   {"Fresh": fresh_val, "Slightly Spoiled": mod_val, "Spoiled": spoil_val},
    }

    for split_name, class_map in mapping.items():
        for cls, imgs in class_map.items():
            dest = PREPARED / split_name / cls
            dest.mkdir(parents=True, exist_ok=True)
            for i, img in enumerate(imgs):
                ext = img.suffix.lower()
                shutil.copy(img, dest / f"{cls.replace(' ','_')}_{i:04d}{ext}")
            print(f"  {split_name}/{cls}: {len(imgs)} images")

    print("Dataset prepared.")


# ── Step 2: data pipelines ────────────────────────────────────────────────────
def make_datasets():
    print("\n[2/4] Building data pipelines ...")

    train_ds = tf.keras.utils.image_dataset_from_directory(
        str(PREPARED / "train"),
        labels="inferred",
        label_mode="categorical",
        class_names=CLASSES,
        image_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        shuffle=True,
        seed=42,
    )

    val_ds = tf.keras.utils.image_dataset_from_directory(
        str(PREPARED / "val"),
        labels="inferred",
        label_mode="categorical",
        class_names=CLASSES,
        image_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        shuffle=False,
    )

    AUTOTUNE = tf.data.AUTOTUNE
    train_ds = train_ds.cache().prefetch(AUTOTUNE)
    val_ds   = val_ds.cache().prefetch(AUTOTUNE)
    return train_ds, val_ds


# ── Step 3: build model ───────────────────────────────────────────────────────
def build_model():
    print("\n[3/4] Building MobileNetV2 model ...")

    augment = keras.Sequential([
        layers.RandomFlip("horizontal_and_vertical"),
        layers.RandomRotation(0.2),
        layers.RandomZoom(0.15),
        layers.RandomBrightness(0.2),
        layers.RandomContrast(0.2),
    ], name="augmentation")

    base = tf.keras.applications.MobileNetV2(
        input_shape=(IMG_SIZE, IMG_SIZE, 3),
        include_top=False,
        weights="imagenet",
    )
    base.trainable = True
    for layer in base.layers[:-40]:
        layer.trainable = False

    inputs = keras.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
    x = augment(inputs)
    x = tf.keras.applications.mobilenet_v2.preprocess_input(x)
    x = base(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.4)(x)
    x = layers.Dense(128, activation="relu",
                     kernel_regularizer=tf.keras.regularizers.l2(0.001))(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(len(CLASSES), activation="softmax")(x)

    model = keras.Model(inputs, outputs)
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=5e-5),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    total   = sum(1 for l in model.layers if hasattr(l, 'trainable_weights'))
    trained = sum(1 for l in model.layers if l.trainable and hasattr(l, 'trainable_weights'))
    print(f"  Total layers: {total} | Trainable: {trained}")
    return model


# ── Step 4: train & save ──────────────────────────────────────────────────────
def compute_class_weights():
    """Compute class weights to fix class imbalance."""
    counts = {}
    for cls in CLASSES:
        counts[cls] = len(list((PREPARED / "train" / cls).glob("*")))
    total = sum(counts.values())
    n_classes = len(CLASSES)
    weights = {}
    for i, cls in enumerate(CLASSES):
        weights[i] = round(total / (n_classes * counts[cls]), 3)
    print(f"  Class counts : {counts}")
    print(f"  Class weights: {weights}")
    return weights


def train(model, train_ds, val_ds):
    print(f"\n[4/4] Training for up to {EPOCHS} epochs ...")

    class_weights = compute_class_weights()

    callbacks = [
        keras.callbacks.EarlyStopping(
            monitor="val_accuracy", patience=6,
            restore_best_weights=True, verbose=1
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.5,
            patience=3, min_lr=1e-7, verbose=1
        ),
        keras.callbacks.ModelCheckpoint(
            str(MODEL_PATH), monitor="val_accuracy",
            save_best_only=True, verbose=1
        ),
    ]

    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS,
        class_weight=class_weights,
        callbacks=callbacks,
        verbose=1,
    )

    loss, acc = model.evaluate(val_ds, verbose=0)
    print(f"\nTraining complete!")
    print(f"  Validation accuracy : {acc * 100:.2f}%")
    print(f"  Model saved to      : {MODEL_PATH}")

    with open(META_PATH, "w") as f:
        json.dump({"classes": CLASSES, "img_size": IMG_SIZE}, f, indent=2)
    print(f"  Metadata saved to   : {META_PATH}")
    return history


# ── main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    if not DATA_ROOT1.exists():
        print(f"ERROR: Dataset 1 not found at {DATA_ROOT1}")
        sys.exit(1)
    if not DATA_ROOT2.exists():
        print(f"ERROR: Dataset 2 not found at {DATA_ROOT2}")
        sys.exit(1)

    build_prepared()
    train_ds, val_ds = make_datasets()
    model = build_model()
    train(model, train_ds, val_ds)
