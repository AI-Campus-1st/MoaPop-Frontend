// Tailwind 설정: docs/DESIGN/BASE.md 의 토큰(색·글꼴·곡률·그림자)을 클래스 이름으로 매핑한다.
// 토큰 값을 바꿀 때는 BASE.md 를 먼저 고치고 여기를 맞춘다.
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#FFFDF6',
        surface: '#FAF6E9',
        card: '#FFFFFF',
        banner: '#EFECDF',
        ink: '#2B2A33',
        'on-ink': '#FFFFFF',
        'on-ink-muted': '#B9B7BF',
        muted: '#6B6A72',
        hairline: '#EDE6CF',
        safe: { strong: '#A0C878', soft: '#DDEB9D', deep: '#4F7A28' },
        warn: { strong: '#FFDEB4', soft: '#FFF9CA', deep: '#B25E00' },
        soldout: { strong: '#FF8787', soft: '#F8C4B4', deep: '#C2272D' },
        brand: { DEFAULT: '#7FE9DE', soft: '#A5F1E9', deep: '#1F7FA8' },
        // 2026-10-15: 비활성 색은 on-ink-muted(#B9B7BF)로 통일
        tab: { bg: '#1E1D24', border: 'rgba(255,255,255,0.10)', inactive: '#B9B7BF' },
        disabled: { bg: '#ECE8DA', text: '#9A988F' },
      },
      borderRadius: { sm: '8px', md: '12px', lg: '20px', xl: '28px' },
      fontFamily: {
        // 'Pretendard Variable' 은 npm 패키지의 가변 글꼴 이름 (src/index.css 에서 등록)
        display: ['Kkukkuk', 'Pretendard Variable', 'Pretendard', 'sans-serif'],
        sans: ['Pretendard Variable', 'Pretendard', 'system-ui', 'sans-serif'],
      },
      // BASE typography 토큰 (크기 + 줄 간격). 굵기는 클래스에서 따로 지정한다.
      fontSize: {
        'display-lg': ['32px', { lineHeight: '1.25' }],
        'display-md': ['24px', { lineHeight: '1.3' }],
        'title-md': ['20px', { lineHeight: '1.35' }],
        'sku-name': ['17px', { lineHeight: '1.35' }],
        'sku-name-compact': ['15px', { lineHeight: '1.35' }],
        'number-md': ['16px', { lineHeight: '1.4' }],
        'body-md': ['16px', { lineHeight: '1.5' }],
        'body-sm': ['14px', { lineHeight: '1.45' }],
        caption: ['13px', { lineHeight: '1.4' }],
        chip: ['14px', { lineHeight: '1' }],
        button: ['16px', { lineHeight: '1' }],
        'tab-label': ['13px', { lineHeight: '1' }],
      },
      boxShadow: {
        float: '0 4px 16px rgba(43,42,51,0.08)',
        chip: '0 1px 4px rgba(43,42,51,0.12)',
      },
    },
  },
  plugins: [],
};
