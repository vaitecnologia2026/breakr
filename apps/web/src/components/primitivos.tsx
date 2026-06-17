// Primitivos de layout/compatibilidade compartilhados entre as paginas.
// Empacotam o design system (ui.tsx) com a API usada pelas paginas de CRUD
// (PaginaShell, BotaoPrimario, EstadoCarregando, etc.). Antes moravam dentro de
// pages/Clientes.tsx — o que acoplava 16 paginas a uma pagina; foram movidos
// para ca para quebrar esse acoplamento pagina->pagina.
import type { ReactNode } from 'react';
import {
  PaginaHeader,
  Btn,
  Campo as CampoNovo,
  Carregando,
  Vazio,
  ErroEstado,
  Alerta,
  Th as ThNovo,
  Td as TdNovo,
} from './ui';

export function PaginaShell({
  titulo, subtitulo, acao, children,
}: { titulo: string; subtitulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PaginaHeader titulo={titulo} subtitulo={subtitulo} acoes={acao} />
      {children}
    </section>
  );
}

export function Th({ children }: { children: ReactNode }) {
  return <ThNovo>{children}</ThNovo>;
}

export function Td({ children }: { children: ReactNode }) {
  return <TdNovo>{children}</TdNovo>;
}

export function RodapeContagem({ total, rotulo }: { total: number; rotulo: string }) {
  return (
    <div style={{ padding: '12px 18px', borderTop: '1px solid var(--borda)', fontSize: 12.5, color: 'var(--texto-fraco)', background: 'var(--superficie-2)' }}>
      {total} {rotulo}{total === 1 ? '' : 's'}
    </div>
  );
}

export function BotaoPrimario({
  children, onClick, type = 'button', disabled,
}: { children: ReactNode; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean }) {
  return (
    <Btn variante="primary" type={type} onClick={onClick} disabled={disabled}>
      {children}
    </Btn>
  );
}

export function BotaoSecundario({
  children, onClick, disabled,
}: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <Btn variante="secondary" onClick={onClick} disabled={disabled}>
      {children}
    </Btn>
  );
}

export function Campo({
  rotulo, valor, aoMudar, placeholder, obrigatorio, autoFocus,
}: {
  rotulo: string; valor: string; aoMudar: (v: string) => void;
  placeholder?: string; obrigatorio?: boolean; autoFocus?: boolean;
}) {
  return (
    <CampoNovo
      rotulo={obrigatorio ? `${rotulo} *` : rotulo}
      value={valor}
      onChange={(e) => aoMudar(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      required={obrigatorio}
    />
  );
}

export function Overlay({ children, onFechar }: { children: ReactNode; onFechar: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onFechar}
      className="brk-overlay"
      style={{ animation: 'brk-fade 0.16s ease' }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ animation: 'brk-rise 0.18s ease' }}>
        {children}
      </div>
    </div>
  );
}

export function MensagemErro({ texto }: { texto: string }) {
  return <Alerta tipo="erro">{texto}</Alerta>;
}

export function EstadoCarregando() {
  return <Carregando />;
}

export function EstadoErro({ mensagem, onTentar }: { mensagem: string; onTentar: () => void }) {
  return <ErroEstado mensagem={mensagem} onTentar={onTentar} />;
}

export function PainelVazio({
  titulo, descricao, acao,
}: { titulo: string; descricao: string; acao?: ReactNode }) {
  return <Vazio titulo={titulo} subtitulo={descricao} acao={acao} />;
}
