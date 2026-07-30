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
    ignores: ["index.html", "legacy/**", ".next/**", "node_modules/**"],
  },
];

export default eslintConfig;
