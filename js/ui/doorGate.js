// 🚪 A corner with a random door (Monster Gotcha · 커뮤니티): the player presses 입장하기,
// the bouncer decides (approved / refused, once per round), and only then the corner opens.
//   doorGate({ name, emoji, chance, state, roll, refusedText, inside })
//     state() → null (not tried this round) | true | false · roll() → true | false (decides + saves)
//     inside() → the corner itself, built once the player is let in
import { h, sleep, put } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { confetti } from "../core/fx.js";

export function doorGate({ name, emoji = "🚪", chance = 60, state, roll, refusedText = "", inside }) {
    const wrap = h("div.door-gate");
    const refused = () => h("div.entry-check.no", h("div.bouncer", "🙅"), h("h2", `${name} 입장 거절!`),
        h("p", `이번 라운드에는 ${name} 문이 열리지 않았습니다 (입장 확률 ${chance}%). 다음 라운드에 다시 오세요.`), refusedText ? h("small.muted", refusedText) : null);
    const show = () => {
        const st = state();
        if (st === true) return put(wrap, inside());
        if (st === false) return put(wrap, refused());
        const btn = h("button.btn.gold.huge", { onclick: async () => {
            btn.disabled = true;
            put(wrap, h("div.entry-check.wait", h("div.bouncer.dg-think", "🕴️"), h("h2", "입장 심사 중…"), h("p.muted", "문지기가 들여보내 줄지 고민하고 있습니다")));
            await sleep(1400);
            const ok = roll();
            if (!ok) { Sound.lose(); put(wrap, refused()); return; }
            Sound.coin(); confetti(18, ["✨", "🎉"]);
            put(wrap, h("div.entry-check.yes", h("div.bouncer", "🙆"), h("h2", `${name} 입장 승인!`), h("p.muted", "안으로 들어갑니다…")));
            await sleep(900);
            show();
        } }, "🚪 입장하기");
        put(wrap, h("div.entry-check", h("div.bouncer", emoji), h("h2", name), h("p", `문지기가 입장을 심사합니다 — 승인 ${chance}% · 거절 ${100 - chance}% (라운드마다 1번)`), btn));
    };
    show();
    return wrap;
}
