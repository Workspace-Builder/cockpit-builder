/**
 * Id curto e legível. Aparece na URL (`/p/pag-8f3k21`), então tem que caber
 * num link mandado no WhatsApp — por isso não é uuid.
 */
export function novoId(prefixo: string) {
  return `${prefixo}-${Math.random().toString(36).slice(2, 8)}`;
}
