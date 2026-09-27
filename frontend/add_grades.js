const fs = require('fs');

const missingGrades = [
  {
    grade: "201",
    type: "Austenitic",
    description: "A lower-cost alternative to 304, using manganese and nitrogen to replace some nickel. Suitable for indoor applications.",
    yieldStrengthMpa: 310,
    tensileStrengthMpa: 750,
    maxTempC: 350,
    pren: 14,
    weldability: 3,
    machinability: 3,
    costTier: 2,
    image: "/grade images/304/image.png",
    composition: { "C": "0.15% max", "Cr": "16.0-18.0%", "Ni": "3.5-5.5%", "Mn": "5.5-7.5%", "N": "0.25% max" }
  },
  {
    grade: "202",
    type: "Austenitic",
    description: "Slightly higher nickel content than 201, providing marginally better corrosion resistance but still primarily for indoor use.",
    yieldStrengthMpa: 260,
    tensileStrengthMpa: 655,
    maxTempC: 350,
    pren: 15,
    weldability: 3,
    machinability: 3,
    costTier: 2,
    image: "/grade images/304L/image.png",
    composition: { "C": "0.15% max", "Cr": "17.0-19.0%", "Ni": "4.0-6.0%", "Mn": "7.5-10.0%", "N": "0.25% max" }
  }
];

let content = fs.readFileSync('src/lib/gradeData.ts', 'utf8');

// Find the end of the steelGrades array
const insertionPoint = content.lastIndexOf('];');

if (insertionPoint !== -1) {
  const newContent = content.slice(0, insertionPoint) + 
    ",\n" + 
    missingGrades.map(g => "  " + JSON.stringify(g, null, 4).split('\n').join('\n  ')).join(',\n') + 
    "\n];\n" + 
    content.slice(insertionPoint + 2);
    
  fs.writeFileSync('src/lib/gradeData.ts', newContent);
}
