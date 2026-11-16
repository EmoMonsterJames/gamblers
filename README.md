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
- 탈락자 전원이 숨겨진 지역 **Survival Land**(평소에는 지도·룰렛에서 숨김)로 랜덤 순서로 이동 → 7개 미션 중 1개 추첨 → 한 명씩 10분 턴 (턴 종료 버튼 없음).
- 패자부활전 동안만 FULL HP · 200,000G · 0P (원래 골드/포인트/HP는 보관), 시즌 코너 횟수 리셋. 끝나면 원래 값으로 복귀 (부활자는 HP 100).
- 패자부활전 골드로 산 것 = 별도 인벤토리 → 끝나면 사라짐. 무료로 얻은 것 · 포획한 이모몬스터는 유지. 손실(강풍, NPC)은 패자부활전 인벤토리 먼저.
- 미션 성공 + 생존자 중 집게(`clawChampion`)가 1명 부활 → 이후 탈락자 순위 한 칸씩 밀림.
- 맵 6개 (`js/data/regions.js` 끝): 🌪️ Disaster Casino · 🕹️ Arcade (`js/screens/arcade.js`) · 🔘 Button Casino · ⛪ Foggy Church · 🧠 Quiz Casino · 🔥 Inferno Casino — 효과는 `js/screens/survivalLand.js`. 맵권 45,000G (Survival Land 상점 전용).
- 🧠 Quiz Casino: 2분 안에 1번 이상 퀴즈 팝업 (문제 은행 `js/data/quiz.js`: 영어 Synonym · Acronym), 힌트 3개 (HP −10씩), 오답 → Penalty 룰렛.
- 🔥 Inferno Casino: 코너마다 죽음의 룰렛, 맵권 사용 불가. 슬롯 Suicide Spin / Kill Me Gently (`js/screens/infernoSlots.js`, 브랜드 Death Slot), Plinko · Bomb Pick 즉사 칸.
- 관리: ⚙️ 지역·맵 관리 → 🔄 Survival Land 탭 (코너 · 상점 · 게임 · 맵 규칙). 모든 비즈니스 매물은 Survival Land 맵에도 오픈 가능.
