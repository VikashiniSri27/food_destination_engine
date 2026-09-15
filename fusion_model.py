"""
Fusion model – combines CNN quality score + shelf-life prediction
to recommend the best recovery pathway.

Recovery pathways:
  1. Human Donation   – safe for human consumption
  2. Animal Feed      – not fit for humans but safe for animals
  3. Compost / Biogas – fully spoiled; best diverted to composting or biogas

Decision logic follows food-safety guidelines (FSSAI / FAO / FDA):
  - quality_score >= 0.8  AND  safety_tier in {Safe, Acceptable}
      → Human Donation
  - quality_score >= 0.3  OR   safety_tier == "Borderline"
      → Animal Feed
  - quality_score < 0.3  AND  safety_tier == "Unsafe"
      → Compost / Biogas
"""

from __future__ import annotations
from typing import Dict, Any


# ── pathway metadata ─────────────────────────────────────────────────────────
PATHWAYS = {
    "Human Donation": {
        "icon": "🤝",
        "color": "#22c55e",   # green
        "description": (
            "Food is safe and nutritious for human consumption. "
            "Recommend donating to food banks, shelters, or community kitchens."
        ),
        "env_impact": {
            "co2_saved_kg": 2.5,   # per kg of food diverted
            "water_saved_l": 250,
            "meals_equivalent": 2,
        },
    },
    "Animal Feed": {
        "icon": "🐄",
        "color": "#f59e0b",   # amber
        "description": (
            "Food is past peak freshness for humans but safe for animal consumption. "
            "Connect with local farms, pet shelters, or livestock facilities."
        ),
        "env_impact": {
            "co2_saved_kg": 1.8,
            "water_saved_l": 180,
            "meals_equivalent": 0,
        },
    },
    "Compost / Biogas": {
        "icon": "♻️",
        "color": "#6366f1",   # indigo
        "description": (
            "Food is fully spoiled and unsuitable for consumption. "
            "Divert to composting or biogas facilities to recover nutrients and energy."
        ),
        "env_impact": {
            "co2_saved_kg": 0.8,
            "water_saved_l": 50,
            "meals_equivalent": 0,
        },
    },
}


def _confidence_score(quality_score: float, usability_pct: float, pathway: str) -> float:
    """Estimate model confidence (0-1) for the chosen pathway."""
    q = quality_score          # 0-1
    u = usability_pct / 100.0  # 0-1

    if pathway == "Human Donation":
        return round((q * 0.6 + u * 0.4), 3)
    if pathway == "Animal Feed":
        mid = abs(q - 0.4) + abs(u - 0.5)
        return round(max(0.0, 1.0 - mid), 3)
    # Compost
    spoilage = (1 - q) * 0.6 + (1 - u) * 0.4
    return round(min(1.0, spoilage), 3)


def _explain(pathway: str, quality_label: str, safety_tier: str,
             remaining_hours: float, quality_score: float) -> list[str]:
    """Generate human-readable explanation bullets."""
    reasons = []
    q_pct = int(quality_score * 100)

    if pathway == "Human Donation":
        reasons.append(f"Image quality assessment: **{quality_label}** ({q_pct}% quality score)")
        reasons.append(f"Food safety tier: **{safety_tier}** with {remaining_hours:.1f} hrs remaining")
        reasons.append("Meets food safety standards for direct human consumption.")
    elif pathway == "Animal Feed":
        reasons.append(f"Image quality assessment: **{quality_label}** ({q_pct}% quality score)")
        reasons.append(f"Food safety tier: **{safety_tier}** — marginal for human use")
        reasons.append("Nutritional value retained; suitable for animal consumption.")
    else:
        reasons.append(f"Image quality assessment: **{quality_label}** ({q_pct}% quality score)")
        reasons.append(f"Food safety tier: **{safety_tier}** — no remaining safe shelf-life")
        reasons.append("Composting / biogas recovers nutrients and reduces landfill methane.")

    return reasons


def _env_impact(pathway: str, quantity_kg: float) -> Dict[str, Any]:
    """Scale environmental impact by food quantity."""
    meta = PATHWAYS[pathway]["env_impact"]
    return {
        "co2_saved_kg":      round(meta["co2_saved_kg"] * quantity_kg, 2),
        "water_saved_l":     round(meta["water_saved_l"] * quantity_kg, 1),
        "meals_equivalent":  int(meta["meals_equivalent"] * quantity_kg),
    }


