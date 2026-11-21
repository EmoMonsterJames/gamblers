# GAMBLERS 🎰

20명의 갬블러가 슬롯·카지노 미션으로 경쟁하고, 마지막 2명이 배틀로 우승을 가리는 시즌제 게임.
빌드 없는 정적 사이트(바닐라 JS 모듈)이며 Cloudflare Pages에 그대로 배포됩니다.

## 로컬 실행
```
powershell -ExecutionPolicy Bypass -File tools/serve.ps1
```
→ http://localhost:8787

## Supabase (기존 프로젝트의 `gamblers` 스키마)
1. 스키마는 `supabase/schema.sql` 로 이미 적용됨.
2. Dashboard → Project Settings → Data API → **Exposed schemas** 에 `gamblers` 추가.
3. Authentication → Users → 관리자 계정 생성 후 SQL Editor에서:
   ```sql
   insert into gamblers.admins (user_id)
   select id from auth.users where email = '관리자이메일';
   ```
4. 사이트 ⚙️ 관리자 페이지에서 로그인 → 첫 로그인 시 플레이어 265명과 잭팟 행이 자동 업로드됩니다.

`js/config.js` 의 URL/KEY 를 비우면 완전 오프라인(브라우저 저장) 모드로 동작합니다.
읽기는 누구나, 쓰기는 `gamblers.admins` 에 등록된 계정만 가능합니다(RLS).

## Cloudflare Pages
Workers & Pages → Create → Pages → Connect to Git → 이 저장소 선택
- Framework preset: None
- Build command: (비움)
- Build output directory: `/`

## 구조
- `js/data` 플레이어·카탈로그(펫/무기/상점/장소/미션)·카지노 게임
- `js/slots` 슬롯 엔진 + 13개 슬롯 설정 (RTP 약 85~92% 보정)
- `js/game/season.js` 시즌 규칙 (선발 → 미션 → 턴 → 심사 → 탈락 → 결승 → 명예의 전당)
- `js/screens` 화면, `js/ui` 공용 UI, `css/` 스타일

