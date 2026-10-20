/**
 * 앱 진입점: 전역 CSS를 불러오고 App 을 #root(index.html)에 그린다.
 * AuthProvider 로 감싸서 모든 화면이 로그인 상태를 읽을 수 있게 한다.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './lib/auth/AuthProvider';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('#root 요소를 찾을 수 없어요. index.html 을 확인하세요.');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