# ── public API ────────────────────────────────────────────────────────────────
def recommend(
    cnn_result: Dict[str, Any],
    shelf_result: Dict[str, Any],
    quantity_kg: float = 1.0,
) -> Dict[str, Any]:
    """
    Combine CNN + shelf-life outputs and return recommendation.

    Parameters
    ----------
    cnn_result   : output of cnn_model.assess_food_quality()
    shelf_result : output of shelf_life_model.predict_shelf_life()
    quantity_kg  : weight of food in kg (for env impact calculation)

    Returns
    -------
    dict with pathway, confidence, explanation, environmental_impact, metadata
    """
    quality_label  = cnn_result.get("quality_label", "Unknown")
    safety_tier    = shelf_result.get("safety_tier", "Borderline")
    usability_pct  = float(shelf_result.get("usability_pct", 50.0))
    remaining_hrs  = float(shelf_result.get("remaining_safe_hours", 0.0))

    # ── use class probabilities for a more accurate quality score ────────────
    probs = cnn_result.get("probabilities", {})
    if probs:
        fresh_prob    = float(probs.get("Fresh", 0))
        moderate_prob = float(probs.get("Slightly Spoiled", 0))
        spoiled_prob  = float(probs.get("Spoiled", 0))
        # Weighted score: Fresh=1.0, Slightly Spoiled=0.5, Spoiled=0.0
        quality_score = round(fresh_prob * 1.0 + moderate_prob * 0.5 + spoiled_prob * 0.0, 4)
        # Penalise heavily when spoilage signal is significant
        spoilage_signal = moderate_prob + spoiled_prob
        if spoilage_signal > 0.20:
            quality_score = quality_score * (1 - spoilage_signal * 0.8)
            quality_score = round(max(0.0, quality_score), 4)
        # Override label based on recalculated score
        if quality_score >= 0.70:
            quality_label = "Fresh"
        elif quality_score >= 0.35:
            quality_label = "Slightly Spoiled"
        else:
            quality_label = "Spoiled"
    else:
        fresh_prob    = 1.0 if quality_label == "Fresh" else 0.0
        moderate_prob = 1.0 if quality_label == "Slightly Spoiled" else 0.0
        spoiled_prob  = 1.0 if quality_label == "Spoiled" else 0.0
        spoilage_signal = moderate_prob + spoiled_prob
        quality_score = float(cnn_result.get("quality_score", 0.5))

    # ── core decision tree (stricter thresholds) ─────────────────────────────
    # Human Donation: needs strong fresh signal AND safe shelf-life
    if (quality_score >= 0.75
            and fresh_prob >= 0.75
            and spoiled_prob <= 0.08
            and safety_tier in ("Safe", "Acceptable")
            and remaining_hrs > 0):
        pathway = "Human Donation"

    # Compost: high spoilage OR very low quality OR unsafe shelf-life
    elif (quality_score < 0.35
          or spoiled_prob >= 0.40
          or spoilage_signal >= 0.55
          or safety_tier == "Unsafe"
          or remaining_hrs <= 0):
        pathway = "Compost / Biogas"

    # Animal Feed: middle ground
    else:
        pathway = "Animal Feed"

    confidence   = _confidence_score(quality_score, usability_pct, pathway)
    explanations = _explain(pathway, quality_label, safety_tier,
                            remaining_hrs, quality_score)
    env_impact   = _env_impact(pathway, max(0.1, float(quantity_kg)))

    return {
        "recommendation":    pathway,
        "icon":              PATHWAYS[pathway]["icon"],
        "color":             PATHWAYS[pathway]["color"],
        "description":       PATHWAYS[pathway]["description"],
        "confidence":        confidence,
        "explanation":       explanations,
        "environmental_impact": env_impact,
        "inputs_summary": {
            "quality_label":      quality_label,
            "quality_score":      quality_score,
            "safety_tier":        safety_tier,
            "remaining_hours":    remaining_hrs,
            "usability_pct":      usability_pct,
        },
    }
