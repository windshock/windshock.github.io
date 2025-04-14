module.exports = {
  content: [
    "./layouts/**/*.html",
    "./content/**/*.{html,md}",
    "./assets/**/*.{js,html}",
  ],
  darkMode: 'class', // ✅ 꼭 필요!
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Spectral"', 'serif'],
      },
      colors: {
        wes: {
          background: '#FDEEEA',       // 로맨틱 핑크 크림
          primary: '#C57B57',          // 로즈 브라운
          accent: '#E9B6A5',           // 살구
          muted: '#5C5470',            // 중후한 자주빛 회색
          light: '#FEF8F3',            // 아이보리
          dark: '#2E1F27',             // 고급 다크 초콜릿
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/line-clamp'),
  ],
};
