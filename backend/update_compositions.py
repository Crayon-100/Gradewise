import json

data_file = 'data/grades.json'
with open(data_file, 'r', encoding='utf-8') as f:
    grades = json.load(f)

compositions = {
    "201": "An austenitic stainless steel that substitutes manganese and nitrogen for a significant portion of the nickel found in 300-series grades. This lowers the cost while maintaining high yield strength, but slightly reduces overall corrosion resistance.",
    "202": "Similar to 201 but with a slightly higher nickel and manganese content. This provides marginally better corrosion resistance and toughness than 201 while remaining a cost-effective alternative to standard 304.",
    "301": "Contains slightly lower chromium and nickel than 304, intentionally designed to undergo rapid work hardening during cold forming. This makes it ideal for high-strength structural applications and springs.",
    "304": "The industry standard austenitic grade containing roughly 18% chromium and 8% nickel. It offers an excellent balance of corrosion resistance, formability, and weldability without requiring exotic alloying elements.",
    "304L": "The low-carbon version of 304 (max 0.03% C), specifically alloyed to prevent carbide precipitation at grain boundaries during welding. This preserves corrosion resistance in the heat-affected zone of heavy weldments.",
    "316": "Contains 16-18% chromium, 10-14% nickel, and a critical addition of 2-3% molybdenum. The molybdenum significantly boosts resistance to pitting and crevice corrosion, particularly in chloride-rich environments like marine or de-icing salt exposure.",
    "316L": "The low-carbon derivative of standard 316, heavily used in welded assemblies. The restricted carbon content eliminates the risk of weld decay while maintaining the superior molybdenum-driven chloride resistance.",
    "321": "A titanium-stabilized variation of 304. The titanium addition preferentially binds with carbon, preventing chromium carbide precipitation and allowing the steel to maintain its corrosion resistance after prolonged exposure to high temperatures.",
    "309S": "Heavily alloyed with high chromium (22-24%) and elevated nickel (12-15%) specifically for high-temperature oxidation resistance. The 'S' denotes lower carbon, improving weldability and minimizing embrittlement during thermal cycling.",
    "310S": "An extreme high-temperature grade boasting 25% chromium and 20% nickel. This massive alloy content provides exceptional resistance to oxidation and scaling in continuous service up to 1150°C.",
    "904L": "A super-austenitic stainless steel with very high nickel (25%), chromium (20%), and molybdenum (4.5%), plus an addition of copper. This exotic composition provides phenomenal resistance to strong reducing acids like sulfuric acid and aggressive chloride attacks.",
    "409": "A low-cost ferritic grade containing roughly 11% chromium and stabilized with titanium. It has just enough chromium to form a passive layer, making it the dominant choice for automotive exhaust systems.",
    "430": "A straight-chromium ferritic steel (16-18% Cr) with virtually no nickel. This offers good basic corrosion resistance for mild indoor environments (like appliances) at a significantly lower cost than austenitic grades.",
    "439": "A ferritic grade containing around 17% chromium, dual-stabilized with titanium and niobium. This stabilization prevents intergranular corrosion after welding and dramatically improves high-temperature oxidation resistance over standard 409.",
    "410": "A martensitic stainless steel with elevated carbon and 11.5-13.5% chromium. This specific composition allows it to be hardened and tempered via heat treatment, delivering high mechanical strength and wear resistance.",
    "2205 (Duplex)": "A highly engineered alloy (22% Cr, 5% Ni, 3% Mo) that solidifies into a mixed austenitic-ferritic microstructure. This precise chemistry delivers roughly double the yield strength of 304 while offering exceptional resistance to chloride stress-corrosion cracking.",
    "2304 (Duplex)": "A 'lean duplex' containing 23% chromium and 4% nickel, but largely omitting expensive molybdenum. It achieves the signature high-strength duplex microstructure at a cost profile highly competitive with standard austenitics."
}

for grade in grades:
    label = grade.get('grade')
    if label in compositions:
        grade['composition'] = compositions[label]

with open(data_file, 'w', encoding='utf-8') as f:
    json.dump(grades, f, indent=2)
