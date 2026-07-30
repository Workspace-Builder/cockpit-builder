"use client";

import clsx from "clsx";
import { ExternalLink } from "lucide-react";
import Inspetor from "./Inspetor";
import type { NoBoard } from "@/lib/model";

// ---------------------------------------------------------------------------
// Detalhes do item — a subtarefa #5 (86ajqefwz)
// ---------------------------------------------------------------------------
// Antes este painel mostrava três caixas tracejadas fixas, independentemente do
// que estivesse selecionado: ficava vazio pra sempre. Agora ele lê o nó clicado.
//
// Três vagas fixas, sempre nesta ordem: aprende → pensa com a IA → executa. A
// ordem é pedagógica e não muda entre os itens (BLUEPRINT-PAGINAS.md §6).
//
// Vaga sem destino aparece TRACEJADA, não some: o mapa mostra o próprio buraco.
// Hoje quase todas estão vazias porque as URLs são as Decisões 5, 6 e 7 — no
// gate. O que o nó já tem (o link dele, a legenda do print) aparece de verdade.
// ---------------------------------------------------------------------------

const NOME_DO_TIPO: Record<string, string> = {
  term: "Início / fim de fase",
  act: "Ação operacional",
  doc: "Documento",
  reg: "Lançamento em registro",
  in: "Entrada — alguém preenche",
  dec: "Decisão",
  db: "Repositório",
  copy: "Trilha paralela · Copy",
  lane: "Agrupador",
  texto: "Texto",
  shot: "Evidência (print)",
  iframe: "Conteúdo embutido",
  video: "Vídeo",
  anim: "Peça interativa",
};

export default function PainelDetalhes({ no }: { no: NoBoard | null }) {
  // Sem seleção, o painel não existe — e o palco fica com a largura toda.
  //
  // Antes ele ficava aberto o tempo inteiro dizendo "nada selecionado": 296px
  // de tela ocupados por um aviso. Painel de detalhes sem detalhe não é
  // contexto, é moldura.
  if (!no) return null;

  return (
    <aside className="flex w-[var(--w-direita)] flex-none flex-col overflow-y-auto border-l border-fio bg-[rgba(16,22,34,.96)]">
      <div className="border-b border-fio px-[18px] pb-3.5 pt-[17px]">
        <b className="block text-[13px] font-bold">Detalhes do item</b>
        <span className="mt-1 block text-[11px] leading-snug text-texto-3">
          {NOME_DO_TIPO[no.tipo] ?? no.tipo}
        </span>
      </div>

      <div className="flex-none px-[18px] py-4">
        <b className="block text-[15px] font-extrabold leading-tight tracking-tight">
          {no.txt || "sem título"}
        </b>
        {no.legenda && (
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-texto-2">
            {no.legenda}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2.5">
          <Vaga
            titulo="Aula"
            sub="Link do vídeo dessa etapa"
            // Decisão 6: as aulas ainda não têm mapa de links.
            url={null}
          />
          <Vaga
            titulo="Inteligência artificial"
            sub="A IA que ajuda nessa etapa"
            // Decisão 7: as 12 IAs caem todas na home do app.
            url={null}
          />
          <Vaga
            titulo="Ferramenta"
            sub={no.url ? "Onde essa etapa é executada" : "Sem link ainda"}
            url={no.url}
          />
        </div>

        <div className="mt-3 border-t border-fio pt-3 font-mono text-[9.5px] leading-relaxed text-texto-3">
          id: {no.id}
        </div>
      </div>

      <Inspetor no={no} />

      <div className="mx-[18px] mb-[18px] rounded-[10px] border border-[rgba(84,201,138,.32)] bg-[rgba(84,201,138,.1)] px-3.5 py-3 text-[11.5px] leading-snug text-texto-2">
        <b className="text-verde">Vaga tracejada = buraco conhecido.</b> As URLs
        de aula e IA são as Decisões 6 e 7 — travadas no gate.
      </div>
    </aside>
  );
}

function Vaga({
  titulo,
  sub,
  url,
}: {
  titulo: string;
  sub: string;
  url: string | null;
}) {
  const conteudo = (
    <>
      <span className="flex items-center gap-1.5">
        <b className="text-[12.5px] font-bold text-texto-2">{titulo}</b>
        {url && <ExternalLink size={11} className="text-texto-3" />}
      </span>
      <span className="mt-0.5 block break-all text-[11px] leading-snug text-texto-3">
        {url ?? sub}
      </span>
    </>
  );

  const classe = clsx(
    "block rounded-xl border px-3.5 py-3",
    url
      ? "border-fio bg-white/[.04] hover:bg-white/[.07]"
      : "border-dashed border-fio-2",
  );

  return url ? (
    <a href={url} target="_blank" rel="noreferrer" className={classe}>
      {conteudo}
    </a>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}
