// "Who hit the big one here?" — MAXI+ jackpot winners per slot, top-prize
// winners per casino game. Opened from the 🏆 button in each game screen.
import { h, fmt } from "../core/util.js";
import { modal } from "../core/fx.js";
import { Store } from "../core/store.js";
import { avatar, displayName } from "./profile.js";

export function jackpotButton(gameId, gameName) {
    return h("button.btn.ghost.small.jp-btn", { title: "잭팟 수령자", onclick: () => showJackpotWinners(gameId, gameName) }, "🏆");
}

export function showJackpotWinners(gameId, gameName) {
    const rows = Store.jackpotWinners(gameId);
    modal(rows.length
        ? h("div.jpw-list", rows.map(r => {
            const p = Store.player(r.playerId);
            return h("div.jpw-row",
                avatar(r.playerId, 46, { effect: false }),
                h("div.jpw-who", h("b", p ? displayName(p) : `#${r.playerId}`), h("small", r.season ? `SEASON ${r.season}` : "")),
                h("span.jpw-tier.t-" + String(r.tier).toLowerCase(), r.tier),
                h("b.jpw-amt", fmt(r.amount) + " G"),
                h("small.muted", r.at ? new Date(r.at).toLocaleDateString() : ""));
        }))
        : h("p.muted.center", "아직 MAXI 이상 잭팟 수령자가 없습니다."),
        { title: `🏆 ${gameName} 잭팟 수령자` });
}
