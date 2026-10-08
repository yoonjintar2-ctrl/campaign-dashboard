# 디지털 캠페인 통합 대시보드

시행사·광고주가 함께 쓰는 디지털 광고 캠페인 대시보드입니다.
제안 단계의 **미디어믹스(예상 효율)** 와 집행 중의 **일별 리포트** 를 한 화면에서 다룹니다.

- **대시보드** — 효율(진행 현황 · KPI · 전체 지표 · 일자별 차트 · 서머리 · 트리맵 · 소재) / 일자별 상세 효율
- **데이터 입력** — 엑셀식 일별 실적 입력 (방향키 이동, Ctrl+Z/Y, 붙여넣기, 입력 히스토리)
- **엑셀 템플릿** — 일자별 실적 · 예상 효율 각각 템플릿을 내려받아 채운 뒤 그대로 불러오기
- **캠페인 설정** — 라인별 예상 효율 + 미디어믹스 자동 생성
- **로그인 · 회원** — 이메일 로그인, 가입 신청 → 마스터 승인, 계정 등급(슈퍼마스터 · 마스터 · 뷰어), 클라우드 저장

로그인하지 않으면 **데모 모드**(예시 데이터)로 화면을 그대로 둘러볼 수 있습니다.

---

## 폴더 구조

```
campaign-dashboard/
├─ index.html                  빌드 결과 (배포되는 실제 파일)
├─ config.js                   Supabase 접속 정보 — 여기에 내 값을 넣는다
├─ config.example.js           config.js 견본
├─ src/                        원본 소스 (여기를 고친다)
│  ├─ 01-head.html             전체 CSS · 디자인 토큰
│  ├─ 02-body.html             화면 마크업
│  ├─ 03-data.js               항목 사전(FIELDS) · 데이터 모델 · 스코프
│  ├─ 04-builder.js            구성 편집기 · 진행 현황 · KPI 도넛
│  ├─ 05-chart.js              일자별 효율 비교 차트 · 서머리
│  ├─ 06-creative.js           표 탭 · 소재 갤러리 · 게재 히스토리(간트)
│  ├─ 07-input.js              데이터 입력 시트
│  ├─ 08-setup.js              캠페인 설정 · 예상 효율 · 미디어믹스
│  ├─ 09-cloud.js              로그인 · 클라우드 저장/불러오기
│  ├─ 10-xlsx.js               엑셀 템플릿 내려받기 · 불러오기
│  ├─ 11~13 …                  코멘트 · 리포트 엑셀 · 설정(열 설정 등) · 트렌드 리포트
│  ├─ 14-tv.js                 메뉴 · TV 캠페인 · 입력 표 공용 틀(열 설정)
│  ├─ 16-ooh.js                OOH 캠페인 — 지면 계획 · 소재 · 서머리 (v81)
│  ├─ 17-overview.js           전체 캠페인 — 같은 광고주의 모든 캠페인 요약 (v81)
│  └─ 15-i18n.js               영어 화면 (빌드 순서상 맨 끝)
├─ tools/build.py              src/ → index.html 빌드 스크립트
├─ supabase/schema.sql         DB 테이블 · 권한(RLS) · 트리거 전체
└─ .github/workflows/pages.yml push 하면 자동 빌드 & 배포
```

`index.html` 을 직접 고치지 마세요. **`src/` 를 고치고 빌드**하면 `index.html` 이 다시 만들어집니다.

```bash
python tools/build.py          # → index.html
```

---

## 설치 — 순서대로 따라 하면 됩니다

아래에서 이렇게 표기합니다.

| 표기 | 뜻 | 예 |
|---|---|---|
| `<프로젝트>` | Supabase 프로젝트 참조 ID | `abcdefghijklmnop` |
| `<깃허브ID>` | GitHub 사용자 이름 | `jintar` |
| `<리포>` | 저장소 이름 | `campaign-dashboard` |

