// Configuração do Tailwind (antes ficava inline no index.html, com o Tailwind rodando no navegador).
// O CSS final é gerado em assets/tailwind.css com: npm run build:css
// Em push na main, o GitHub Action .github/workflows/build-css.yml regera o arquivo sozinho.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          base: '#1e1b4b', // Dark Indigo
          primary: '#4F46E5', // Indigo
          success: '#00C38D', // Green Prisme
          accent: '#7C3AED', // Purple
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        blob: 'blob 7s infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
      },
    },
  },
};
