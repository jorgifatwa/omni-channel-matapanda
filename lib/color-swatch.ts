/**
 * Colour-name → swatch hex lookup.
 *
 * Variants used to be saved with the admin form's default hex (#000000) even
 * when the colour was "Yellow" or "Pink", so every storefront swatch showed
 * black. These helpers recover a sensible swatch from the colour name
 * (English and Indonesian) whenever the stored hex is missing or is that
 * untouched default.
 */

const NAMED: Array<[string, string]> = [
  // Multi-word / specific names first (matched before single words)
  ["sky blue", "#87CEEB"],
  ["baby blue", "#A7C7E7"],
  ["light blue", "#ADD8E6"],
  ["navy blue", "#1F2A44"],
  ["royal blue", "#4169E1"],
  ["dusty pink", "#D8A7A7"],
  ["baby pink", "#F4C2C2"],
  ["hot pink", "#FF69B4"],
  ["light pink", "#FFB6C1"],
  ["dark green", "#1F4D3A"],
  ["army green", "#4B5320"],
  ["forest green", "#228B22"],
  ["light grey", "#D3D3D3"],
  ["light gray", "#D3D3D3"],
  ["dark grey", "#4A4A4A"],
  ["dark gray", "#4A4A4A"],
  ["dark brown", "#5C4033"],
  ["light brown", "#B5835A"],
  ["off white", "#F5F3EC"],
  ["broken white", "#F5F3EC"],
  ["biru muda", "#87CEEB"],
  ["biru tua", "#1F2A44"],
  ["hijau tua", "#1F4D3A"],
  ["hijau muda", "#90EE90"],
  ["merah muda", "#FFC0CB"],
  ["abu abu", "#9E9E9E"],
  ["abu-abu", "#9E9E9E"],
  ["coklat tua", "#5C4033"],
  ["coklat muda", "#B5835A"],
  ["cokelat tua", "#5C4033"],
  ["cokelat muda", "#B5835A"],
  // Single words
  ["black", "#111111"],
  ["hitam", "#111111"],
  ["white", "#FFFFFF"],
  ["putih", "#FFFFFF"],
  ["ivory", "#FFFFF0"],
  ["cream", "#F3E5C0"],
  ["krem", "#F3E5C0"],
  ["beige", "#E8D9BE"],
  ["khaki", "#C3B091"],
  ["sand", "#D8C3A0"],
  ["taupe", "#8B7D6B"],
  ["tan", "#D2B48C"],
  ["camel", "#C19A6B"],
  ["mocha", "#7B5B45"],
  ["brown", "#8B5A2B"],
  ["coklat", "#8B5A2B"],
  ["cokelat", "#8B5A2B"],
  ["chocolate", "#5C3A21"],
  ["coffee", "#6F4E37"],
  ["grey", "#9E9E9E"],
  ["gray", "#9E9E9E"],
  ["abu", "#9E9E9E"],
  ["silver", "#C0C0C0"],
  ["charcoal", "#36454F"],
  ["red", "#D32F2F"],
  ["merah", "#D32F2F"],
  ["maroon", "#800000"],
  ["burgundy", "#800020"],
  ["wine", "#722F37"],
  ["pink", "#F4A6C0"],
  ["rose", "#E8A0A8"],
  ["blush", "#F1C6C6"],
  ["peach", "#FFCBA4"],
  ["salmon", "#FA8072"],
  ["coral", "#FF7F50"],
  ["orange", "#F57C00"],
  ["oranye", "#F57C00"],
  ["jingga", "#F57C00"],
  ["terracotta", "#C8603F"],
  ["rust", "#B7410E"],
  ["yellow", "#F7DC6F"],
  ["kuning", "#F7DC6F"],
  ["mustard", "#D4A017"],
  ["lemon", "#FFF44F"],
  ["gold", "#D4AF37"],
  ["emas", "#D4AF37"],
  ["green", "#3E8E5E"],
  ["hijau", "#3E8E5E"],
  ["olive", "#708238"],
  ["sage", "#9CAF88"],
  ["mint", "#98E2C6"],
  ["lime", "#C6E86B"],
  ["emerald", "#2E8B57"],
  ["teal", "#008080"],
  ["tosca", "#40E0D0"],
  ["turquoise", "#40E0D0"],
  ["blue", "#2F6FD6"],
  ["biru", "#2F6FD6"],
  ["navy", "#1F2A44"],
  ["denim", "#3B5B8C"],
  ["cobalt", "#0047AB"],
  ["purple", "#7E57C2"],
  ["ungu", "#7E57C2"],
  ["lilac", "#C8A2C8"],
  ["lavender", "#C9B6F2"],
  ["violet", "#8F00FF"],
  ["mauve", "#B784A7"],
  ["magenta", "#D81B60"],
  ["fuchsia", "#E040FB"],
];

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Hex for a colour name, or null when the name isn't recognised. */
export function colorNameToHex(name: string | null | undefined): string | null {
  const n = (name || "").toLowerCase().replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  if (!n) return null;
  for (const [key, hex] of NAMED) {
    if (n === key) return hex;
  }
  for (const [key, hex] of NAMED) {
    if (new RegExp(`(^|[^a-z])${key.replace(/[-\s]/g, "[-\\s]")}([^a-z]|$)`).test(n)) return hex;
  }
  return null;
}

function isBlackName(name: string | null | undefined): boolean {
  return /\b(black|hitam|jet|onyx|ebony)\b/i.test(name || "");
}

/**
 * The swatch to show for a variant: the stored hex when it is a deliberate
 * choice, otherwise the hex derived from the colour name.
 */
export function resolveSwatchHex(name: string | null | undefined, hex: string | null | undefined): string | null {
  const stored = (hex || "").trim();
  const valid = HEX_RE.test(stored);
  const untouchedDefault = valid && /^#0{3}(0{3})?$/.test(stored) && !isBlackName(name);
  if (valid && !untouchedDefault) return stored;
  return colorNameToHex(name) || (valid ? stored : null);
}
