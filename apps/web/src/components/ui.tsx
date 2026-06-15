// Biblioteca de componentes UI compartilhados do Breakr OS.
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from 'react';

/* ── Page Header ── */
export function PaginaHeader({
  titulo, subtitulo, acoes,
}: { titulo: string; subtitulo?: string; acoes?: ReactNode }) {
  return (
    <div className="brk-pagina-header">
      <div>
        <h1 className="brk-pagina-titulo">{titulo}</h1>
        {subtitulo && <p className="brk-pagina-subtitulo">{subtitulo}</p>}
      </div>
      {acoes && <div className="brk-pagina-acoes">{acoes}</div>}
    </div>
  );
}

/* ── Buttons ── */
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'primary' | 'secondary' | 'ghost' | 'danger';
  tamanho?: 'sm' | 'md';
  children: ReactNode;
}
export function Btn({ variante = 'primary', tamanho, children, className = '', ...rest }: BtnProps) {
  const cls = [
    'brk-btn',
    variante === 'primary' ? 'brk-btn-primary' : '',
    variante === 'secondary' ? 'brk-btn-secondary' : '',
    variante === 'ghost' ? 'brk-btn-ghost' : '',
    variante === 'danger' ? 'brk-btn-danger' : '',
    tamanho === 'sm' ? 'brk-btn-sm' : '',
    className,
  ].filter(Boolean).join(' ');
  return <button type="button" className={cls} {...rest}>{children}</button>;
}

/* ── Campo / Input ── */
interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  rotulo: string;
  erro?: string;
}
export function Campo({ rotulo, erro, id, ...rest }: CampoProps) {
  const inputId = id ?? `campo-${rotulo.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="brk-campo">
      <label className="brk-campo-label" htmlFor={inputId}>{rotulo}</label>
      <input id={inputId} className={`brk-input${erro ? ' brk-input-error' : ''}`} {...rest} />
      {erro && <span style={{ fontSize: 12, color: 'var(--vermelho)', marginTop: 2 }}>{erro}</span>}
    </div>
  );
}

export function CampoSenha({ rotulo, id, ...rest }: Omit<CampoProps, 'type'>) {
  return <Campo rotulo={rotulo} id={id} type="password" autoComplete="new-password" {...rest} />;
}

export function CampoSelect({
  rotulo, id, children, ...rest
}: { rotulo: string; id?: string; children: ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const selectId = id ?? `select-${rotulo.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="brk-campo">
      <label className="brk-campo-label" htmlFor={selectId}>{rotulo}</label>
      <select id={selectId} className="brk-input" {...rest}>{children}</select>
    </div>
  );
}

/* ── Modal ── */
export function Modal({
  titulo, children, onFechar, rodape,
}: { titulo: string; children: ReactNode; onFechar: () => void; rodape?: ReactNode }) {
  return (
    <div className="brk-overlay" onClick={(e) => { if (e.target === e.currentTarget) onFechar(); }}>
      <div className="brk-modal" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="brk-modal-header">
          <span className="brk-modal-titulo">{titulo}</span>
          <button type="button" className="brk-modal-fechar" onClick={onFechar} aria-label="Fechar">×</button>
        </div>
        <div className="brk-modal-body">{children}</div>
        {rodape && <div className="brk-modal-footer">{rodape}</div>}
      </div>
    </div>
  );
}

/* ── Badge ── */
type Cor = 'verde' | 'vermelho' | 'amarelo' | 'azul' | 'neutro';
export function Badge({ cor = 'neutro', children }: { cor?: Cor; children: ReactNode }) {
  return (
    <span className={`brk-badge brk-badge-${cor}`}>
      <span className="brk-badge-dot" aria-hidden="true" />
      {children}
    </span>
  );
}

/* ── States ── */
export function Carregando({ mensagem = 'Carregando…' }: { mensagem?: string }) {
  return (
    <div className="brk-estado">
      <div className="brk-spinner" role="status" aria-label="Carregando" />
      <span className="brk-estado-sub">{mensagem}</span>
    </div>
  );
}

export function Vazio({ titulo = 'Nenhum item encontrado', subtitulo, acao }: { titulo?: string; subtitulo?: string; acao?: ReactNode }) {
  return (
    <div className="brk-estado">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--borda-forte)' }}>
        <circle cx="12" cy="12" r="10" /><line x1="8" y1="12" x2="16" y2="12" />
      </svg>
      <div>
        <div className="brk-estado-titulo">{titulo}</div>
        {subtitulo && <div className="brk-estado-sub">{subtitulo}</div>}
      </div>
      {acao}
    </div>
  );
}

export function ErroEstado({ mensagem, onTentar }: { mensagem: string; onTentar?: () => void }) {
  return (
    <div className="brk-estado">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--vermelho)' }}>
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <div>
        <div className="brk-estado-titulo">Algo deu errado</div>
        <div className="brk-estado-sub">{mensagem}</div>
      </div>
      {onTentar && <Btn variante="secondary" tamanho="sm" onClick={onTentar}>Tentar novamente</Btn>}
    </div>
  );
}

/* ── Alert inline ── */
export function Alerta({ tipo = 'info', children }: { tipo?: 'erro' | 'sucesso' | 'info' | 'aviso'; children: ReactNode }) {
  return (
    <div role="status" className={`brk-alerta brk-alerta-${tipo}`}>
      {children}
    </div>
  );
}

/* ── Switch ── */
export function Switch({
  ativo, aoAlternar, rotulo,
}: { ativo: boolean; aoAlternar: (v: boolean) => void; rotulo?: string }) {
  return (
    <button
      type="button" role="switch" aria-checked={ativo}
      aria-label={rotulo ?? 'alternar'}
      onClick={() => aoAlternar(!ativo)}
      className="brk-switch-wrap"
      style={{ background: 'none', border: 'none', padding: 0 }}
    >
      <span className={`brk-switch${ativo ? ' on' : ''}`} aria-hidden="true">
        <span className="brk-switch-handle" />
      </span>
      {rotulo && <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--texto-suave)' }}>{rotulo}</span>}
    </button>
  );
}

/* ── Tabs ── */
export function Tabs({
  abas, ativa, aoMudar,
}: { abas: string[]; ativa: string; aoMudar: (a: string) => void }) {
  return (
    <div className="brk-tabs">
      {abas.map((a) => (
        <button
          key={a} type="button"
          className={`brk-tab${ativa === a ? ' active' : ''}`}
          onClick={() => aoMudar(a)}
        >{a}</button>
      ))}
    </div>
  );
}

/* ── Card ── */
export function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={`brk-card brk-card-p ${className}`} style={style}>{children}</div>;
}

/* ── Table helpers ── */
export function Th({ children }: { children: ReactNode }) {
  return <th className="brk-th">{children}</th>;
}
export function Td({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return <td className="brk-td" style={style}>{children}</td>;
}
