import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

// ─── Ícones ───────────────────────────────────────────────────────────────────

function IcoSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function IcoPage() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
function IcoUser() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function IcoArrow() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ─── Dados estáticos ──────────────────────────────────────────────────────────

interface ResultItem {
  id: string;
  rotulo: string;
  sub?: string;
  path: string;
  categoria: string;
  icone: React.ReactNode;
}

const PAGINAS: ResultItem[] = [
  { id: 'pg-dash',   rotulo: 'Dashboard',    path: '/',               categoria: 'Páginas', icone: <IcoPage /> },
  { id: 'pg-com',    rotulo: 'Comercial',     path: '/comercial',      categoria: 'Páginas', icone: <IcoPage /> },
  { id: 'pg-cli',    rotulo: 'Clientes',      path: '/clientes',       categoria: 'Páginas', icone: <IcoPage /> },
  { id: 'pg-cont',   rotulo: 'Contratos',     path: '/contratos',      categoria: 'Páginas', icone: <IcoPage /> },
  { id: 'pg-cob',    rotulo: 'Cobranças',     path: '/cobrancas',      categoria: 'Páginas', icone: <IcoPage /> },
  { id: 'pg-proj',   rotulo: 'Projetos',      path: '/projetos',       categoria: 'Páginas', icone: <IcoPage /> },
  { id: 'pg-cont2',  rotulo: 'Conteúdo',      path: '/conteudos',      categoria: 'Páginas', icone: <IcoPage /> },
  { id: 'pg-qual',   rotulo: 'Qualidade',     path: '/qualidade',      categoria: 'Páginas', icone: <IcoPage /> },
  { id: 'pg-traf',   rotulo: 'Tráfego',       path: '/trafego',        categoria: 'Páginas', icone: <IcoPage /> },
  { id: 'pg-sq',     rotulo: 'Squads',        path: '/squads',         categoria: 'Páginas', icone: <IcoPage /> },
  { id: 'pg-rec',    rotulo: 'Recrutamento',  path: '/recrutamento',   categoria: 'Páginas', icone: <IcoPage /> },
  { id: 'pg-comp',   rotulo: 'Compras',       path: '/compras',        categoria: 'Páginas', icone: <IcoPage /> },
  { id: 'pg-dev',    rotulo: 'Bugs & Dev',    path: '/desenvolvimento', categoria: 'Páginas', icone: <IcoPage /> },
  { id: 'pg-aut',    rotulo: 'Automações',    path: '/automacoes',     categoria: 'Páginas', icone: <IcoPage /> },
  { id: 'pg-ate',    rotulo: 'Atendimento',   path: '/atendimento',    categoria: 'Páginas', icone: <IcoPage /> },
  { id: 'pg-eq',     rotulo: 'Equipe',        path: '/equipe',         categoria: 'Páginas', icone: <IcoPage /> },
  { id: 'pg-cfg',    rotulo: 'Configurações', path: '/configuracoes',  categoria: 'Páginas', icone: <IcoPage /> },
  { id: 'pg-inbox',  rotulo: 'Inbox',         path: '/inbox',          categoria: 'Páginas', icone: <IcoPage /> },
  { id: 'pg-comu',   rotulo: 'Comunicados',   path: '/comunicados',    categoria: 'Páginas', icone: <IcoPage /> },
];

// ─── Hook de exposição global ─────────────────────────────────────────────────

let _setAberto: ((v: boolean) => void) | null = null;
export function abrirBusca() { _setAberto?.(true); }

// ─── Componente ───────────────────────────────────────────────────────────────