## 🔄 패자부활전 (Survival Land)
- 10번째 탈락자가 나오면 다음 라운드 전에 팝업 → 관리자가 **패자부활전 진행하기** (`js/game/revival.js`, 화면 `js/screens/revivalView.js`).
- 탈락자 전원이 숨겨진 지역 **Survival Land**(평소에는 지도·룰렛에서 숨김)로 랜덤 순서로 이동 → 6개 미션 중 1개 추첨 → 한 명씩 5분 턴 (턴 종료 버튼 없음 · ⏹️ 턴 종료권으로는 종료 가능).
- 미션 (`REVIVAL_MISSIONS`): 슬롯 100번 안에 50,000G · 카지노 5,000G · 슬롯 Win 15번 · 이모몬스터 1마리 캡쳐 · 슬롯 보너스 5번 · NPC 공격 1회 받고 살아남기.
- 미션 실패 = 바로 탈락 확정 · 미션 성공 + 5분 생존 = 🏝️ 생존자 공간 → 그중 1명만 부활.
- 패자부활전 동안만 FULL HP · 200,000G · 0P (원래 골드/포인트/HP는 보관), 시즌 코너 횟수 리셋. 끝나면 원래 값으로 복귀 (부활자는 HP 100).
- 패자부활전 골드로 산 것 = 별도 인벤토리 → 끝나면 사라짐. 무료로 얻은 것 · 포획한 이모몬스터는 유지. 손실(강풍, NPC)은 패자부활전 인벤토리 먼저.
- 생존자 공간의 플레이어 중 집게(`clawChampion`)가 1명 부활 → 이후 탈락자 순위 한 칸씩 밀림.
- 맵 9개 (`js/data/regions.js` 끝): 🌪️ Disaster Casino · 🕹️ Arcade (`js/screens/arcade.js`) · 🔘 Button Casino · ⛪ Foggy Church · 🧠 Quiz Casino · 🔥 Inferno Casino · 🧊 Icy Castle · 🦋 Decalcomania Casino · 🦟 모기 숲 — 효과는 `js/screens/survivalLand.js` / `js/screens/survivalIce.js` / `js/screens/survivalMosquito.js`. 맵권 45,000G (Survival Land 상점 전용) · 지금 맵에서 2분이 지나야 사용 가능. 맵마다 배경음 (BGM의 ¼ 볼륨). 일반 상점은 맵마다 정해진 목록만 팝니다 (`SURVIVAL_SHOP` in `js/data/catalogAdmin.js`) · 무기 상점이 있는 맵(Disaster · Foggy Church · Inferno · Icy Castle · 모기 숲)은 겹치지 않는 무기 3개씩 (`SURVIVAL_WEAPONS`) · NPC Block 권은 없습니다.
- 🕹️ Arcade: 스테이지 3분 안에 못 끝내면 HP −50 (+기회 1번 소모) · 시작 전에 경고 표시 · 보스 클리어 보상 🎫 미션완료권 (쓰지 않으면 패자부활전이 끝날 때 사라짐). 🎫 미션완료권은 패자부활전에서도 사용 가능 → 패자부활 미션 통과.
- 🧊 Icy Castle: 입장 시 독감 40% · 모든 코너가 얼음벽 (🔨 망치 30회 · 다 쓰면 10초 충전 · 깨지는 타수: 5번 안 10% · 10번 안 10% · 20번 안 30% · 30번 안 30% · 31번 이상 20%) · 👸 Ice Queen만 등장 (Icy Breath: 화면 전체 30초 동결).
- 🦟 모기 숲: 화면 전체에 모기 떼 · Tiny Mosquito 자주 물기 (HP −5 · 모기알 상자에 물림 횟수 표시 · 5% 암 팝업) · 대형 모기알 100 → Monster Mosquito 배틀 (HP 100 · 지면 사망) — Monster Mosquito는 알에서만 나오고, 첫 알은 5분 안에 반드시 한 번 깨집니다.
- 🦋 Decalcomania Casino: 화면이 좌우 두 개로 나뉘고 객체마다 한쪽은 진짜 · 한쪽은 가짜 (가짜 클릭 HP −10) · 🎭 Fake Profile만 등장 (Profile Copy: 60초 동안 악마 프로필이 랜덤 플레이 · 40% 확률로 그동안 죽지 않음 · 실제 버튼만 사람 속도(3~5초에 1번)로 누름 · 조종 중엔 다른 NPC 공격 없음 · 진짜/가짜는 코너마다 좌우로 섞임).
- 🌪️ Disaster Casino 강풍 HP −10 · 🔘 Button Casino: 🤖 Robot 몬스터 보유 시 버튼 HP 차감 30% 확률로 막음 (맵 태그에 표시).
- 🧠 Quiz Casino: 2분 안에 1번 이상 퀴즈 팝업 (문제 은행 `js/data/quiz.js`: 영어 Synonym · Acronym), 힌트 3개 (HP −10씩), 오답 → Penalty 룰렛.
- 🔥 Inferno Casino: 코너마다 죽음의 룰렛, 맵권 사용 불가. 슬롯 Suicide Spin / Kill Me Gently (`js/screens/infernoSlots.js`, 브랜드 Death Slot), Plinko · Bomb Pick 즉사 칸.
- 관리: ⚙️ 지역·맵 관리 → 🔄 Survival Land 탭 (코너 · 상점 · 게임 · 맵 규칙). 모든 비즈니스 매물은 Survival Land 맵에도 오픈 가능.

## 🖼️ 맵 배경
- 턴을 플레이하는 동안 페이지 배경(플레이 화면 바깥)이 그 맵에 맞는 장면으로 바뀝니다 (`js/ui/mapBackdrop.js` — 지역별 장면 + 맵 색 · 이모지, Survival Land는 맵마다 전용 장면).

