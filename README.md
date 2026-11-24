# 마이옵티멀다이어트 28일 루틴 — 24시간 퀘스트 대시보드 (프로토타입)

참여자용 28일 루틴 체크보드 + 관리자 대시보드 웹앱입니다.
'오늘' 화면은 **프로필·신체 요약 바 → 실시간 공복/수면 타이머 → 오늘의 명언 → 허용·금기식품 → 7가지 데일리 퀘스트(인증사진)** 순서의 대시보드로 구성했고,
28일 체크보드·주차별 인바디·공구·관리자는 기존 기능을 그대로 유지하고,
**처음 보는 튜토리얼 탭**에서 시작 인바디를 입력하고 기본 규칙·주차별 허용/금기식품을 한 번만 읽으면 바로 시작할 수 있습니다.
빌드 없이 `index.html`만 열면 바로 동작하고, 데이터는 브라우저 localStorage에 저장됩니다.
나중에 Supabase/REST API로 바꿀 수 있도록 데이터·인증 레이어를 분리해 두었습니다.

---

## 1. 실행 방법

**가장 간단하게 (파일 열기)**
```
apps/my-optimal-diet/index.html 을 브라우저로 열기
```
- 크롬/사파리에서 더블클릭으로 열면 바로 사용할 수 있어요.
- 폰에서 보려면: 폴더를 웹 서버에 올리거나, PC에서 아래처럼 임시 서버를 띄우고 같은 Wi-Fi의 폰에서 접속하세요.

```
cd apps/my-optimal-diet
python3 -m http.server 8080
# PC: http://localhost:8080   /  폰: http://<PC의 IP>:8080
```

> `file://`로 열면 PWA 설치·서비스워커는 동작하지 않습니다(앱 기능은 정상). https 배포 시 자동 등록됩니다.

## 2. 데모 계정

| 구분 | 방법 |
|---|---|
| 카카오 로그인 버튼 | 지금은 **데모 모드** — 누르면 체험 계정 선택 안내가 나옵니다 |
| 데모 참여자 체험 | 김유니 (가상 인물, 오늘 시작 = Day 1) |
| 관리자 로그인 | 로그인 화면 → **관리자 로그인** → 관리자 코드 입력 (원클릭 버튼 없음) |
| 참여코드 입장 | 코드 **1234** (김유니) · 2751 (김서연) · 4813 (이지은) · 6302 (최하늘) |

데모 참여자 4명은 모두 **가상 인물·가상 수치**입니다. 기본 데모 참여자(김유니)의 시작일은 처음 접속한 날이라 항상 **Day 1**부터 시작하고,
나머지 세 명은 관리자 대시보드 예시를 위해 가상의 지난 기록을 갖고 있습니다.
관리자 화면 → **데모·설정 → 데모 데이터 초기화**로 언제든 처음 상태(Day 1)로 돌릴 수 있어요.

> 관리자 코드는 `js/config.js`의 `demo.adminCode` 값입니다. 소스가 공개되는 데모라 코드도 함께 보이므로, 실제 서비스에서는 아래 7절처럼 서버 인증으로 막아야 합니다.

## 3. 화면 구성

### 참여자 (모바일 퍼스트, 하단 탭 5개 — 튜토리얼 / 오늘 / 보드 / 인바디 / 공구)
0. **튜토리얼** — 처음 접속하면 이 탭이 먼저 열리고, **입력 저장하고 1일차 시작하기 →** 로 오늘 탭에 들어가면 다음부터는 오늘 탭이 기본이에요(언제든 다시 보고 수정 가능)
   - **01 내 정보 & 시작 인바디**: 닉네임 · 시작 체중 · 골격근량 · 체지방량 · 내장지방 레벨(1~20) 입력 + **입력 저장** — 저장하면 상단 프로필 · Day 1 인바디 · 단백질 권장량에 바로 반영
   - **02 기본 규칙**: 14시간 공복 · 7시간+ 숙면 · 의자 중독 탈출 · 운동 강도(4가지) + 나머지 공통 수칙 접이식
   - **단백질 기준**: 단백질쉐이크 선택 기준(순탄수 15g↓ · 당류 3g↓ · 단백질 20g↑)과 하루 단백질 섭취 권장량(소제목 바로 아래 `현재 체중 00.0kg 기준`, 0.8g / 1.2~1.6g / 최대 2g per kg) 자동 계산
   - **03 전 주차 금기식품**: 🍭 설탕·청량음료 🍺 술 … **이모지 + 글씨 칩**, 항목별 상세는 접이식
   - **04 주차별 허용식품**: D1~3 / D4~7 / 2주차 / 3주차 / 4주·유지기 허용식품 이모지 칩 + **외식 추천 메뉴**
