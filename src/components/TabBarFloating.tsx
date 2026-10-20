/**
 * 하단 플로팅 탭바 (components/navigation.md 'tab-bar-floating')
 * 팝업 검색 / 재고 확인 / MY. 활성 탭은 brand + fill 아이콘, 비활성은 on-ink-muted + regular (BASE 기준).
 * 사용처: App.tsx 의 탭 레이아웃 (popup-detail·login 에서는 보이지 않음)
 */
import { NavLink } from 'react-router-dom';
import { MagnifyingGlass, ShoppingCartSimple, User } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

interface TabItem {
  to: string;
  label: string;
  icon: Icon;
}

const TABS: TabItem[] = [
  { to: '/search', label: '팝업 검색', icon: MagnifyingGlass },
  { to: '/stock', label: '재고 확인', icon: ShoppingCartSimple },
  { to: '/my', label: 'MY', icon: User },
];

export default function TabBarFloating() {
  return (
    <nav
      aria-label="하단 메뉴"
      className="fixed bottom-[calc(12px+env(safe-area-inset-bottom))] left-1/2 z-30 flex h-16 w-[calc(100%-24px)] max-w-[456px] -translate-x-1/2 rounded-full border border-tab-border bg-tab-bg shadow-float"
    >
      {TABS.map(({ to, label, icon: IconComponent }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center justify-center gap-1 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-deep ${
              isActive ? 'text-brand' : 'text-tab-inactive'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <IconComponent size={24} weight={isActive ? 'fill' : 'regular'} aria-hidden />
              <span className="text-tab-label font-semibold">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
