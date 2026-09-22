# 공지사항 · PMS DB 설정

`/admin/`에서 공지를 작성·조회·수정·삭제한다. 저장하면 `/notice/`에 즉시 공개된다. 임시저장, 게시 전환, 상단 고정은 없다. 제목·분류·본문만 입력하며 본문은 줄바꿈을 유지하는 일반 텍스트다.

## 연결

1. PMS backend 변경분과 `backend/.db/patches/20260922-website-notices.sql`을 적용한다. 로그인 횟수 제한은 예약 연동의 `website_rate_limits`를 사용하므로 `20260922-website-booking.sql`도 필요하다. 운영 DB 패치와 배포는 개발 과정에서 실행하지 않았다.
2. PMS에는 `WEBSITE_PROJECT_ID`, `WEBSITE_API_KEY`, `WEBSITE_SESSION_SECRET`을 설정한다. 객실 매핑만 PMS `backend/src/config/website-integration.constants.ts`에 유지한다.
3. 새 환경에서는 `npm run admin:setup`으로 관리자 비밀번호를 발급한다. 기존 설정은 덮어쓰지 않는다. 해시·서명키는 `.env.local`, 비밀번호 확인용 값은 `.env.admin.local`에 저장한다. 두 파일 모두 Git에서 제외한다. 이번 상수 분리에서는 기존 비밀번호를 유지했다.
4. Vercel에는 아래 서버 전용 환경변수를 등록한다. `NEXT_PUBLIC_` 접두사를 사용하지 않는다.

| 환경변수 | 값 |
|---|---|
| `PMS_PROJECT_ID` | `7b85fd96-06a0-42f3-bfb9-cbe14c55718a` |
| `PMS_API_KEY` | PMS의 `WEBSITE_API_KEY`와 동일한 키 |
| `ADMIN_PASSWORD_HASH` | `.env.local`의 관리자 비밀번호 해시 |
| `ADMIN_SESSION_SECRET` | `.env.local`의 관리자 세션 서명키 |

PMS 주소는 `https://pms-api.hio.ai.kr/api`로 고정했다. `src/config/website.server.json`에는 이 공개 주소만 들어 있다. 비밀번호·연동 키·서명키는 소스에 넣지 않는다. Git에는 빈 `.env.example`만 올린다. 환경변수 변경 후 재배포해야 반영된다. Vercel Blob은 사용하지 않는다. 기존 Blob 데이터는 자동 복사·삭제하지 않는다.

## 운영

- 제목 120자, 본문 20,000자, 전체 200건·4 MiB 이내다. 최신 작성순으로 10개씩 표시하고 작성 후 7일 동안 NEW를 표시한다. 수정해도 최초 작성일을 유지한다.
- PMS DB의 `website_notice_catalogs`에 프로젝트별 공지 목록을 저장한다. 수정·삭제는 DB 잠금과 revision 검사로 다른 창의 변경을 덮어쓰지 않는다. 충돌 시 목록을 새로고침한 뒤 수정한다.
- 작성·수정·삭제는 관리자 로그인과 같은 Origin을 확인한다. 공개 조회에는 로그인이 필요 없다. DB 변경과 PMS 활동 로그는 같은 트랜잭션이다.
- 로그인은 PMS DB 공용 카운터로 사이트 전체 합계 1분 10회까지 제한한다. 관리자 세션은 HttpOnly·Secure(프로덕션)·SameSite=Strict 쿠키로 8시간 유지한다.
- 관리자 비밀번호는 Git 제외 파일 `.env.admin.local`에서 확인한다. 재발급은 `npm run admin:setup -- --reset`으로 수행하고 Vercel의 해시·서명키를 교체한 뒤 재배포한다. 기존 관리자 세션은 무효화된다. 수분양자 계정은 관리자가 발급하며 PMS DB에 저장한다.
- 개발은 `npm run dev`, 로컬 프로덕션 확인은 `npm run build` 후 `npm start`다. Vercel은 Next.js 기본 설정을 사용하고 Output Directory를 `out`으로 지정하지 않는다. 배포는 사용자가 진행한다.

## 검증

```bash
npm test
npm run lint
npm run build
npm run test:http
```

홈페이지 HTTP 검사는 실제 Next.js 서버와 외부 PMS 통신 대역을 사용해 로그인·권한·CSRF·CRUD·즉시 공개·충돌·세션 만료를 확인한다. PMS의 서비스/HTTP 검사는 pg-mem과 실제 서비스로 DB 저장·조회·수정·삭제·활동 로그·로그인 제한을 검증한다. 실제 운영 DB는 수정하지 않는다.
