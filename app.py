"""
AI-Powered Food Destination Engine — Flask Backend
===================================================

Endpoints:
  POST /api/analyze          – upload image + contextual data, get recommendation
  GET  /api/history          – get all past analyses
  GET  /api/history/<id>     – get single analysis
  DELETE /api/history/<id>   – delete single analysis
  GET  /api/stats            – aggregate dashboard statistics
  GET  /api/food-types       – list supported food types
  GET  /api/health           – health check
"""

import os
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

from models.cnn_model import assess_food_quality
from models.shelf_life_model import (
    predict_shelf_life,
    FOOD_TYPES,
    STORAGE_CONDITIONS,
)
from models.fusion_model import recommend
from utils.validators import validate_analyze_payload, MAX_IMAGE_BYTES
from database import init_db, save_analysis, get_all_analyses, get_analysis_by_id, get_stats, delete_analysis

# ── app setup ────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["MAX_CONTENT_LENGTH"] = MAX_IMAGE_BYTES

# initialise database on startup
init_db()


# ── helpers ──────────────────────────────────────────────────────────────────
def _bad_request(message: str, errors: list = None):
    payload = {"success": False, "message": message}
    if errors:
        payload["errors"] = errors
    return jsonify(payload), 400


def _server_error(message: str):
    return jsonify({"success": False, "message": message}), 500


def _not_found(message: str):
    return jsonify({"success": False, "message": message}), 404


# ── routes ───────────────────────────────────────────────────────────────────
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "Food Destination Engine"})


@app.route("/api/food-types", methods=["GET"])
def food_types():
    return jsonify({
        "food_types": list(FOOD_TYPES.keys()),
        "storage_conditions": list(STORAGE_CONDITIONS.keys()),
    })


@app.route("/api/analyze", methods=["POST"])
def analyze():
    # ── validation ────────────────────────────────────────────────────────────
    errors = validate_analyze_payload(request.form, request.files)
    if errors:
        return _bad_request("Validation failed.", errors)

    # ── read image bytes ──────────────────────────────────────────────────────
    image_file = request.files["image"]
    image_bytes = image_file.read()

    # ── read contextual fields ────────────────────────────────────────────────
    food_type         = request.form.get("food_type", "other")
    storage_condition = request.form.get("storage_condition", "room_temperature")
    hours_since_prep  = float(request.form.get("hours_since_prep", 0))
    temperature_c     = float(request.form.get("temperature_c", 25))
    humidity_pct      = float(request.form.get("humidity_pct", 60))
    quantity_kg       = float(request.form.get("quantity_kg", 1))

    inputs = {
        "food_type":         food_type,
        "storage_condition": storage_condition,
        "hours_since_prep":  hours_since_prep,
        "temperature_c":     temperature_c,
        "humidity_pct":      humidity_pct,
        "quantity_kg":       quantity_kg,
    }

    # ── run models ────────────────────────────────────────────────────────────
    try:
        cnn_result = assess_food_quality(image_bytes)
    except Exception as e:
        return _server_error(f"Image analysis failed: {str(e)}")

    try:
        shelf_result = predict_shelf_life(
            food_type=food_type,
            storage_condition=storage_condition,
            hours_since_prep=hours_since_prep,
            temperature_c=temperature_c,
            humidity_pct=humidity_pct,
        )
    except Exception as e:
        return _server_error(f"Shelf-life prediction failed: {str(e)}")

    try:
        fusion_result = recommend(cnn_result, shelf_result, quantity_kg)
    except Exception as e:
        return _server_error(f"Recommendation engine failed: {str(e)}")

    # ── save image ────────────────────────────────────────────────────────────
    filename = secure_filename(image_file.filename or "upload.jpg")
    save_name = f"{uuid.uuid4().hex}_{filename}"
    save_path = os.path.join(UPLOAD_FOLDER, save_name)
    with open(save_path, "wb") as f:
        f.write(image_bytes)

    # ── use fusion-corrected quality values for display ───────────────────────
    corrected_label = fusion_result["inputs_summary"]["quality_label"]
    corrected_score = fusion_result["inputs_summary"]["quality_score"]
    display_quality = {
        **cnn_result,
        "quality_label": corrected_label,
        "quality_score": corrected_score,
    }

    # ── save to database ──────────────────────────────────────────────────────
    try:
        record_id = save_analysis(
            inputs=inputs,
            image_quality=display_quality,
            shelf_life=shelf_result,
            recommendation=fusion_result,
            image_filename=save_name,
        )
    except Exception as e:
        record_id = None
        print(f"[DB] Warning: could not save analysis: {e}")

    # ── compose response ──────────────────────────────────────────────────────
    return jsonify({
        "success":        True,
        "record_id":      record_id,
        "image_quality":  display_quality,
        "shelf_life":     shelf_result,
        "recommendation": fusion_result,
        "inputs":         inputs,
    })


# ── history routes ────────────────────────────────────────────────────────────
@app.route("/api/history", methods=["GET"])
def history():
    limit  = int(request.args.get("limit", 50))
    offset = int(request.args.get("offset", 0))
    rows   = get_all_analyses(limit=limit, offset=offset)
    return jsonify({"success": True, "count": len(rows), "records": rows})


@app.route("/api/history/<int:analysis_id>", methods=["GET"])
def history_single(analysis_id):
    row = get_analysis_by_id(analysis_id)
    if not row:
        return _not_found(f"Analysis #{analysis_id} not found.")
    return jsonify({"success": True, "record": row})


@app.route("/api/history/<int:analysis_id>", methods=["DELETE"])
def history_delete(analysis_id):
    deleted = delete_analysis(analysis_id)
    if not deleted:
        return _not_found(f"Analysis #{analysis_id} not found.")
    return jsonify({"success": True, "message": f"Analysis #{analysis_id} deleted."})


@app.route("/api/stats", methods=["GET"])
def stats():
    data = get_stats()
    return jsonify({"success": True, "stats": data})


# ── entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
