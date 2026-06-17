// Utilitarios de data.

// Formata uma data como YYYY-MM-DD no fuso de Sao Paulo (America/Sao_Paulo).
// Usar isto — e nao d.toISOString().slice(0,10) — ao enviar datas de vencimento
// ao ASAAS: o toISOString converte para UTC primeiro e, em UTC-3, uma data a
// meia-noite local "volta" para o dia anterior, adiantando o vencimento em 1 dia.
const FORMATADOR_SP = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function dataIsoSaoPaulo(d: Date): string {
  // en-CA produz exatamente o formato YYYY-MM-DD.
  return FORMATADOR_SP.format(d);
}
