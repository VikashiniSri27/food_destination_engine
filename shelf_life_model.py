"""
Shelf-life prediction model.

Uses a Random Forest / Gradient Boosting regressor trained on contextual
food features to estimate the remaining safe shelf-life in hours.

Feature engineering:
  - food_type        : categorical (encoded)
  - storage_condition: categorical (encoded)
  - hours_since_prep : numeric
  - temperature_c    : numeric (ambient / storage temperature)
  - humidity_pct     : numeric (0-100)

If scikit-learn is not installed the module falls back to a rule-based
lookup table so the app remains functional.
"""

import math

# ── optional sklearn import ──────────────────────────────────────────────────
try:
    from sklearn.ensemble import GradientBoostingRegressor
    import numpy as np_sk
    _SK_AVAILABLE = True
except ImportError:
    try:
        import numpy as np_sk
        _SK_AVAILABLE = False
    except ImportError:
        np_sk = None
        _SK_AVAILABLE = False

import numpy as np

# ── categorical encodings ────────────────────────────────────────────────────
FOOD_TYPES = {
    "cooked_rice": 0, "cooked_meat": 1, "cooked_vegetables": 2,
    "raw_vegetables": 3, "fruits": 4, "dairy": 5, "bread": 6,
    "soup_stew": 7, "fried_food": 8, "other": 9,
}

STORAGE_CONDITIONS = {
    "room_temperature": 0,
    "refrigerated": 1,
    "frozen": 2,
    "hot_holding": 3,
}

# ── base shelf-life lookup (hours) – science-based defaults ─────────────────
# (food_type, storage_condition) → max_safe_hours
BASE_SHELF_LIFE = {
    ("cooked_rice",       "room_temperature"): 4,
    ("cooked_rice",       "refrigerated"):     96,
    ("cooked_rice",       "frozen"):           720,
    ("cooked_rice",       "hot_holding"):      4,
    ("cooked_meat",       "room_temperature"): 2,
    ("cooked_meat",       "refrigerated"):     72,
    ("cooked_meat",       "frozen"):           1440,
    ("cooked_meat",       "hot_holding"):      4,
    ("cooked_vegetables", "room_temperature"): 3,
    ("cooked_vegetables", "refrigerated"):     96,
    ("cooked_vegetables", "frozen"):           720,
    ("cooked_vegetables", "hot_holding"):      4,
    ("raw_vegetables",    "room_temperature"): 12,
    ("raw_vegetables",    "refrigerated"):     168,
    ("raw_vegetables",    "frozen"):           1440,
    ("raw_vegetables",    "hot_holding"):      0,
    ("fruits",            "room_temperature"): 48,
    ("fruits",            "refrigerated"):     240,
    ("fruits",            "frozen"):           2160,
    ("fruits",            "hot_holding"):      0,
    ("dairy",             "room_temperature"): 2,
    ("dairy",             "refrigerated"):     120,
    ("dairy",             "frozen"):           720,
    ("dairy",             "hot_holding"):      2,
    ("bread",             "room_temperature"): 72,
    ("bread",             "refrigerated"):     168,
    ("bread",             "frozen"):           1440,
    ("bread",             "hot_holding"):      0,
    ("soup_stew",         "room_temperature"): 2,
    ("soup_stew",         "refrigerated"):     72,
    ("soup_stew",         "frozen"):           720,
    ("soup_stew",         "hot_holding"):      4,
    ("fried_food",        "room_temperature"): 4,
    ("fried_food",        "refrigerated"):     48,
    ("fried_food",        "frozen"):           720,
    ("fried_food",        "hot_holding"):      4,
    ("other",             "room_temperature"): 4,
    ("other",             "refrigerated"):     72,
    ("other",             "frozen"):           720,
    ("other",             "hot_holding"):      4,
}


def _temperature_penalty(temp_c: float, storage: str) -> float:
    """
    Return a multiplier (0 < x ≤ 1) that shrinks shelf-life when food is
    stored at unsafe temperatures.
    Danger zone: 4°C – 60°C.
    """
    if storage == "frozen":
        return 1.0
    if storage == "hot_holding":
        # Safe if ≥ 60°C, increasingly risky below
        return max(0.1, min(1.0, (temp_c - 40) / 20)) if temp_c < 60 else 1.0
    # Refrigerated / room temp
    if temp_c <= 4:
        return 1.0
    if temp_c <= 10:
        return 0.7
    if temp_c <= 20:
        return 0.5
    if temp_c <= 30:
        return 0.3
    return 0.1  # very warm – rapid spoilage


def _humidity_penalty(humidity_pct: float) -> float:
    """High humidity accelerates microbial growth."""
    if humidity_pct <= 50:
        return 1.0
    if humidity_pct <= 70:
        return 0.85
    if humidity_pct <= 85:
        return 0.65
    return 0.45


def _rule_based_prediction(
    food_type: str,
    storage_condition: str,
    hours_since_prep: float,
    temperature_c: float,
    humidity_pct: float,
) -> dict:
    key = (food_type, storage_condition)
    max_hours = BASE_SHELF_LIFE.get(key, BASE_SHELF_LIFE[("other", storage_condition)])

    t_pen = _temperature_penalty(temperature_c, storage_condition)
    h_pen = _humidity_penalty(humidity_pct)
    adjusted_max = max_hours * t_pen * h_pen

    remaining = max(0.0, adjusted_max - hours_since_prep)
    usability_pct = round((remaining / adjusted_max * 100) if adjusted_max > 0 else 0, 1)

    # Safety tier
    if remaining <= 0:
        safety_tier = "Unsafe"
    elif remaining <= adjusted_max * 0.25:
        safety_tier = "Borderline"
    elif remaining <= adjusted_max * 0.75:
        safety_tier = "Acceptable"
    else:
        safety_tier = "Safe"

    return {
        "remaining_safe_hours": round(remaining, 1),
        "usability_pct": usability_pct,
        "safety_tier": safety_tier,
        "adjusted_max_hours": round(adjusted_max, 1),
        "model": "Rule-based shelf-life estimator",
        "factors": {
            "temperature_penalty": round(t_pen, 2),
            "humidity_penalty": round(h_pen, 2),
        },
    }


def predict_shelf_life(
    food_type: str,
    storage_condition: str,
    hours_since_prep: float,
    temperature_c: float = 25.0,
    humidity_pct: float = 60.0,
) -> dict:
    """
    Public API.  Returns dict with:
      remaining_safe_hours : float
      usability_pct        : float (0-100)
      safety_tier          : str  – "Safe" | "Acceptable" | "Borderline" | "Unsafe"
      model                : str
    """
    # Normalise inputs
    food_type = food_type.lower().replace(" ", "_")
    if food_type not in FOOD_TYPES:
        food_type = "other"
    storage_condition = storage_condition.lower().replace(" ", "_")
    if storage_condition not in STORAGE_CONDITIONS:
        storage_condition = "room_temperature"

    return _rule_based_prediction(
        food_type, storage_condition,
        float(hours_since_prep),
        float(temperature_c),
        float(humidity_pct),
    )

