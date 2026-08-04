// Builda a versão do ALUNO: HTML estático em `out/`, sem servidor e sem escrita.
// Uso: npm run build:aluno
//
// POR QUE UM SCRIPT E NÃO `MODO=aluno next build` direto no package.json:
// prefixo de variável na linha de comando é sintaxe de shell POSIX, e o npm no
// Windows roda os scripts pelo cmd.exe, onde `MODO=aluno next build` é erro de
// comando não encontrado. A alternativa usual seria a dependência `cross-env`,
// mas o repo acabou de emagrecer (o Postgres saiu inteiro) e 6 linhas de Node
// resolvem sem trazer pacote de volta.
//
// As DUAS variáveis são necessárias, e por motivos diferentes:
//   MODO              lido por next.config.ts (roda no Node do build) pra ligar
//                     `output: "export"` e trocar as ações pelo stub.
//   NEXT_PUBLIC_MODO  atravessa pro bundle do cliente, que é onde `PODE_EDITAR`
//                     (lib/modo.ts) apaga a UI de edição. Sem o prefixo
//                     `NEXT_PUBLIC_` o valor não chega no navegador e o aluno
//                     veria os botões.

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

// Comando como STRING, não `("npx", ["next","build"])`: com `shell: true` o
// Node avisa (DEP0190) que argumentos em array são concatenados sem escape.
// Não há entrada de fora aqui, mas o aviso polui a saída do build a cada rodada.
const r = spawnSync("npx next build", {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, MODO: "aluno", NEXT_PUBLIC_MODO: "aluno" },
});

if (r.status !== 0) process.exit(r.status ?? 1);

// ---------------------------------------------------------------------------
// Conserto: os payloads de prefetch saem com o nome errado
// ---------------------------------------------------------------------------
// O Next 16.2.12 GRAVA os payloads de navegação como pasta aninhada e os PEDE
// com ponto. Medido no navegador, com a build de 6 páginas:
//
//   em disco   out/p/obra/__next.p/$d$id.txt
//   pedido     GET /p/obra/__next.p.$d$id.txt   → 404
//
// São 2 requisições 404 por página publicada (24 no console com 6 páginas).
// Não quebra a tela — o link continua navegando, só que por carga completa em
// vez de transição de cliente. O custo é o prefetch inteiro morto e um console
// cheio de vermelho pra quem abrir o DevTools.
//
// A correção é uma CÓPIA, não um `rename`: se uma versão futura do Next passar
// a pedir o caminho aninhado (ou seja, consertar do lado dele), os arquivos
// originais continuam lá e nada quebra. Copiar custa alguns KB.
//
// A regra é literal: `<dir>/__next.p/A/B/C.txt` vira `<dir>/__next.p.A.B.C.txt`.

const OUT = resolve("out");

/** Todos os arquivos abaixo de um diretório, com o caminho relativo a ele. */
function arquivosDe(dir, prefixo = []) {
  const saida = [];
  for (const nome of readdirSync(dir)) {
    const cheio = join(dir, nome);
    if (statSync(cheio).isDirectory()) {
      saida.push(...arquivosDe(cheio, [...prefixo, nome]));
    } else {
      saida.push({ cheio, partes: [...prefixo, nome] });
    }
  }
  return saida;
}

/** Acha as pastas `__next.*` e escreve o gêmeo de nome achatado ao lado. */
function achatar(dir) {
  let feitos = 0;
  for (const nome of readdirSync(dir)) {
    const cheio = join(dir, nome);
    if (!statSync(cheio).isDirectory()) continue;

    if (nome.startsWith("__next.")) {
      for (const { cheio: origem, partes } of arquivosDe(cheio)) {
        const plano = join(dir, `${nome}.${partes.join(".")}`);
        if (!existsSync(plano)) {
          copyFileSync(origem, plano);
          feitos++;
        }
      }
    } else {
      feitos += achatar(cheio);
    }
  }
  return feitos;
}

if (existsSync(OUT)) {
  const n = achatar(OUT);
  console.log(
    `\n${n} payload(s) de prefetch copiado(s) pro nome que o cliente pede.`,
  );
}
