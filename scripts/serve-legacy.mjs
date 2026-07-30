// Servidor estático mínimo pro board legado (`index.html`).
// Uso: node scripts/serve-legacy.mjs  →  http://localhost:3980
//
// Existe porque a extração dos nós é feita com o board RODANDO: o motor antigo
// calcula x, y, largura e altura, e ler isso do DOM é mais confiável do que
// interpretar o código que gera (que passa por px()/py(), escala do Figma e
// requestAnimationFrame). O Next serve `src/`, não a raiz do repo — daí este
// servidor de 30 linhas.
//
// Depois de subir, abra /index.html e rode o extrator no console do navegador;
// a saída vai pra dados/legado.json. Ver docs/ARQUITETURA.md §7.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".mp4": "video/mp4",
  ".svg": "image/svg+xml",
};

createServer(async (req, res) => {
  const caminho = decodeURIComponent(
    (req.url || "/").split("?")[0].split("#")[0],
  );
  const arquivo = join(
    process.cwd(),
    normalize(caminho === "/" ? "/index.html" : caminho),
  );
  try {
    const buf = await readFile(arquivo);
    res.writeHead(200, {
      "Content-Type": TIPOS[extname(arquivo)] || "application/octet-stream",
    });
    res.end(buf);
  } catch {
    res.writeHead(404).end("nao encontrado");
  }
}).listen(3980, () => console.log("board legado em http://localhost:3980"));