최종 주소는 `https://<깃허브ID>.github.io/<리포>/` 가 됩니다.

---

### 1단계 — Supabase 프로젝트 만들기

1. <https://supabase.com> 접속 → **Start your project** → 구글 계정으로 가입
2. **New project**
   - Name: `campaign-dashboard`
   - Database Password: 아무 값이나 만들고 **따로 적어 두세요** (나중에 DB 직접 접속할 때 필요)
   - Region: **Northeast Asia (Seoul)**
3. 생성에 1~2분 걸립니다.
4. 좌측 **Project Settings → API** 에서 두 값을 복사해 둡니다.
   - **Project URL** → `https://<프로젝트>.supabase.co`
   - **anon public** 키 (`eyJ...` 로 시작하는 긴 문자열)

> **anon key 는 공개되어도 되는 값입니다.** 브라우저에 그대로 실립니다.
> 실제 데이터 보호는 3단계에서 넣는 RLS 정책이 담당합니다.
> **`service_role` 키는 절대 이 저장소나 config.js 에 넣지 마세요.**

---

### 2단계 — 테이블 만들기

1. Supabase 좌측 **SQL Editor → New query**
2. 이 저장소의 `supabase/schema.sql` 을 **전체 복사해서 붙여넣기**
3. **Run** (초록색 성공 메시지가 나오면 끝)

> 이미 운영 중인 DB 라면 전체를 다시 돌릴 필요 없이, 새로 생긴 조각만 실행하면 됩니다.
> - `supabase/2026-09-30_trend_security.sql` — 트렌드 리포트 대외비 보안 (v78)
> - `supabase/2026-10-01_overview.sql` — **전체 캠페인** 메뉴를 광고주(뷰어 코드) 화면에서도 보이게 하는 함수 (v81).
>   실행하지 않아도 시행사(로그인) 화면에서는 그대로 동작합니다.
> - `supabase/2026-10-01_advertiser_access.sql` — **접근 권한을 광고주 단위로** (v82). 한 캠페인의 멤버 · 코드로 같은 광고주의
>   모든 캠페인을 열람(운영진은 수정)하고, 코드로 들어온 화면에서 같은 광고주 캠페인 사이를 옮겨 다닌다. 전체 캠페인 함수도 이걸로 갱신된다.
> - `supabase/2026-10-08_members_email.sql` — **회원 시스템 개편** (v117). 이메일 로그인 · 가입 승인 · 계정 등급
>   (슈퍼마스터 · 마스터 · 뷰어). 캠페인 단위 멤버 권한(v82)을 대신한다. 순서는 파일 맨 위 안내대로(슈퍼마스터 계정 → Confirm email 끄기).
> - `supabase/2026-10-08_viewer_code_only.sql` — **링크 코드는 뷰어 코드만** (v121). 운영진 코드 링크를 없앤다(예전 운영진 = 마스터 계정).

무엇이 만들어지는지:

| 테이블 | 내용 |
|---|---|
| `profiles` | 로그인한 사람 (이름·이메일·소속) |
| `campaigns` | 캠페인 1건 = 1행. 설정·라인·소재·이슈·화면 구성이 `doc` (JSON) 에 통째로 들어감 |
| `profiles.app_role` | 계정 등급 — `super`(슈퍼마스터) / `master`(마스터) / `viewer`(뷰어) / `pending`(승인 대기) |
| `viewer_advertisers` | 뷰어가 볼 수 있는 광고주 (마스터가 지정) |
| `campaign_members` · `campaign_invites` | (v117 전) 캠페인 단위 권한 — 이제 권한을 주지 않고 기록으로만 남음 |
| `daily_stats` | **일별 실적** — 캠페인·일자·라인별 노출/클릭/조회/전환/Net 광고비 |
| `campaign_history` | 저장할 때마다 남는 스냅샷 (되돌리기·감사 로그) |

