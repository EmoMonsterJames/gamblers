// =====================================================================
// 🐝 Spelling Bee words. pos: 명사 | 형용사 | 동사 · lv: 1 초급 · 2 중급 · 3 중상급
// h1 = first hint (wide), h3 = third hint (narrow). The second hint is made
// on the fly: one letter and its position (spellHint2).
// Add words freely — upper-case A~Z only.
// =====================================================================
export const WORDS = [
    // ---- 초급
    { w: "GO", pos: "동사", lv: 1, h1: "앞으로 나아가다, 이동하다", h3: "STOP의 반대말" },
    { w: "CAT", pos: "명사", lv: 1, h1: "야옹 하고 우는 동물", h3: "쥐를 잘 잡는 반려동물" },
    { w: "DOG", pos: "명사", lv: 1, h1: "멍멍 짖는 동물", h3: "사람의 가장 오랜 친구라 불리는 반려동물" },
    { w: "ANT", pos: "명사", lv: 1, h1: "더듬이가 달린 작은 곤충", h3: "군집 생활을 하는 부지런한 곤충" },
    { w: "SUN", pos: "명사", lv: 1, h1: "낮에 하늘에서 빛나는 것", h3: "태양계의 중심에 있는 별" },
    { w: "RUN", pos: "동사", lv: 1, h1: "빠르게 발을 움직여 가다", h3: "WALK보다 빠른 움직임" },
    { w: "BIG", pos: "형용사", lv: 1, h1: "크기가 큰", h3: "SMALL의 반대말" },
    { w: "HOT", pos: "형용사", lv: 1, h1: "온도가 높은", h3: "COLD의 반대말" },
    { w: "RED", pos: "형용사", lv: 1, h1: "사과나 딸기의 색깔", h3: "신호등에서 '멈춤'을 뜻하는 색" },
    { w: "EGG", pos: "명사", lv: 1, h1: "닭이 낳는 것", h3: "프라이나 스크램블로 요리해 먹는다" },
    { w: "FISH", pos: "명사", lv: 1, h1: "물속에서 헤엄치는 동물", h3: "아가미로 숨을 쉰다" },
    { w: "CAKE", pos: "명사", lv: 1, h1: "생일에 먹는 달콤한 음식", h3: "촛불을 꽂고 후 불어 끈다" },
    { w: "JUMP", pos: "동사", lv: 1, h1: "땅에서 위로 뛰어오르다", h3: "줄넘기를 할 때 하는 동작" },
    { w: "PLAY", pos: "동사", lv: 1, h1: "게임이나 놀이를 하다", h3: "악기를 연주할 때도 쓰는 동사" },
    { w: "BOOK", pos: "명사", lv: 1, h1: "책장에 꽂혀 있는 읽을거리", h3: "도서관에 가득한 것" },
    { w: "MILK", pos: "명사", lv: 1, h1: "소에게서 얻는 하얀 음료", h3: "시리얼에 부어 먹는다" },
    { w: "TREE", pos: "명사", lv: 1, h1: "숲에 많이 서 있는 식물", h3: "가지와 잎이 있고 열매를 맺기도 한다" },
    { w: "HAPPY", pos: "형용사", lv: 1, h1: "기분이 아주 좋은", h3: "SAD의 반대말" },
    { w: "MONEY", pos: "명사", lv: 1, h1: "물건을 살 때 내는 것", h3: "갬블러들이 가장 좋아하는 것!" },
    { w: "SPIN", pos: "동사", lv: 1, h1: "빙글빙글 돌다, 돌리다", h3: "슬롯머신의 버튼 이름" },
    // ---- 중급
    { w: "WINNER", pos: "명사", lv: 2, h1: "경기나 게임에서 이긴 사람", h3: "LOSER의 반대말" },
    { w: "JACKPOT", pos: "명사", lv: 2, h1: "슬롯에서 터지는 가장 큰 상금", h3: "MINI · MAJOR · GRAND 같은 등급이 있다" },
    { w: "CASINO", pos: "명사", lv: 2, h1: "슬롯머신과 룰렛이 있는 곳", h3: "라스베이거스에 많은 건물" },
    { w: "LUCKY", pos: "형용사", lv: 2, h1: "운이 좋은", h3: "네잎클로버를 찾은 사람은 ○○○○○하다" },
    { w: "DANCE", pos: "동사", lv: 2, h1: "음악에 맞춰 몸을 움직이다", h3: "발레 · 힙합 · 탱고" },
    { w: "RABBIT", pos: "명사", lv: 2, h1: "긴 귀를 가진 동물", h3: "당근을 좋아하고 깡충깡충 뛴다" },
    { w: "PUZZLE", pos: "명사", lv: 2, h1: "조각을 맞춰 완성하는 놀이", h3: "직소 ○○○○○○" },
    { w: "QUICK", pos: "형용사", lv: 2, h1: "속도가 빠른", h3: "SLOW의 반대말, FAST와 비슷한 말" },
    { w: "FROZEN", pos: "형용사", lv: 2, h1: "꽁꽁 얼어붙은", h3: "냉동실에 넣어 둔 음식의 상태" },
    { w: "WHISPER", pos: "동사", lv: 2, h1: "아주 작은 목소리로 말하다", h3: "비밀 이야기를 귀에 대고 하는 말투" },
    { w: "BRIGHT", pos: "형용사", lv: 2, h1: "빛이 밝은", h3: "DARK의 반대말" },
    { w: "OCEAN", pos: "명사", lv: 2, h1: "아주 넓고 깊은 바다", h3: "태평양 · 대서양 · 인도양" },
    { w: "KNIGHT", pos: "명사", lv: 2, h1: "갑옷을 입고 말을 탄 중세 전사", h3: "체스 말 중 하나 — 앞 글자는 소리 나지 않는다" },
    { w: "ZEBRA", pos: "명사", lv: 2, h1: "흑백 줄무늬가 있는 동물", h3: "아프리카 초원에 사는 말과 동물" },
    { w: "VOLCANO", pos: "명사", lv: 2, h1: "용암을 뿜는 산", h3: "폭발하면 화산재가 날린다" },
    { w: "HUNGRY", pos: "형용사", lv: 2, h1: "배가 고픈", h3: "FULL의 반대말" },
    { w: "EXPLORE", pos: "동사", lv: 2, h1: "새로운 곳을 찾아 돌아다니다", h3: "탐험가가 하는 일" },
    { w: "QUEEN", pos: "명사", lv: 2, h1: "나라를 다스리는 여자 임금", h3: "카드 Q의 주인공" },
    { w: "YELLOW", pos: "형용사", lv: 2, h1: "바나나의 색깔", h3: "병아리와 레몬의 색" },
    { w: "WIZARD", pos: "명사", lv: 2, h1: "마법을 쓰는 사람", h3: "지팡이와 뾰족 모자" },
    { w: "PIRATE", pos: "명사", lv: 2, h1: "바다의 도둑", h3: "해골 깃발과 보물지도" },
    { w: "JUNGLE", pos: "명사", lv: 2, h1: "열대의 빽빽한 숲", h3: "원숭이와 앵무새가 사는 곳" },
    { w: "HONEY", pos: "명사", lv: 2, h1: "벌이 만드는 달콤한 것", h3: "곰돌이가 좋아하는 끈적한 음식" },
    { w: "ZIGZAG", pos: "명사", lv: 2, h1: "번개 모양으로 꺾인 선", h3: "Z자 모양으로 왔다 갔다" },
    // ---- 중상급
    { w: "TREASURE", pos: "명사", lv: 3, h1: "숨겨진 귀한 것", h3: "해적이 지도에 X 표시를 해 둔 것" },
    { w: "ADVENTURE", pos: "명사", lv: 3, h1: "위험을 무릅쓴 신나는 경험", h3: "모험 영화 · 게임의 장르 이름" },
    { w: "CHAMPION", pos: "명사", lv: 3, h1: "대회에서 1등을 한 사람", h3: "시즌 우승자에게 붙는 칭호" },
    { w: "FORTUNE", pos: "명사", lv: 3, h1: "큰 재산 또는 운", h3: "○○○○○○○ 쿠키 안에는 운세 쪽지가 있다" },
    { w: "DANGEROUS", pos: "형용사", lv: 3, h1: "위험한", h3: "SAFE의 반대말" },
    { w: "BEAUTIFUL", pos: "형용사", lv: 3, h1: "아름다운", h3: "PRETTY보다 더 강한 칭찬" },
    { w: "CELEBRATE", pos: "동사", lv: 3, h1: "기쁜 일을 축하하다", h3: "파티를 열고 폭죽을 터뜨리며 하는 일" },
    { w: "MYSTERIOUS", pos: "형용사", lv: 3, h1: "알 수 없어서 신비로운", h3: "MYSTERY의 형용사형" },
    { w: "KANGAROO", pos: "명사", lv: 3, h1: "배 주머니에 새끼를 넣고 다니는 동물", h3: "호주를 대표하는 점프 동물" },
    { w: "ELEPHANT", pos: "명사", lv: 3, h1: "코가 아주 긴 동물", h3: "육지에서 가장 큰 동물" },
    { w: "TELESCOPE", pos: "명사", lv: 3, h1: "멀리 있는 것을 크게 보는 도구", h3: "천문대에서 별을 볼 때 쓴다" },
    { w: "IMAGINE", pos: "동사", lv: 3, h1: "머릿속으로 그려 보다", h3: "IMAGINATION의 동사형" },
    { w: "GAMBLER", pos: "명사", lv: 3, h1: "돈을 걸고 게임하는 사람", h3: "이 게임의 제목에 들어간 단어" },
    { w: "COMPLICATED", pos: "형용사", lv: 3, h1: "복잡한", h3: "SIMPLE의 반대말" },
    { w: "DISAPPEAR", pos: "동사", lv: 3, h1: "눈앞에서 사라지다", h3: "APPEAR(나타나다)의 반대말" },
    { w: "JOURNEY", pos: "명사", lv: 3, h1: "먼 곳으로 떠나는 여정", h3: "TRIP보다 긴 여행" },
    { w: "UNIVERSE", pos: "명사", lv: 3, h1: "모든 별과 은하를 포함한 공간", h3: "빅뱅으로 시작됐다고 알려져 있다" },
    { w: "EXCELLENT", pos: "형용사", lv: 3, h1: "아주 훌륭한", h3: "성적표의 최고 평가 같은 느낌" },
    { w: "WATERFALL", pos: "명사", lv: 3, h1: "물이 높은 곳에서 떨어지는 곳", h3: "나이아가라 ○○○○○○○○○" },
    { w: "BUTTERFLY", pos: "명사", lv: 3, h1: "아름다운 날개를 가진 곤충", h3: "애벌레가 번데기를 거쳐 변신한다" },
    { w: "QUESTION", pos: "명사", lv: 3, h1: "궁금한 것을 묻는 말", h3: "ANSWER의 짝, 물음표(?)로 끝난다" },
    { w: "VICTORY", pos: "명사", lv: 3, h1: "싸움이나 경기에서의 승리", h3: "손가락으로 V를 만드는 이유" },
    { w: "SQUEEZE", pos: "동사", lv: 3, h1: "꽉 짜다, 쥐어짜다", h3: "레몬즙을 낼 때 하는 동작" },
    { w: "FANTASTIC", pos: "형용사", lv: 3, h1: "환상적인", h3: "FANTASY의 형용사형" },
    { w: "NEIGHBOR", pos: "명사", lv: 3, h1: "옆집에 사는 사람", h3: "가운데 GH는 소리 나지 않는다" }
];

// the second hint: one letter and where it goes (the middle one, as in "ANT → 가운데 N")
export function spellHint2(word) {
    const i = Math.floor((word.length - 1) / 2);
    return `${i + 1}번째 자리에 알파벳 ${word[i]}이(가) 들어갑니다`;
}

// prize: 50,000 ~ 300,000 G — longer · harder · fewer hints = more
export const SPELL_MIN = 50000, SPELL_MAX = 300000;
export function spellPrize(word, lv, hints) {
    const len = Math.min(1, Math.max(0, (word.length - 2) / 8));
    const hard = (lv - 1) / 2;
    const full = SPELL_MIN + (SPELL_MAX - SPELL_MIN) * (0.65 * len + 0.35 * hard);
    return Math.max(SPELL_MIN, Math.round(full * (1 - 0.15 * hints) / 1000) * 1000);
}