1. **오늘** — 한 화면 대시보드
   - **히어로(프로필·신체 요약)**: 닉네임, 몸무게(kg)·체지방량(kg)·내장지방레벨, 28일 달성률 줄무늬 게이지, Day/주차
     - 게이지 위를 **통통한 요가복(크롭탑+레깅스) 캐릭터가 현재 % 위치에서 달려가고**, 끝에는 결승 깃발(100%면 트로피)이 있어요. 캐릭터는 인라인 SVG라 이미지 파일 없이 가볍게 동작합니다.
   - **실시간 타이머(1초 갱신)**: 공복 타이머(14시간 기준, 전날 마지막 식사 시각 수정 가능) · **아침 먹었어요 ✓**(그 시점까지 실제 공복 시간을 `공복 14시간 15분 완료 · 08:15 아침 식사`처럼 고정 표시, 시각 수정·해제 가능 — 단식일 카드에서는 같은 버튼이 **단식 종료**로 계산·표시) · **단식일 24시간 단식 타이머**(전날 마지막 식사 기준 → 24시간 카운트다운, 18시간 최소 기준 통과 표시, 24시간 달성 시 🏆 · 게이지 캐릭터 100%) · **마지막 저녁식사 타이머**(취침 2시간 전 쉐이크 / 4시간 전 무탄·저탄 일반식 — 카드에서 탭 한 번으로 전환, 선택은 저장됨. 1주차 D1~7 기본은 쉐이크, 2~4주차는 일반식) · **저녁 식사 시작했어요 ✓**(누르면 그 시각이 `entries[day].lastMealAt`·`settings.lastMeals[day]`에 저장되어 **다음 날 14시간 공복·24시간 단식 타이머가 그 시각부터** 계산) · 수면 카운트다운(최소 7시간, 내일 기상 목표 수정 가능, 권장 취침 시각 표시) — 세 게이지 위에서도 캐릭터가 초침에 맞춰 이동
   - **모든 날짜에서 타이머 3개 상시 표시**: `‹`/`›` 또는 보드에서 다른 날을 열어도 공복(단식일이면 24시간)·마지막 저녁식사·수면 카드가 항상 함께 뜹니다. 오늘이 아닌 날짜에서는 지금 시간 기준으로 계산된다는 안내가 붙어요.
   - **단식일 바꾸기**: 단식일 카드의 `단식일 바꾸기`(또는 상단 Day 표시줄)에서 같은 주차의 다른 날로 하루 단식일을 옮기거나 해제할 수 있어요. 옮기면 **원래 날짜는 일반 식단(14시간 공복 타이머)**으로 돌아가고 **새 날짜에 24시간 단식 타이머가 바로** 뜹니다. 연속 이틀 단식이 되면 한 번 더 확인해요.
   - **오늘의 명언**: Day 1~28에 맞춰 자동으로 바뀌는 확언·실전 조언 28개
   - **허용식품 / 금기식품**: 현재 주차 허용식품과 핵심 금기식을 초록·빨강 카드로 구분하되, `🥬 양배추·채소` `🍚 현미밥 2/3공기` / `🍭 설탕·청량음료` `🍺 술(한 모금도 X)`처럼 **이모지 + 짧은 글씨 칩**으로 표시(튜토리얼 탭 전체 보기 연결)
   - **오늘의 7가지 퀘스트**: 아침·점심·오후간식·저녁·물(2L/8잔, 카드에서 +1잔)·운동(웨이트 20분+/유산소 40분+)·수면(7시간 이상) 카드를 눌러 완료. 카드마다 파스텔 컬러 이모지 배지(🌅·🍚·🍎·🌙·💧·🏃‍♀️·😴)와 진행률 게이지 위 캐릭터가 있어요. 단식일 끼니는 '단식'으로 자동 완료
   - **인증사진**: 아침·점심·오후간식·저녁·운동 카드에서 촬영/선택 → 자동 리사이즈·압축 + 우측 하단에 촬영 시각·항목명 타임스탬프, 썸네일·크게 보기·다시 찍기·삭제
   - **세부 기록(접이식)**: 끼니별 계획/체크, 아침·저녁 영양제, 물 8잔 카운터, 공복 14시간·수면·운동·생리·대변
   - **인바디 입력**: 측정 날짜, 몸무게·골격근량·체지방량·내장지방레벨
   - 메모, 관리자 피드백, 광고/공구 배너 슬롯
