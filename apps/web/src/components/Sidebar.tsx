import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { podeVerMenu } from '../lib/permissoes';
import { useFavoritos } from '../lib/favoritos';
import type { FavItem } from '../lib/favoritos';
import { Avatar } from './UserMenu';
import { Logo } from './Logo';
import { abrirBusca } from './GlobalSearch';

// ─── SVG Icon helper ──────────────────────────────────────────────────────────

function Ico({ children }: { children: React.ReactNode }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

// ─── Ícones ───────────────────────────────────────────────────────────────────

const IcoHome = () => <Ico><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></Ico>;
const IcoBriefcase = () => <Ico><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></Ico>;
const IcoUsers = () => <Ico><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Ico>;
const IcoFileText = () => <Ico><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></Ico>;
const IcoCreditCard = () => <Ico><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></Ico>;
const IcoLayout = () => <Ico><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></Ico>;
const IcoImage = () => <Ico><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></Ico>;
const IcoStar = () => <Ico><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></Ico>;
const IcoTrendingUp = () => <Ico><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></Ico>;
const IcoDiamond = () => <Ico><path d="M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z"/></Ico>;
const IcoUserPlus = () => <Ico><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></Ico>;
const IcoShoppingBag = () => <Ico><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></Ico>;
const IcoCode = () => <Ico><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></Ico>;
const IcoZap = () => <Ico><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></Ico>;
const IcoMessageCircle = () => <Ico><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Ico>;
const IcoChat = () => <Ico><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="13" y2="14"/></Ico>;
const IcoUserCheck = () => <Ico><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></Ico>;
const IcoSettings = () => <Ico><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Ico>;
const IcoInbox = () => <Ico><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></Ico>;
const IcoBullhorn = () => <Ico><path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 22-7z"/></Ico>;
const IcoCalendar = () => <Ico><path d="M8 2v4"/><path d="M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/></Ico>;
const IcoChevronLeft = () => <Ico><polyline points="15 18 9 12 15 6"/></Ico>;
const IcoChevronRight = () => <Ico><polyline points="9 18 15 12 9 6"/></Ico>;
const IcoLogOut = () => <Ico><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></Ico>;

function IcoStar16({ filled }: { filled: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}
function IcoBusca() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface NavItem {
  para: string;
  rotulo: string;
  icone: React.ReactNode;
  fim?: boolean;
  subItens?: NavItem[];
}

interface NavGroup {
  label: string;
  icone: React.ReactNode;
  collapsible?: boolean;
  items: NavItem[];
}

// ─── Grupos de navegação ──────────────────────────────────────────────────────

const GRUPOS: NavGroup[] = [
  {
    label: 'Início',
    icone: <IcoHome />,
    items: [
      { para: '/',          rotulo: 'Dashboard',  icone: <IcoHome />, fim: true },
      { para: '/inbox',     rotulo: 'Inbox',      icone: <IcoInbox /> },
      { para: '/comunicados', rotulo: 'Comunicados', icone: <IcoBullhorn /> },
      { para: '/comunicados-cliente', rotulo: 'Comunicar clientes', icone: <IcoBullhorn /> },
    ],
  },
  {
    label: 'Comercial',
    icone: <IcoUsers />,
    collapsible: true,
    items: [
      { para: '/comercial',  rotulo: 'Comercial',  icone: <IcoBriefcase /> },
      { para: '/meu-painel', rotulo: 'Meu Painel', icone: <IcoHome /> },
      { para: '/negocios',   rotulo: 'Negócios',   icone: <IcoBriefcase /> },
      { para: '/contatos',   rotulo: 'Contatos',   icone: <IcoUsers />, subItens: [
        { para: '/contatos/pessoas', rotulo: 'Pessoas', icone: <IcoUsers /> },
        { para: '/contatos/empresas', rotulo: 'Empresas', icone: <IcoBriefcase /> },
      ] },
      { para: '/atividades', rotulo: 'Atividades', icone: <IcoFileText /> },
      { para: '/agendamento', rotulo: 'Agendamento', icone: <IcoCalendar /> },
      { para: '/metricas',   rotulo: 'Métricas',   icone: <IcoTrendingUp /> },
      { para: '/onboarding', rotulo: 'Onboarding', icone: <IcoStar /> },
      { para: '/medalhas',   rotulo: 'Medalhas',   icone: <IcoStar /> },
      { para: '/contratos',  rotulo: 'Contratos',  icone: <IcoFileText /> },
      { para: '/planos',     rotulo: 'Planos e Produtos', icone: <IcoFileText /> },
      { para: '/cobrancas',  rotulo: 'Cobranças',  icone: <IcoCreditCard /> },
      { para: '/financeiro', rotulo: 'Financeiro', icone: <IcoCreditCard /> },
      { para: '/centro-custo', rotulo: 'Centro de custo', icone: <IcoCreditCard /> },
      { para: '/projetos',   rotulo: 'Projetos',   icone: <IcoLayout /> },
    ],
  },
  {
    label: 'Marketing',
    icone: <IcoImage />,
    collapsible: true,
    items: [
      { para: '/conteudos', rotulo: 'Conteúdo', icone: <IcoImage /> },
      { para: '/painel-designer', rotulo: 'Painel do designer', icone: <IcoLayout /> },
      { para: '/estrategia', rotulo: 'Estratégia', icone: <IcoFileText /> },
      { para: '/qualidade', rotulo: 'Qualidade', icone: <IcoStar /> },
      { para: '/trafego',   rotulo: 'Tráfego',   icone: <IcoTrendingUp /> },
    ],
  },
  {
    label: 'Operações',
    icone: <IcoSettings />,
    collapsible: true,
    items: [
      { para: '/squads',       rotulo: 'Squads',       icone: <IcoDiamond /> },
      { para: '/reunioes',     rotulo: 'Reuniões',     icone: <IcoFileText /> },
      { para: '/agenda',       rotulo: 'Agenda',       icone: <IcoFileText /> },
      { para: '/recrutamento', rotulo: 'Recrutamento', icone: <IcoUserPlus /> },
      { para: '/banco-talentos', rotulo: 'Banco de talentos', icone: <IcoUsers /> },
      { para: '/compras',      rotulo: 'Compras',      icone: <IcoShoppingBag /> },
      { para: '/inventario',   rotulo: 'Inventário',   icone: <IcoLayout /> },
      { para: '/educacional',  rotulo: 'Educacional',  icone: <IcoStar /> },
      { para: '/metas',        rotulo: 'Metas',        icone: <IcoTrendingUp /> },
      { para: '/ouvidoria',    rotulo: 'Ouvidoria',    icone: <IcoFileText /> },
      { para: '/enps',         rotulo: 'eNPS',         icone: <IcoStar /> },
      { para: '/documentos',   rotulo: 'Documentos',   icone: <IcoFileText /> },
      { para: '/desempenho',   rotulo: 'Desempenho',   icone: <IcoTrendingUp /> },
      { para: '/desenvolvimento', rotulo: 'Bugs & Dev', icone: <IcoCode /> },
      { para: '/automacoes',   rotulo: 'Automações',   icone: <IcoZap /> },
    ],
  },
  {
    label: 'Atendimento',
    icone: <IcoMessageCircle />,
    items: [
      { para: '/atendimento', rotulo: 'Atendimento',  icone: <IcoMessageCircle /> },
      { para: '/nps-cliente', rotulo: 'NPS de cliente', icone: <IcoStar /> },
      { para: '/pesquisas',   rotulo: 'Pesquisas',    icone: <IcoFileText /> },
      { para: '/chat',        rotulo: 'Chat interno', icone: <IcoChat /> },
    ],
  },
];

const GRUPO_ADMIN: NavGroup = {
  label: 'Gestão',
  icone: <IcoUserCheck />,
  collapsible: true,
  items: [
    { para: '/configuracoes', rotulo: 'Configurações', icone: <IcoSettings /> },
  ],
};

// Grupo da Área administrativa — visível para Jurídico (e Admin/Superadmin).
const GRUPO_ADMINISTRATIVO: NavGroup = {
  label: 'Área administrativa',
  icone: <IcoBriefcase />,
  collapsible: true,
  items: [
    { para: '/contratos',  rotulo: 'Contratos',  icone: <IcoFileText /> },
    { para: '/onboarding', rotulo: 'Onboarding', icone: <IcoStar /> },
    { para: '/captacao',   rotulo: 'Captação',   icone: <IcoFileText /> },
    { para: '/ouvidoria',  rotulo: 'Ouvidoria',  icone: <IcoFileText /> },
    { para: '/equipe',     rotulo: 'Equipe',     icone: <IcoUserCheck /> },
  ],
};

const TODOS_ITENS: NavItem[] = GRUPOS.flatMap((g) => g.items);

// Catálogo plano de menus (rota + rótulo, agrupado) para a tela de Perfis de
// acesso (Equipe). Derivado dos próprios grupos — fonte única de verdade das
// rotas permissionáveis, incluindo subitens e os grupos administrativos.
export interface CatalogoMenuItem { para: string; rotulo: string }
export interface CatalogoMenuGrupo { grupo: string; itens: CatalogoMenuItem[] }
export const CATALOGO_MENUS: CatalogoMenuGrupo[] = [...GRUPOS, GRUPO_ADMINISTRATIVO, GRUPO_ADMIN].map((g) => ({
  grupo: g.label,
  itens: g.items.flatMap((i) => [
    { para: i.para, rotulo: i.rotulo },
    ...((i.subItens ?? []).map((s) => ({ para: s.para, rotulo: s.rotulo }))),
  ]),
}));

// ─── Status de teste por tela (bolinha ao lado do item) ───────────────────────
// 'ok' verde = testado e funcional; 'erro' vermelho = tem erro a ajustar.
// Telas não listadas caem em 'na' (amarelo = não testado). Base: suíte E2E que
// passa em produção (verde) + achados do qa-explorador (vermelho).
type StatusTeste = 'ok' | 'na' | 'erro';

const STATUS_TESTE: Record<string, StatusTeste> = {
  '/clientes': 'ok',
  '/planos': 'ok',
  '/squads': 'ok',
  '/equipe': 'ok',
  '/conteudos': 'ok',
  '/estrategia': 'ok',
  '/chat': 'ok',
  '/atendimento': 'ok',
  '/': 'ok',            // Dashboard: "Peças" corrigido (era "Pecas" sem cedilha)
  '/nps-cliente': 'ok', // NPS: pluralização "resposta(s)" corrigida (era "1 respostas")
};

const COR_STATUS: Record<StatusTeste, string> = {
  ok: '#2ecc71',
  na: '#ffb44d',
  erro: '#e2738a',
};

const ROTULO_STATUS: Record<StatusTeste, string> = {
  ok: 'Testado e funcional',
  na: 'Não testado',
  erro: 'Tem erro — precisa ajustar',
};

function PontoStatusTeste({ para }: { para: string }) {
  const status: StatusTeste = STATUS_TESTE[para] ?? 'na';
  return (
    <span
      title={ROTULO_STATUS[status]}
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: 999,
        background: COR_STATUS[status],
        marginRight: 6,
        flexShrink: 0,
      }}
    />
  );
}

