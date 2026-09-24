import os
import json
import re
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
    "Elongation (%)": "elongation_pct",
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

def convert():
    if not os.path.exists(EXCEL_PATH):
        raise FileNotFoundError(f"Excel file not found at: {EXCEL_PATH}")

    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    ws = wb["Grade Data"] if "Grade Data" in wb.sheetnames else wb.active

    headers = [cell.value for cell in ws[1]]
    mapped_keys = [HEADER_MAP.get(h) for h in headers]

    missing_headers = [h for h, k in zip(headers, mapped_keys) if k is None]
    if missing_headers:
        print(f"Warning: Unmapped headers encountered: {missing_headers}")

    grades = []
    for row_idx in range(2, ws.max_row + 1):
        vals = [cell.value for cell in ws[row_idx]]
        if not any(vals):
            continue

        item = {}
        for key, val in zip(mapped_keys, vals):
            if not key:
                continue

            # Type conversions
            if key in NUMERIC_FIELDS:
                if val is not None:
                    # If int-like, store as int
                    num_val = float(val)
                    item[key] = int(num_val) if num_val.is_integer() else num_val
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

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(grades, f, indent=2, ensure_ascii=False)

    print(f"Successfully converted {len(grades)} steel grades to: {OUTPUT_PATH}")
    return grades

if __name__ == "__main__":
    convert()
