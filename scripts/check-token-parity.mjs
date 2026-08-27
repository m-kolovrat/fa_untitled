#!/usr/bin/env node
/**
 * Token parity check — theme.css vs. tokens/figma-tokens.json.
 *
 * Figma is the source of truth (see TOKENS.md). This script reads the committed
 * Figma extract, parses styles/theme.css with the same lightweight regex
 * technique components/foundations/foundations.story.tsx already uses for its
 * `?raw` import, and fails (non-zero exit) if anything in the extract is:
 *
 *   - missing from theme.css,
 *   - bound to the wrong ramp step (value mismatch), or
 *   - a primitive ramp Figma no longer defines but theme.css still declares
 *     (the exact regression this script exists to catch — a stale `--color-
 *     neutral-*`/`-yellow-*`/etc. surviving a future rename that missed a spot).
 *
 * Run: node scripts/check-token-parity.mjs   (wired up as `npm run tokens:check`)
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const tokens = JSON.parse(readFileSync(path.join(ROOT, "tokens/figma-tokens.json"), "utf8"));
const themeCss = readFileSync(path.join(ROOT, "styles/theme.css"), "utf8");

// ---------------------------------------------------------------------------
// Parse theme.css into { light: Map<name, rawValue>, dark: Map<name, rawValue> }
// ---------------------------------------------------------------------------

const DARK_MARKER = ".dark-mode {";
const darkStart = themeCss.indexOf(DARK_MARKER);
if (darkStart === -1) fail("Could not find `.dark-mode {` in theme.css — parser assumption broken.");

const lightBlock = themeCss.slice(0, darkStart);
// From the marker to the file's closing braces (last two `}` close .dark-mode and @layer base).
const darkBlock = themeCss.slice(darkStart);

const DECL_RE = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;

function parseDecls(block) {
    const map = new Map();
    for (const m of block.matchAll(DECL_RE)) {
        // First declaration wins if duplicated (matches CSS's own last-wins is actually
        // opposite — but theme.css doesn't intentionally duplicate keys, so this is fine
        // as a parity check, not a cascade simulator).
        if (!map.has(m[1])) map.set(m[1], m[2].trim());
    }
    return map;
}

const light = parseDecls(lightBlock);
const dark = parseDecls(darkBlock);

// ---------------------------------------------------------------------------
// Resolve a theme.css custom property to a final hex color, following var()
// chains across both scopes (dark falls back to light, matching the real
// cascade under .dark-mode).
// ---------------------------------------------------------------------------

const VAR_REF_RE = /^var\((--[a-zA-Z0-9_-]+)\)$/;

function resolveCss(name, mode, seen = new Set()) {
    if (seen.has(name)) return null; // circular guard
    seen.add(name);
    const scope = mode === "dark" ? dark : light;
    const raw = scope.get(name) ?? light.get(name);
    if (raw === undefined) return undefined; // not declared anywhere
    const ref = raw.match(VAR_REF_RE);
    if (ref) return resolveCss(ref[1], mode, seen);
    return normalizeColor(raw);
}

function normalizeColor(raw) {
    raw = raw.trim();
    if (raw.toLowerCase() === "transparent") return "#ffffff00";
    // rgb(R G B) or rgb(R G B / A)
    let m = raw.match(/^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+))?\s*\)$/i);
    if (m) {
        const [, r, g, b, a] = m;
        return toHex(+r, +g, +b, a !== undefined ? +a : 1);
    }
    // rgba(R, G, B, A) or rgb(R, G, B)
    m = raw.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/i);
    if (m) {
        const [, r, g, b, a] = m;
        return toHex(+r, +g, +b, a !== undefined ? +a : 1);
    }
    // hex literal, with or without alpha
    m = raw.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
    if (m) {
        const alpha = m[2] ? parseInt(m[2], 16) / 255 : 1;
        return toHex(...hexToRgb(m[1]), alpha);
    }
    return raw.toLowerCase(); // literal we don't recognize (e.g. a raw number list) — compare as-is
}

function hexToRgb(hex6) {
    return [parseInt(hex6.slice(0, 2), 16), parseInt(hex6.slice(2, 4), 16), parseInt(hex6.slice(4, 6), 16)];
}

function toHex(r, g, b, a = 1) {
    const h2 = (n) => Math.round(n).toString(16).padStart(2, "0");
    const base = `#${h2(r)}${h2(g)}${h2(b)}`;
    if (a >= 1) return base;
    return `${base}${h2(Math.round(a * 255))}`;
}

// Alpha-tolerant comparison — 8-digit hex alpha channels can round differently
// depending on which side (rgba fraction vs. hex byte) produced them.
function colorsMatch(a, b) {
    if (a === b) return true;
    if (a === undefined || b === undefined) return false;
    const ma = a.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
    const mb = b.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
    if (!ma || !mb || ma[1].toLowerCase() !== mb[1].toLowerCase()) return false;
    const alphaA = ma[2] ? parseInt(ma[2], 16) : 255;
    const alphaB = mb[2] ? parseInt(mb[2], 16) : 255;
    return Math.abs(alphaA - alphaB) <= 3; // ~1% tolerance
}

// ---------------------------------------------------------------------------
// Resolve a Figma JSON value ("gray-light/900", "brand/500", "#00000014",
// or a bare semantic-token name like "bg-secondary") to a final hex color.
// ---------------------------------------------------------------------------

function resolveFigma(value, mode, seen = new Set()) {
    if (value.startsWith("#")) return normalizeColor(value);
    if (value.includes("/")) {
        const [ramp, step] = value.split("/");
        const hex = tokens.primitives[ramp]?.[step];
        if (!hex) fail(`tokens/figma-tokens.json references unknown primitive "${value}"`);
        return normalizeColor(hex);
    }
    // Bare name → alias to another semantic token (same [light,dark] pair, by key).
    if (seen.has(value)) return null;
    seen.add(value);
    for (const category of Object.values(tokens.semantic)) {
        if (value in category) {
            const pair = category[value];
            return resolveFigma(pair[mode === "dark" ? 1 : 0], mode, seen);
        }
    }
    fail(`tokens/figma-tokens.json aliases unknown semantic token "${value}"`);
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

const errors = [];
function record(msg) {
    errors.push(msg);
}

// 1. Primitives — every ramp/step from the JSON must exist in theme.css with
//    the matching value. `gray` is special: gray-light → @theme, gray-dark → .dark-mode.
for (const [ramp, steps] of Object.entries(tokens.primitives)) {
    if (ramp === "base") continue; // white/black/transparent, checked separately below
    const emittedName = ramp.startsWith("gray-") ? "gray" : ramp;
    const mode = ramp === "gray-dark" ? "dark" : "light";
    for (const [step, hex] of Object.entries(steps)) {
        const varName = `--color-${emittedName}-${step}`;
        const actual = resolveCss(varName, mode);
        const expected = normalizeColor(hex);
        if (actual === undefined) {
            record(`missing primitive: ${varName} (${mode}) — Figma ${ramp}/${step} = ${hex}`);
        } else if (!colorsMatch(actual, expected)) {
            record(`wrong value: ${varName} (${mode}) is ${actual}, Figma ${ramp}/${step} = ${expected}`);
        }
    }
}

// base/white, base/black, base/transparent
for (const [step, hex] of Object.entries(tokens.primitives.base)) {
    const varName = `--color-${step}`;
    const actual = resolveCss(varName, "light");
    const expected = normalizeColor(hex);
    if (actual === undefined) record(`missing primitive: ${varName} — Figma base/${step} = ${hex}`);
    else if (!colorsMatch(actual, expected)) record(`wrong value: ${varName} is ${actual}, Figma base/${step} = ${expected}`);
}

// 2. Stale primitive ramps — names Figma no longer defines that theme.css
//    still declares (the "missed a spot on rename" regression).
const figmaRampNames = new Set([...Object.keys(tokens.primitives).filter((r) => r !== "base" && !r.startsWith("gray-")), "gray"]);
const RETIRED_RAMPS = ["neutral", "yellow", "green", "sky", "orange", "blue", "indigo", "slate", "amber", "emerald", "fuchsia"];
for (const retired of RETIRED_RAMPS) {
    if (figmaRampNames.has(retired)) continue; // shouldn't happen, but don't false-flag if Figma re-adds one
    // Match the ramp name as a whole hyphen-delimited segment (a trailing digit
    // after the ramp name) so "orange" doesn't false-match "orange-dark-*".
    const re = new RegExp(`^--color-(utility-)?${retired}-\\d`);
    const stale = [...light.keys(), ...dark.keys()].find((k) => re.test(k));
    if (stale) record(`stale ramp still declared: ${stale} — "${retired}" has no Figma counterpart`);
}

// 3. Utility ramps — per-step [lightStep, darkStep] against the ramp's primitive.
for (const [utilityName, spec] of Object.entries(tokens.utility)) {
    if (utilityName === "$note" || utilityName === "brand_alt") continue; // brand_alt has its own shape, checked structurally elsewhere
    const [lightRamp, darkRamp] = spec.$ramp;
    for (const [step, mapping] of Object.entries(spec)) {
        if (step === "$ramp") continue;
        const [lightStep, darkStep] = mapping;
        const varName = `--color-utility-${utilityName}-${step}`;

        const lightExpected = normalizeColor(tokens.primitives[lightRamp]?.[lightStep]);
        const lightActual = resolveCss(varName, "light");
        if (lightActual === undefined) record(`missing utility: ${varName} (light)`);
        else if (!colorsMatch(lightActual, lightExpected))
            record(`wrong value: ${varName} (light) is ${lightActual}, expected ${lightExpected} (${lightRamp}/${lightStep})`);

        const darkExpected = normalizeColor(tokens.primitives[darkRamp]?.[darkStep]);
        const darkActual = resolveCss(varName, "dark");
        if (darkActual === undefined) record(`missing utility: ${varName} (dark)`);
        else if (!colorsMatch(darkActual, darkExpected))
            record(`wrong value: ${varName} (dark) is ${darkActual}, expected ${darkExpected} (${darkRamp}/${darkStep})`);
    }
}

// 4. Semantic tokens — text / border / foreground / background / focusRing / componentColors.
//    Skip shadowColors (checked separately — theme.css doesn't name shadow layers
//    the same way) and componentColors' two literal RGBA-triplet legacy entries.
const LITERAL_TRIPLET_KEYS = new Set(["app-store-badge-border", "avatar-styles-bg-neutral"]);
const SEMANTIC_PREFIX = {
    text: "text",
    border: "border",
    foreground: "fg",
    background: "bg",
    focusRing: "", // focus-ring, focus-ring-error — no shared prefix pattern, handled by key as-is
    componentColors: "",
};

for (const [category, entries] of Object.entries(tokens.semantic)) {
    if (category === "shadowColors") continue;
    for (const [key, pair] of Object.entries(entries)) {
        if (LITERAL_TRIPLET_KEYS.has(key)) continue; // "166 166 166 1" form — not a color to resolve
        const varName = `--color-${key}`;
        for (const [mode, idx] of [
            ["light", 0],
            ["dark", 1],
        ]) {
            const expected = resolveFigma(pair[idx], mode);
            const actual = resolveCss(varName, mode);
            if (actual === undefined) {
                record(`missing semantic: ${varName} (${mode}, ${category}) — Figma ${key} = ${pair[idx]}`);
            } else if (expected !== null && !colorsMatch(actual, expected)) {
                record(`wrong value: ${varName} (${mode}, ${category}) is ${actual}, Figma ${key} = ${pair[idx]} (${expected})`);
            }
        }
    }
}

// 5. Radius — xxs..4xl only (none/full are Tailwind's hardcoded, non-configurable values).
for (const [key, px] of Object.entries(tokens.radius)) {
    const step = key.replace("radius-", "");
    if (step === "none" || step === "full") continue;
    const varName = `--radius-${step}`;
    const raw = light.get(varName);
    if (raw === undefined) {
        record(`missing radius: ${varName} — Figma ${key} = ${px}px`);
        continue;
    }
    const remMatch = raw.match(/^([\d.]+)rem$/);
    const actualPx = remMatch ? parseFloat(remMatch[1]) * 16 : NaN;
    if (Math.abs(actualPx - px) > 0.01) {
        record(`wrong value: ${varName} is ${raw} (${actualPx}px), Figma ${key} = ${px}px`);
    }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

if (errors.length > 0) {
    console.error(`\n✗ Token parity check failed — ${errors.length} issue(s) between theme.css and tokens/figma-tokens.json:\n`);
    for (const e of errors) console.error(`  - ${e}`);
    console.error(`\nIf this is an intentional divergence (see TOKENS.md §4), update this script's exceptions.\n`);
    process.exit(1);
}

console.log("✓ theme.css matches tokens/figma-tokens.json");

function fail(msg) {
    console.error(`\n✗ ${msg}\n`);
    process.exit(1);
}
