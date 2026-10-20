/**
 * Mock 계정 시드 (서버 연결 전 테스트용)
 * 처음 실행할 때 이 계정이 저장소에 들어간다. 로그인 테스트: test@moapop.dev / 123456
 * 비밀번호를 평문으로 들고 있는 것은 Mock 한정이다. Supabase 연결 시 이 파일은 삭제한다.
 * 처음 포인트는 0P (2026-10-16 사용자 요청: MY 시연을 0P부터 확인). 이미 저장된 계정은 localStorage 를 지워야 반영된다.
 * 사용처: src/api/auth.ts
 */
import type { Profile } from '../types';

/** Mock 저장소에 보관하는 계정 한 건 (auth.users + profiles 를 합친 모양) */
export interface MockAccount {
  email: string;
  password: string;
  profile: Profile;
}

export const seedAccounts: MockAccount[] = [
  {
    email: 'test@moapop.dev',
    password: '123456',
    profile: { id: 'user-test-1', nickname: '율희', total_points: 0 },
  },
];
