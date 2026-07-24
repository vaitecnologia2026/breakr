// Helpers de permissão de menu/rota por perfil de acesso.
//
// Regras (compatibilidade total com o que já existe):
//  - ADMIN/SUPERADMIN sempre veem tudo.
//  - Usuário SEM perfil (perfilId ausente/null) vê tudo.
//  - Só quando há perfilId as permissões (lista de rotas) passam a restringir.
import type { UsuarioPublico } from '@breakr/shared';

// Rotas que qualquer usuário autenticado sempre acessa (evita lockout).
export const ROTAS_SEMPRE_LIBERADAS = ['/', '/perfil'];

// Rotas unificadas: a antiga "/comercial" foi absorvida por "/negocios". Um perfil
// que já liberava "/comercial" continua enxergando/acessando o quadro (agora em
// "/negocios"), sem precisar reeditar o perfil — ninguém perde acesso.
const ALIAS_ROTA: Record<string, string[]> = {
  '/negocios': ['/comercial'],
};

// true = enxerga tudo (sem restrição de perfil).
export function veTudo(u: UsuarioPublico | null | undefined): boolean {
  if (!u) return true;
  if (u.cargo === 'ADMIN' || u.cargo === 'SUPERADMIN') return true;
  // Sem perfil atribuído → acesso total (usuários já existentes não mudam).
  if (!u.perfilId) return true;
  return false;
}

// Um menu (identificado pela rota "para") é visível para o usuário?
export function podeVerMenu(u: UsuarioPublico | null | undefined, para: string): boolean {
  if (veTudo(u)) return true;
  if (ROTAS_SEMPRE_LIBERADAS.includes(para)) return true;
  const perms = u?.permissoes ?? [];
  if (perms.includes(para)) return true;
  return (ALIAS_ROTA[para] ?? []).some((alias) => perms.includes(alias));
}

// Uma rota (pathname atual) é permitida? Considera sub-rotas:
//  - "/contatos/pessoas" é liberada se a permissão for "/contatos" ou "/contatos/pessoas".
//  - o pai "/contatos" é liberado se houver qualquer permissão que comece com "/contatos/".
export function rotaPermitida(u: UsuarioPublico | null | undefined, pathname: string): boolean {
  if (veTudo(u)) return true;
  if (ROTAS_SEMPRE_LIBERADAS.includes(pathname)) return true;
  const perms = u?.permissoes ?? [];
  const aliases = ALIAS_ROTA[pathname] ?? [];
  return perms.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`) || p.startsWith(`${pathname}/`) || aliases.includes(p),
  );
}

// ── Blocos / informações internas das telas (dashboard, métricas, gestão à vista) ──
// As permissões de bloco convivem na mesma lista `permissoes` (chaves "bloco:*").
// Semântica OPT-IN POR CATEGORIA: se o perfil não marcou NENHUM bloco de uma
// categoria, ele vê TODOS os blocos daquela categoria (compatibilidade — perfis
// já criados, que só têm menus, continuam vendo tudo). Só quando marca ao menos
// um bloco da categoria é que passa a ver apenas os marcados.
export interface BlocoItem { chave: string; rotulo: string }
export interface BlocoGrupo { id: string; grupo: string; itens: BlocoItem[] }

export const CATALOGO_BLOCOS: BlocoGrupo[] = [
  {
    id: 'inicio',
    grupo: 'Início (gestão à vista)',
    itens: [
      { chave: 'bloco:inicio:meu-dia', rotulo: 'Meu dia (Hoje & Atrasados)' },
      { chave: 'bloco:inicio:kpis', rotulo: 'Indicadores (KPIs)' },
      { chave: 'bloco:inicio:motor', rotulo: 'Status do motor de automação' },
      { chave: 'bloco:inicio:csat', rotulo: 'CSAT (satisfação)' },
      { chave: 'bloco:inicio:pendencias', rotulo: 'Precisa de atenção (pendências)' },
    ],
  },
  {
    id: 'meu-painel',
    grupo: 'Meu Painel (dashboard)',
    itens: [
      { chave: 'bloco:painel:kpis', rotulo: 'Indicadores (KPIs)' },
      { chave: 'bloco:painel:parados', rotulo: 'Negócios parados' },
      { chave: 'bloco:painel:etapas', rotulo: 'Negócios por Etapa' },
      { chave: 'bloco:painel:atividades', rotulo: 'Atividades de Hoje' },
      { chave: 'bloco:painel:mes', rotulo: 'Este Mês (Ganhos/Perdidos)' },
      { chave: 'bloco:painel:acoes', rotulo: 'Ações Rápidas' },
    ],
  },
  {
    id: 'metricas',
    grupo: 'Métricas',
    itens: [
      { chave: 'bloco:metricas:meu-painel', rotulo: 'Meu Painel (visão geral)' },
      { chave: 'bloco:metricas:Geral', rotulo: 'Relatórios: Geral' },
      { chave: 'bloco:metricas:Prospecção', rotulo: 'Relatórios: Prospecção' },
      { chave: 'bloco:metricas:Inbound', rotulo: 'Relatórios: Inbound' },
      { chave: 'bloco:metricas:Social Selling', rotulo: 'Relatórios: Social Selling' },
      { chave: 'bloco:metricas:Negociação', rotulo: 'Relatórios: Negociação' },
    ],
  },
];

// Um bloco (identificado por grupoId + chave) é visível para o usuário?
export function podeVerBloco(
  u: UsuarioPublico | null | undefined,
  grupoId: string,
  chave: string,
): boolean {
  if (veTudo(u)) return true;
  const grupo = CATALOGO_BLOCOS.find((g) => g.id === grupoId);
  if (!grupo) return true;
  const perms = u?.permissoes ?? [];
  const algumMarcado = grupo.itens.some((it) => perms.includes(it.chave));
  if (!algumMarcado) return true; // categoria não configurada → mostra tudo
  return perms.includes(chave);
}
