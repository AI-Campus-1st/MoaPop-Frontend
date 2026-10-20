/**
 * Vite 환경 변수 타입 선언
 * import.meta.env.VITE_* 값을 타입 검사가 알 수 있게 한다. 값은 .env.local(로컬)·Vercel 설정(배포)에서 온다.
 * 값이 비어 있을 수 있어서 string | undefined로 두고, 쓰는 곳(src/lib/supabase.ts)에서 확인한다.
 */
/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase API 주소 (로컬: supabase status의 Project URL) */
  readonly VITE_SUPABASE_URL: string | undefined;
  /** Supabase 공개 키(Publishable, 예전 이름 anon). 브라우저에 노출되는 전제의 키이며 데이터 보호는 서버의 RLS가 맡는다 */
  readonly VITE_SUPABASE_ANON_KEY: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
