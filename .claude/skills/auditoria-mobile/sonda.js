// Sonda de responsividade — roda dentro da página via browser_evaluate.
//
// Mede o que dá pra medir. Não opina sobre estética: devolve números e os
// elementos culpados, e quem lê decide. O critério é o aluno consumindo o mapa
// no celular — "consigo ler e navegar?", não "está bonito?".
//
// Cinco coisas aqui existem porque a sonda mentiu sem elas. Cada uma custou uma
// rodada, e são o motivo de este arquivo não ser cinco linhas de querySelector:
//
// 1. Com `overflow-hidden` na raiz, `scrollWidth` NÃO cresce. O vazamento marca
//    zero e o conteúdo simplesmente some, decepado, sem scroll pra alcançar.
//    Isso é pior que barra horizontal, e era o que estava passando batido.
// 2. Dentro do canvas, tamanho é função do ZOOM, não do CSS. Contar aresta de
//    1px e texto de 8px lá dentro enterrou os achados reais sob 200 de ruído.
// 3. Quem engole a tela aqui é uma barra lateral em flex, não um painel
//    flutuante. Filtrar por position:fixed/absolute deixava passar o culpado
//    número um.
// 4. Passar da borda dentro de um container com overflow-x:auto é alcançável.
//    Sem essa checagem, todo dock rolável virava falso alarme.
// 5. Gaveta fechada mora fora do viewport de propósito. Sem `totalmenteFora`,
//    consertar o layout PIORAVA os números — a própria solução era acusada.
//
// Uso: passe o corpo desta arrow function no mcp__playwright__browser_evaluate.
() => {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const TOQUE_MIN = 44; // Apple HIG; Material pede 48
  const TOQUE_GRAVE = 32; // abaixo disso o dedo erra sempre
  const FONTE_MIN = 12;
  const TOPO = 10;

  /**
   * O que é PALCO, não layout.
   *
   * O `svg[data-obra]` é o mundo da Obra: viewBox fixo de 2600×2100, maior que
   * qualquer tela por construção, com a câmera aplicada por transform. Ele
   * aparecia como "sobra 1609px" — falso alarme idêntico ao que o canvas do
   * React Flow gerava, e pela mesma razão: conteúdo pan-and-zoom não obedece
   * às regras de conteúdo em fluxo.
   */
  const noCanvas = (el) =>
    !!el.closest(".react-flow__viewport, .react-flow__edges") ||
    el.matches("svg[data-obra]") ||
    !!el.closest("svg[data-obra]");

  const visivel = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    const s = getComputedStyle(el);
    return (
      s.visibility !== "hidden" &&
      s.display !== "none" &&
      Number(s.opacity) > 0.05
    );
  };

  const apelido = (el) => {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : "";
    const cls = (el.getAttribute("class") || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((c) => `.${c}`)
      .join("");
    const txt = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 30);
    return `${tag}${id}${cls}${txt ? ` "${txt}"` : ""}`;
  };

  const caixa = (el) => {
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.left),
      y: Math.round(r.top),
      w: Math.round(r.width),
      h: Math.round(r.height),
    };
  };

  /** quanto do viewport este elemento realmente ocupa, em % */
  const pctTela = (el) => {
    const r = el.getBoundingClientRect();
    const vis =
      Math.max(0, Math.min(r.right, W) - Math.max(r.left, 0)) *
      Math.max(0, Math.min(r.bottom, H) - Math.max(r.top, 0));
    return Math.round((vis / (W * H)) * 100);
  };

  const todos = Array.from(document.querySelectorAll("body *"));
  const foraDoCanvas = todos.filter((el) => !noCanvas(el));
  const rasos = (arr) => arr.filter((el, _i, a) => !a.some((o) => o !== el && o.contains(el)));

  /**
   * Gaveta fechada não é conteúdo perdido.
   *
   * Um painel off-canvas fica INTEIRAMENTE fora do viewport de propósito. O que
   * denuncia corte é o elemento que começa dentro e termina fora — esse o olho
   * vê pela metade e não alcança o resto.
   */
  const totalmenteFora = (el) => {
    const r = el.getBoundingClientRect();
    return r.right <= 0 || r.left >= W || r.bottom <= 0 || r.top >= H;
  };

  /** Passa da borda, mas há um container rolável no caminho: dá pra alcançar. */
  const alcancavel = (el) => {
    let n = el.parentElement;
    while (n && n !== document.body) {
      const ox = getComputedStyle(n).overflowX;
      if (ox === "auto" || ox === "scroll") return true;
      n = n.parentElement;
    }
    return false;
  };

  // -------------------------------------------------------------------------
  // 1. Conteúdo além da tela — com ou sem como alcançar
  // -------------------------------------------------------------------------
  const raiz = document.documentElement;
  const scrollavel =
    Math.max(raiz.scrollWidth, document.body.scrollWidth) > W + 1;
  const clipado = /hidden|clip/.test(
    getComputedStyle(document.body).overflowX +
      getComputedStyle(raiz).overflowX +
      (document.body.firstElementChild
        ? getComputedStyle(document.body.firstElementChild).overflowX
        : ""),
  );

  const alem = rasos(
    foraDoCanvas.filter((el) => {
      if (!visivel(el) || totalmenteFora(el)) return false;
      const r = el.getBoundingClientRect();
      return r.right > W + 1 || r.left < -1;
    }),
  );

  // Só é decepado o que passa da borda SEM scroll pra alcançar.
  const decepados = alem
    .filter((el) => !alcancavel(el))
    .slice(0, TOPO)
    .map((el) => ({
      el: apelido(el),
      ...caixa(el),
      sobra: Math.round(el.getBoundingClientRect().right - W),
    }));

  // -------------------------------------------------------------------------
  // 2. Quem rouba a largura do conteúdo principal
  // -------------------------------------------------------------------------
  // Sobe do palco até o body e coleta os IRMÃOS de cada nível: são eles que
  // dividem a largura com o conteúdo. Pega barra lateral em flex, que nenhum
  // filtro de position enxerga.
  const palco =
    document.querySelector(".react-flow") ||
    // a Obra: o palco é o PAI do svg do mundo, que é quem tem o tamanho da tela
    document.querySelector("svg[data-obra]")?.parentElement ||
    document.querySelector("main") ||
    document.querySelector("[data-palco]");

  const ladroes = [];
  if (palco) {
    let n = palco;
    while (n && n.parentElement && n.parentElement !== document.body) {
      for (const irmao of n.parentElement.children) {
        if (irmao === n || !visivel(irmao)) continue;
        // Roubar largura é coisa de elemento em FLUXO. O que é fixed/absolute
        // flutua por cima e cai em `cobrindoConteudo` — misturar os dois fazia
        // o dock aparecer como se estivesse espremendo o mapa.
        const pos = getComputedStyle(irmao).position;
        if (pos === "fixed" || pos === "absolute") continue;
        const r = irmao.getBoundingClientRect();
        const larg = Math.max(0, Math.min(r.right, W) - Math.max(r.left, 0));
        if (larg / W > 0.12) {
          ladroes.push({
            el: apelido(irmao),
            larguraPx: Math.round(larg),
            pctLargura: Math.round((larg / W) * 100),
          });
        }
      }
      n = n.parentElement;
    }
  }

  const pctPalco = palco ? pctTela(palco) : null;
  const largPalco = palco
    ? Math.round(
        Math.max(
          0,
          Math.min(palco.getBoundingClientRect().right, W) -
            Math.max(palco.getBoundingClientRect().left, 0),
        ),
      )
    : null;

  // painel flutuante que cobre o conteúdo — categoria separada dos ladrões
  const cobrindo = rasos(
    foraDoCanvas.filter((el) => {
      if (!visivel(el)) return false;
      const s = getComputedStyle(el);
      if (s.position !== "fixed" && s.position !== "absolute") return false;
      return pctTela(el) > 35 && s.pointerEvents !== "none";
    }),
  )
    .slice(0, 6)
    .map((el) => ({ el: apelido(el), ...caixa(el), pct: pctTela(el) }));

  // -------------------------------------------------------------------------
  // 3. Alvos de toque — só o que é UI de verdade
  // -------------------------------------------------------------------------
  const CLICAVEL =
    'button,a[href],input,select,textarea,[role="button"],[role="tab"],[role="link"],[onclick]';

  const alvos = Array.from(document.querySelectorAll(CLICAVEL))
    // `totalmenteFora` tira os botões que moram na gaveta fechada: eles estão
    // guardados, não perdidos, e apareciam como dezenas de alvos inalcançáveis.
    .filter((el) => visivel(el) && !noCanvas(el) && !totalmenteFora(el))
    .map((el) => {
      const r = el.getBoundingClientRect();
      return {
        el,
        w: r.width,
        h: r.height,
        menor: Math.min(r.width, r.height),
        // um alvo pode estar cortado pela borda da tela e nem ser tocável
        naTela: r.right <= W + 1 && r.left >= -1 && r.bottom <= H + 1,
      };
    })
    .filter((a) => a.menor < TOQUE_MIN);

  // -------------------------------------------------------------------------
  // 4. Texto miúdo — só fora do canvas, pelo mesmo motivo
  // -------------------------------------------------------------------------
  const temTextoProprio = (el) =>
    Array.from(el.childNodes).some(
      (n) => n.nodeType === 3 && n.textContent.trim().length > 1,
    );

  const miudos = foraDoCanvas
    .filter((el) => visivel(el) && !totalmenteFora(el) && temTextoProprio(el))
    .map((el) => ({ el, px: parseFloat(getComputedStyle(el).fontSize) || 16 }))
    .filter((t) => t.px < FONTE_MIN);

  // -------------------------------------------------------------------------
  // 5. Fundamentos
  // -------------------------------------------------------------------------
  const meta = document.querySelector('meta[name="viewport"]');
  const conteudoMeta = meta ? meta.getAttribute("content") : null;

  // h-screen vira 100vh: a barra de endereço do celular come o rodapé e o dock
  // some atrás dela. `dvh` é o conserto.
  const cemVh = foraDoCanvas.filter((el) => {
    if (!visivel(el)) return false;
    const cls = typeof el.className === "string" ? el.className : "";
    return /(^|\s)100vh/.test(getComputedStyle(el).height) || cls.includes("h-screen");
  }).length;

  // -------------------------------------------------------------------------
  // 6. Canvas — dá pra navegar e editar sem mouse?
  // -------------------------------------------------------------------------
  const alca = document.querySelector(".react-flow__handle");
  const canvas = palco?.classList.contains("react-flow")
    ? {
        presente: true,
        nos: document.querySelectorAll(".react-flow__node").length,
        touchAction: getComputedStyle(palco).touchAction,
        alca: alca
          ? `${Math.round(alca.getBoundingClientRect().width)}x${Math.round(alca.getBoundingClientRect().height)}`
          : "ausente",
      }
    : { presente: false };

  return {
    viewport: `${W}x${H}`,
    url: location.pathname + location.search,

    fundamentos: {
      metaViewport: conteudoMeta,
      metaOk: !!conteudoMeta && /width=device-width/.test(conteudoMeta),
      elementos100vh: cemVh,
    },

    // `decepado` é o caso grave: passa da tela E não há como alcançar — nem
    // scroll da página, nem container rolável no caminho.
    alemDaTela: {
      qtd: alem.length,
      alcancaveisPorScroll: alem.length - decepados.length,
      scrollavel,
      clipado,
      decepado: decepados.length > 0 && !scrollavel,
      culpados: decepados,
    },

    palco: {
      seletor: palco ? apelido(palco).split(" ")[0] : null,
      larguraPx: largPalco,
      pctLargura: largPalco === null ? null : Math.round((largPalco / W) * 100),
      pctTela: pctPalco,
      roubandoLargura: ladroes,
    },

    cobrindoConteudo: cobrindo,

    toque: {
      abaixoDe44: alvos.length,
      abaixoDe32: alvos.filter((a) => a.menor < TOQUE_GRAVE).length,
      foraDaTela: alvos.filter((a) => !a.naTela).length,
      piores: alvos
        .sort((a, b) => a.menor - b.menor)
        .slice(0, TOPO)
        .map((a) => ({
          el: apelido(a.el),
          tam: `${Math.round(a.w)}x${Math.round(a.h)}`,
          naTela: a.naTela,
        })),
    },

    texto: {
      abaixoDe12px: miudos.length,
      piores: miudos
        .sort((a, b) => a.px - b.px)
        .slice(0, TOPO)
        .map((t) => ({ el: apelido(t.el), px: t.px })),
    },

    canvas,
  };
}
