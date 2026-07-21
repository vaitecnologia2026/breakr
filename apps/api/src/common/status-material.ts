// StatusMaterial deixou de ser enum do Prisma quando MaterialCampanha.status virou
// String (para permitir COLUNAS CUSTOMIZADAS no board). Mantemos aqui as 9 chaves do
// nucleo — valores IDENTICOS aos do enum anterior — para que toda a logica existente
// que compara/atribui StatusMaterial.* continue valendo sem qualquer mudanca.
export const StatusMaterial = {
  PLANEJADO: 'PLANEJADO',
  EM_COPY: 'EM_COPY',
  COPY_CONCLUIDA: 'COPY_CONCLUIDA',
  EM_DESIGN: 'EM_DESIGN',
  AGUARDANDO_APROVACAO: 'AGUARDANDO_APROVACAO',
  APROVADO: 'APROVADO',
  EM_AJUSTE: 'EM_AJUSTE',
  ATIVO_TRAFEGO: 'ATIVO_TRAFEGO',
  CONCLUIDO: 'CONCLUIDO',
} as const;

// Tipo permissivo (string): o status agora pode ser tambem uma coluna customizada.
export type StatusMaterial = string;