2. **보드** — 28일 전체 체크보드 + **주차별 정보**
   - 각 주차 블록 **상단에 그 주차의 핵심 미션 · 식단 · 단식 · 운동 요약** (1주차는 D1~3 / D4~7 두 블록, 2·3·4주는 해당 주차 요약)
   - 주차마다 **이 주의 단식일**(지금 지정된 날짜 기준)과 **단식일 바꾸기** 버튼 — 여기서도 같은 주차 안에서 단식일을 옮길 수 있어요
   - 상태 색상: **완료(초록)·일부/미달(코랄)·미입력(점선 코랄)·예정(회색)**, 오늘은 굵은 테두리
   - 각 칸 아래 6칸 스트립 = **식단·물·영양제·공복·수면·운동** O/X (초록 O, 코랄 X, 회색 미입력)
   - 주차 보기에서는 일자별 카드에 항목별 O/X 그리드 표시
3. **인바디** — 주차별 인바디(몸무게·골격근량·체지방량·내장지방레벨 4종 변화 카드·SVG 추이 그래프·입력)
   - 시작(1일차)·1~4주차 입력, 시작 대비 변화 카드(4종), "주 1회 권장·단식일 다음날 제외" 안내
4. **공구** — 유형(진행중 공구/쿠팡 추천/브랜드 광고)·카테고리별 필터, 제품 카드, 혜택/할인코드, 외부 링크, 쿠팡 파트너스 고지

> 기존의 **가이드 탭은 없어졌어요.** 공통 규칙·단백질 기준·금기식·주차별 허용식품·외식 추천은 **튜토리얼 탭**으로, 주차별 핵심 안내(미션·식단·단식·운동)는 **보드의 주차 블록**으로 옮겼습니다.
> D1~3 당질 제한(10시간 내 쉐이크 4회·탄수/과일/콩/견과/카페인 제한), D4~7 현미 점심과 영양제, 2주차 간헐적 단식+HIIT, 3주차 단식 2회·활동량 UP, 4주·유지기(저녁 밥 반 공기·과일 1개)는 보드 요약과 오늘 화면 안내에 그대로 담겨 있습니다.
### 관리자 (관리자 코드로 로그인한 세션에만 **관리자** 탭이 보입니다)
- 참여자 관리 / 공구·광고 관리

### 관리자
- 참여자 요약(28일 달성률, 오늘 체크, 몸무게·골격근·체지방 변화, 최근 기록일)
- 참여자 추가(4자리 코드 자동 생성), 전체/개인 CSV 내보내기
- 참여자 상세: 28일 히트맵, 주차별 인바디(변화 카드 4종+그래프), **인증사진 갤러리(일자·항목·촬영 시각)**, 일별 기록 표(몸무게·내장지방·사진 수), 피드백 남기기/삭제
- CSV: 요약(닉네임·내장지방레벨 포함), 상세(내장지방레벨·인증사진 수 포함)
- **공구·광고 관리**: 새 공구 등록·수정·삭제, 노출 ON/OFF, 배너 노출, 유형/카테고리/링크/썸네일/쿠팡 고지 토글 → 참여자 화면에 즉시 반영

