"""
Input validation helpers for the API layer.
"""

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "bmp", "gif"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB


def allowed_image(filename: str) -> bool:
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


def validate_analyze_payload(form: dict, files: dict) -> list[str]:
    """Return a list of validation error strings (empty = valid)."""
    errors = []

    if "image" not in files or files["image"].filename == "":
        errors.append("An image file is required.")
    elif not allowed_image(files["image"].filename):
        errors.append(
            f"Unsupported image format. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Numeric fields
    for field, lo, hi in [
        ("hours_since_prep", 0, 8760),
        ("temperature_c", -30, 120),
        ("humidity_pct", 0, 100),
        ("quantity_kg", 0.01, 10000),
    ]:
        val = form.get(field)
        if val is not None:
            try:
                fval = float(val)
                if not (lo <= fval <= hi):
                    errors.append(f"{field} must be between {lo} and {hi}.")
            except ValueError:
                errors.append(f"{field} must be a number.")

    return errors
