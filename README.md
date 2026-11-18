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
- 맵 9개 (`js/data/regions.js` 끝): 🌪️ Disaster Casino · 🕹️ Arcade (`js/screens/arcade.js`) · 🔘 Button Casino · ⛪ Foggy Church · 🧠 Quiz Casino · 🔥 Inferno Casino · 🧊 Icy Castle · 🦋 Decalcomania Casino · 🦟 모기 숲 — 효과는 `js/screens/survivalLand.js` / `js/screens/survivalIce.js` / `js/screens/survivalMosquito.js`. 맵권 45,000G (Survival Land 상점 전용) · 지금 맵에서 2분이 지나야 사용 가능. 맵마다 배경음 (BGM의 ¼ 볼륨). 일반 상점은 맵마다 정해진 목록만 팝니다 (`SURVIVAL_SHOP` in `js/data/catalogAdmin.js`) · NPC Block 권은 없습니다.
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