## 4. 파일 구조

```
apps/my-optimal-diet/
├─ index.html               # 앱 셸 (스크립트 로드 순서 포함)
├─ manifest.webmanifest     # PWA 매니페스트
├─ sw.js                    # 오프라인 캐시 (https에서만 등록)
├─ icons/                   # 앱 아이콘 (SVG)
├─ css/app.css              # 전체 스타일 (모바일 퍼스트)
├─ js/
│  ├─ program.js            # ★ 프로그램 정의: 28일 식단 패턴, 주차별 가이드, 금기식, 공구 유형
│  ├─ config.js             # ★ 배포 설정: authMode, Supabase/Kakao 키, 데모 코드, dataMode
│  ├─ auth.js               # ★ 인증 어댑터: demo / supabase(Kakao OAuth) / kakao JS SDK
│  ├─ model.js              # 계산 로직: 달성률, 항목 O/X, 주차별 인바디, CSV (DOM 없음)
│  ├─ views.js              # 화면 템플릿 (HTML 문자열, DOM 없음)
│  ├─ seed.js               # 데모 데이터
│  ├─ store.js              # ★ 데이터 레이어: local 어댑터 + REST 어댑터
│  ├─ photo.js              # 인증사진: 900px·80KB 이하 JPEG 압축 + 시각/항목 타임스탬프
│  └─ app.js                # 라우팅·이벤트·저장·실시간 타이머 (DOM)
└─ tests/
   ├─ run_tests.py          # 검증 실행기
   ├─ smoke.js              # 로직·템플릿 테스트
   ├─ dom_test.js           # 가짜 DOM으로 앱을 실제 부팅해 조작하는 테스트
   ├─ browser_test.py       # 실제 크로미움 종단 테스트 (사진 업로드 포함)
   └─ preview.py            # 미리보기 스크린샷 (downloads/my-optimal-diet-preview)
```

## 5. 데이터 구조 (localStorage → 서버)

localStorage 키: `mod.v2.participants`, `mod.v2.promos`, `mod.v2.session` (이전 `mod.v1.*` 데이터는 첫 실행 때 지워집니다)

```jsonc
// participant
{
  "id": "p1", "name": "김유니", "nickname": "유니", "code": "1234", "startDate": "2026-11-24",
  "email": null, "authUserId": null,
  "settings": { "lastMeal": "19:30", "wake": "07:00", "dinnerMode": "shake",
                "lastMeals": { "9": "20:30" },          // 날짜별 마지막 식사 시각(다음 날 공복·단식 타이머 자동 연동)
                "lastMeal": "19:30", "wake": "07:00",   // 아침 체크·저녁 체크는 entries[day].breakfastAt / lastMealAt 에도 저장
                "fastPrevMeal": { "10": "18:00" },      // 단식일별 기준 시각 직접 수정값
                "fastingPrevMealAt": "18:00",           // 위 값이 없을 때 쓰는 기본 설정
                "tutorialDone": true, "tutorialDoneAt": "2026-11-24T07:20:00+09:00" },  // 타이머 시각·저녁식사 기준·튜토리얼 완료
  "planOverrides": { "10": { "breakfast": "SHAKE", "lunch": "LOW", "snack": "SHAKE", "dinner": "ZERO" } },
  "entries": {
    "1": {
      "date": "2026-11-24",
      "weight": 61.5, "muscle": 21.5, "fat": 21.0, "visceral": 5,
      "photos": {
        "breakfast": { "dataUrl": "data:image/jpeg;base64,...", "at": "2026-11-24T08:32:00+09:00",
                        "label": "아침", "w": 900, "h": 675, "bytes": 62000 }
      },
      "meals": { "breakfast": false, "lunch": false, "snack": false, "dinner": false },
      "supplements": { "morning": false, "evening": false },
      "water": 0, "fasting14": false, "sleep": false,
      "exercise": { "weight": true, "cardio": false },
      "menstruation": false, "bowel": true,
      "memo": "", "updatedAt": "2026-11-24T08:40:00+09:00"
    }
  },
  "feedback": [ { "id": "f1", "day": 1, "text": "...", "createdAt": "..." } ]
}
```
- `entries`는 **프로그램 Day(1~28)** 기준입니다. `date`는 인바디 측정 날짜 표시용.
- 단식일 24시간 타이머는 **그 날의 전날 기록**에서 마지막 식사 시각을 가져옵니다: `entries[day-1].lastMealAt` → `settings.lastMeals[day-1]` → `settings.fastPrevMealAt` → 기본 `18:00`. 카드에서 고친 시각은 `settings.fastPrevMeal[day]`에 그 날짜에만 저장돼요.
- `visceral`은 내장지방레벨(숫자), `photos`는 항목별 인증사진(압축된 JPEG 데이터 URL + 촬영 시각)입니다.
- 달성률 = 계획된 끼니(단식 제외) + 영양제 2(단식일 제외) + 물(8잔까지 부분점수) + 공복 + 수면 + 운동 + 대변. 생리는 기록만 하고 점수에서 제외.
- 주차 인바디 = 그 주의 마지막 측정값. **단식일 다음날 측정값은 집계에서 제외**(수분 영향).

