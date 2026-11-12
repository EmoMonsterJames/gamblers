// =====================================================================
// The 7 "special" machines. They run on js/slots/specialEngine.js
// (engine: "sp_*") and are animated by js/screens/slotSpecial.js.
// Every machine follows the same rules as the others: feature-first
// bonus decisions (features.*.p, raised by pet luck), teasing reels,
// P icons, progressive pools via Store.contribute / hitJackpot.
// px scales every cash prize except jackpots (calibrated by simulation).
// =====================================================================
const CARDS = {
    A: { e: "A", card: true, pay: [0.1, 0.25, 0.6] }, K: { e: "K", card: true, pay: [0.1, 0.25, 0.6] },
    Q: { e: "Q", card: true, pay: [0.08, 0.2, 0.5] }, J: { e: "J", card: true, pay: [0.08, 0.2, 0.5] },
    T: { e: "10", card: true, pay: [0.06, 0.15, 0.4] }
};
const CARD_W = { A: 6, K: 6, Q: 6.5, J: 6.5, T: 7 };
const digits = (pre, cls, name) => Object.fromEntries(Array.from({ length: 10 }, (_, d) => [pre + d, { e: String(d), cls, name: `${name} ${d}` }]));

export const SPECIAL_SLOTS = [
    // ------------------------------------------------ Monster Kitchen (cluster cascade)
    {
        id: "monster_kitchen", name: "Monster Kitchen", brand: "IPEX", engine: "sp_kitchen", progressive: false, jp: null,
        bets: [100, 300, 500, 1000], reels: 6, rows: 5, maxX: 5000, px: 5.8,
        desc: "괴수들이 운영하는 철판 포장마차! 같은 재료 5개 이상이 붙으면(클러스터) 요리 완성 → 터지고 위에서 새 재료가 떨어진다(캐스케이드). 🔥 고질라 그릴 플레어 = 날재료가 골든 고메로! · 🦖 타이탄 미터 가득 = 램페이지(낮은 재료 박살 + 2x2/3x3 거대 WILD) · ⭐ 미슐랭 3개 = 푸드 크리틱 보스 배틀 · 🏮 3개 = 8 무료스핀",
        jpText: "🍳 CLUSTER PAYS · CASCADE · TITAN RAMPAGE · FOOD CRITIC BOSS · 8 FREE SPINS",
        theme: { bg: "linear-gradient(180deg,#f97316 0%,#7c2d12 55%,#1c0a02 100%)", accent: "#fde047", glow: "#fb923c", font: "'Lilita One', sans-serif" },
        syms: {
            GG: { e: "🍱", name: "Golden Gourmet", cls: "sym-gold", pay: [1, 1.5, 2, 3, 4, 6, 12, 25] },
            H1: { e: "🍣", name: "Sushi", pay: [0.5, 0.75, 1, 1.5, 2, 3, 6, 12] },
            H2: { e: "🍜", name: "Ramen", pay: [0.4, 0.6, 0.8, 1.2, 1.6, 2.4, 5, 10] },
            H3: { e: "🐙", name: "Takoyaki", pay: [0.3, 0.45, 0.6, 0.9, 1.2, 1.8, 4, 8] },
            H4: { e: "🍤", name: "Tempura", pay: [0.25, 0.35, 0.5, 0.75, 1, 1.5, 3, 6] },
            L1: { e: "🥚", name: "Raw Egg", raw: true, pay: [0.1, 0.15, 0.2, 0.3, 0.4, 0.6, 1.2, 2.5] },
            L2: { e: "🦐", name: "Raw Shrimp", raw: true, pay: [0.1, 0.15, 0.2, 0.3, 0.4, 0.6, 1.2, 2.5] },
            L3: { e: "🥬", name: "Cabbage", raw: true, pay: [0.08, 0.12, 0.16, 0.25, 0.35, 0.5, 1, 2] },
            L4: { e: "🍄", name: "Mushroom", raw: true, pay: [0.08, 0.12, 0.16, 0.25, 0.35, 0.5, 1, 2] }
        },
        look: { W: { e: "👹", name: "KAIJU WILD" }, F: { e: "🏮", name: "Free Spins Lantern" }, MS: { e: "⭐", name: "Michelin Star", cls: "sym-gold" } },
        w: { H1: 5, H2: 6, H3: 7, H4: 8, L1: 13, L2: 13, L3: 14, L4: 14, W: 1.1 },
        titanMax: 25,
        features: {
            flare: { p: 0.07, pFree: 0.3 },
            boss: { p: 0.0025, sym: true },
            free: { p: 0.005, spins: 8 }
        },
        bgm: "kitchen_taiko",
        omens: [{ fx: "smoke" }, { fx: "text", text: "CoOoOoOokin' HoOoOoOot!!!!!" }],
        tests: [["free", "🏮 8 무료스핀"], ["boss", "⭐ 푸드 크리틱 보스"], ["flare", "🔥 그릴 플레어"], ["rampage", "🦖 램페이지"]]
    },

    // ------------------------------------------------ DJ Crypto (5x3 ways)
    {
        id: "dj_crypto", name: "DJ Crypto", brand: "Rabbit-Gaming", engine: "sp_dj", progressive: false, jp: null,
        bets: [100, 200, 300, 500, 800, 1000], reels: 5, rows: 3, maxX: 5000, px: 1.987,
        desc: "카타콤 속 네온 고딕 EDM 페스티벌! 🔊 서브우퍼가 떨어지면 BASS DROP — 심볼이 튕겨 재배치돼 무조건 당첨 · 💿 VINYL SCRATCH — 해골 DJ 손이 릴을 긁어 x2~x5 스티키 와일드 릴 + 2 리스핀 · 🎫 VIP 팔찌 3개 = VIP CROWD SURF 10 무료스핀 (DJ가 오른쪽 무대까지 서핑하며 야광봉 배수 투하). 243 WAYS.",
        jpText: "🔊 BASS DROP · 💿 VINYL SCRATCH WILDS x2~x5 · 🎫 VIP CROWD SURF 10 FREE SPINS",
        theme: { bg: "linear-gradient(180deg,#4c1d95 0%,#1e1b4b 50%,#020617 100%)", accent: "#22d3ee", glow: "#e879f9", font: "'Lilita One', sans-serif" },
        syms: {
            ...CARDS,
            H1: { e: "💀", name: "Skeleton DJ", pay: [0.6, 2, 6] }, H2: { e: "🧛", name: "Vampire", pay: [0.5, 1.5, 4] },
            H3: { e: "🎧", name: "Headphones", pay: [0.4, 1.2, 3] }, L1: { e: "🎵", name: "Note", pay: [0.25, 0.6, 1.6] }, L2: { e: "💿", name: "Vinyl", pay: [0.2, 0.5, 1.3] }
        },
        look: { W: { e: "🎛️", name: "MIXER WILD" }, F: { e: "🎫", name: "VIP Wristband" }, SW: { e: "🔊", name: "Subwoofer" } },
        w: { ...CARD_W, H1: 3, H2: 3.5, H3: 4, L1: 5, L2: 5.5, W: [0, 3, 3, 3, 0] },
        features: {
            bass: { p: 0.03 },
            scratch: { p: 0.02, respins: 2 },
            free: { p: 0.006, spins: 10 }
        },
        bgm: "synthwave",
        omens: [{ fx: "notes" }, { fx: "shake", text: "⚠️ Crypto Withdrawal Warning!!!!! ⚠️" }, { fx: "turntable" }],
        tests: [["free", "🎫 VIP CROWD SURF"], ["bass", "🔊 BASS DROP"], ["scratch", "💿 VINYL SCRATCH"]]
    },

    // ------------------------------------------------ Sol & Umbra (digit orbs)
    {
        id: "sol_umbra", name: "Sol & Umbra: Eclipse of the Gods", brand: "BLK", engine: "sp_orb", progressive: true, linearGate: true,
        bets: [100, 200, 300, 500, 800, 1000], reels: 5, rows: 4, maxX: 5000, px: 0.56,
        desc: "태양신 솔과 달의 여신 움브라의 스테인드글라스 전쟁! 숫자(0~9)가 적힌 별빛 오브가 가로로 붙으면 숫자가 이어져 큰 상금이 된다 (4 옆에 8 = 48). ☀️ 3개+ = SOL 8 무료스핀 (오브 고정 + 태양 화살이 맨 앞 숫자에 +1/+2 → 48이 148/248로!) · 🌙 3개+ = UMBRA 5x8 이클립스 1 스핀 (오브 홍수 + 중력 자석) · ☀️🌙 섞어서 5개+ = TOTAL ECLIPSE 5x8 락&리스핀, 40칸을 모두 채우면 CELESTIAL GRAND!",
        theme: { bg: "linear-gradient(180deg,#f59e0b 0%,#7c2d12 30%,#1e1b4b 70%,#020617 100%)", accent: "#fde68a", glow: "#a5b4fc", font: "'Rye', serif" },
        syms: {
            ...CARDS,
            H1: { e: "🔱", name: "Sun Spear", pay: [0.6, 2, 6] }, H2: { e: "🪞", name: "Moon Mirror", pay: [0.5, 1.5, 4] },
            H3: { e: "🦉", name: "Night Owl", pay: [0.4, 1.2, 3] }, L1: { e: "💠", name: "Glass", pay: [0.25, 0.6, 1.6] }, L2: { e: "🔷", name: "Prism", pay: [0.2, 0.5, 1.3] }
        },
        look: { ...digits("O", "orb", "Starlight Orb"), OJ: { e: "🌟", cls: "orb.orbjp", name: "Jackpot Orb" }, W: { e: "🌗", name: "ECLIPSE WILD" }, SU: { e: "☀️", name: "Sun Scatter" }, MO: { e: "🌙", name: "Moon Scatter" } },
        w: { ...CARD_W, H1: 3, H2: 3.5, H3: 4, L1: 5, L2: 5.5, W: [0, 3, 3, 3, 0] },
        orb: { base: 0.07, sol: 0.1, umbra: 0.5, eclipseLand: 0.075, jpOrb: 0.008, digitK: 0.01 },
        jp: { MINI: { x: 10 }, MINOR: { x: 25 }, MAXI: { x: 100 }, MAJOR: { seed: 50000, rate: 0.01 }, GRAND: { seed: 500000, rate: 0.02, cap: 2000000 } },
        features: {
            sol: { p: 0.006, spins: 8 },
            umbra: { p: 0.004 },
            eclipse: { p: 0.0012, spins: 5 }
        },
        bgm: "celestial_brass",
        omens: [{ fx: "sun" }, { fx: "moon" }, { fx: "sunmoon" }],
        tests: [["sol", "☀️ SOL 무료스핀"], ["umbra", "🌙 UMBRA 이클립스 스핀"], ["eclipse", "🌗 TOTAL ECLIPSE"], ["eclipse:full", "🌗 TOTAL ECLIPSE (가득 채우기)"]]
    },

    // ------------------------------------------------ Neon Space Cadets (digit pods)
    {
        id: "neon_cadets", name: "Neon Space Cadets", brand: "Rabbit-Gaming", engine: "sp_pod", progressive: true, linearGate: true,
        bets: [500, 800, 1000, 2000, 3000, 5000], reels: 5, rows: 4, maxX: 5000, px: 0.84,
        desc: "우주복 입은 햄스터들의 네온 우주정거장! 숫자 스타시드 포드가 가로로 붙으면 레이저로 융합 (4·8 = 48). 🚀 로켓 부스터가 위로 쏘아 올라 포드 숫자를 업그레이드 · 🌀 ZERO-GRAVITY SHUFFLE (꽝 스핀이 당첨으로 재배치) · 🎡 로켓이 맨 윗줄 포드까지 올리면 COSMIC WHEEL 잭팟 · 🔵 3개+ = ORBIT LOCK 7 무료스핀 (포드 고정·합체) · 🩷 3개+ = HYPER-DRIVE 5x8 메가 스핀 · 🔵🩷 5개+ = SUPERNOVA (5x8, 2x 운석) · MEGA HAMSTER = 모든 잭팟 합산!",
        theme: { bg: "linear-gradient(180deg,#0e7490 0%,#312e81 45%,#0b0221 100%)", accent: "#f0abfc", glow: "#22d3ee", font: "'Lilita One', sans-serif" },
        syms: {
            ...CARDS,
            H1: { e: "🐹", name: "Cadet Hamster", pay: [0.6, 2, 6] }, H2: { e: "🛰️", name: "Space Station", pay: [0.5, 1.5, 4] },
            H3: { e: "🛸", name: "Saucer", pay: [0.4, 1.2, 3] }, L1: { e: "🌻", name: "Sunflower Seed", pay: [0.25, 0.6, 1.6] }, L2: { e: "🧀", name: "Space Cheese", pay: [0.2, 0.5, 1.3] }
        },
        look: { ...digits("D", "orb.pod", "Star-Seed Pod"), DJ: { e: "🌟", cls: "orb.pod.orbjp", name: "Jackpot Pod" }, W: { e: "🌌", name: "NEON WILD" }, SB: { e: "🔵", name: "Blue Cadet Scatter" }, SK: { e: "🩷", name: "Pink Cadet Scatter" }, RB: { e: "🚀", name: "Rocket Booster" } },
        w: { ...CARD_W, H1: 3, H2: 3.5, H3: 4, L1: 5, L2: 5.5, W: [0, 3, 3, 3, 0] },
        orb: { base: 0.07, sol: 0.1, umbra: 0.45, eclipseLand: 0.075, jpOrb: 0.008, digitK: 0.01, rocket: 0.05 },
        jp: { MINI: { x: 10 }, MINOR: { x: 25 }, MAXI: { x: 100 }, MAJOR: { seed: 150000, rate: 0.01 }, GRAND: { seed: 1500000, rate: 0.02, cap: 5000000 }, MEGA: { sum: true } },
        features: {
            zerog: { p: 0.06 },
            wheel: { p: 0.0025, seg: ["MINI", "MINOR", "MINI", "MAJOR", "MINI", "MINOR", "GRAND", "MINI", "MINOR", "MEGA"], w: [22, 12, 22, 3, 22, 12, 0.5, 22, 12, 0.04] },
            orbit: { p: 0.005, spins: 7 },
            hyper: { p: 0.004 },
            supernova: { p: 0.001, spins: 5 }
        },
        bgm: "synthwave",
        omens: [{ fx: "hamsters" }, { fx: "meteors" }, { fx: "explosion" }],
        tests: [["orbit", "🔵 ORBIT LOCK 무료스핀"], ["hyper", "🩷 HYPER-DRIVE"], ["supernova", "💥 SUPERNOVA"], ["supernova:full", "💥 SUPERNOVA (MEGA 테스트)"], ["wheel", "🎡 COSMIC WHEEL"], ["zerog", "🌀 ZERO-G SHUFFLE"]]
    },

    // ------------------------------------------------ 4 Pillars (사주 4x2)
    {
        id: "four_pillars", name: "4 Pillars", brand: "DAEBAK", engine: "sp_pillars", progressive: true, linearGate: true,
        bets: [100, 200, 500, 1000, 1200, 1500], reels: 4, rows: 2, maxX: 5000, px: 0.5,
        desc: "사주의 네 기둥(년·월·일·시), 위는 천간 아래는 지지! 오방색 오행 글자: 木(청) < 火(적) < 土(황) < 金(백) < 水(흑). 🔄 상생 캐스케이드 — 당첨 글자가 다음 오행으로 진화 (木→火→土→金→水→木) · ⚡ 합충 — 꽝 스핀에 두 기둥이 빛나 합(2x2 메가 기둥) 또는 충(낮은 심볼 박살 + x2~x10) · ☯️ 용신 — 당첨마다 오행 게이지가 차고, 4색이 차면 빠진 5번째 오행으로 10 무료스핀 (그 색 = 확장 스티키 와일드) · 印 운명의 도장 4개 = 대운 홀드앤스핀 (4x5, 기둥 완성 x5, 4기둥 = GRAND). 16 WAYS.",
        theme: { bg: "linear-gradient(180deg,#1e1b4b 0%,#3b0764 40%,#0a0a0a 100%)", accent: "#facc15", glow: "#ef4444", font: "'Noto Sans KR', sans-serif" },
        syms: {
            E1: { e: "木", name: "Wood 木", cls: "el-wood", pay: [0.5, 1.5] },
            E2: { e: "火", name: "Fire 火", cls: "el-fire", pay: [0.7, 2.2] },
            E3: { e: "土", name: "Earth 土", cls: "el-earth", pay: [1, 3.2] },
            E4: { e: "金", name: "Metal 金", cls: "el-metal", pay: [1.5, 4.5] },
            E5: { e: "水", name: "Water 水", cls: "el-water", pay: [2.2, 7] },
            L1: { e: "子", name: "Rat 子", cls: "el-low", pay: [0.2, 0.5] },
            L2: { e: "午", name: "Horse 午", cls: "el-low", pay: [0.2, 0.5] },
            L3: { e: "酉", name: "Rooster 酉", cls: "el-low", pay: [0.15, 0.4] }
        },
        look: { W: { e: "☯️", name: "TAEGEUK WILD" }, DS: { e: "印", name: "Destiny Seal", cls: "el-seal" } },
        w: { E1: 6, E2: 5.5, E3: 5, E4: 4, E5: 3, L1: 9, L2: 9, L3: 10, W: [0, 1.6, 1.6, 0] },
        yong: { max: 8 },
        features: {
            hap: { p: 0.04 },
            yong: {},
            daeun: { p: 0.005, sym: true }
        },
        jp: { MINI: { x: 10 }, MINOR: { x: 25 }, MAXI: { x: 100 }, MAJOR: { seed: 30000, rate: 0.01 }, GRAND: { seed: 400000, rate: 0.02, cap: 1500000 } },
        bgm: "tropical_steel",
        omens: [{ fx: "elements", text: "🍀 Lucky has arrived 🍀" }, { fx: "wind" , chars: ["🍃", "🌫️", "〰️"] }, { fx: "shake", text: "글자가 갑자기 부서진다…!" }],
        tests: [["daeun", "印 대운 홀드앤스핀"], ["daeun:full", "印 대운 (4기둥 GRAND 테스트)"], ["yong", "☯️ 용신 무료스핀"], ["hap", "⚡ 합충 (꽝 스핀에서)"]]
    },

    // ------------------------------------------------ Gift (party, 10 gift boxes)
    {
        id: "gift", name: "Gift", brand: "HYHG GAMING", engine: "sp_gift", progressive: true, linearGate: true,
        bets: [200, 400, 600, 800, 1000], reels: 5, rows: 3, maxX: 5000, px: 1.22,
        desc: "파티장에 놓인 선물상자 10개! 🎁 선물 보너스 = TOP OFFER (금색 상자를 뺀 상자 중 랜덤 제안 최대 3번, 수락/거절) · ❓ 가운데 금색 상자가 터지면 홀드앤스핀(코인 6개, 🎁코인 = 전부 COLLECT, JACKPOT 코인 = MINI~GRAND) / 휠(무료스핀 8·10·20, MINI, MINOR, 3~5배) / WILD 뿌리기(5개 이상) 중 하나 · 🍕 파티 음식 스캐터 3개 = 8 무료스핀 · 🎈 풍선 3개 = 풍선 터뜨리기 MATCH 3 잭팟. 243 WAYS.",
        theme: { bg: "linear-gradient(180deg,#db2777 0%,#7e22ce 50%,#1e0533 100%)", accent: "#fde047", glow: "#f472b6", font: "'Lilita One', sans-serif" },
        syms: {
            ...CARDS,
            H1: { e: "🎂", name: "Cake", pay: [0.6, 2, 6] }, H2: { e: "🍾", name: "Champagne", pay: [0.5, 1.5, 4] },
            H3: { e: "🎉", name: "Party Popper", pay: [0.4, 1.2, 3] }, L1: { e: "🍬", name: "Candy", pay: [0.25, 0.6, 1.6] }, L2: { e: "🧁", name: "Cupcake", pay: [0.2, 0.5, 1.3] }
        },
        look: { W: { e: "🎁", name: "GIFT WILD" }, F: { e: "🍕", name: "Party Food Scatter" }, BL: { e: "🎈", name: "Balloon" }, GC: { e: "🪙", name: "Coin" } },
        w: { ...CARD_W, H1: 3, H2: 3.5, H3: 4, L1: 5, L2: 5.5, W: [0, 3, 3, 3, 0] },
        boxes: ["MINI", "x5", "MINOR", "x10", "?", "x20", "MAJOR", "x3", "GRAND", "x50"],
        offerW: { x3: 30, x5: 30, x10: 18, MINI: 12, x20: 6, MINOR: 3, x50: 0.8, MAJOR: 0.25, GRAND: 0.02 },
        jp: { MINI: { x: 10 }, MINOR: { x: 25 }, MAJOR: { seed: 40000, rate: 0.012 }, GRAND: { seed: 500000, rate: 0.02, cap: 2000000 } },
        features: {
            offer: { p: 0.004 },
            gold: { p: 0.006, w: { hold: 40, wheel: 35, wild: 25 } },
            free: { p: 0.007, spins: 8 },
            balloon: { p: 0.004, tw: { MINI: 55, MINOR: 30, MAJOR: 12, GRAND: 0.3 } }
        },
        bgm: "monkey_funk",
        omens: [{ fx: "text", text: "🍀 Lucky has arrived 🍀" }, { fx: "shake" }, { fx: "rain", chars: ["🎁", "🎀", "🎁"] }, { fx: "horn" }, { fx: "balloons" }],
        tests: [["offer", "🎁 TOP OFFER"], ["gold:hold", "❓ 금색 상자 → 홀드앤스핀"], ["gold:wheel", "❓ 금색 상자 → 휠"], ["gold:wild", "❓ 금색 상자 → WILD 뿌리기"], ["free", "🍕 8 무료스핀"], ["balloon", "🎈 풍선 MATCH 3"]]
    },

    // ------------------------------------------------ Chrono-Heist (3x3 vault dial)
    {
        id: "chrono_heist", name: "Chrono-Heist: The Time-Loop Vault", brand: "Scrooge-Slots", engine: "sp_heist", progressive: true, linearGate: true,
        bets: [300, 500, 800, 1000, 1500, 2000], reels: 3, rows: 3, maxX: 3000, px: 2.167,
        desc: "시간여행 도둑단의 레트로 퓨처 금고털이! 3x3 금고 다이얼이 시계·반시계로 돌아가며, 심볼이 맞춰지면 레이저 빔이 잠긴다 (가로3·세로3·대각2 = 8라인). ⏪ REWIND GLITCH — 꽝 스핀 후 기계가 떨리며 직전 3스핀을 거꾸로 되감고 낮은 심볼을 WILD로 바꿔 강제 당첨 · 📘 설계도 3개 = LASER GRID BREACH (박물관 지도에서 노드를 눌러 레이저 해제, 패러독스 알람을 피해 배수 수집 — 모든 노드 해제 시 TIME VAULT 잭팟!) · 🌀 포털 3개 = TIME-LOOP 5 무료스핀 (당첨이 얼어붙고, 마지막에 루프 배수로 한꺼번에 재생).",
        theme: { bg: "linear-gradient(180deg,#0f172a 0%,#1e3a8a 40%,#020617 100%)", accent: "#38bdf8", glow: "#f472b6", font: "'Lilita One', sans-serif" },
        syms: {
            H1: { e: "💎", name: "Diamond", pay: [5] }, H2: { e: "👑", name: "Crown", pay: [3] }, H3: { e: "⌚", name: "Chrono Watch", pay: [2] },
            L1: { e: "🔑", name: "Key", pay: [1] }, L2: { e: "💵", name: "Cash", pay: [0.8] }, L3: { e: "🧲", name: "Magnet", pay: [0.6] }
        },
        look: { W: { e: "⏳", name: "TIME WILD" }, BP: { e: "📘", name: "Blueprint" }, F: { e: "🌀", name: "Time Portal" } },
        w: { H1: 2, H2: 3, H3: 4, L1: 6, L2: 7, L3: 8, W: 1.2 },
        jp: { MINI: { x: 10 }, MINOR: { x: 25 }, MAXI: { x: 100 }, MAJOR: { seed: 80000, rate: 0.01 }, GRAND: { seed: 800000, rate: 0.015, cap: 3000000 }, VAULT: { seed: 3000000, rate: 0.008, cap: 10000000 } },
        features: {
            rewind: { p: 0.06 },
            laser: { p: 0.005, nodes: 16, alarms: 3, mult: [[1, 30], [2, 28], [3, 18], [5, 12], [10, 5], ["MINI", 4], ["MINOR", 2], ["MAJOR", 0.3]] },
            loop: { p: 0.005, spins: 5 }
        },
        bgm: "bigband_swing",
        omens: [{ fx: "shake", text: "🔐 VAULT SHAKING…" }, { fx: "siren" }, { fx: "rain", chars: ["🪙", "💰", "🪙"] }],
        tests: [["laser", "📘 LASER GRID BREACH"], ["laser:vault", "📘 LASER (TIME VAULT 테스트)"], ["loop", "🌀 TIME-LOOP 무료스핀"], ["rewind", "⏪ REWIND GLITCH"]]
    }
];
