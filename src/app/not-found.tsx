import Link from "next/link";

export default function NaoEncontrada() {
  return (
    <main className="flex h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="titulinho">404</span>
      <h1 className="text-2xl font-extrabold tracking-tight">
        Essa rota não existe
      </h1>
      <p className="max-w-md text-sm text-texto-2">
        Páginas do Cockpit vivem em <code className="text-texto">/p/&lt;id&gt;</code>.
      </p>
      <Link
        href="/"
        className="rounded-lg border border-fio bg-painel px-5 py-2 text-sm font-semibold hover:bg-painel-2"
      >
        Voltar pro começo
      </Link>
    </main>
  );
}