## 6. 서버 연결하기

### 6-1. 데이터 (Supabase 권장)
`js/config.js`에서:
```js
dataMode: 'rest',
rest: { baseUrl: 'https://<project>.supabase.co/rest/v1/rpc/app' }
```
`js/store.js`의 `createRest`가 기대하는 경로:
| 메서드 | 메서드/경로 |
|---|---|
| 목록 | `GET /participants` |
| 단건 | `GET /participants/:id` |
| 코드 조회 | `GET /participants?code=1234` |
| 추가 | `POST /participants` |
| 수정 | `PATCH /participants/:id` |
| 기록 저장 | `PUT /participants/:id/entries/:day` |
| 식단 변경 | `PATCH /participants/:id/plans/:day` `{ meals }` (null이면 기본값) |
| 피드백 | `POST/DELETE /participants/:id/feedback` |
| 공구 목록/등록/수정/삭제 | `GET/POST /promos`, `PATCH/DELETE /promos/:id` |

Supabase 테이블 예시:
```sql
create table participants (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  nickname text default '',
  code text unique not null,
  email text,
  start_date date not null,
  settings jsonb not null default '{}'::jsonb,     -- { lastMeal, wake } 타이머 시각
  plan_overrides jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table entries (
  participant_id uuid references participants(id) on delete cascade,
  day int not null check (day between 1 and 28),
  date date,
  weight numeric, muscle numeric, fat numeric, visceral int,
  meals jsonb not null default '{}'::jsonb,
  photos jsonb not null default '{}'::jsonb,        -- { breakfast: { dataUrl, at, label, w, h, bytes } }
  supplements jsonb not null default '{}'::jsonb,
  water int not null default 0,
  fasting14 boolean not null default false,
  sleep boolean not null default false,
  exercise jsonb not null default '{}'::jsonb,
  menstruation boolean not null default false,
  bowel boolean not null default false,
  memo text default '',
  updated_at timestamptz not null default now(),
  primary key (participant_id, day)
);

create table feedback (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references participants(id) on delete cascade,
  day int,
  text text not null,
  created_at timestamptz not null default now()
);

create table promos (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('groupbuy','coupang','ad')),
  category text not null check (category in ('shake','supplement','food','etc')),
  title text not null, memo text, benefit text, link text not null, image_url text,
  disclosure boolean not null default false,
  active boolean not null default true,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```
RLS 예시 (참여자는 본인 기록만, 관리자는 전체):
```sql
alter table participants enable row level security;
alter table entries enable row level security;

create policy "own participant" on participants
  for select using (auth_user_id = auth.uid());

create policy "own entries" on entries
  for all using (
    participant_id in (select id from participants where auth_user_id = auth.uid())
  );

create policy "admin all" on participants
  for all using (auth.jwt() ->> 'role' = 'admin');
```
> 앱은 진짜 서버에서 관리자 권한을 검사하지 않습니다. 배포 시 **관리자 계정/RLS**로 반드시 막아주세요.

