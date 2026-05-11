export const schoolClassOptions = [
  "Pre Nursery",
  "Nursery",
  "LKG",
  "UKG",
  "1",
  "2",
  "3",
  "4",
  "5"
];

const classAliases = new Map([
  ["playgroup", "Play"],
  ["play group", "Play"],
  ["play", "Play"],
  ["pre nursery", "Pre Nursery"],
  ["prenursery", "Pre Nursery"],
  ["pre nur", "Pre Nursery"],
  ["pre nur.", "Pre Nursery"],
  ["pre-nursery", "Pre Nursery"],
  ["pre nursery.", "Pre Nursery"],
  ["nursery", "Nursery"],
  ["nursary", "Nursery"],
  ["nursary.", "Nursery"],
  ["lkg", "LKG"],
  ["ukg", "UKG"]
]);

export function normalizeSchoolClass(value) {
  const raw = String(value || "")
    .trim()
    .replace(/[._-]+/g, " ")
    .replace(/^class\s+/i, "")
    .replace(/\s+/g, " ");

  if (!raw) return "";

  const lower = raw.toLowerCase();
  if (classAliases.has(lower)) {
    return classAliases.get(lower);
  }

  const numeric = lower.match(/^class\s+0*(\d+)$/) || lower.match(/^0*(\d+)$/);
  if (numeric) {
    return String(Number(numeric[1]));
  }

  return raw
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function sortSchoolClasses(a, b) {
  const aClass = normalizeSchoolClass(a);
  const bClass = normalizeSchoolClass(b);
  const aIndex = schoolClassOptions.indexOf(aClass);
  const bIndex = schoolClassOptions.indexOf(bClass);

  if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
  if (aIndex !== -1) return -1;
  if (bIndex !== -1) return 1;

  return aClass.localeCompare(bClass, undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

export function normalizeSection(value) {
  return String(value || "").trim().toUpperCase();
}
