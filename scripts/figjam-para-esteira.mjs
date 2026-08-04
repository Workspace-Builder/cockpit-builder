// Converte o board FigJam oficial do CEO em nós e arestas da esteira.
// Uso: node scripts/figjam-para-esteira.mjs   → escreve dados/esteira.json
//
// FONTE: `dados/figjam-oficial.txt` é o dump do MCP do Figma
// (get_figjam, fileKey hMZj1iR2BaRAcbvB4lB0T4, nó raiz 0:1), guardado no repo
// pra que a conversão rode sem depender do MCP estar de pé.
//
// POR QUE ISSO EXISTE: o Onboarding veio do `index.html` legado, que já trazia
// x/y/w/h calculados. O resto do board não tem essa fonte — e reconstruir de
// PNG seria adivinhar coordenada e texto. O dump do FigJam traz geometria,
// texto, links e os conectores por id, então transpor virou conversão, não
// desenho no dedo.
//
// GEOMETRIA (medida, não estimada):
//   - As coordenadas do dump são ABSOLUTAS em todo nível de aninhamento.
//   - Só os elementos de TOPO viram nó. Foi o que o Onboarding fez (67 objetos
//     de topo no Figma → 43 nós no board), e é o que o Figma mostra como
//     objeto na página; os filhos são a tripa de cada grupo.
//   - app = figma × 0,5 + (20093, 45). A escala saiu de comparar cinco nós do
//     Onboarding que existem nos dois lados — bate em 0,4992..0,5006.
//
// COR: o dump não traz preenchimento, e a cor é o que separa `act` roxo de
// `doc` rosa de `copy` amarelo. Ela foi amostrada em pixel no render do board
// (`dados/figjam-cores.tsv`, uma cruz de 8 pontos por forma, moda) — o mesmo
// método que deu as cores do vocabulário em `globals.css`. O mapa abaixo foi
// conferido contra os 19 nós do Onboarding cujo tipo já era conhecido: 19/19.
import { readFileSync, writeFileSync } from "node:fs";

const DUMP = "dados/figjam-oficial.txt";
const CORES = "dados/figjam-cores.tsv";
const SAIDA = "dados/esteira.json";

// O board inteiro, em coordenada do Figma. A esteira do Setup 6D começa no
// Onboarding; os quatro blocos daqui pra frente são o que falta transpor.
const BLOCOS = [
  { id: "dev", nome: "Desenvolvimento da Página", x0: -9000, x1: 3400 },
  { id: "aju", nome: "Ajustes finais", x0: 3400, x1: 11100 },
  { id: "oti", nome: "Otimização da Página", x0: 11100, x1: 15100 },
  { id: "pos", nome: "Pós venda e retro-alimentação", x0: 15100, x1: 99999 },
];

// Artefato do arquivo: filho do frame do funil com coordenada fora do board.
const ARTEFATOS = new Set(["1:749"]);

// Cinza lavado: a moldura de um bloco inteiro. Separado do amarelo lavado, que
// é a swimlane de aprovação.
const LAVADAS = new Set(["#EFF2F2", "#EFEFF2", "#F2EFF2", "#F0F2EF"]);

/** Vocabulário do fluxograma: cor amostrada + forma → tipo do nó. */
function tipoDaForma(forma, cor) {
  // O losango é decisão por definição do vocabulário, e a cor dele não é
  // confiável: quando ele cai dentro da swimlane de aprovação, as amostras das
  // pontas pegam o amarelo do fundo em vez do verde da forma.
  if (forma === "DIAMOND") return "dec";
  switch (cor) {
    case "#757575":
      return "term";
    case "#9747FF":
      return "act";
    case "#FFC7C2":
      return forma === "PARALLELOGRAM_RIGHT" ? "reg" : "doc";
    case "#14AE5C":
      return forma === "DIAMOND" ? "dec" : "in";
    case "#FFCD29":
      return forma === "ENG_DATABASE" ? "db" : "copy";
    // Amarelo lavado e cinza lavado são faixa de fundo, não nó de processo:
    // a swimlane de aprovação e o retângulo que emoldura cada bloco.
    case "#F7DD8C":
    case "#F7DE8C":
    case "#F8DE8B":
    case "#EFF2F2":
    case "#EFEFF2":
    case "#F2EFF2":
    case "#F0F2EF":
      return "lane";
    default:
      return null; // escuro = moldura de print, sem texto: não é nó
  }
}