### 6-2. 카카오 로그인

**권장: Supabase Auth (Kakao OAuth)**
1. 카카오 개발자센터 → 앱 만들기 → **카카오 로그인** 활성화
2. Redirect URI 등록: `https://<project>.supabase.co/auth/v1/callback`
3. Supabase → Authentication → Providers → **Kakao** 켜고 REST API 키/시크릿 입력
4. `js/config.js`:
```js
authMode: 'supabase',
supabase: { url: 'https://<project>.supabase.co', anonKey: '<anon public key>', redirectTo: 'https://내도메인/' }
```
5. 첫 로그인 후 `participants.auth_user_id`(또는 email)를 연결하면 다음부터 자동 입장합니다.
   (`reloadAll()`이 `authUserId`/`email`로 참여자를 찾습니다.)

**Kakao JS SDK 직접 사용**
```js
authMode: 'kakao',
kakao: { jsKey: '<JavaScript 키>', redirectUri: 'https://내도메인/' }
```
> `authMode`가 `demo`가 아니면 카카오 버튼이 실제 로그인으로 동작합니다. 로컬 데모에서는 체험 계정 선택 안내가 뜹니다.

## 7. 관리자 보안 (배포 전 필수)

지금은 데모라 `js/config.js`의 관리자 코드로 로그인한 세션에서만 **관리자** 탭과 관리자 화면이 열립니다
(로그인 전·일반 참여자에게는 탭이 만들어지지 않고, `#/admin` 주소로 들어와도 오늘 화면으로 돌아갑니다).
다만 코드가 공개 소스에 들어 있는 클라이언트 잠금이라 진짜 보안은 아닙니다. 실제 배포 시:
- Supabase Auth + `role` 클레임(또는 `admins` 테이블)으로 관리자만 접근
- RLS로 참여자별 데이터 분리
- 공구·광고 쓰기 권한은 관리자만
- 카카오/구글 로그인 후 참여코드는 "연결 코드"로만 사용

## 8. 검증

```bash
pip install esprima quickjs
cd apps/my-optimal-diet
python3 tests/run_tests.py
```
- JS 문법 검사(esprima)
- 로직·템플릿 스모크 테스트(quickjs): 식단 패턴, 달성률, 항목 O/X, 주차 인바디/제외 규칙, 공복·수면 타이머 계산, 28일 명언, 퀘스트 진행률, 기간별(D1~3·D4~7·2~4주) 퀘스트 부제, 내장지방레벨, CSV, 저장소 CRUD, 공구 CRUD, 모든 화면 렌더
- **가짜 DOM 런타임 테스트**: 앱을 실제로 부팅해 로그인→**튜토리얼 입력 저장/시작**→퀘스트 체크→타이머 시각 변경/실시간 갱신→인바디·내장지방 입력→인증사진 저장/삭제→식단 수정→공구 등록/수정/삭제→피드백→CSV까지 클릭으로 구동
- 정적 검사: 화면의 모든 `data-act`가 app.js에서 처리되는지, 참조 파일 존재, 사진 모듈(900px·80KB·타임스탬프) 포함 여부, 5탭 구성·튜토리얼·보드 주차별 정보·단식일 24시간 타이머·단식일 바꾸기 연동·아침/저녁 식사 체크·쉐이크 표기 통일·캐시 v8, 원작자 이미지 미포함

현재 결과: **915개 검증 통과** (로직·템플릿·가짜 DOM 구동·마크업 균형).

실제 브라우저 검증(선택, Playwright 필요):
```bash
pip install playwright && python3 -m playwright install chromium
python3 tests/browser_test.py   # 튜토리얼 저장→오늘→보드 주차별 정보→단식일 24시간 타이머·단식일 바꾸기→아침/저녁 체크·다음 날 공복 연동→인증사진→공구→CSV 등 151개
python3 tests/live_check.py     # 라이브(GitHub Pages) 검증 + 스크린샷
python3 tests/preview.py        # 미리보기 스크린샷 (downloads/my-optimal-diet-preview)
```
- `file://`로 열어 실제 크로미움에서 구동해 콘솔 오류 0건을 확인했습니다.


