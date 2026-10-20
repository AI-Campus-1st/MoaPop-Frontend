# MoaPop Frontend

팝업스토어 굿즈 재고를 현장 방문자의 제보로 공유하는 서비스 **MoaPop**의 프론트엔드입니다.
React + TypeScript + Vite + Tailwind CSS로 만든 모바일 우선 웹앱입니다.

> **현재 상태**: 화면은 브라우저 저장소(목업 데이터)로 동작합니다.
> 백엔드(Supabase) 연결 작업을 진행 중이며, 연결이 끝나면 아래 환경 변수를 사용합니다.

## 로컬 실행

필요한 것: Node.js(LTS 권장)

```bash
npm install     # 의존성 설치
npm run dev     # 개발 서버 실행 (주소는 터미널에 표시)
npm run build   # 배포용 빌드 (dist/에 생성)
```

실제 스크립트 이름은 `package.json`의 `scripts`를 기준으로 합니다.

## 환경 변수

키는 코드에 적지 않고 환경 변수로만 읽습니다.

1. `.env.example`을 복사해 `.env.local`을 만듭니다.
   ```bash
   cp .env.example .env.local
   ```
2. `.env.local`에 값을 채웁니다. 로컬 개발이면 백엔드 폴더에서 `supabase status`로 확인한 값을 씁니다.

| 변수 | 내용 |
|---|---|
| `VITE_SUPABASE_URL` | Supabase API 주소 |
| `VITE_SUPABASE_ANON_KEY` | Supabase **공개 키(anon)**. 브라우저에 노출되는 것을 전제로 한 키이며, 데이터 보호는 백엔드의 RLS가 맡는다 |

- `.env.local`은 git에 올라가지 않습니다(`.gitignore`). 저장소에는 빈 값 예시인 `.env.example`만 둡니다.
- 모든 권한을 가진 서버 키(`service_role`)는 **절대 프론트에 넣지 않습니다.**
- 배포(Vercel) 때는 같은 이름의 환경 변수를 Vercel 프로젝트 설정에 등록합니다.

## 폰트

`fonts/`에는 화면에 쓰는 글자만 남긴 서브셋 정보가 있습니다. 원본 폰트 파일은 이 저장소에 포함하지 않습니다.
서브셋을 다시 만드는 방법은 `fonts/kkukkuk-text.txt`에 있습니다.

## 관련 저장소

- 백엔드: MoaPop-Backend (Supabase 마이그레이션, 시드, RLS·RPC, 확인 스크립트)
