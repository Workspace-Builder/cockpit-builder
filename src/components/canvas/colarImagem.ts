"use client";

// ---------------------------------------------------------------------------
// A print da área de transferência, pronta pra virar arquivo
// ---------------------------------------------------------------------------
// Encolher AQUI, no navegador, e não no servidor, é o que evita uma dependência
// nativa (`sharp`, ~30MB) pra fazer o que o `<canvas>` já faz. E é o que
// protege o repositório: desde 2026-08-03 `dados/` é a fonte da verdade e a
// print vai junto, commitada. Print de tela cheia num monitor 2560 é PNG de
// ~2MB; a mesma imagem em 1600px WebP fica em ~200KB. Git guarda binário pra
// sempre e não faz dedup — o que entra aqui não sai mais, então entra magro.
//
// WebP e não PNG: é o formato que todo navegador que roda este app entende há
// anos, e num print de tela (muita área chapada, texto fino) ele ganha do PNG
// sem borrar o texto, que é o que o JPEG faria.
// ---------------------------------------------------------------------------

/** Acima disto nenhum print fica melhor — só mais pesado. */
const LARGURA_MAX = 1600;

/** 0.92: em print de tela o artefato aparece abaixo de ~0.85, no texto pequeno. */
const QUALIDADE = 0.92;

export type ImagemColada = {
  /** `data:image/webp;base64,...` — vai pro servidor e vira arquivo */
  dataUrl: string;
  /** medidas JÁ reduzidas — é delas que sai a proporção do nó */
  largura: number;
  altura: number;
};

/**
 * Tira a imagem de um evento de colar. Devolve `null` quando não há imagem
 * nenhuma — colar texto tem que continuar sendo colar texto.
 */
export function imagemDoEvento(e: ClipboardEvent): Blob | null {
  const itens = e.clipboardData?.items;
  if (!itens) return null;
  for (const item of itens) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const arquivo = item.getAsFile();
      if (arquivo) return arquivo;
    }
  }
  return null;
}

/** Reduz e converte pra WebP. O retorno é o que a Server Action grava. */
export async function prepararImagem(blob: Blob): Promise<ImagemColada> {
  const bitmap = await createImageBitmap(blob);
  try {
    const escala = Math.min(1, LARGURA_MAX / bitmap.width);
    const largura = Math.max(1, Math.round(bitmap.width * escala));
    const altura = Math.max(1, Math.round(bitmap.height * escala));

    const tela = document.createElement("canvas");
    tela.width = largura;
    tela.height = altura;
    const ctx = tela.getContext("2d");
    if (!ctx) throw new Error("canvas 2d indisponível");
    ctx.drawImage(bitmap, 0, 0, largura, altura);

    const dataUrl = tela.toDataURL("image/webp", QUALIDADE);
    // Navegador sem WebP devolveria um PNG com o cabeçalho errado calado —
    // melhor descobrir aqui do que gravar `.webp` que não é WebP.
    if (!dataUrl.startsWith("data:image/webp")) {
      throw new Error("este navegador não converte para WebP");
    }
    return { dataUrl, largura, altura };
  } finally {
    // Libera a memória do bitmap na hora: uma print 4K são ~33MB de RGBA, e
    // colar dez seguidas sem isto segura tudo até o coletor decidir passar.
    bitmap.close();
  }
}

/**
 * Caixa do nó `shot` que nasce da print, em coordenada de board.
 *
 * Largura fixa e altura pela proporção: é assim que os 80 prints da esteira
 * estão, e um nó novo que nasce com outra régua salta aos olhos no meio deles.
 */
export function caixaDoNo(largura: number, altura: number) {
  const w = 360;
  return { w, h: Math.max(40, Math.round((altura / largura) * w)) };
}
