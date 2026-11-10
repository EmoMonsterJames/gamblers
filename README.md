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
