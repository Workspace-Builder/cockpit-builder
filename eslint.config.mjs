import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

// eslint-config-next 16 já exporta flat config — não passa por FlatCompat
// (o compat estoura "circular structure" ao serializar o plugin do react).
const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    // O board legado é ES5 num arquivo só — não passa (nem deve passar) pelas
    // regras do app novo. Sai quando virarmos a chave.
    //
    // `.claude/` guarda instrumento, não app: a sonda de responsividade é uma
    // arrow function solta de propósito, pra ser injetada na página pelo
    // Playwright. Lintar como módulo acusa a própria forma dela.
    ignores: [
      "index.html",
      "legacy/**",
      ".next/**",
      "node_modules/**",
      ".claude/**",
      ".mobile-audit/**",
    ],
  },
];

export default eslintConfig;