권한 규칙(RLS)도 함께 들어갑니다.

- **슈퍼마스터** — 마스터의 모든 권한 + 마스터 강등 · 탈퇴 · 비밀번호 재설정
- **마스터** — 모든 광고주 · 캠페인 열람 · 수정 · 삭제, 가입 승인(뷰어/마스터), 뷰어 승격 · 광고주 지정 · 탈퇴.
  마스터끼리는 서로 볼 수만 있음
- **뷰어** — 지정된 광고주의 캠페인 대시보드만 (조회 전용)
- **승인 대기** — 아무것도 볼 수 없음. 지정되지 않은 광고주의 캠페인은 **DB 차원에서 조회 자체가 막힙니다.**

여러 번 실행해도 안전한 스크립트라, 나중에 스키마를 고칠 때도 그대로 다시 Run 하면 됩니다.

---

### 3단계 — 이메일 로그인 설정

1. Supabase **Authentication → Sign In / Providers**
   - **Allow new users to sign up** 켬 (가입 신청을 받는다)
   - **Confirm email** 끔 — 가입은 마스터가 승인하므로 메일 확인이 필요 없고,
     Supabase 기본 메일 서버는 프로젝트 팀원 주소로만 메일을 보내 켜 두면 가입 신청이 막힙니다
   - **Email** 공급자 켬 (기본값)
2. **Authentication → URL Configuration** 의 **Site URL** 을 사이트 주소로
   ```
   https://<깃허브ID>.github.io/<리포>/
   ```
3. 첫 슈퍼마스터 — **Authentication → Users → Add user → Create new user** 로 이메일 · 비밀번호를 만들고
   (Auto Confirm 체크) `supabase/2026-10-08_members_email.sql` 의 맨 아래 줄 이메일을 그 주소로 바꿔 실행
4. 비밀번호를 잊은 사람은 메일 대신 **회원 관리 › 비밀번호** 로 마스터(마스터는 슈퍼마스터)가 새로 정해 줍니다

---

### 4단계 — GitHub 에 올리기

**방법 A. 웹에서 끌어다 놓기 (가장 쉬움)**

1. <https://github.com/new> → Repository name `campaign-dashboard` → **Public** → Create
2. 만들어진 화면에서 **uploading an existing file** 클릭
3. `campaign-dashboard` 폴더 **안의 내용물 전체**를 끌어다 놓기
   (폴더 자체가 아니라 그 안의 `index.html`, `src`, `tools`, `supabase`, `.github` … 를 통째로)
4. Commit changes

> 윈도우 탐색기에서 `.github` 폴더가 안 보이면 **보기 → 숨긴 항목** 을 켜세요.
> 이 폴더가 빠지면 자동 배포가 동작하지 않습니다.

**방법 B. 명령어로 (Git 설치되어 있다면)**

```bash
cd "campaign-dashboard"
git init
git add .
git commit -m "디지털 캠페인 통합 대시보드 v1"
git branch -M main
git remote add origin https://github.com/<깃허브ID>/<리포>.git
git push -u origin main
```

---

### 5단계 — 접속 정보 등록

1. GitHub 저장소 → **Settings → Secrets and variables → Actions → New repository secret**
2. 두 개를 등록합니다.

| Name | Secret |
|---|---|
| `SUPABASE_URL` | `https://<프로젝트>.supabase.co` |
| `SUPABASE_ANON_KEY` | 1단계에서 복사한 **anon public** 키 |

배포할 때 이 값으로 `config.js` 가 자동 생성됩니다.
(등록하지 않으면 사이트가 **데모 모드**로만 뜹니다 — 오류는 나지 않습니다.)

> 저장소가 어차피 Public 이라 anon key 를 `config.js` 에 직접 적어 커밋해도 보안상 문제는 없습니다.
> Secrets 를 쓰는 편이 키를 바꿀 때 편해서 권장할 뿐입니다.

---

