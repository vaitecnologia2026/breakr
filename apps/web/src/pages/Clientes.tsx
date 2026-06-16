import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ClienteStatus } from '@breakr/shared';
import { api } from '../lib/api';
import {
  PaginaHeader, Btn, Campo as CampoNovo, Modal, Badge,
  Carregando, Vazio, ErroEstado, Alerta,
  Th as ThNovo, Td as TdNovo,
} from '../components/ui';

interface Cliente {
  id: string;
  nomeFantasia: string;
  tag: string | null;
  cnpj: string | null;
  status: ClienteStatus;
  codigoUnico: string;
  squadId: string | null;
  planoId: string | null;
  criadoEm: string;
  onboarding: { progresso: number; concluido: boolean } | null;
}

const STATUS_COR: Record<ClienteStatus, 'verde' | 'amarelo' | 'vermelho' | 'neutro' | 'azul'> = {
  [ClienteStatus.NOVO]: 'amarelo',
  [ClienteStatus.ONBOARD]: 'azul',
  [ClienteStatus.ATIVO]: 'verde',
  [ClienteStatus.RENOVACAO]: 'neutro',
  [ClienteStatus.INATIVO]: 'vermelho',
};

const STATUS_ROTULO: Record<ClienteStatus, string> = {
  [ClienteStatus.NOVO]: 'Novo',
  [ClienteStatus.ONBOARD]: 'Onboard',
  [ClienteStatus.ATIVO]: 'Ativo',
  [ClienteStatus.RENOVACAO]: 'Renovação',
  [ClienteStatus.INATIVO]: 'Inativo',
};

