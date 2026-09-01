/**
 * Central scenario config used by the dashboard shell to statically know labels
 * and color mappings. Live values are streamed from the backend.
 */
export const SCENARIOS = [
  { key: "normal",        label: "Normal Operation",       hotkey: "1" },
  { key: "loose_joint",   label: "Loose Joint (J2)",       hotkey: "2" },
  { key: "damaged_joint", label: "Damaged Joint (J2)",     hotkey: "3" },
  { key: "misalignment",  label: "Belt Misalignment",      hotkey: "4" },
  { key: "overload",      label: "Motor Overload",         hotkey: "5" },
];

// ISA-101 palette (ISO 10816-3 severity bands)
export const SEVERITY_COLOR = {
  healthy:  "#5A6063",
  warning:  "#FFBF00",
  critical: "#FF3333",
  info:     "#4A90E2",
  muted:    "#3A3E41",
};

export const ISO_ZONES = [
  { key: "A", from: 0.0,  to: 1.8,  color: "#2A3D2A", label: "Good" },
  { key: "B", from: 1.8,  to: 2.8,  color: "#3A3E41", label: "Satisfactory" },
  { key: "C", from: 2.8,  to: 4.5,  color: "#5A4A1F", label: "Unsatisfactory" },
  { key: "D", from: 4.5,  to: 8.0,  color: "#5A2020", label: "Unacceptable" },
];

// Placeholder splice images (used in vision panel & joint thumbnails)
export const SPLICE_IMAGES = {
  clean:
    "https://images.unsplash.com/photo-1535923430552-0ce3cd477cc7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1OTN8MHwxfHNlYXJjaHwzfHxpbmR1c3RyaWFsJTIwY29udmV5b3IlMjBiZWx0JTIwbWFjaGluZXJ5fGVufDB8fHx8MTc4ODAyMjAwMnww&ixlib=rb-4.1.0&q=85",
  damaged:
    "https://images.unsplash.com/photo-1721413059017-2c4232b10ded?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAxODF8MHwxfHNlYXJjaHwxfHxkYW1hZ2VkJTIwcnViYmVyJTIwdGV4dHVyZXxlbnwwfHx8fDE3ODgwMjIwMDZ8MA&ixlib=rb-4.1.0&q=85",
};
