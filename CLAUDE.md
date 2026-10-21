# MoaPop Frontend — Claude Code 작업 지침

이 저장소는 MoaPop의 프론트엔드다. React + TypeScript + Vite + Tailwind CSS, 데이터는 Supabase(백엔드 저장소: `~/moapop-repos/MoaPop-Backend`).

## 대화 방식
- 항상 한국어로 답한다. 기술 용어가 처음 나오면 한 줄로 설명한다(같은 대화에서 다시 설명하지 않는다).
- 작업이 끝나면 바꾼 파일마다 한 줄로 요약한다. 형식: `src/App.tsx` - 무엇을 했는지. 이유·다음 제안은 요청할 때만.

## 승인 절차 (가장 중요)
- **코드를 쓰거나 파일을 바꾸기 전에** 만들거나 바꿀 파일(컴포넌트, 함수) 목록과 확인 방법을 먼저 보여 주고, 사용자가 "OK"라고 한 뒤에만 작성한다.
- 설명·질문·개선 제안은 승인 없이 해도 된다. 적용은 승인 후.
- 승인 범위 안의 사소한 수정(오타, import 정리, 일관성을 위한 이름 변경)은 먼저 하고 나중에 보고한다.
- 다시 물어야 하는 것: 승인 목록에 없는 파일 추가·변경, 로직이나 동작이 바뀌는 수정.
- 새 패키지는 무엇이고 왜 필요한지 설명하고 승인받은 뒤에만 추가한다. 버전은 정확히 고정하고(`--save-exact`), 나온 지 2주가 안 된 버전은 피한다.
- **`git push`는 매번 승인**: `main`에 push하면 Vercel이 바로 운영 배포한다.
- 화면(페이지)은 사용자가 결과를 보고 OK해야 완료다.
- 모호하면 임의로 정하지 말고 먼저 묻는다.

## 코드 규칙
- TypeScript: `any` 금지. 모르는 값은 `unknown`으로 받고 좁혀서 쓴다(서버 응답도 모양을 검사한 뒤 화면 타입으로 바꾼다).
- React: Hook을 쓰는 함수 컴포넌트만. 컴포넌트는 역할 하나만, 화면이 길어지면 역할별로 나눈다.
- 주석: 파일·컴포넌트·함수 단위로 무엇을 하고 어디서 쓰는지. 읽기만으로 의도가 안 보이는 로직(정규식, 여러 단계 변환, 특정 버그 우회)에는 한 줄 주석. 뻔한 코드에는 달지 않는다.

## 구조
- 화면은 `src/api/*`의 함수만 호출한다. Supabase 연결 객체는 `src/lib/supabase.ts` 하나뿐이고 화면 컴포넌트는 직접 쓰지 않는다.
- 데이터 타입은 `src/api/types.ts`. 서버 실패는 `types.ts`의 코드로만 바꿔서 돌려준다.
- 이미지: `image_url` → 공식 게시물 이미지(`src/lib/useOfficialImage.ts`) → 대체 아이콘 순.
- 설계 문서는 저장소 밖(`~/Desktop/campus/workspace/MoaPop_App/docs/`, `…/backend/`의 md)에 있다. 읽을 때 승인을 받고, 문서는 직접 고치지 않고 바꿀 줄을 md 텍스트로 보여 준다.

## 보안
- 키는 코드에 적지 않는다. 환경 변수 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`(공개 키)만 쓴다. 값은 `.env.local`(로컬)과 Vercel 프로젝트 설정(운영)에만 있다.
- **`.env*` 파일은 읽거나 출력하지 않는다**(필요하면 이름과 길이만).
- 서버 키(`service_role`·Secret)는 프론트 어디에도 넣지 않는다.

## 실행과 확인 (직접 실행해서 결과를 읽는다)
- 빌드·타입 검사: `npm run build` (타입 오류가 있으면 배포 전에 막힌다)
- 로컬 실행: 백엔드 저장소에서 `supabase start`, `supabase functions serve` → 여기서 `npm run dev`
- Docker: `docker compose --env-file .env.local up --build` → http://localhost:8080
- 화면 동작은 사용자가 브라우저로 확인한다. 확인할 항목을 번호 표로 제시한다.

## 디버깅 순서 (에이전틱 디버깅 사이클)
1. 증상을 듣는다 → 2. 코드·빌드 출력·Docker 로그를 직접 확인한다(백엔드 로그는 `docker logs supabase_*_backend`) → 3. 원인과 수정 계획(파일 목록 + 확인 방법)을 제시하고 **승인받는다** → 4. 고치고 `npm run build`로 다시 검증한다 → 실패하면 2로.
- 브라우저 Console·Network 내용은 사용자에게 요청한다.
