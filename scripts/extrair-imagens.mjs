// Tira o base64 de dentro do dump e transforma em arquivo.
// Uso: node scripts/extrair-imagens.mjs
//
// O board legado tem ~1 MB de imagem embutida como data:URL, numa única linha
// do HTML, bloqueante e sem lazy-load (BLUEPRINT.md §11). Arrastar isso pro
// Postgres seria trocar de lugar sem resolver: a imagem viraria coluna `text`
// de 190 KB, carregada em toda listagem.
//
// Aqui cada data:URL vira arquivo em public/assets/metodo/, nomeado pelo hash
// do conteúdo — o que também deduplica (o print do Behance aparece nas duas
// partes do funil e vira um arquivo só). O JSON é reescrito apontando pro
// caminho.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DESTINO = "public/assets/metodo";
const EXT = { jpeg: "jpg", jpg: "jpg", png: "png", gif: "gif", webp: "webp", "svg+xml": "svg" };

mkdirSync(DESTINO, { recursive: true });

const dados = JSON.parse(readFileSync("dados/legado.json", "utf8"));
const escritos = new Map(); // dataURL → caminho público
let bytes = 0;

function gravar(dataUrl) {
  if (escritos.has(dataUrl)) return escritos.get(dataUrl);
  const m = dataUrl.match(/^data:image\/([a-z+]+);base64,(.*)$/s);
  if (!m) return null;
  const buf = Buffer.from(m[2], "base64");
  const hash = createHash("sha1").update(buf).digest("hex").slice(0, 12);
  const arquivo = `${hash}.${EXT[m[1]] || "bin"}`;
  writeFileSync(join(DESTINO, arquivo), buf);
  const caminho = `/assets/metodo/${arquivo}`;
  escritos.set(dataUrl, caminho);
  bytes += buf.length;
  return caminho;
}

const RE_DATA = /data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/g;

/**
 * Tira do HTML a tralha do motor antigo: as 4 portas de conexão e a alça de
 * redimensionar que o `makeNode` grudava em todo nó. O React Flow tem as
 * próprias âncoras — manter as antigas seria carregar 5 divs invisíveis por nó
 * (280 no total) e duas dúzias de classes CSS que só existiam pro motor.
 */
function limparMotorAntigo(html) {
  return html
    .replace(/<div class="port[^"]*"[^>]*><\/div>/g, "")
    .replace(/<div class="rsz"[^>]*><\/div>/g, "")
    .replace(/\s+data-drag(="[^"]*")?/g, "");
}

for (const n of dados.nos) {
  if (n.img?.startsWith("data:")) n.img = gravar(n.img) ?? n.img;
  if (n.html?.includes("data:image")) {
    n.html = n.html.replace(RE_DATA, (url) => gravar(url) ?? url);
  }
  // Os prints do onboarding já eram arquivo; só falta a barra inicial pro
  // Next servir de /public.
  if (n.img && !n.img.startsWith("/") && !n.img.startsWith("data:")) {
    n.img = "/" + n.img.replace(/^\.?\//, "");
  }
  if (n.html) {
    n.html = limparMotorAntigo(n.html)
      .replace(/(src|href)="assets\//g, '$1="/assets/')
      // Os .mp4 moravam na raiz do repo legado e eram referenciados sem barra.
      // Numa rota /p/<id> isso vira /p/arquivo.mp4 e dá 404.
      .replace(/(src|href)="(?!\/|https?:|data:)([^"]+\.mp4)"/g, '$1="/assets/$2"');
  }
}

writeFileSync("dados/legado.json", JSON.stringify(dados, null, 1));

console.log(
  `✓ ${escritos.size} imagem(ns) extraída(s), ${(bytes / 1048576).toFixed(2)} MB → ${DESTINO}`,
);
