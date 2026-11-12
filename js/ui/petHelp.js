// "Your pet helped!" — shown when pet luck turned a losing spin into a win
// (win) or raised a bonus / jackpot trigger (bonus). The credit goes to the
// pet or the pet effect, weighted by how much each one adds:
//   win   → every pet / effect counts (boost %)
//   bonus → only SPECIAL pets / effects count (they are the only bonus boosts)
import { h, fmt } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { petView } from "./profile.js";

export function petCredit(luck, what) {
    const list = (luck?.sources || []).filter(s => what === "bonus" ? s.special : true);
    if (!list.length) return null;
    let r = Math.random() * list.reduce((a, s) => a + s.boost, 0);
    for (const s of list) if ((r -= s.boost) <= 0) return s;
    return list[list.length - 1];
}

const MSG = {
    win: [
        (who, g) => `${who} 덕분에 꽝이 당첨으로 바뀌었어요!${g}`,
        (who, g) => `${who}이(가) 돈을 따도록 도와줬어요!${g}`,
        (who, g) => `${who}의 행운이 통했어요!${g}`
    ],
    bonus: [
        (who) => `${who}이(가) 보너스를 터뜨려 줬어요!`,
        (who) => `${who}의 특수 능력으로 보너스 발동!`,
        (who) => `${who}이(가) 보너스를 불러왔어요!`
    ]
};

let stack = null;
// luck: ctx.luck (season luckOf) · what: "win" | "bonus" · amount: gold won
export function showPetHelp(luck, what, amount = 0) {
    const credit = petCredit(luck, what);
    if (!credit) return null;
    const label = `${credit.kind === "pet" ? (credit.special ? "특수펫" : "펫") : (credit.special ? "특수 펫효과" : "펫효과")} '${credit.name}'`;
    const gold = amount > 0 ? ` +${fmt(amount)} G` : "";
    const lines = MSG[what] || MSG.win;
    const text = lines[Math.floor(Math.random() * lines.length)](label, gold);
    if (!stack || !stack.isConnected) { stack = h("div.pethelp-stack"); document.body.append(stack); }
    const card = h("div.pethelp" + (what === "bonus" ? ".bonus" : "") + (credit.special ? ".special" : ""),
        h("div.ph-pet", luck.pet ? petView(luck.pet, credit.kind === "fx" ? luck.petEffect : null, 54) : h("span", credit.emoji)),
        h("div.ph-text",
            h("small", what === "bonus" ? "🐾 펫 도움 · 보너스" : "🐾 펫 도움 · 당첨"),
            h("b", text),
            h("small.muted", `${credit.kind === "pet" ? "펫" : "펫효과"} +${Math.round(credit.boost * 10) / 10}%${credit.special ? " · 승률 + 보너스 확률" : " · 승률"}`)));
    stack.append(card);
    try { what === "bonus" ? Sound.bonus() : Sound.coin(); } catch { /* sound off */ }
    setTimeout(() => card.classList.add("out"), what === "bonus" ? 4200 : 3200);
    setTimeout(() => card.remove(), what === "bonus" ? 4700 : 3700);
    return credit;
}
