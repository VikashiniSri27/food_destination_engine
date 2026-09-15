"""
database.py
===========
SQLite database layer for the AI Food Destination Engine.

Tables:
  analyses  – one row per food analysis request
"""

import sqlite3
import json
import pathlib
from datetime import datetime

DB_PATH = pathlib.Path(__file__).parent / "food_analysis.db"


def get_connection():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    """Create tables if they don't exist."""
    with get_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS analyses (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at          TEXT    NOT NULL,
                food_type           TEXT    NOT NULL,
                storage_condition   TEXT    NOT NULL,
                hours_since_prep    REAL    NOT NULL,
                temperature_c       REAL    NOT NULL,
                humidity_pct        REAL    NOT NULL,
                quantity_kg         REAL    NOT NULL,
                quality_label       TEXT    NOT NULL,
                quality_score       REAL    NOT NULL,
                probabilities       TEXT    NOT NULL,
                inference_mode      TEXT    NOT NULL,
                remaining_hours     REAL    NOT NULL,
                usability_pct       REAL    NOT NULL,
                safety_tier         TEXT    NOT NULL,
                recommendation      TEXT    NOT NULL,
                confidence          REAL    NOT NULL,
                co2_saved_kg        REAL    NOT NULL,
                water_saved_l       REAL    NOT NULL,
                meals_equivalent    INTEGER NOT NULL,
                image_filename      TEXT
            )
        """)
        conn.commit()
    print(f"[DB] Database ready at {DB_PATH}")


def save_analysis(
    inputs: dict,
    image_quality: dict,
    shelf_life: dict,
    recommendation: dict,
    image_filename: str = None,
) -> int:
    """Insert one analysis record. Returns the new row id."""
    env_impact = recommendation.get("environmental_impact", {})
    probs_json = json.dumps(image_quality.get("probabilities", {}))

    with get_connection() as conn:
        cursor = conn.execute("""
            INSERT INTO analyses (
                created_at, food_type, storage_condition,
                hours_since_prep, temperature_c, humidity_pct, quantity_kg,
                quality_label, quality_score, probabilities, inference_mode,
                remaining_hours, usability_pct, safety_tier,
                recommendation, confidence,
                co2_saved_kg, water_saved_l, meals_equivalent,
                image_filename
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            inputs.get("food_type", ""),
            inputs.get("storage_condition", ""),
            inputs.get("hours_since_prep", 0),
            inputs.get("temperature_c", 25),
            inputs.get("humidity_pct", 60),
            inputs.get("quantity_kg", 1),
            image_quality.get("quality_label", ""),
            image_quality.get("quality_score", 0),
            probs_json,
            image_quality.get("inference_mode", ""),
            shelf_life.get("remaining_safe_hours", 0),
            shelf_life.get("usability_pct", 0),
            shelf_life.get("safety_tier", ""),
            recommendation.get("recommendation", ""),
            recommendation.get("confidence", 0),
            env_impact.get("co2_saved_kg", 0),
            env_impact.get("water_saved_l", 0),
            env_impact.get("meals_equivalent", 0),
            image_filename,
        ))
        conn.commit()
        return cursor.lastrowid


def get_all_analyses(limit: int = 100, offset: int = 0) -> list:
    """Return recent analyses, newest first."""
    with get_connection() as conn:
        rows = conn.execute("""
            SELECT * FROM analyses
            ORDER BY id DESC
            LIMIT ? OFFSET ?
        """, (limit, offset)).fetchall()
        return [dict(r) for r in rows]


def get_analysis_by_id(analysis_id: int) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM analyses WHERE id = ?", (analysis_id,)
        ).fetchone()
        return dict(row) if row else None


def get_stats() -> dict:
    """Aggregate statistics for the dashboard."""
    with get_connection() as conn:
        total = conn.execute("SELECT COUNT(*) FROM analyses").fetchone()[0]

        pathway_counts = conn.execute("""
            SELECT recommendation, COUNT(*) as cnt
            FROM analyses GROUP BY recommendation
        """).fetchall()

        quality_counts = conn.execute("""
            SELECT quality_label, COUNT(*) as cnt
            FROM analyses GROUP BY quality_label
        """).fetchall()

        totals = conn.execute("""
            SELECT
                SUM(co2_saved_kg)     as total_co2,
                SUM(water_saved_l)    as total_water,
                SUM(meals_equivalent) as total_meals,
                SUM(quantity_kg)      as total_kg
            FROM analyses
        """).fetchone()

        recent_7 = conn.execute("""
            SELECT DATE(created_at) as day, COUNT(*) as cnt
            FROM analyses
            WHERE created_at >= DATE('now', '-7 days')
            GROUP BY day ORDER BY day
        """).fetchall()

    return {
        "total_analyses": total,
        "pathway_counts": {r["recommendation"]: r["cnt"] for r in pathway_counts},
        "quality_counts": {r["quality_label"]: r["cnt"] for r in quality_counts},
        "total_co2_saved_kg":   round(totals["total_co2"]   or 0, 2),
        "total_water_saved_l":  round(totals["total_water"]  or 0, 1),
        "total_meals":          int(totals["total_meals"]    or 0),
        "total_food_kg":        round(totals["total_kg"]     or 0, 1),
        "daily_counts":         [{"day": r["day"], "count": r["cnt"]} for r in recent_7],
    }


def delete_analysis(analysis_id: int) -> bool:
    with get_connection() as conn:
        cursor = conn.execute("DELETE FROM analyses WHERE id = ?", (analysis_id,))
        conn.commit()
        return cursor.rowcount > 0