export function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [busca, setBusca] = useState('');

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<Cliente[]>('/clientes');
      setClientes(data);
    } catch {
      setErro('Não foi possível carregar os clientes.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  const q = busca.toLowerCase().trim();
  const filtrados = q
    ? clientes.filter(
        (c) =>
          c.nomeFantasia.toLowerCase().includes(q) ||
          (c.tag?.toLowerCase().includes(q) ?? false) ||
          (c.cnpj?.includes(q) ?? false) ||
          c.codigoUnico.toLowerCase().includes(q),
      )
    : clientes;

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PaginaHeader
        titulo="Clientes"
        subtitulo="Carteira de clientes do Breakr OS"
        acoes={<Btn onClick={() => setModalAberto(true)}>+ Novo cliente</Btn>}
      />

      <div className="brk-filtros">
        <div className="brk-search">
          <span className="brk-search-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            className="brk-input"
            type="search"
            placeholder="Buscar por nome, tag ou CNPJ…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            disabled={carregando}
          />
        </div>
      </div>

      {carregando ? (
        <Carregando />
      ) : erro ? (
        <ErroEstado mensagem={erro} onTentar={carregar} />
      ) : filtrados.length === 0 ? (
        <Vazio
          titulo={busca ? 'Nenhum resultado' : 'Nenhum cliente ainda'}
          subtitulo={
            busca
              ? `Nenhum cliente corresponde a "${busca}".`
              : 'Cadastre o primeiro cliente da carteira para começar.'
          }
          acao={!busca ? <Btn onClick={() => setModalAberto(true)}>+ Novo cliente</Btn> : undefined}
        />
      ) : (
        <div className="brk-table-wrap">
          <table className="brk-table">
            <thead>
              <tr>
                <ThNovo>Cliente</ThNovo>
                <ThNovo>Código / Portal</ThNovo>
                <ThNovo>Status</ThNovo>
                <ThNovo>Onboarding</ThNovo>
                <ThNovo>Squad</ThNovo>
                <ThNovo>Criado em</ThNovo>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id}>
                  <TdNovo>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <AvatarCliente nome={c.nomeFantasia} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'var(--texto)' }}>{c.nomeFantasia}</div>
                        {c.tag && <div style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>{c.tag}</div>}
                      </div>
                    </div>
                  </TdNovo>
                  <TdNovo>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <code style={{ fontSize: 12, background: 'var(--superficie-3)', padding: '2px 8px', borderRadius: 6, color: 'var(--texto-suave)' }}>
                        {c.codigoUnico}
                      </code>
                      <a
                        href={`/portal/${c.codigoUnico}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 11.5, color: 'var(--amarelo-fagulha)', display: 'inline-flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}
                      >
                        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        Portal
                      </a>
                    </div>
                  </TdNovo>
                  <TdNovo>
                    <Badge cor={STATUS_COR[c.status]}>{STATUS_ROTULO[c.status]}</Badge>
                  </TdNovo>
                  <TdNovo>
                    {c.onboarding ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 80 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, height: 6, borderRadius: 999, background: 'var(--superficie-3)', overflow: 'hidden' }}>
                            <div
                              className="brk-gradient-bg"
                              style={{ width: `${c.onboarding.progresso}%`, height: '100%', borderRadius: 999 }}
                            />
                          </div>
                          <span style={{ fontSize: 11.5, color: 'var(--texto-fraco)', minWidth: 28 }}>
                            {c.onboarding.progresso}%
                          </span>
                        </div>
                        {c.onboarding.concluido && (
                          <span style={{ fontSize: 11, color: '#67e0a3', fontWeight: 600 }}>Concluído</span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--texto-fraco)', fontSize: 13 }}>—</span>
                    )}
                  </TdNovo>
                  <TdNovo>
                    <span style={{ color: c.squadId ? 'var(--texto-suave)' : 'var(--texto-fraco)' }}>
                      {c.squadId ? 'Atribuído' : 'Sem squad'}
                    </span>
                  </TdNovo>
                  <TdNovo>
                    <span style={{ color: 'var(--texto-fraco)' }}>{formatarData(c.criadoEm)}</span>
                  </TdNovo>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '12px 18px', borderTop: '1px solid var(--borda)', fontSize: 12.5, color: 'var(--texto-fraco)', background: 'var(--superficie-2)' }}>
            {filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''}
            {busca && clientes.length !== filtrados.length ? ` de ${clientes.length}` : ''}
          </div>
        </div>
      )}

      {modalAberto && (
        <ModalNovoCliente
          onFechar={() => setModalAberto(false)}
          onCriado={() => { setModalAberto(false); carregar(); }}
        />
      )}
    </section>
  );
}

function ModalNovoCliente({ onFechar, onCriado }: { onFechar: () => void; onCriado: () => void }) {
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [tag, setTag] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  const valido = nomeFantasia.trim().length >= 2;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || salvando) return;
    setSalvando(true);
    setErroMsg(null);
    try {
      await api.post('/clientes', {
        nomeFantasia: nomeFantasia.trim(),
        cnpj: cnpj.trim() || undefined,
        tag: tag.trim() || undefined,
      });
      onCriado();
    } catch {
      setErroMsg('Falha ao cadastrar o cliente. Verifique os dados e tente de novo.');
      setSalvando(false);
    }
  }

  return (
    <Modal
      titulo="Novo cliente"
      onFechar={onFechar}
      rodape={
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variante="secondary" onClick={onFechar} disabled={salvando}>Cancelar</Btn>
          <Btn variante="primary" type="submit" form="form-novo-cliente" disabled={!valido || salvando}>
            {salvando ? 'Salvando…' : 'Cadastrar'}
          </Btn>
        </div>
      }
    >
      <form id="form-novo-cliente" onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {erroMsg && <Alerta tipo="erro">{erroMsg}</Alerta>}
        <CampoNovo
          rotulo="Nome fantasia"
          value={nomeFantasia}
          onChange={(e) => setNomeFantasia(e.target.value)}
          placeholder="Ex.: Estúdio Aurora"
          autoFocus
          required
        />
        <CampoNovo
          rotulo="CNPJ"
          value={cnpj}
          onChange={(e) => setCnpj(e.target.value)}
          placeholder="00.000.000/0000-00 (opcional)"
        />
        <CampoNovo
          rotulo="Tag"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="Ex.: Premium, Inbound (opcional)"
        />
      </form>
    </Modal>
  );
}

function AvatarCliente({ nome }: { nome: string }) {
  const iniciais = nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  return (
    <span
      aria-hidden="true"
      className="brk-gradient-bg"
      style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 10, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 12.5 }}
    >
      {iniciais || '?'}
    </span>
  );
}

function formatarData(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ─── PRIMITIVOS COMPATÍVEIS ────────────────────────────────────────────────
   Exportados para que Comercial, Contratos, Cobranças, etc. continuem
   funcionando sem alteração. Internamente usam o design system v2 (brk-*).
   ─────────────────────────────────────────────────────────────────────────── */

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
