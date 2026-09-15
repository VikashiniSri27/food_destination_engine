import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

import tensorflow as tf
import json
import pathlib

MODEL = pathlib.Path('c:/users/vikashini/OneDrive/Documents/food/backend/models/food_quality_model.keras')
META  = pathlib.Path('c:/users/vikashini/OneDrive/Documents/food/backend/models/model_meta.json')

print("=" * 50)
print("MODEL CHECK REPORT")
print("=" * 50)

if not MODEL.exists():
    print("ERROR: Model file not found. Training may still be running.")
    exit()

mb = round(MODEL.stat().st_size / 1024 / 1024, 2)
print(f"Model file   : {MODEL.name}")
print(f"Model size   : {mb} MB")

meta = json.loads(META.read_text())
print(f"Classes      : {meta['classes']}")
print(f"Image size   : {meta['img_size']} x {meta['img_size']}")

print("\nLoading model...")
model = tf.keras.models.load_model(str(MODEL))
print("Status       : Loaded successfully")
print(f"Input shape  : {model.input_shape}")
print(f"Output shape : {model.output_shape}")

# Evaluate on validation set
PREPARED = pathlib.Path('c:/users/vikashini/OneDrive/Documents/food/backend/dataset/prepared_v2')
if PREPARED.exists():
    print("\nEvaluating on validation set...")
    val_ds = tf.keras.utils.image_dataset_from_directory(
        str(PREPARED / 'val'),
        labels='inferred',
        label_mode='categorical',
        class_names=meta['classes'],
        image_size=(meta['img_size'], meta['img_size']),
        batch_size=16,
        shuffle=False
    )
    loss, acc = model.evaluate(val_ds, verbose=1)
    print("=" * 50)
    print(f"Validation Accuracy : {round(acc * 100, 2)}%")
    print(f"Validation Loss     : {round(loss, 4)}")
    print("=" * 50)

    # Per-class prediction breakdown
    import numpy as np
    y_true, y_pred = [], []
    for imgs, labels in val_ds:
        preds = model.predict(imgs, verbose=0)
        y_true.extend(tf.argmax(labels, axis=1).numpy())
        y_pred.extend(tf.argmax(preds, axis=1).numpy())

    classes = meta['classes']
    print("\nPer-class accuracy:")
    for i, cls in enumerate(classes):
        idxs = [j for j, y in enumerate(y_true) if y == i]
        correct = sum(1 for j in idxs if y_pred[j] == i)
        total = len(idxs)
        pct = round(correct / total * 100, 1) if total > 0 else 0
        print(f"  {cls:20s} : {correct}/{total} = {pct}%")
else:
    print("\nNOTE: prepared_v2 folder not found - skipping evaluation")
    print("Model is loaded and ready to use.")
