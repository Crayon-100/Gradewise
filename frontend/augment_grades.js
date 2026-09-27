const fs = require('fs');

const compMap = {
  "304": { "C": "0.08% max", "Cr": "18.0-20.0%", "Ni": "8.0-10.5%", "Mn": "2.0% max" },
  "304L": { "C": "0.03% max", "Cr": "18.0-20.0%", "Ni": "8.0-12.0%", "Mn": "2.0% max" },
  "316": { "C": "0.08% max", "Cr": "16.0-18.0%", "Ni": "10.0-14.0%", "Mo": "2.0-3.0%" },
  "316L": { "C": "0.03% max", "Cr": "16.0-18.0%", "Ni": "10.0-14.0%", "Mo": "2.0-3.0%" },
  "321": { "C": "0.08% max", "Cr": "17.0-19.0%", "Ni": "9.0-12.0%", "Ti": "5x(C+N) min" },
  "347": { "C": "0.08% max", "Cr": "17.0-19.0%", "Ni": "9.0-13.0%", "Nb": "10xC min" },
  "310S": { "C": "0.08% max", "Cr": "24.0-26.0%", "Ni": "19.0-22.0%", "Mn": "2.0% max" },
  "904L": { "C": "0.02% max", "Cr": "19.0-23.0%", "Ni": "23.0-28.0%", "Mo": "4.0-5.0%", "Cu": "1.0-2.0%" },
  "409": { "C": "0.08% max", "Cr": "10.5-11.7%", "Ti": "6xC min", "Mn": "1.0% max" },
  "430": { "C": "0.12% max", "Cr": "16.0-18.0%", "Mn": "1.0% max" },
  "439": { "C": "0.03% max", "Cr": "17.0-19.0%", "Ti": "0.2-1.1%" },
  "441": { "C": "0.03% max", "Cr": "17.5-19.5%", "Ti": "0.1-0.5%", "Nb": "0.3-0.9%" },
  "444": { "C": "0.025% max", "Cr": "17.5-19.5%", "Mo": "1.75-2.50%" },
  "410S": { "C": "0.08% max", "Cr": "11.5-13.5%", "Mn": "1.0% max" },
  "2205": { "C": "0.03% max", "Cr": "22.0-23.0%", "Ni": "4.5-6.5%", "Mo": "3.0-3.5%", "N": "0.14-0.20%" },
  "2507": { "C": "0.03% max", "Cr": "24.0-26.0%", "Ni": "6.0-8.0%", "Mo": "3.0-5.0%", "N": "0.24-0.32%" },
  "17-4PH": { "C": "0.07% max", "Cr": "15.0-17.5%", "Ni": "3.0-5.0%", "Cu": "3.0-5.0%", "Nb": "0.15-0.45%" }
};

let content = fs.readFileSync('src/lib/gradeData.ts', 'utf8');

content = content.replace(
  '  costTier: 1 | 2 | 3 | 4 | 5;\n  image: string; // The single image representing this grade',
  '  costTier: 1 | 2 | 3 | 4 | 5;\n  image: string;\n  composition: Record<string, string>;'
);

for (const [grade, comp] of Object.entries(compMap)) {
  const compStr = JSON.stringify(comp);
  const regex = new RegExp(`(grade: "${grade}",[\\s\\S]*?image: ".*?",)`);
  content = content.replace(regex, `$1\n    composition: ${compStr},`);
}

fs.writeFileSync('src/lib/gradeData.ts', content);
