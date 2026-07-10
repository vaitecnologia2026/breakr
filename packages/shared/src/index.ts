// Tipos e enums compartilhados entre API e Web (Breakr OS)
// Referência: docs/escopo/02-modelo-de-dados.md

/** Cargos (definem permissões e o painel "Hoje & Atrasados") */
export enum Cargo {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  COMERCIAL = 'COMERCIAL',
  CS = 'CS',
  ESTRATEGISTA = 'ESTRATEGISTA',
  COPYWRITER = 'COPYWRITER',
  DESIGNER = 'DESIGNER',
  EDITOR_VIDEO = 'EDITOR_VIDEO',
  GESTOR_TRAFEGO = 'GESTOR_TRAFEGO',
  FINANCEIRO = 'FINANCEIRO',
  JURIDICO = 'JURIDICO',
}

/** Função do usuário dentro de um squad (base da atribuição automática) */
export enum FuncaoSquad {
  CS = 'CS',
  ESTRATEGISTA = 'ESTRATEGISTA',
  COPYWRITER = 'COPYWRITER',
  DESIGNER = 'DESIGNER',
  EDITOR_VIDEO = 'EDITOR_VIDEO',
  GESTOR_TRAFEGO = 'GESTOR_TRAFEGO',
}

/** Ciclo de vida do cliente */
export enum ClienteStatus {
  NOVO = 'NOVO',
  ONBOARD = 'ONBOARD',
  ATIVO = 'ATIVO',
  RENOVACAO = 'RENOVACAO',
  INATIVO = 'INATIVO',
}

/** Tipos de projeto (até 3 por cliente) */
export enum TipoProjeto {
  MARKETING = 'MARKETING',
  GESTAO = 'GESTAO',
  FINANCEIRO = 'FINANCEIRO',
}

/** Módulos do sistema (para navegação) */
export const MODULOS = [
  { id: 10, slug: 'nucleo', nome: 'Núcleo', fase: 0 },
  { id: 11, slug: 'comercial', nome: 'Comercial / CRM', fase: 3 },
  { id: 12, slug: 'contratos', nome: 'Contratos', fase: 1 },
  { id: 13, slug: 'financeiro', nome: 'Financeiro / BPO', fase: 1 },
  { id: 14, slug: 'cs-portal', nome: 'CS & Portal', fase: 1 },
  { id: 15, slug: 'projetos', nome: 'Projetos', fase: 1 },
  { id: 16, slug: 'marketing', nome: 'Marketing', fase: 2 },
  { id: 17, slug: 'trafego', nome: 'Tráfego + IA', fase: 2 },
  { id: 18, slug: 'qualidade', nome: 'Qualidade', fase: 2 },
  { id: 19, slug: 'rh', nome: 'RH', fase: 3 },
  { id: 20, slug: 'operacoes', nome: 'Operações', fase: 3 },
  { id: 21, slug: 'desenvolvimento', nome: 'Desenvolvimento', fase: 3 },
] as const;

/** Usuário autenticado (payload seguro p/ o front) */
export interface UsuarioPublico {
  id: string;
  nome: string;
  email: string;
  cargo: Cargo;
  // Perfil de acesso (opcional). Quando ausente/null, o usuário enxerga tudo
  // (compatibilidade com usuários já existentes). ADMIN/SUPERADMIN sempre veem tudo.
  perfilId?: string | null;
  // Rotas (menus) liberadas pelo perfil de acesso. Só restringe quando há perfilId.
  permissoes?: string[];
}

export interface LoginResponse {
  token: string;
  usuario: UsuarioPublico;
}