### 6단계 — 배포 켜기

1. GitHub 저장소 → **Settings → Pages**
2. **Source** 를 **GitHub Actions** 로 변경
3. **Actions** 탭에서 `Deploy to GitHub Pages` 가 초록불이 될 때까지 기다립니다 (1~2분)
4. 완성된 주소로 접속

```
https://<깃허브ID>.github.io/<리포>/
```

---

### 7단계 — 첫 실행

1. 사이트 접속 → 처음에는 **데모 모드**(예시 데이터)
2. 접속 화면에서 **이메일 · 비밀번호로 로그인** (슈퍼마스터 · 마스터 계정)
3. **＋ 새 캠페인** → 이름 입력
4. **캠페인 설정** 탭에서 라인(예상 효율)을 입력하고 **예상 효율 저장**
5. **데이터 입력** 탭에서 일별 실적을 넣고 **반영**
6. 상단 **☁ 저장** 을 누르면 클라우드에 저장됩니다
   (캠페인 설정 저장 / 예상 효율 저장 / 데이터 반영을 누를 때도 자동으로 함께 저장됩니다)

**회원** — 접속 화면의 **가입 신청**으로 누구나 신청 → 마스터 · 슈퍼마스터의 우측 상단 계정 동그라미에 알림(빨간 숫자)이 뜨고,
누르면 **회원 관리 › 가입 요청**에서 **뷰어(볼 광고주 선택)** 또는 **마스터**로 승인합니다.
회원 목록에서 뷰어의 광고주 변경 · 마스터 승격 · 탈퇴, (슈퍼마스터) 마스터 강등 · 탈퇴를 합니다.

---

## 엑셀로 넣기

한 줄씩 치는 대신 엑셀로 한 번에 올릴 수 있습니다.

| 어디서 | 버튼 |
|---|---|
| 데이터 입력 탭 | **⤓ 엑셀 템플릿** → **⤒ 엑셀 불러오기** |
| 캠페인 설정 › 예상 효율 | **⤓ 엑셀 템플릿** → **⤒ 엑셀 불러오기** |

템플릿에는 **직접 입력하는 항목만** 들어 있습니다.
CTR · CPM · CPV · Gross 예산 · 밸류 같은 계산 항목은 열 자체가 없고, 올리면 사이트가 계산합니다.
값이 없는 항목은 **열을 통째로 비워 두면** 됩니다 — 0 을 채울 필요 없습니다.

파일 맨 위에 작성 요령이 들어 있고, 그 아래 머리글 줄과 예시 한 줄이 있습니다.
안내 부분은 지우지 않아도 되고, 필요 없는 열을 지우거나 순서를 바꿔도
**머리글 이름을 보고 찾아 넣습니다.**

일자는 `8/3`, `2026.8.3`, `20260803` 처럼 적어도 올릴 때 `2026-08-03` 으로 바뀝니다.
수수료율은 `10` 이든 `10%` 든 상관없습니다.

불러오면 표의 기존 내용을 **대체**합니다. 잘못 올렸으면 <kbd>Ctrl</kbd>+<kbd>Z</kbd> 로 되돌립니다.

> `.xlsx` 를 그대로 읽으려면 인터넷 연결이 필요합니다(SheetJS 를 CDN 에서 불러옵니다).
> 파일을 더블클릭해서 연 오프라인 상태에서는 엑셀에서 **다른 이름으로 저장 → CSV** 로 바꿔 올리거나,
> 엑셀에서 범위를 복사해 표에 <kbd>Ctrl</kbd>+<kbd>V</kbd> 로 붙여 넣으세요.

---

## 수정하고 다시 배포하기

```bash
# src/ 안의 파일을 고친 뒤
python tools/build.py        # index.html 재생성 (확인용)
git add .
git commit -m "무엇을 고쳤는지"
git push
```

push 하면 GitHub Actions 가 알아서 다시 빌드·배포합니다 (1~2분).

