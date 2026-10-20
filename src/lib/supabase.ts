/**
 * Supabase 연결 객체
 * 앱 전체가 함께 쓰는 연결 하나를 만든다. 로그인·테이블 조회·RPC·실시간 구독·Edge Function 호출이 모두 이 객체를 거친다.
 * 사용처: src/api/*.ts (프론트 연결 단계에서 목업 대신 이 객체를 쓰도록 바꾼다). 화면 컴포넌트는 직접 쓰지 않는다.
 * 키: 공개 키(anon)만 환경 변수에서 읽는다. 코드에 키를 적지 않고, 서버 키(service_role)는 절대 쓰지 않는다.
 * 세션: 기본 설정대로 브라우저 저장소에 로그인 세션을 저장하고, 만료 전에 자동으로 갱신한다.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 환경 변수가 없으면 앱이 엉뚱한 곳에 요청하지 않도록, 원인과 해결 방법을 알려 주고 바로 멈춘다
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase 환경 변수가 비어 있습니다. .env.example을 복사해 .env.local을 만들고 ' +
      'VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY를 채운 뒤 개발 서버를 다시 켜세요.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