export function parseFigjam(bruto) {
  const els = [];
  const re = /<([a-z-]+)((?:\s+[a-zA-Z]+="[^"]*")*)\s*(\/?)>/g;
  let m;
  while ((m = re.exec(bruto))) {
    const [, tag, attrsBrutos, auto] = m;
    if (tag === "canvas") continue;
    const attrs = {};
    for (const a of attrsBrutos.matchAll(/([a-zA-Z]+)="([^"]*)"/g))
      attrs[a[1]] = a[2];
    let texto = "";
    if (!auto) {
      const fim = bruto.indexOf(`</${tag}>`, re.lastIndex);
      if (fim > -1) texto = bruto.slice(re.lastIndex, fim).trim();
      if (texto.includes("<")) texto = ""; // era container, não texto
    }
    const linha = bruto.lastIndexOf("\n", m.index);
    els.push({
      tag,
      id: attrs.id,
      forma: attrs.name ?? null,
      x: attrs.x !== undefined ? +attrs.x : null,
      y: attrs.y !== undefined ? +attrs.y : null,
      w: attrs.width !== undefined ? +attrs.width : null,
      h: attrs.height !== undefined ? +attrs.height : null,
      texto,
      de: attrs.connectorStart ?? null,
      para: attrs.connectorEnd ?? null,
      tracejada: attrs.connectorEndCap === "DIAMOND_FILLED",
      oculto: attrs.hidden === "true",
      indent: linha < 0 ? 0 : m.index - linha - 1,
      topo: linha < 0 ? false : m.index - linha - 1 === 2,
      auto: !!auto,
    });
  }
  // Conector pode apontar pra um filho (a imagem dentro do grupo). Como só o
  // objeto de topo vira nó, cada elemento aprende quem é seu ancestral de topo
  // e a aresta é redirecionada pra ele.
  const pilha = [];
  for (const e of els) {
    while (pilha.length && pilha[pilha.length - 1].indent >= e.indent)
      pilha.pop();
    e.ancestral = pilha.length ? pilha[0].id : e.id;
    if (!e.auto) pilha.push(e);
  }
  return els.filter((e) => !ARTEFATOS.has(e.id));
}

/** `[rótulo](url)` do FigJam → { texto, url }. O board usa isso pra linkar. */
function separarLink(bruto) {
  const texto = (bruto || "").replace(/\[([^\]]*)\]\(([^)]*)\)/g, "$1").trim();
  const m = (bruto || "").match(/\]\(([^)]+)\)/);
  return { texto, url: m ? m[1] : null };
}

const emApp = {
  x: (v) => Math.round(v * 0.5 + 20093),
  y: (v) => Math.round(v * 0.5 + 45),
  tam: (v) => Math.round(v * 0.5),
};

const idDe = (figmaId) => "es-" + figmaId.replace(":", "-");

/** Qual lado do nó a aresta encosta, pela posição relativa dos dois centros. */
function lados(a, b) {
  const dx = b.x + b.w / 2 - (a.x + a.w / 2);
  const dy = b.y + b.h / 2 - (a.y + a.h / 2);
  if (Math.abs(dx) >= Math.abs(dy))
    return dx >= 0 ? ["r", "l"] : ["l", "r"];
  return dy >= 0 ? ["b", "t"] : ["t", "b"];
}

// ── conversão ──────────────────────────────────────────────────────────────
const els = parseFigjam(readFileSync(DUMP, "utf8"));
const cores = new Map(
  readFileSync(CORES, "utf8")
    .trim()
    .split(/\r?\n/)
    .map((l) => {
      const p = l.split("\t");
      return [p[0], p[2]];
    }),
);

const blocoDe = (x) => BLOCOS.find((b) => x >= b.x0 && x < b.x1) ?? null;

const nos = [];
const porFigmaId = new Map(); // id do Figma → nó gerado (pra ligar as arestas)
const descartados = [];

