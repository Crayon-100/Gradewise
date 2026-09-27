import re

with open('backend/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace _build_prompt
old_build_prompt = r"""def _build_prompt(user_need: str, diameter_mm: float, length_mm: float) -> str:
    \"\"\"
    Build the Groq prompt. Embedding the full grades.json ensures the model
    reasons only from real data and cannot hallucinate grades or properties.
    \"\"\"
    grades_json_str = json.dumps(GRADES, indent=2)

    return f\"\"\"You are a stainless steel grade selection assistant for GradeWise.

TASK
----
A user needs help choosing a Jindal Stainless steel grade for their application.
Shortlist exactly 2 or 3 candidate grades from the dataset below that best match
the user's stated need.

USER NEED
---------
\"{user_need}\"

ROD DIMENSIONS (for context only — do NOT calculate any numbers yourself)
-----------------------------------
Diameter: {diameter_mm} mm
Length:   {length_mm} mm

RULES (strictly enforced)
--------------------------
1. Only recommend grades that appear in the dataset below — never invent grades.
2. Do NOT include any numbers in your ai_explanation — no MPa, no kg, no mm values.
3. Write ai_explanation for a non-engineer audience.
4. Cover the real trade-offs: what you gain AND what you give up with each grade.
5. You MUST output a JSON object with a single key "recommendations".
6. The value of "recommendations" must be an array of exactly 2 or 3 objects.
7. Each object must have exactly three keys: 
   - "grade" (the exact label from the dataset)
   - "ai_explanation" (your plain English text on why it's chosen)
   - "trade_off_notes" (explicitly state what downside this choice has directly compared to the OTHER grades you selected in this response).

GRADES DATASET
--------------
{grades_json_str}
\"\"\""""

new_build_prompt = r"""def _build_prompt(user_need: str, diameter_mm: float, length_mm: float) -> str:
    \"\"\"
    Build the Groq prompt. Embedding the full grades.json ensures the model
    reasons only from real data and cannot hallucinate grades or properties.
    \"\"\"
    grades_json_str = json.dumps(GRADES, indent=2)

    return f\"\"\"You are a stainless steel grade selection assistant for GradeWise.

TASK
----
A user needs help choosing a Jindal Stainless steel grade for their application.
Shortlist exactly 2 or 3 candidate grades from the dataset below that best match
the user's stated need.

USER NEED
---------
\"{user_need}\"

ROD DIMENSIONS (for context only — do NOT calculate any numbers yourself)
-----------------------------------
Diameter: {diameter_mm} mm
Length:   {length_mm} mm

RULES (strictly enforced)
--------------------------
1. NEVER output a grade name directly! We use a deterministic character mapping system.
2. Select the matching grade by outputting its exact 5-string 'character_id' combination from the dataset.
3. The valid semantic strings are: ["STRENGTH", "CORROSION", "HEAT", "ECONOMY", "WELDING", "FORMING", "HARDNESS"].
4. You MUST completely ignore and NEVER output the following 4 unused combinations:
   - ["CORROSION", "HEAT", "ECONOMY", "FORMING", "HARDNESS"]
   - ["CORROSION", "HEAT", "WELDING", "FORMING", "HARDNESS"]
   - ["CORROSION", "ECONOMY", "WELDING", "FORMING", "HARDNESS"]
   - ["HEAT", "ECONOMY", "WELDING", "FORMING", "HARDNESS"]
5. Do NOT include any numbers in your ai_explanation — no MPa, no kg, no mm values.
6. Write ai_explanation for a non-engineer audience.
7. Cover the real trade-offs: what you gain AND what you give up with each grade.
8. You MUST output a JSON object with a single key "recommendations".
9. The value of "recommendations" must be an array of exactly 2 or 3 objects.
10. Each object must have exactly three keys: 
    - "character_id" (An array of exactly 5 uppercase strings representing the grade you chose)
    - "ai_explanation" (your plain English text on why it's chosen)
    - "trade_off_notes" (explicitly state what downside this choice has directly compared to the OTHER choices in this response).

GRADES DATASET
--------------
{grades_json_str}
\"\"\""""

content = content.replace(old_build_prompt, new_build_prompt)

# Replace _find_grade with _find_grade_by_character_id
old_find_grade = r"""def _find_grade(label: str) -> dict | None:
    \"\"\"
    Look up a grade by its label. Try exact match first, then case-insensitive,
    then a normalised partial match (handles slight whitespace differences).
    Returns None if not found.
    \"\"\"
    # 1. Exact match
    if label in GRADES_BY_LABEL:
        return GRADES_BY_LABEL[label]

    # 2. Case-insensitive match
    label_lower = label.strip().lower()
    for key, grade in GRADES_BY_LABEL.items():
        if key.lower() == label_lower:
            return grade

    # 3. Normalised match — strip spaces & brackets for robustness
    def _normalise(s: str) -> str:
        return re.sub(r"[\s()\-]", "", s).lower()

    label_norm = _normalise(label)
    for key, grade in GRADES_BY_LABEL.items():
        if _normalise(key) == label_norm:
            return grade

    return None"""

new_find_grade = r"""def _find_grade_by_character_id(char_id: list[str]) -> dict | None:
    \"\"\"
    Look up a grade by its deterministic 5-string combination.
    Returns None if not found.
    \"\"\"
    if not isinstance(char_id, list) or len(char_id) != 5:
        return None
        
    char_id_sorted = sorted([str(s).upper() for s in char_id])
    
    for grade in GRADES:
        g_char_id = grade.get("character_id")
        if isinstance(g_char_id, list) and sorted([str(s).upper() for s in g_char_id]) == char_id_sorted:
            return grade

    return None"""

content = content.replace(old_find_grade, new_find_grade)

# Replace the loop in recommend()
old_loop = r"""    for pick in ai_picks:
        grade_label: str = pick.get("grade", "").strip()
        ai_explanation: str = pick.get("ai_explanation", "").strip()
        trade_off_notes: str = pick.get("trade_off_notes", "").strip()

        # Fallback to static if AI fails to provide the tradeoff
        if not trade_off_notes:
            temp_grade = _find_grade(grade_label)
            if temp_grade:
                trade_off_notes = temp_grade.get("trade_off_notes", "No trade-off data available.")

        # Look up grade in our dataset (AI cannot fabricate this)
        grade_data = _find_grade(grade_label)
        if grade_data is None:
            # Skip unknown grades rather than crashing — shouldn't happen with
            # the strict prompt, but defensive code matters for a live demo
            continue"""

new_loop = r"""    for pick in ai_picks:
        char_id: list[str] = pick.get("character_id", [])
        ai_explanation: str = pick.get("ai_explanation", "").strip()
        trade_off_notes: str = pick.get("trade_off_notes", "").strip()

        # Look up grade via deterministic character_id
        grade_data = _find_grade_by_character_id(char_id)
        if grade_data is None:
            # The AI hallucinated a bad combination or returned a dead combo
            continue
            
        grade_label = grade_data["grade"]"""

content = content.replace(old_loop, new_loop)

with open('backend/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
