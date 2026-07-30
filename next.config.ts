import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Railway/standalone é o padrão de deploy da casa (mesma config da área de
  // membros). Enquanto o board legado ainda serve no GitHub Pages, isto só
  // prepara o terreno — não muda nada em produção.
  output: "standalone",

  // O board é conteúdo interno; embedar terceiros (Docs, ClickUp Forms) é
  // requisito do produto, então nada de X-Frame-Options aqui.
  turbopack: {
    // Pin no diretório do app. Sem isto o Turbopack infere a raiz pelo
    // lockfile mais próximo e sobe até C:\Users\elvis — a pasta-pai deste
    // repo ainda tem espaço no nome, o que piora o palpite.
    root: __dirname,
  },
};

export default nextConfig;
