"""
Convert the GradeWise demo Excel datasheet into backend/data/grades.json.

Run from anywhere:
    python convert_grades.py
    python convert_grades.py --excel /path/to/Datasheet.xlsx --output /path/to/grades.json
"""

import argparse
import json
import os
import re
import sys

import openpyxl

EXCEL_PATH = os.path.join(os.path.dirname(__file__), "..", "GradeWise_Demo_Steel_Datasheet.xlsx")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "data", "grades.json")

HEADER_MAP = {
    "Grade": "grade",
    "UNS No.": "uns_no",
    "Series": "series",
    "Type": "type",
    "Yield Strength (MPa)": "yield_strength_mpa",
    "Tensile Strength (MPa)": "tensile_strength_mpa",
    "Elongation (%):": "elongation_pct",
    "Hardness": "hardness",
    "Young's Modulus (GPa)": "youngs_modulus_gpa",
    "Density (kg/m3)": "density_kg_m3",
    "Magnetic": "magnetic",
    "Corrosion Resistance (1-5)": "corrosion_resistance",
    "Max Service Temp (C)": "max_service_temp_c",
    "Formability (1-5)": "formability",
    "Weldability": "weldability",
    "Relative Cost Tier (1-5)": "cost_tier",
    "Typical Applications": "typical_applications",
    "Trade-off Notes": "trade_off_notes",
}

NUMERIC_FIELDS = {
    "yield_strength_mpa",
    "tensile_strength_mpa",
    "elongation_pct",
    "youngs_modulus_gpa",
    "density_kg_m3",
    "corrosion_resistance",
    "max_service_temp_c",
    "formability",
    "cost_tier",
}


def clean_text(val):
    if not isinstance(val, str):
        return val
    # Clean whitespace and normalize hyphens/dashes
    val = val.strip()
    val = val.replace("\ufffd", "—")  # Fix any broken unicode replacement chars
    val = re.sub(r"\s+", " ", val)
    return val


def _to_number(key, val, warnings):
    """Coerce a cell to int/float. Non-numeric cells degrade to 0 with a warning
    instead of aborting the whole conversion."""
    try:
        num_val = float(val)
    except (TypeError, ValueError):
        warnings.append(f"row value {val!r} for '{key}' is not numeric — stored as 0")
        return 0
    return int(num_val) if num_val.is_integer() else num_val


def convert(excel_path=EXCEL_PATH, output_path=OUTPUT_PATH):
    """Read the datasheet and write grades.json. Returns the parsed grade list."""
    warnings = []

    if not os.path.exists(excel_path):
        raise FileNotFoundError(f"Excel file not found at: {excel_path}")

    wb = openpyxl.load_workbook(excel_path, data_only=True)
    ws = wb["Grade Data"] if "Grade Data" in wb.sheetnames else wb.active

    headers = [cell.value for cell in ws[1]]
    mapped_keys = [HEADER_MAP.get(h) for h in headers]

    missing_headers = [h for h, k in zip(headers, mapped_keys, strict=False) if k is None]
    if missing_headers:
        warnings.append(f"Unmapped headers encountered: {missing_headers}")

    grades = []
    for row_idx in range(2, ws.max_row + 1):
        vals = [cell.value for cell in ws[row_idx]]
        if not any(vals):
            continue

        item = {}
        for key, val in zip(mapped_keys, vals, strict=False):
            if not key:
                continue

            # Type conversions
            if key in NUMERIC_FIELDS:
                if val is not None:
                    item[key] = _to_number(key, val, warnings)
                else:
                    item[key] = 0
            else:
                item[key] = clean_text(str(val) if val is not None else "")

        # Format series as string
        if "series" in item:
            item["series"] = str(item["series"])
        if "grade" in item:
            item["grade"] = str(item["grade"])

        grades.append(item)

    for warning in warnings:
        print(f"Warning: {warning}")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(grades, f, indent=2, ensure_ascii=False)

    print(f"Successfully converted {len(grades)} steel grades to: {output_path}")
    return grades


def build_parser():
    parser = argparse.ArgumentParser(
        description="Convert the GradeWise demo Excel datasheet into backend/data/grades.json."
    )
    parser.add_argument("--excel", default=EXCEL_PATH, help="Path to the source .xlsx datasheet.")
    parser.add_argument("--output", default=OUTPUT_PATH, help="Path to write grades.json.")
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    try:
        convert(args.excel, args.output)
    except FileNotFoundError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())