for (const e of els) {
  if (!e.topo || e.oculto || e.x === null) continue;
  const bloco = blocoDe(e.x);
  if (!bloco) continue; // fora da esteira nova (funil, captação, onboarding)

  const { texto, url } = separarLink(e.texto);
  let tipo = null;
  let legenda = null;
  let cor = null;

  if (e.tag === "shape-with-text") {
    tipo = tipoDaForma(e.forma, cores.get(e.id));
    if (!tipo) {
      descartados.push({ id: e.id, motivo: "moldura de print", cor: cores.get(e.id) });
      continue;
    }
    // A faixa do bloco não ganha rótulo: o título ("Desenvolvimento da
    // Página", "Ajustes finais"…) já é um nó de texto solto no Figma, e
    // repetir viraria legenda dobrada em cima da mesma faixa.
    //
    // Duas espécies de raia, e elas não podem sair iguais: a de APROVAÇÃO é
    // amarela no Figma e amarela no board (é o padrão do tipo `lane`); a que
    // emoldura um bloco inteiro é quase branca lá, e aqui precisa virar um véu
    // neutro — no tema escuro, uma faixa clara de 5.554 × 11.173 estouraria.
    if (tipo === "lane" && LAVADAS.has(cores.get(e.id)))
      cor = "rgba(255,255,255,0.035)";
  } else if (e.tag === "rounded-rectangle" || e.tag === "frame") {
    // No FigJam a imagem colada vira retângulo (ou grupo de um só filho).
    // O nome do layer ("image 45", "Group 1171276438") é nome de arquivo, não
    // conteúdo — vira figcaption no board, então fica de fora.
    tipo = "shot";
  } else if (e.tag === "text" || e.tag === "sticky") {
    tipo = "texto";
  } else {
    descartados.push({ id: e.id, motivo: `tag ${e.tag}` });
    continue;
  }

  const no = {
    id: idDe(e.id),
    figmaId: e.id,
    // bbox no espaço do Figma — é o que permite recortar o print do render do
    // board sem ter que pedir asset nó a nó.
    fx: e.x,
    fy: e.y,
    fw: e.w,
    fh: e.h,
    doc: "onboarding", // a esteira toda vive numa página só
    bloco: bloco.id,
    tipo,
    x: emApp.x(e.x),
    y: emApp.y(e.y),
    w: emApp.tam(e.w),
    h: emApp.tam(e.h),
    txt: texto || (e.tag === "text" ? e.forma : "") || "",
    cap: legenda,
    cor,
    url,
    img: null,
  };
  nos.push(no);
  porFigmaId.set(e.id, no);
}

const ancestralDe = new Map(els.map((e) => [e.id, e.ancestral]));
const resolver = (figmaId) =>
  porFigmaId.get(figmaId) ?? porFigmaId.get(ancestralDe.get(figmaId));

const arestas = [];
const orfas = [];
for (const e of els) {
  if (e.tag !== "connector" || e.oculto || !e.de || !e.para) continue;
  const a = resolver(e.de);
  const b = resolver(e.para);
  if (!a || !b || a.id === b.id) {
    // Só interessa a aresta que sai OU chega na esteira nova; as que ligam
    // dois nós do onboarding já existem no board.
    if (a || b) orfas.push({ id: e.id, de: e.de, para: e.para });
    continue;
  }
  const [ladoDe, ladoPara] = lados(a, b);
  arestas.push({
    doc: "onboarding",
    de: a.id,
    para: b.id,
    ladoDe,
    ladoPara,
    tracejada: e.tracejada,
    rotulo: separarLink(e.texto).texto || null,
  });
}

const resumo = {
  nos: nos.length,
  arestas: arestas.length,
  porBloco: Object.fromEntries(
    BLOCOS.map((b) => [b.id, nos.filter((n) => n.bloco === b.id).length]),
  ),
  porTipo: nos.reduce((a, n) => ((a[n.tipo] = (a[n.tipo] || 0) + 1), a), {}),
  descartados: descartados.length,
  arestasOrfas: orfas.length,
};

writeFileSync(SAIDA, JSON.stringify({ resumo, nos, arestas }, null, 1));
console.log(`✓ ${SAIDA}`);
console.log(`  ${resumo.nos} nós, ${resumo.arestas} arestas`);
console.log(`  por bloco:`, JSON.stringify(resumo.porBloco));
console.log(`  por tipo :`, JSON.stringify(resumo.porTipo));
console.log(`  descartados: ${resumo.descartados} (moldura sem texto)`);
if (orfas.length)
  console.log(`  arestas órfãs: ${orfas.length} — ligam a nó fora da esteira`);
