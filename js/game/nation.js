// ================================================================ 🌍 nationality · 귀화 (Naturalized) · 🪪 영주권
//   • "Ground Town (Naturalized)" = a naturalized citizen of Ground Town — treated exactly like "Ground Town"
//     (country maps, home corners, prices, 같은 국가 intimacy …)
//   • 영주권 (permanent residency) — Store.residency = { pid: [country, …] } (settings row "residency"):
//     a resident may enter that country's nationality maps, and gets +1 intimacy with players from that country
import { Store } from "../core/store.js";
import { COUNTRIES } from "../data/catalog.js";

export const NAT_SUFFIX = " (Naturalized)";
export const NATURALIZED = COUNTRIES.map(c => c + NAT_SUFFIX);
export const COUNTRY_CHOICES = [...COUNTRIES, ...NATURALIZED];
const key = c => String(c || "").toLowerCase().replace(/\(\s*naturalized\s*\)/, "").replace(/[^a-z]/g, "").replace(/^emworld$/, "emoworld");
export const countryKey = key;
// "Ground Town (Naturalized)" → "Ground Town"
export const baseCountry = c => COUNTRIES.find(x => key(x) === key(c)) || String(c || "").replace(/\s*\(\s*naturalized\s*\)\s*/i, "").trim();
export const sameNation = (a, b) => !!key(a) && key(a) === key(b);
export const isNaturalized = c => /\(\s*naturalized\s*\)/i.test(String(c || ""));
const pl = p => (p && typeof p === "object" ? p : Store.player(p));
// citizen (born there or naturalized)
export const citizenOf = (p, c) => sameNation(pl(p)?.country, c);
export const residencyOf = p => { const id = pl(p)?.id ?? p; return (Store.residency?.[id] || []).filter(Boolean); };
export const hasResidency = (p, c) => residencyOf(p).some(x => sameNation(x, c));
// may use that country's nationality-only maps / shops (citizen · naturalized · 영주권자)
export const belongsTo = (p, c) => citizenOf(p, c) || hasResidency(p, c);
export function setResidency(pid, list) {
    Store.residency ||= {};
    const clean = [...new Set((list || []).map(baseCountry).filter(Boolean))];
    if (clean.length) Store.residency[pid] = clean; else delete Store.residency[pid];
    return Store.saveKey("residency");
}
// "Ground Town (Naturalized) · 🪪 영주권: Polynesia"
export const nationText = p => { const P = pl(p); if (!P) return "-"; const r = residencyOf(P); return `${P.country || "-"}${r.length ? ` · 🪪 영주권: ${r.join(", ")}` : ""}`; };
