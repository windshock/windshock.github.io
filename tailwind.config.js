// tailwind.config.js
module.exports = {
  content: [
    "./layouts/**/*.html",
    "./content/**/*.{html,md}",
    "./assets/**/*.{js,html}",
  ],
  darkMode: 'class', // ✅ 다크 모드 전환에 필수
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Spectral"', 'serif'], // 🎨 헤더와 카드 제목용 폰트
      },
      colors: {
        wes: {
          background: '#FDEEEA',   // 🩷 로맨틱 핑크 크림
          primary: '#C57B57',      // 🧡 로즈 브라운
          accent: '#E9B6A5',       // 🍑 살구
          muted: '#5C5470',        // 🟣 중후한 자주빛 회색
          light: '#FEF8F3',        // 🌸 아이보리
          dark: '#2E1F27',         // 🍫 고급 다크 초콜릿
        }
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(1rem)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.8s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.5s ease-out forwards',
      },
    },
  },
  plugins: [
    require('@tailwindcss/line-clamp'),
  ],
};

