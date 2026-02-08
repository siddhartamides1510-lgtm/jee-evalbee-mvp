export function parseNamesFromCSV(text: string): string[] {
  // Supports: single column CSV OR multiple columns (takes first column)
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Remove header if it looks like "name" or "student" etc.
  const first = lines[0]?.toLowerCase() ?? "";
  const startIndex =
    first.includes("name") || first.includes("student") ? 1 : 0;

  const names = lines
    .slice(startIndex)
    .map((line) => {
      // take first column
      const firstCol = line.split(",")[0]?.trim() ?? "";
      // remove surrounding quotes
      return firstCol.replace(/^"|"$/g, "").trim();
    })
    .filter(Boolean);

  // Deduplicate (case-insensitive) while preserving original casing
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const key = n.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(n);
    }
  }
  return out;
}