## 9. 인증사진 처리 방식

1. 퀘스트 카드의 `인증사진`(또는 `다시 찍기`)을 누르면 `<input type="file" accept="image/*" capture="environment">`가 열립니다.
2. 선택/촬영한 사진을 `js/photo.js`가 HTML5 Canvas로 그리며 **긴 변 900px 이하**로 줄이고,
   JPEG 품질을 0.82 → 0.42까지 낮춰 **약 80KB 이하**가 되면 저장합니다(그래도 크면 한 번 더 축소).
3. 같은 캔버스 오른쪽 아래에 **`2026.11.24 08:32 · 아침`** 형식의 반투명 타임스탬프를 찍습니다. (기기 로컬 시각)
4. 결과는 `entry.photos[항목]`에 `{ dataUrl, at, label, w, h, bytes }`로 저장되고, 카드 썸네일·크게 보기(촬영 시각·용량·해상도 표시)·삭제가 가능합니다.
5. 관리자 참여자 상세의 **인증사진** 갤러리에서 일자·항목·촬영 시각과 함께 확인할 수 있습니다(관리자는 열람만).

> 사진은 브라우저 저장소에 들어가므로 오래 쓰려면 서버 저장으로 옮기는 것을 권장합니다(아래 알려진 한계 참고).

## 10. 알려진 한계 (프로토타입)

- 관리자 잠금은 클라이언트 코드 대조 수준입니다(관리자 코드가 소스에 보임). 배포 전 Supabase Auth + RLS로 관리자만 접근하게 막아주세요.
- **인증사진은 localStorage에 저장**합니다. 사진 1장이 약 20~80KB라 하루 5장씩 28일을 채우면 브라우저 한도(약 5MB)에 닿을 수 있어요.
  한도에 닿으면 "저장 공간이 부족해요" 안내가 뜨고, 지난 사진을 지우거나 서버 저장(dataMode: 'rest')으로 바꾸면 됩니다.
- 촬영 시각은 **기기 시계** 기준입니다. 기기 시간이 틀어져 있으면 타임스탬프도 그대로 찍힙니다.
- `capture="environment"`라 모바일에서는 카메라가 바로 열립니다. 앨범에서 고르려면 기기 브라우저의 기본 동작을 따릅니다.
- 공구·광고 샘플 4건은 `example.com` / 쿠팡 홈 링크입니다. 관리자 화면에서 실제 링크로 바꿔주세요.
- 사파리에서 `file://`로 열면 브라우저 정책상 저장이 막힐 수 있어요. 로컬 서버나 https 배포로 열면 정상입니다.
- 푸시 알림, 참여자 간 랭킹, 결제는 포함되지 않았습니다.
- 미리보기 스크린샷: `downloads/my-optimal-diet-preview/`
  - `01-로그인` · `02-오늘-상단`(프로필·타이머) · `03-오늘-전체` · `12-퀘스트-인증사진` · `13-오늘-인증사진` · `14-사진-크게보기`
  - `04-28일-체크보드` · `05-주차별-카드`(주차별 정보 포함) · `06-주차별-인바디` · `07-공구-추천` · `08-튜토리얼` · `09~11-관리자`

## 11. 저작권·안내

- 원작자(@yoyop_diet)의 이미지 파일은 포함하지 않았습니다. 프로그램 구성(식단 패턴·허용식품·금기식 등)만 앱 UI 텍스트로 재구성했습니다.
- 이 앱은 기록 도구입니다. 질환이 있거나 약을 복용 중이라면 시작 전 의료진과 상담하세요.
- 공구·광고의 쿠팡 링크는 쿠팡 파트너스 고지 문구를 켜두는 것을 권장합니다(관리자 화면에서 토글).