## 🍚 식량 · 🌦️ 날씨 · 🏨 숙소 · 🏢 취업 (2026-11)
- **HP / 식량 게이지** (`screens/lifeCorners.js` `vitals()`, ⓘ 버튼 = 규칙 표): 시작 식량 30 · 턴 플레이 2분마다 −10 · 게이지 0 → 굶주림: 게이지를 11 이상으로 올리기 전까지 HP −10 (0이면 30초마다 · 1~3은 다 쓰고 30초 · 4~7은 1분 · 8~10은 1분 30초 뒤) · 11 이상이면 다시 2분마다 −10 · HP 0이면 "굶주림으로 바로 사망" (하이라이트 🍽️ 카테고리).
- **음식 / 푸드 코너** (`data/life.js` FOODS · FOOD_CORNERS, 그림 `ui/foodArt.js`): 맵 푸드 코너는 모두 🎡 입장 룰렛 (무료 30% · 1000G/3000G/5000G/10000G 각 5% · 거절 50%) · 고향 코너(`FOOD_HOME_COUNTRY`: 솔잎국수→Emo World, 베스트떠귀→Dung Town, 투명주스→Foggy Nation, 도형쿠키→Polynesia, 개밋잎국수→Ground Town, 구운당근→MJ World)는 그 나라 플레이어에게 무료 50% · 1000G 20% · 거절 30% · 종족 · 국적 제한 없음 (햇살 상점만 Smile 종족 전용, `FOOD_CORNER_RACES`) · 숙소 안 코너는 기존 입장 방식 · 판매 품목은 라운드마다 랜덤 · 푸드 코너 이용 라운드당 2회. 음식은 가방 아이템(`food_<id>`)도 되어 Self-Business 미니마켓 · 럭셔리 라운지에서 팝니다.
- **날씨** (모든 맵 랜덤, 라운드마다 다시 뽑음: 맑음 10% · 비 10% · 폭풍 20% · 눈 10% · 눈보라 20% · 우박 20% · 폭염 10%): 1분마다 HP 피해 (맑음 제외) · 그 맵 숙소에 묵으면 무사.
- **숙소** (`LODGES`): 랜덤 객실은 문 애니메이션으로 방을 뽑고 → "N번 객실을 골랐습니다" → 결제 → 결제 후에 입장 결과 공개 (실패하면 요금 없음) · 이미 투숙객이 있으면 🔑 투숙객교체권(10P, 포인트 상점 20개 맵)으로 자리를 빼앗을지 묻습니다 · 스위트는 바로 선택 · 예약 1~3라운드는 같은 종류 숙소가 있는 모든 맵에 적용 · 🧳 체크아웃(환불 없음) · 날씨 + NPC 공격 차단 · 예약 끝나면 라운드 시작 때 강제 퇴실 · 호텔 미니 상점 / 음지동굴자판기 / 펜트하우스 레스토랑은 투숙객 전용 · Self-Business 오너는 그 맵에 무료 방 (입장만 랜덤).
- **직업**: 그만두기를 눌러도 이번 턴의 직업 시도가 사용됩니다.
- **슬롯 표준 크기**: 모든 슬롯 머신은 960×720 표준 상자 안에 맞춰지고 (`screens/slot.js` `fitSlotToScreen`, `SLOT_STD`), 화면이 작으면 상자째 축소됩니다.
- **FREE SPIN 표시**: 무료 스핀 횟수(`.fs-hud` · `.sp-hud`)는 릴 보드 오른쪽 아래에 표시됩니다.
- **"~G 이상 벌기" 미션** (`slot_net` · `casino_net` · `combo`, 패자부활 100스핀, 사내 미션 casino8k): 손익이 아니라 슬롯 / 카지노에서 **번 돈**(당첨금 합계, 베팅은 빼지 않음)으로 판정 (`t.stats.slotWon` · `casinoWon`).
- **턴 종료 최소 체류** (`game/extra.js` `MIN_STAY`): Hell · Magma Town · Death Door · Dark Space · Death Casino는 맵에 들어온 뒤 2분이 지나야 턴을 끝낼 수 있습니다 (Hell은 기존 "남은 시간 5분 이하" 규칙도 함께).
- **🛡️ 최종후보선택제외권** (100,000G, 일반 상점이 있는 맵 20곳 — 관리자가 상점을 바꿔도 지금 일반 상점이 있는 맵에서 다시 뽑음): 미션 실패로 탈락후보가 되면 70% 확률로 후보에서 빠지고 1개 사용 · 성공자와 따로 "🛡️ 제외" 칸에 표시 · 남은 플레이어 6명 이하이면 발동 안 함 · 후보는 최소 1명 남음.
- **🗳️ 투표 탈락 (16명 · 8명)** (`game/social.js` `tallyVote`): 한 표마다 💞 75% 친밀도 1위 · 🎲 25% 그 1위가 아닌 플레이어 (반은 친밀도 다음 순위, 반은 랜덤) · 탈락자 공개 뒤 "누가 누구에게 투표했나" 목록 (`voteBoard`, 탈락 화면에도 표시).
- **테스트 시즌**: 플레이어 검색창 (이름 · ID · 국가 · 종족) + "선택한 플레이어만" 보기.
- **관리**: ⚙️ 지역·맵 관리의 각 맵 카드 아래 🌦️ 날씨(모두 랜덤 안내) · 🍚 푸드 코너(룰렛 안내 · 품목 · 가격) · 🏨 숙소 코너. 🔢 모든 맵에 번호(#1 …, Survival Land 마지막 맵이 마지막).
- **은행**: 계좌 개설은 TOP 15 경력 · 🧾 대부기록 삭제권 (50,000G) · ④ 계좌 전용 상품 (3라운드마다 이자).
- **취업 코너** (`game/employ.js`, 관리: 🏦 은행 관리 → 🏢 취업 탭): 7개 회사 · 지원자 5명이 차면 심사 시작 → 라운드마다 단계 결과를 그 플레이어 턴에 통보 · 최종 합격 → 계좌 코드 연동 후 입사 · 매 라운드 급여(계좌) · 시즌 종료 때 진급 / 매니저 / 해고. 기록(방문 맵 · 직업 횟수 · 브랜드 최고 WIN · 잭팟)은 `Store.bank.lifelog`에 쌓입니다 (이번 업데이트부터).
