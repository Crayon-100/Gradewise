import json
import os

data_file = 'data/grades.json'

with open(data_file, 'r', encoding='utf-8') as f:
    grades = json.load(f)

specialties = {
    "201": "Cost-effective high yield strength.",
    "202": "Cost-effective general purpose toughness.",
    "301": "Extreme work-hardening for springs and structural flex.",
    "304": "The universal industry standard for balanced corrosion resistance.",
    "304L": "Heavy-section welding without carbide precipitation.",
    "316": "Superior pitting resistance in marine and chloride environments.",
    "316L": "Marine-grade heavy welding without weld decay.",
    "321": "High-temperature stability (up to 816°C) and resistance to intergranular corrosion.",
    "309S": "Extreme high-temperature oxidation resistance (up to 980°C).",
    "310S": "Ultimate high-temperature scaling resistance (up to 1150°C).",
    "904L": "Extreme resistance to strong reducing acids (e.g. sulfuric) and severe chlorides.",
    "409": "Ultra-low-cost oxidation resistance for automotive exhausts.",
    "430": "Budget-friendly cosmetic resistance for indoor appliances and trim.",
    "439": "Upgraded thermal fatigue and oxidation resistance for complex exhausts.",
    "410": "Hardenable for high mechanical wear resistance and sharp edge retention.",
    "2205 (Duplex)": "Exceptional strength and total immunity to chloride stress-corrosion cracking.",
    "2304 (Duplex)": "Lean duplex offering 2205-level structural strength at a competitive price point."
}

for grade in grades:
    label = grade.get('grade')
    if label in specialties:
        grade['speciality'] = specialties[label]

with open(data_file, 'w', encoding='utf-8') as f:
    json.dump(grades, f, indent=2)
