// =====================================================================
// 💬 Community corner goods (커뮤니티 상점). Every good is used up by the
// next comment written with it (default comment colour: white).
//   kind: color | effect | font | bold | underline | anim
//   gold / pts: price · winner: only past season champions may buy it
// =====================================================================
export const COMMENT_FEE = 500;          // gold to write a comment (once per season)
export const COMMUNITY_OK = 0.6;         // the door lets 60% in
export const CM_COLORS = [
    { id: "black", name: "Black", ko: "검정", css: "#111111", gold: 200 },
    { id: "brown", name: "Brown", ko: "갈색", css: "#8b5a2b", gold: 200 },
    { id: "red", name: "Red", ko: "빨강", css: "#ef4444", gold: 1000 },
    { id: "orange", name: "Orange", ko: "주황", css: "#f97316", gold: 1000 },
    { id: "yellow", name: "Yellow", ko: "노랑", css: "#facc15", gold: 1000 },
    { id: "green", name: "Green", ko: "초록", css: "#22c55e", gold: 1000 },
    { id: "blue", name: "Blue", ko: "파랑", css: "#3b82f6", gold: 1000 },
    { id: "purple", name: "Purple", ko: "보라", css: "#a855f7", gold: 1000 },
    { id: "pink", name: "Pink", ko: "분홍", css: "#ec4899", gold: 1000 },
    { id: "rainbow", name: "Rainbow", ko: "무지개", css: "rainbow", gold: 3000 },
    { id: "goldsilver", name: "Gold & Silver", ko: "금·은", css: "goldsilver", gold: 2000 }
];
export const CM_EFFECTS = [
    { id: "twinkle", name: "Twinkle Effect", ko: "반짝이 효과", fx: ["✨", "⭐", "💫"], gold: 5000 },
    { id: "lovely", name: "Lovely Effect", ko: "하트 효과", fx: ["💖", "💕", "💗"], gold: 5000 },
    { id: "rain", name: "Rain Effect", ko: "비 효과", fx: ["💧", "🌧️", "💧"], gold: 5000 },
    { id: "snow", name: "Snow Effect", ko: "눈 효과", fx: ["❄️", "❅", "⛄"], gold: 5000 },
    { id: "winner", name: "Winner Effect", ko: "위너 효과", fx: ["🏆", "👑", "WINNER"], pts: 10, winner: true },
    { id: "fu", name: "福 Effect", ko: "福 효과", fx: ["福", "🧧", "福"], pts: 10 }
];
// 6 fonts (Google Fonts, loaded in index.html)
export const CM_FONTS = [
    { id: "f_blackhan", name: "Black Han Sans", ko: "검은고딕", css: "'Black Han Sans', sans-serif", gold: 3000 },
    { id: "f_pen", name: "Nanum Pen Script", ko: "나눔손글씨 펜", css: "'Nanum Pen Script', cursive", gold: 3000 },
    { id: "f_dohyeon", name: "Do Hyeon", ko: "도현체", css: "'Do Hyeon', sans-serif", gold: 3000 },
    { id: "f_gamja", name: "Gamja Flower", ko: "감자꽃", css: "'Gamja Flower', cursive", gold: 3000 },
    { id: "f_yeonsung", name: "Yeon Sung", ko: "연성체", css: "'Yeon Sung', cursive", gold: 3000 },
    { id: "f_poor", name: "Poor Story", ko: "서툰이야기", css: "'Poor Story', cursive", gold: 3000 }
];
export const CM_ANIMS = [
    { id: "shake", name: "떨리는 글씨", en: "Shaking Text", desc: "작성한 코멘트가 진동합니다", gold: 10000 },
    { id: "wander", name: "움직이는 글씨", en: "Wandering Text", desc: "코멘트 글자들이 이리저리 움직입니다", gold: 10000 },
    { id: "spin", name: "회전하는 글씨", en: "Spinning Text", desc: "코멘트 글자 일부가 빙글빙글 돌아갑니다", gold: 10000 },
    { id: "combo", name: "콤보 글씨", en: "Combo Text", desc: "진동하며 일부 글자가 움직이거나 빙글빙글 돌아갑니다", pts: 40 }
];
// every good as a bag item: ps.items["cm_<kind>_<id>"]
export const CM_GOODS = [
    ...CM_COLORS.map(c => ({ id: "cm_color_" + c.id, kind: "color", ref: c.id, name: `${c.name} Pen`, emoji: "🖊️", gold: c.gold, desc: `다음 코멘트를 ${c.ko}색으로 씁니다 (1회용)` })),
    ...CM_EFFECTS.map(e => ({ id: "cm_effect_" + e.id, kind: "effect", ref: e.id, name: e.name, emoji: e.fx[0], gold: e.gold, pts: e.pts, winner: !!e.winner, desc: `다음 코멘트 주변에 ${e.ko} (1회용)${e.winner ? " · 시즌 우승 전적이 있어야 살 수 있습니다" : ""}` })),
    ...CM_FONTS.map(f => ({ id: "cm_font_" + f.id, kind: "font", ref: f.id, name: `${f.name} 글씨체`, emoji: "🔤", gold: f.gold, desc: `다음 코멘트를 ${f.ko} 글씨체로 씁니다 (1회용)` })),
    { id: "cm_bold", kind: "bold", ref: "bold", name: "볼드 효과", emoji: "𝐁", gold: 2000, desc: "다음 코멘트를 굵게 씁니다 (1회용)" },
    { id: "cm_underline", kind: "underline", ref: "underline", name: "밑줄 효과", emoji: "U̲", gold: 2000, desc: "다음 코멘트에 밑줄을 긋습니다 (1회용)" },
    ...CM_ANIMS.map(a => ({ id: "cm_anim_" + a.id, kind: "anim", ref: a.id, name: a.name, emoji: "🌀", gold: a.gold, pts: a.pts, desc: `${a.desc} (1회용)` }))
];
export const CM_BY_ID = Object.fromEntries(CM_GOODS.map(g => [g.id, g]));
export const cmColor = id => CM_COLORS.find(c => c.id === id);
export const cmEffect = id => CM_EFFECTS.find(c => c.id === id);
export const cmFont = id => CM_FONTS.find(c => c.id === id);