// ─── Chaves de persistência ───────────────────────────────────────────────────

const COLLAPSED_KEY = 'brk.sidebar.collapsed';
const GROUPS_KEY    = 'brk.sidebar.groups';

function readGroupsState(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(GROUPS_KEY) ?? '{}'); } catch { return {}; }
}
function writeGroupsState(s: Record<string, boolean>) {
  try { localStorage.setItem(GROUPS_KEY, JSON.stringify(s)); } catch { /* noop */ }
}

// ─── Sidebar principal ────────────────────────────────────────────────────────

export function Sidebar({ mobileAberta = false }: { mobileAberta?: boolean } = {}) {
  const { usuario, logout } = useAuth();
  const { favoritos, toggleFav } = useFavoritos();
  const isAdmin = usuario?.cargo === 'ADMIN' || usuario?.cargo === 'SUPERADMIN';
  const isJuridico = usuario?.cargo === 'JURIDICO';

  // Filtra itens (e subitens) pelo perfil de acesso do usuário. Mantém o item
  // pai quando ele próprio é permitido OU quando ainda tem algum subitem visível.
  function filtrarItens(items: NavItem[]): NavItem[] {
    return items
      .map((it): NavItem | null => {
        if (it.subItens) {
          const subs = it.subItens.filter((s) => podeVerMenu(usuario, s.para));
          if (!podeVerMenu(usuario, it.para) && subs.length === 0) return null;
          return { ...it, subItens: subs };
        }
        return podeVerMenu(usuario, it.para) ? it : null;
      })
      .filter((x): x is NavItem => x !== null);
  }

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(COLLAPSED_KEY) === '1'; } catch { return false; }
  });

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0'); } catch { /* noop */ }
  }

  // Lista plana p/ modo colapsado e favoritos. Inclui os grupos administrativos
  // visíveis ao usuário e deduplica por rota (Equipe/Captação vivem só nesses
  // grupos; Contratos/Onboarding/Ouvidoria já aparecem nos grupos principais).
  const todosItens = filtrarItens(
    Array.from(
      new Map(
        [
          ...TODOS_ITENS,
          ...(isAdmin || isJuridico ? GRUPO_ADMINISTRATIVO.items : []),
          ...(isAdmin ? GRUPO_ADMIN.items : []),
        ].map((item) => [item.para, item]),
      ).values(),
    ),
  );

  function toggleFavItem(item: NavItem) {
    toggleFav({ para: item.para, rotulo: item.rotulo });
  }

  return (
    <aside className={`brk-sidebar${collapsed ? ' collapsed' : ''}${mobileAberta ? ' mobile-open' : ''}`}>
      {/* ── Logo ── */}
      <div className="brk-sidebar-logo">
        <Logo tamanho={collapsed ? 20 : 22} comTexto={!collapsed} />
      </div>

      {/* ── Perfil social no topo ── */}
      <div className={`brk-sidebar-perfil${collapsed ? ' collapsed' : ''}`}>
        {usuario && (
          <>
            <div className="brk-sidebar-perfil-avatar">
              <Avatar nome={usuario.nome} userId={usuario.id} size={collapsed ? 34 : 42} editable />
              <span className="brk-sidebar-perfil-status" title="Online" />
            </div>
            {!collapsed && (
              <div className="brk-sidebar-perfil-info">
                <span className="brk-sidebar-perfil-nome">{usuario.nome}</span>
                <span className="brk-sidebar-perfil-cargo">{usuario.cargo}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Busca (só expandido) ── */}
      {!collapsed && (
        <button className="brk-sidebar-busca" onClick={abrirBusca} title="Buscar (Ctrl+K)">
          <IcoBusca />
          <span className="brk-sidebar-busca-text">Buscar…</span>
          <kbd className="brk-sidebar-busca-kbd">⌘K</kbd>
        </button>
      )}

      <nav className="brk-sidebar-nav">
        {/* Favoritos (só expandido) */}
        {!collapsed && favoritos.length > 0 && (
          <div className="brk-sidebar-group">
            <span className="brk-sidebar-label">Favoritos</span>
            {favoritos.map((fav) => {
              const item = todosItens.find((i) => i.para === fav.para);
              if (!item) return null;
              return (
                <SidebarLink key={fav.para} {...item} favoritado onToggleFav={() => toggleFavItem(item)} />
              );
            })}
          </div>
        )}

        {collapsed ? (
          <div className="brk-sidebar-group">
            {todosItens.map((item) => (
              <SidebarLink key={item.para} {...item} />
            ))}
          </div>
        ) : (
          <>
            {GRUPOS.map((grupo) => {
              const items = filtrarItens(grupo.items);
              if (items.length === 0) return null;
              return (
                <NavGrupo
                  key={grupo.label}
                  {...grupo}
                  items={items}
                  favoritos={favoritos}
                  onToggleFav={(item) => toggleFavItem(item)}
                />
              );
            })}
            {(isAdmin || isJuridico) && filtrarItens(GRUPO_ADMINISTRATIVO.items).length > 0 && (
              <NavGrupo
                {...GRUPO_ADMINISTRATIVO}
                items={filtrarItens(GRUPO_ADMINISTRATIVO.items)}
                favoritos={favoritos}
                onToggleFav={(item) => toggleFavItem(item)}
              />
            )}
            {isAdmin && filtrarItens(GRUPO_ADMIN.items).length > 0 && (
              <NavGrupo
                {...GRUPO_ADMIN}
                items={filtrarItens(GRUPO_ADMIN.items)}
                favoritos={favoritos}
                onToggleFav={(item) => toggleFavItem(item)}
              />
            )}
          </>
        )}
      </nav>

      <div className="brk-sidebar-footer">
        <button
          type="button"
          className="brk-sidebar-toggle"
          onClick={toggleCollapse}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <IcoChevronRight /> : <IcoChevronLeft />}
          <span className="brk-sidebar-toggle-label">Recolher</span>
        </button>

        {/* Logout rápido no footer */}
        <button
          type="button"
          onClick={logout}
          className="brk-sidebar-logout-footer"
          title="Sair"
        >
          <IcoLogOut />
          <span className="brk-sidebar-toggle-label">Sair</span>
        </button>
      </div>
    </aside>
  );
}

// ─── Grupo colapsável ─────────────────────────────────────────────────────────

function NavGrupo({ label, icone, collapsible, items, favoritos, onToggleFav }: NavGroup & {
  favoritos: FavItem[];
  onToggleFav: (item: NavItem) => void;
}) {
  const location = useLocation();

  const hasActiveChild = items.some((item) => {
    if (item.fim) return location.pathname === item.para;
    return location.pathname === item.para || location.pathname.startsWith(item.para + '/');
  });

  const [aberto, setAberto] = useState<boolean>(() => {
    if (!collapsible) return true;
    const saved = readGroupsState();
    return saved[label] !== false;
  });

  useEffect(() => {
    if (hasActiveChild && !aberto) {
      setAberto(true);
      const saved = readGroupsState();
      writeGroupsState({ ...saved, [label]: true });
    }
  }, [hasActiveChild, label]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggle() {
    const next = !aberto;
    setAberto(next);
    const saved = readGroupsState();
    writeGroupsState({ ...saved, [label]: next });
  }

  if (!collapsible) {
    return (
      <div className="brk-sidebar-group">
        {items.map((item) =>
          item.subItens && item.subItens.length ? (
            <SidebarLinkComSub key={item.para} item={item} favoritos={favoritos} onToggleFav={onToggleFav} />
          ) : (
            <SidebarLink key={item.para} {...item}
              favoritado={favoritos.some((f) => f.para === item.para)}
              onToggleFav={() => onToggleFav(item)}
            />
          ),
        )}
      </div>
    );
  }

  return (
    <div className="brk-sidebar-group">
      <button type="button" className="brk-sidebar-group-header" onClick={toggle} aria-expanded={aberto}>
        <span className="brk-sidebar-icon">{icone}</span>
        <span className="brk-sidebar-group-header-text">{label}</span>
        <span className={`brk-sidebar-group-chevron${aberto ? ' open' : ''}`}>
          <IcoChevronRight />
        </span>
      </button>

      {aberto && (
        <div className="brk-sidebar-submenu">
          {items.map((item) =>
            item.subItens && item.subItens.length ? (
              <SidebarLinkComSub key={item.para} item={item} favoritos={favoritos} onToggleFav={onToggleFav} />
            ) : (
              <SidebarLink key={item.para} {...item} sub
                favoritado={favoritos.some((f) => f.para === item.para)}
                onToggleFav={() => onToggleFav(item)}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

// ─── Link de navegação ────────────────────────────────────────────────────────

function SidebarLink({
  para, rotulo, icone, fim, sub, favoritado, onToggleFav,
}: NavItem & { sub?: boolean; favoritado?: boolean; onToggleFav?: () => void }) {
  return (
    <div className="brk-sidebar-item-wrap">
      <NavLink
        to={para}
        end={fim}
        className={({ isActive }) =>
          `brk-sidebar-item${sub ? ' sub' : ''}${isActive ? ' active' : ''}`
        }
        title={rotulo}
      >
        <span className="brk-sidebar-icon" aria-hidden="true">{icone}</span>
        <span className="brk-sidebar-item-label"><PontoStatusTeste para={para} />{rotulo}</span>
      </NavLink>
      {onToggleFav && (
        <button
          type="button"
          className={`brk-sidebar-fav${favoritado ? ' on' : ''}`}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFav(); }}
          title={favoritado ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          <IcoStar16 filled={!!favoritado} />
        </button>
      )}
    </div>
  );
}

// Item de navegação que, ao clicar, abre um sub-submenu (ex.: Contatos → Pessoas).
// O item pai vira um botão de expandir/recolher (não navega); os filhos são
// SidebarLink normais, indentados. Aditivo — não altera o SidebarLink existente.
function SidebarLinkComSub({
  item, favoritos, onToggleFav,
}: {
  item: NavItem;
  favoritos: FavItem[];
  onToggleFav: (item: NavItem) => void;
}) {
  const location = useLocation();
  const filhos = item.subItens ?? [];
  const temFilhoAtivo = filhos.some(
    (f) => location.pathname === f.para || location.pathname.startsWith(f.para + '/'),
  );
  // Inicia expandido para o subitem (ex.: Pessoas) já aparecer sob o pai.
  const [aberto, setAberto] = useState<boolean>(true);

  useEffect(() => {
    if (temFilhoAtivo) setAberto(true);
  }, [temFilhoAtivo]);

  return (
    <div className="brk-sidebar-item-wrap" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      <button
        type="button"
        className={`brk-sidebar-item sub${temFilhoAtivo ? ' active' : ''}`}
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        title={item.rotulo}
        style={{ width: '100%', border: 'none', background: 'transparent', font: 'inherit', cursor: 'pointer', textAlign: 'left' }}
      >
        <span className="brk-sidebar-icon" aria-hidden="true">{item.icone}</span>
        <span className="brk-sidebar-item-label"><PontoStatusTeste para={item.para} />{item.rotulo}</span>
        <span className={`brk-sidebar-group-chevron${aberto ? ' open' : ''}`} style={{ marginLeft: 'auto' }}>
          <IcoChevronRight />
        </span>
      </button>
      {aberto && (
        <div className="brk-sidebar-submenu">
          {filhos.map((f) => (
            <SidebarLink key={f.para} {...f} sub
              favoritado={favoritos.some((x) => x.para === f.para)}
              onToggleFav={() => onToggleFav(f)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function useSidebarMobile() {
  const [aberta, setAberta] = useState(false);
  return {
    aberta,
    abrir: () => setAberta(true),
    fechar: () => setAberta(false),
    alternar: () => setAberta((v) => !v),
  };
}
