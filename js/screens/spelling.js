// =====================================================================
// 🐝 Spelling Bee corner (catalog.js SPELL_MAPS). Press START: a random
// word is drawn — only its length and part of speech (명사/형용사/동사)
// are shown. Spell it with alphabet cards from the bag, in order. Up to 3
// hints (each one lowers the prize). Longer / harder / fewer hints → up to
// 300,000 G. 포기 = the cards already placed are NOT returned.
// One challenge per player per round; an unfinished word stays with the
// player (it can be finished at any Spelling Bee map this round or later).
// =====================================================================
import { h, fmt } from "../core/util.js";
import { Sound } from "../core/sound.js";
import { toast, confirmBox, confetti, bigWin } from "../core/fx.js";
import { Store } from "../core/store.js";
import { cardId } from "../data/catalog.js";
import { WORDS, spellHint2, spellPrize, SPELL_MIN, SPELL_MAX } from "../data/words.js";
import * as G from "../game/season.js";
import { letterCard } from "../ui/letterCard.js";

export function spellingView(pid, loc, onChange) {
    const s = G.S(), ps = s.ps[pid];
    const wrap = h("div.spelling");
    const sp = ps.spell;
    const playedThisRound = ps.spellRound === s.round && !sp;
    const head = h("div.sb-head", h("span.sb-bee", "🐝"), h("div", h("b", "SPELLING BEE"), h("small", `알파벳권으로 단어를 완성하고 ${fmt(SPELL_MIN)}~${fmt(SPELL_MAX)} G 상금을 받으세요!`)));

    if (!sp) {
        const startBtn = h("button.btn.gold.big", { disabled: playedThisRound, onclick: start }, "▶ START");
        const giveBtn = h("button.btn.ghost.big", { disabled: true, title: "진행 중인 단어가 없습니다" }, "🏳️ 포기");
        const last = ps.spellLast;
        wrap.append(head,
            last ? h("div.sb-reveal" + (last.ok ? ".ok" : ".bad"),
                h("small", last.ok ? "🎉 정답!" : last.gaveUp ? "🏳️ 포기 — 정답 공개" : "❌ 오답 — 정답 공개"),
                h("div.sb-answer", [...last.w].map(L => letterCard(L, 40))),
                h("b", `${last.w} (${last.pos})`),
                last.ok ? h("span", `상금 +${fmt(last.prize)} G`) : last.tried ? h("span.muted", `제출한 답: ${last.tried}`) : "") : "",
            h("ul.sb-rules",
                h("li", "START를 누르면 단어의 글자 수와 품사(명사 · 형용사 · 동사)가 공개됩니다."),
                h("li", "가방의 알파벳권(알파벳 카드 포함)을 ", h("b", "순서대로"), " 넣어 단어를 완성하세요. 넣은 알파벳권은 사용됩니다."),
                h("li", "힌트는 3번까지 — 힌트를 볼 때마다 상금이 줄어듭니다."),
                h("li", "단어가 길고 어려울수록, 힌트를 안 볼수록 상금이 커집니다 (최대 ", h("b", `${fmt(SPELL_MAX)} G`), ")."),
                h("li", "틀리거나 포기하면 넣었던 알파벳권은 돌려받지 못합니다. 도전은 라운드당 1회.")),
            playedThisRound ? h("p.notice", "🐝 이번 라운드에는 이미 도전했습니다. 다음 라운드에 다시 오세요!") : "",
            h("div.row.center", startBtn, giveBtn));
        return wrap;
    }

    // ---- a word in progress
    const word = sp.w, n = word.length;
    const prize = spellPrize(word, sp.lv, sp.hints);
    const full = sp.placed.length >= n;
    const cards = Object.entries(ps.items).filter(([k, c]) => k.startsWith("card_") && c > 0).map(([k, c]) => [k.slice(5), c]).sort((a, b) => a[0].localeCompare(b[0]));
    const hints = [sp.h1, spellHint2(word), sp.h3];
    wrap.append(head,
        h("div.sb-info", h("span.sb-pos", sp.pos), h("span", `${n}글자`), h("span.sb-prize", `현재 상금 ${fmt(prize)} G`), h("small.muted", `난이도 ${["초급", "중급", "중상급"][sp.lv - 1]}`)),
        h("div.sb-slots", Array.from({ length: n }, (_, i) => h("div.sb-slot" + (sp.placed[i] ? ".on" : "") + (i === sp.placed.length ? ".next" : ""), sp.placed[i] ? letterCard(sp.placed[i], 40) : h("span", i + 1)))),
        h("div.sb-hints",
            hints.map((t, i) => i < sp.hints ? h("div.sb-hint.open", h("small", `힌트 ${i + 1}`), h("span", t))
                : h("button.sb-hint", { disabled: i !== sp.hints, onclick: () => hint() }, h("small", `힌트 ${i + 1}`), h("span", i === sp.hints ? `🔍 보기 (상금 → ${fmt(spellPrize(word, sp.lv, sp.hints + 1))} G)` : "🔒")))),
        h("h4", "🎒 내 알파벳권 — 눌러서 다음 칸에 넣기"),
        h("div.sb-tray", cards.length ? cards.map(([L, c]) => h("button.sb-card", { disabled: full, onclick: () => place(L) }, letterCard(L, 40), h("small", `×${c}`)))
            : h("p.muted", "알파벳권이 없습니다. 상점(일반 · 할인 · 포인트)에서 구하거나 ❓ 랜덤알파벳권을 써 보세요. 단어는 그대로 남아 있으니 나중에 이어서 할 수 있어요.")),
        h("div.row.center",
            h("button.btn.ghost", { disabled: !sp.placed.length, onclick: undo }, "⌫ 한 칸 빼기"),
            h("button.btn.gold.big", { disabled: !full, onclick: submit }, "✅ 제출"),
            h("button.btn.red", { onclick: giveUp }, "🏳️ 포기")));
    return wrap;

    function start() {
        if (ps.spell || ps.spellRound === s.round) return;
        ps.spellLast = null;
        const w = WORDS[Math.floor(Math.random() * WORDS.length)];
        ps.spell = { w: w.w, pos: w.pos, lv: w.lv, h1: w.h1, h3: w.h3, hints: 0, placed: [], round: s.round, loc: loc?.id };
        ps.spellRound = s.round;
        G.log(`🐝 ${G.name(pid)} Spelling Bee 도전 시작 (${w.w.length}글자 ${w.pos})`);
        Store.saveSeason();
        Sound.bonus();
        onChange();
    }
    function hint() {
        if (sp.hints >= 3) return;
        sp.hints++;
        Sound.click();
        Store.saveSeason();
        onChange();
    }
    function place(L) {
        if (sp.placed.length >= n || !(ps.items[cardId(L)] > 0)) return;
        ps.items[cardId(L)]--;
        sp.placed.push(L);
        Sound.tick();
        Store.saveSeason();
        onChange();
    }
    function undo() {
        const L = sp.placed.pop();
        if (!L) return;
        ps.items[cardId(L)] = (ps.items[cardId(L)] || 0) + 1;
        Store.saveSeason();
        onChange();
    }
    async function submit() {
        if (sp.placed.length < n) return;
        const ok = sp.placed.join("") === word;
        if (!(await confirmBox(`${sp.placed.join(" ")}\n이 단어로 제출할까요?${ok ? "" : "\n(틀리면 넣은 알파벳권은 돌려받지 못합니다)"}`, "제출", "취소"))) return;
        ps.spell = null;
        ps.spellLast = { w: word, pos: sp.pos, ok, prize: ok ? prize : 0, tried: sp.placed.join("") };
        if (ok && s.turn?.pid === pid) s.turn.stats.spellOk = true; // "Spelling Bee 성공" missions
        if (ok) {
            ps.money += prize;
            G.log(`🐝 ${G.name(pid)} Spelling Bee 정답! ${word} (+${prize.toLocaleString()}G · 힌트 ${sp.hints}개)`);
            Store.saveSeason(true);
            confetti(80, ["🐝", "🍯", "✨", "🪙"]);
            await bigWin(prize, SPELL_MIN / 10, { title: `🐝 ${word}!` });
        } else {
            G.log(`🐝 ${G.name(pid)} Spelling Bee 오답… (정답 ${word})`);
            Store.saveSeason(true);
            Sound.lose();
            toast(`❌ 오답! 정답은 ${word} 였습니다`, "warn", 4500);
        }
        onChange();
    }
    async function giveUp() {
        if (!(await confirmBox(`정말 포기할까요?\n넣었던 알파벳권 ${sp.placed.length}장은 돌려받지 못합니다.\n(포기하면 정답이 공개됩니다)`, "포기하기", "계속하기"))) return;
        ps.spell = null;
        ps.spellLast = { w: word, pos: sp.pos, ok: false, gaveUp: true };
        G.log(`🐝 ${G.name(pid)} Spelling Bee 포기 (정답 ${word})`);
        Store.saveSeason(true);
        toast(`🏳️ 포기했습니다. 정답은 ${word}`, "info", 4500);
        onChange();
    }
}
