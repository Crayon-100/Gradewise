/** Curated Unsplash image URLs for each Jindal Stainless grade. */
const GRADE_IMAGES: Record<string, string> = {
  // 300-series Austenitic
  "304":             "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=900&q=80",
  "304L":            "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=900&q=80",
  "316":             "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80",
  "316L":            "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80",
  "317L":            "https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?auto=format&fit=crop&w=900&q=80",
  "321":             "https://images.unsplash.com/photo-1518709766631-a6a7f45921c3?auto=format&fit=crop&w=900&q=80",
  "310S":            "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=900&q=80",
  "301":             "https://images.unsplash.com/photo-1530283566498-bd4dde06c09e?auto=format&fit=crop&w=900&q=80",
  "904L":            "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=900&q=80",
  // 200-series Austenitic
  "201":             "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=900&q=80",
  "202":             "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=900&q=80",
  // 400-series Ferritic / Martensitic
  "409":             "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80",
  "410":             "https://images.unsplash.com/photo-1612538498456-e861df91d473?auto=format&fit=crop&w=900&q=80",
  "416":             "https://images.unsplash.com/photo-1612538498456-e861df91d473?auto=format&fit=crop&w=900&q=80",
  "430":             "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=900&q=80",
  // Duplex
  "2205 (Duplex)":   "https://images.unsplash.com/photo-1565043666747-69f6646db940?auto=format&fit=crop&w=900&q=80",
  "2507 (Duplex)":   "https://images.unsplash.com/photo-1565043666747-69f6646db940?auto=format&fit=crop&w=900&q=80",
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1587293852726-70cdb56c2866?auto=format&fit=crop&w=900&q=80";

/** Return the best-matching industrial image URL for a given grade label. */
export function gradeImageUrl(gradeLabel: string): string {
  return GRADE_IMAGES[gradeLabel] ?? FALLBACK_IMAGE;
}

/** PREN (Pitting Resistance Equivalent Number) — higher = more resistant.
 *  PREN = %Cr + 3.3×%Mo + 16×%N
 *  These are approximate representative values for each grade family.
 */
export const GRADE_PREN: Record<string, number> = {
  "201": 16,  "202": 16,
  "301": 18,  "304": 18,  "304L": 18,
  "316": 24,  "316L": 24, "317L": 29,
  "321": 18,  "310S": 26, "904L": 36,
  "409": 10,  "410": 12,  "416": 12, "430": 17,
  "2205 (Duplex)": 35, "2507 (Duplex)": 43,
};
