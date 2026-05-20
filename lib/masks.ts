/** CNPJ: 00.000.000/0000-00 */
export function maskCNPJ(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

/** CPF: 000.000.000-00 */
export function maskCPF(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/** CPF ou CNPJ — detecta automaticamente pelo tamanho */
export function maskCPFCNPJ(v: string): string {
  const d = v.replace(/\D/g, "");
  if (d.length <= 11) return maskCPF(v);
  return maskCNPJ(v);
}

/** Valor monetário: R$ 1.234,56 */
export function maskMoney(v: string): string {
  const d = v.replace(/\D/g, "");
  if (!d) return "";
  const n = parseInt(d, 10) / 100;
  return (
    "R$ " +
    n.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/** Chave de acesso NF-e: 0000 0000 0000 ... (44 dígitos em grupos de 4) */
export function maskNFKey(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 44);
  const chunks: string[] = [];
  for (let i = 0; i < d.length; i += 4) chunks.push(d.slice(i, i + 4));
  return chunks.join(" ");
}

/** Código de rastreio: maiúsculas, alfanumérico apenas */
export function maskTrackingCode(v: string): string {
  return v.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

/** Remove toda a formatação de máscara (só dígitos) */
export function stripMask(v: string): string {
  return v.replace(/\D/g, "");
}