export function GlobalSearch() {
  const [aberto, setAberto] = useState(false);
  const [query, setQuery] = useState('');
  const [clientes, setClientes] = useState<ResultItem[]>([]);
  const [ativo, setAtivo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Expõe setAberto globalmente
  useEffect(() => { _setAberto = setAberto; return () => { _setAberto = null; }; }, []);

  // Ctrl/Cmd+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setAberto((v) => !v); }
      if (e.key === 'Escape') setAberto(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Foca o input ao abrir
  useEffect(() => {
    if (aberto) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setClientes([]);
      setAtivo(0);
    }
  }, [aberto]);

  // Busca clientes na API (debounced)
  const buscarClientes = useCallback(async (q: string) => {
    if (q.length < 2) { setClientes([]); return; }
    try {
      const { data } = await api.get<{ id: string; nome: string; email: string }[]>(
        `/clientes?busca=${encodeURIComponent(q)}&limite=5`,
      );
      setClientes(
        (data ?? []).slice(0, 5).map((c) => ({
          id: `cli-${c.id}`,
          rotulo: c.nome,
          sub: c.email,
          path: `/clientes`,
          categoria: 'Clientes',
          icone: <IcoUser />,
        })),
      );
    } catch {
      setClientes([]);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => buscarClientes(query), 220);
    return () => clearTimeout(t);
  }, [query, buscarClientes]);

  // Resultados filtrados
  const pagsFiltradas = query
    ? PAGINAS.filter((p) => p.rotulo.toLowerCase().includes(query.toLowerCase()))
    : PAGINAS.slice(0, 6);

  const todos: ResultItem[] = [...pagsFiltradas, ...clientes];

  // Navegação por teclado
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!aberto) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setAtivo((v) => Math.min(v + 1, todos.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((v) => Math.max(v - 1, 0)); }
      if (e.key === 'Enter' && todos[ativo]) { navegar(todos[ativo]); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [aberto, todos, ativo]); // eslint-disable-line react-hooks/exhaustive-deps

  function navegar(item: ResultItem) {
    navigate(item.path);
    setAberto(false);
  }

  if (!aberto) return null;

  // Agrupar por categoria
  const grupos: Record<string, ResultItem[]> = {};
  todos.forEach((item) => {
    if (!grupos[item.categoria]) grupos[item.categoria] = [];
    grupos[item.categoria].push(item);
  });

  let idx = 0;

  return (
    <div className="brk-gs-overlay" onClick={() => setAberto(false)}>
      <div className="brk-gs-modal" onClick={(e) => e.stopPropagation()}>
        {/* Input */}
        <div className="brk-gs-input-wrap">
          <span className="brk-gs-search-ico"><IcoSearch /></span>
          <input
            ref={inputRef}
            className="brk-gs-input"
            placeholder="Buscar páginas, clientes, contratos…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setAtivo(0); }}
          />
          <kbd className="brk-gs-kbd">ESC</kbd>
        </div>

        {/* Resultados */}
        <div className="brk-gs-results">
          {Object.entries(grupos).map(([cat, items]) => (
            <div key={cat} className="brk-gs-group">
              <div className="brk-gs-group-label">{cat}</div>
              {items.map((item) => {
                const i = idx++;
                return (
                  <button
                    key={item.id}
                    className={`brk-gs-item${i === ativo ? ' active' : ''}`}
                    onMouseEnter={() => setAtivo(i)}
                    onClick={() => navegar(item)}
                  >
                    <span className="brk-gs-item-ico">{item.icone}</span>
                    <span className="brk-gs-item-texto">
                      <span className="brk-gs-item-nome">{item.rotulo}</span>
                      {item.sub && <span className="brk-gs-item-sub">{item.sub}</span>}
                    </span>
                    <span className="brk-gs-item-arrow"><IcoArrow /></span>
                  </button>
                );
              })}
            </div>
          ))}

          {todos.length === 0 && query.length >= 2 && (
            <div className="brk-gs-vazio">Nenhum resultado para "{query}"</div>
          )}
        </div>

        {/* Rodapé de atalhos */}
        <div className="brk-gs-footer">
          <span><kbd>↑↓</kbd> navegar</span>
          <span><kbd>↵</kbd> abrir</span>
          <span><kbd>ESC</kbd> fechar</span>
        </div>
      </div>
    </div>
  );
}
