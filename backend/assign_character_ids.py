import json
import itertools

# The 7 chosen strings (semantic tags to help the AI reason logically)
TAGS = ["STRENGTH", "CORROSION", "HEAT", "ECONOMY", "WELDING", "FORMING", "HARDNESS"]

# Generate all 21 combinations of 5 tags
all_combinations = list(itertools.combinations(TAGS, 5))
all_combinations = [list(c) for c in all_combinations]

# Load grades
data_file = 'data/grades.json'
with open(data_file, 'r', encoding='utf-8') as f:
    grades = json.load(f)

# Assign 17 combinations to the 17 grades
for i, grade in enumerate(grades):
    grade['character_id'] = all_combinations[i]

# The remaining 4 combinations are unused
unused_combinations = all_combinations[17:]

# Save back to json
with open(data_file, 'w', encoding='utf-8') as f:
    json.dump(grades, f, indent=2)

print("7 STRINGS USED:")
print(TAGS)
print("\nUNUSED COMBINATIONS (The 4 dead combinations to tell AI to ignore):")
for u in unused_combinations:
    print(u)
