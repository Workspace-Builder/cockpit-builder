"use client";

import clsx from "clsx";
import {
  Circle,
  Diamond,
  FileText,
  Image as Imagem,
  Minus,
  MousePointer2,
  Play,
  Square,
  SquareDashed,
  Type,
} from "lucide-react";

// ---------------------------------------------------------------------------
// A barra de ferramentas — vertical, flutuante, à esquerda do palco
// ---------------------------------------------------------------------------
// Layout escolhido no wireframe-editor.html: convenção do Figma e do Miro. Ela
// não encosta no dock (que fica embaixo, no centro), então dá pra inserir uma
// forma e pular pra um checkpoint sem trocar de modo.
//
// A ferramenta ativa é ESTADO, não comando: com uma forma selecionada, clicar
// no palco insere. `selecionar` é o repouso — e é pra ele que a barra volta
// depois de cada inserção, senão o segundo clique cria uma forma que ninguém
// pediu.
// ---------------------------------------------------------------------------

/** `null` = ferramenta de seleção (o repouso). */
export type Ferramenta = null | string;

const GRUPOS: { tipo: Ferramenta; icone: React.ReactNode; nome: string; tecla: string }[][] =
  [
    [
      {
        tipo: null,
        icone: <MousePointer2 size={17} />,
        nome: "Selecionar",
        tecla: "V",
      },
    ],
    [
      { tipo: "act", icone: <Square size={17} />, nome: "Ação", tecla: "R" },
      { tipo: "dec", icone: <Diamond size={17} />, nome: "Decisão", tecla: "D" },
      { tipo: "term", icone: <Circle size={17} />, nome: "Início / fim", tecla: "O" },
      { tipo: "doc", icone: <FileText size={17} />, nome: "Documento", tecla: "F" },
      { tipo: "texto", icone: <Type size={17} />, nome: "Texto", tecla: "T" },
      { tipo: "lane", icone: <SquareDashed size={17} />, nome: "Área", tecla: "A" },
    ],
    [
      { tipo: "shot", icone: <Imagem size={17} />, nome: "Imagem", tecla: "I" },
      { tipo: "video", icone: <Play size={17} />, nome: "Vídeo", tecla: "" },
      { tipo: "iframe", icone: <Minus size={17} />, nome: "Janela / iframe", tecla: "" },
    ],
  ];

export default function BarraFerramentas({
  ativa,
  onEscolher,
}: {
  ativa: Ferramenta;
  onEscolher: (f: Ferramenta) => void;
}) {
  return (
    <div className="absolute left-3.5 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-[3px] rounded-2xl border border-fio bg-[rgba(13,18,29,.96)] p-1.5 shadow-[0_16px_44px_rgba(0,0,0,.55)] backdrop-blur-md">
      {GRUPOS.map((grupo, gi) => (
        <div key={gi} className="flex flex-col gap-[3px]">
          {gi > 0 && <span className="mx-1.5 my-1 h-px bg-fio" />}
          {grupo.map((f) => (
            <button
              key={f.nome}
              type="button"
              onClick={() => onEscolher(f.tipo)}
              title={f.tecla ? `${f.nome} · ${f.tecla}` : f.nome}
              aria-label={f.nome}
              aria-pressed={ativa === f.tipo}
              className={clsx(
                "grid h-10 w-10 place-items-center rounded-[10px]",
                ativa === f.tipo
                  ? "bg-azul text-white"
                  : "text-texto-2 hover:bg-white/[.09] hover:text-white",
              )}
            >
              {f.icone}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
