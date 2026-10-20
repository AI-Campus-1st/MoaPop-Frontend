// Vite 빌드 설정
// React 플러그인 없이 esbuild의 JSX 자동 변환으로 .tsx를 처리한다.
import { defineConfig } from 'vite';

export default defineConfig({
  esbuild: {
    // React 17+ 방식: 파일마다 import React 없이 JSX 사용
    jsx: 'automatic',
  },
});
