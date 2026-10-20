/**
 * 라우팅 (화면 지도: docs/DESIGN/BASE.md '화면 지도')
 * - 탭 레이아웃: /search, /stock, /my → 화면 아래에 플로팅 탭바
 * - 탭바 없는 화면: /popups/:popupId (하단 고정 바가 대신함), /login, /signup
 * - 로그인이 필요한 화면은 RequireAuth 로 감싼다 (지금은 /my). 버튼 동작은 useRequireAuth 를 쓴다.
 * - /stock(찜 목록), /stock/:popupId(SKU Grid)는 로그인이 필요하지만 RequireAuth 를 쓰지 않는다.
 *   비로그인이면 화면 안에서 로그인을 안내한다(DEV_RULES 2-7).
 * - /stock/:popupId 는 탭 레이아웃 안에 있다. NavLink '/stock' 에 end 가 없어서 탭바 '재고 확인'이 활성으로 보인다.
 */
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import TabBarFloating from './components/TabBarFloating';
import RequireAuth from './lib/auth/RequireAuth';
import LoginPage from './pages/LoginPage';
import MyPage from './pages/my/MyPage';
import PopupSearchPage from './pages/PopupSearchPage';
import PopupDetailPage from './pages/popup-detail/PopupDetailPage';
import SignupPage from './pages/SignupPage';
import StockFavoritesPage from './pages/stock-favorites/StockFavoritesPage';
import StockGridPage from './pages/stock-grid/StockGridPage';

/** 탭 화면 공통 틀: 화면 내용 + 하단 탭바 */
function TabLayout() {
  return (
    <>
      <Outlet />
      <TabBarFloating />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<TabLayout />}>
        <Route path="/search" element={<PopupSearchPage />} />
        <Route path="/stock" element={<StockFavoritesPage />} />
        <Route path="/stock/:popupId" element={<StockGridPage />} />
        <Route
          path="/my"
          element={
            <RequireAuth>
              <MyPage />
            </RequireAuth>
          }
        />
      </Route>

      <Route path="/popups/:popupId" element={<PopupDetailPage />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* 첫 화면과 없는 주소는 팝업 검색으로 */}
      <Route path="*" element={<Navigate to="/search" replace />} />
    </Routes>
  );
}