**로컬에서 미리 보기** — `index.html` 을 더블클릭해도 열리지만, 그때는 **데모 모드**로만 동작합니다.
로그인까지 확인하려면 로컬 서버로 띄우세요.

```bash
python -m http.server 8000
# → http://localhost:8000
```

(이 주소를 Supabase Redirect URLs 에 넣어 둬야 로그인이 됩니다 — 3-2 참고)

---

## 데이터가 어떻게 저장되는지

**캠페인 설정 · 소재 · 이슈 · 화면 구성** → `campaigns.doc` 에 JSON 한 덩어리
화면 구성을 바꿔도 DB 스키마를 손댈 필요가 없습니다.

**일별 실적** → `daily_stats` 에 행 단위

```
campaign_id | stat_date  | line_key                                    | imp    | click | view  | net
------------+------------+---------------------------------------------+--------+-------+-------+---------
 …          | 2026-08-30 | Phase 1|YouTube|VRC|BMW 관심 오디언스|BMW iX | 658562 |   897 | 58772 | 3976573
```

`line_key` 는 `구분|매체|광고상품|타겟팅 그룹|제품` 입니다.
25%/50%/75%/100% 조회, 3·15·30초 조회, 공감·공유, 그리고 열 설정에서 직접 만든 열은
`extra` (JSON) 에 함께 들어갑니다.

행 단위로 쌓이므로 SQL 집계가 그대로 됩니다.

```sql
select stat_date, sum(imp) 노출, sum(click) 클릭, sum(net) net광고비
from daily_stats
where campaign_id = '...'
group by stat_date
order by stat_date;
```

매체별 일자 집계는 `v_daily_by_media` 뷰를 그대로 쓰면 됩니다.

---

## 자주 나는 문제

| 증상 | 원인 · 해결 |
|---|---|
| 가입 신청 시 "확인 메일을 보내지 못해…" | Supabase → Authentication → Sign In / Providers 의 **Confirm email** 이 켜져 있습니다. 끄세요 |
| 로그인했는데 "승인 대기 중입니다" | 정상입니다. 마스터가 **회원 관리 › 가입 요청**에서 승인해야 합니다 |
| 로그인은 되는데 계속 "데모 모드" | GitHub Secrets 2개가 등록됐는지, Actions 가 성공했는지 확인. 브라우저에서 `…/config.js` 를 직접 열어 값이 들어 있는지 보세요 |
| "캠페인이 없습니다" | 정상입니다. **＋ 새 캠페인** 으로 시작하세요 |
| 뷰어에게 캠페인이 안 보임 | **회원 관리 › 회원**에서 그 뷰어의 **광고주 지정**에 캠페인의 광고주가 들어 있는지 확인 |
| 저장 시 `new row violates row-level security` | 뷰어(조회 전용) 계정입니다. 마스터 계정으로 로그인하세요 |
| 배포는 됐는데 화면이 깨짐 | `.github` 폴더까지 올라갔는지, Pages Source 가 **GitHub Actions** 인지 확인 |

---

## 비용

| | 무료 한도 | 이 대시보드 기준 |
|---|---|---|
| GitHub Pages | Public 저장소 무제한 | 넉넉함 |
| Supabase Free | DB 500MB · 월 활성 사용자 5만 | 캠페인 수백 건 · 일별 실적 수십만 행까지 여유 |

프로젝트를 2주 이상 아무도 쓰지 않으면 Supabase 무료 플랜은 일시 정지됩니다.
대시보드에 접속하면 다시 깨어나지만, 실무에 쓰기 시작하면 Pro 플랜($25/월)을 권합니다.

---

## 아직 안 된 것

- 소재 이미지 업로드 (지금은 링크 입력만) — Supabase Storage 연동 예정
- 매체 API 자동 연동 (지금은 수동 입력 · 붙여넣기)
- 리포트 PDF 내보내기
