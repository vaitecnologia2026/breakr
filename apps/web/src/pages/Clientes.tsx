import { useEffect, useState, type FormEvent } from 'react';
import { ClienteStatus } from '@breakr/shared';
import { api } from '../lib/api';
import { comDemo, mockSeDemo } from '../lib/demo';
import {
  PaginaHeader, Btn, Campo as CampoNovo, CampoSelect, Modal, Badge,
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

const MOCK_CLIENTES: Cliente[] = [
  { id: 'c1', nomeFantasia: 'Tua Pizza', tag: 'Restaurante', cnpj: '12.345.678/0001-90', status: ClienteStatus.ATIVO, codigoUnico: 'CLI-001', squadId: 'sq1', planoId: 'pl1', criadoEm: '2025-11-01T00:00:00Z', onboarding: { progresso: 100, concluido: true } },
  { id: 'c2', nomeFantasia: 'Rikai Sushi', tag: 'Restaurante', cnpj: '23.456.789/0001-01', status: ClienteStatus.ATIVO, codigoUnico: 'CLI-002', squadId: 'sq1', planoId: 'pl2', criadoEm: '2025-10-15T00:00:00Z', onboarding: { progresso: 100, concluido: true } },
  { id: 'c3', nomeFantasia: 'Bigger Pizzaria', tag: 'Restaurante', cnpj: '34.567.890/0001-12', status: ClienteStatus.ATIVO, codigoUnico: 'CLI-003', squadId: 'sq2', planoId: 'pl1', criadoEm: '2026-01-20T00:00:00Z', onboarding: { progresso: 75, concluido: false } },
  { id: 'c4', nomeFantasia: 'Brasa Burger', tag: 'Restaurante', cnpj: '45.678.901/0001-23', status: ClienteStatus.ATIVO, codigoUnico: 'CLI-004', squadId: 'sq1', planoId: 'pl2', criadoEm: '2025-12-01T00:00:00Z', onboarding: { progresso: 100, concluido: true } },
  { id: 'c5', nomeFantasia: 'Taco Loco', tag: 'Restaurante', cnpj: '56.789.012/0001-34', status: ClienteStatus.ATIVO, codigoUnico: 'CLI-005', squadId: 'sq3', planoId: 'pl1', criadoEm: '2026-02-10T00:00:00Z', onboarding: { progresso: 90, concluido: false } },
  { id: 'c6', nomeFantasia: 'Kings Pizza', tag: 'Restaurante', cnpj: '67.890.123/0001-45', status: ClienteStatus.ATIVO, codigoUnico: 'CLI-006', squadId: 'sq2', planoId: 'pl1', criadoEm: '2025-08-05T00:00:00Z', onboarding: { progresso: 100, concluido: true } },
  { id: 'c7', nomeFantasia: 'Brasils Pizzeria', tag: 'Restaurante', cnpj: '78.901.234/0001-56', status: ClienteStatus.ATIVO, codigoUnico: 'CLI-007', squadId: 'sq3', planoId: 'pl1', criadoEm: '2026-03-01T00:00:00Z', onboarding: { progresso: 45, concluido: false } },
  { id: 'c8', nomeFantasia: 'Brasa Burger Filial 2', tag: 'Restaurante', cnpj: null, status: ClienteStatus.ONBOARD, codigoUnico: 'CLI-008', squadId: 'sq2', planoId: 'pl2', criadoEm: '2026-05-10T00:00:00Z', onboarding: { progresso: 20, concluido: false } },
];

export function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [busca, setBusca] = useState('');

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<Cliente[]>('/clientes');
      setClientes(comDemo(data, MOCK_CLIENTES));
    } catch {
      setClientes(mockSeDemo(MOCK_CLIENTES));
      setErro(null);
      return;
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
                <ThNovo>Ações</ThNovo>
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
                  <TdNovo>
                    <Btn variante="secondary" tamanho="sm" onClick={() => setEditando(c)}>Editar</Btn>
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

      {(modalAberto || editando) && (
        <ModalNovoCliente
          cliente={editando}
          onFechar={() => { setModalAberto(false); setEditando(null); }}
          onCriado={() => { setModalAberto(false); setEditando(null); carregar(); }}
        />
      )}
    </section>
  );
}

function ModalNovoCliente({ cliente, onFechar, onCriado }: { cliente?: Cliente | null; onFechar: () => void; onCriado: () => void }) {
  const edicao = !!cliente;
  const [nomeFantasia, setNomeFantasia] = useState(cliente?.nomeFantasia ?? '');
  const [cnpj, setCnpj] = useState(cliente?.cnpj ?? '');
  const [tag, setTag] = useState(cliente?.tag ?? '');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [planoId, setPlanoId] = useState(cliente?.planoId ?? '');
  const [squadId, setSquadId] = useState(cliente?.squadId ?? '');
  const [status, setStatus] = useState<ClienteStatus>(cliente?.status ?? ClienteStatus.NOVO);
  const [planos, setPlanos] = useState<{ id: string; nome: string }[]>([]);
  const [squads, setSquads] = useState<{ id: string; nome: string }[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ id: string; nome: string }[]>('/planos').then(({ data }) => setPlanos(data)).catch(() => setPlanos([]));
    api.get<{ id: string; nome: string }[]>('/squads').then(({ data }) => setSquads(data)).catch(() => setSquads([]));
  }, []);

  const valido = nomeFantasia.trim().length >= 2;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || salvando) return;
    setSalvando(true);
    setErroMsg(null);
    const corpo: Record<string, unknown> = {
      nomeFantasia: nomeFantasia.trim(),
      cnpj: cnpj.trim() || undefined,
      tag: tag.trim() || undefined,
      planoId: planoId || undefined,
      squadId: squadId || undefined,
    };
    if (email.trim()) corpo.email = email.trim();
    if (telefone.trim()) corpo.telefone = telefone.trim();
    try {
      if (edicao && cliente) {
        await api.patch(`/clientes/${cliente.id}`, { ...corpo, status });
      } else {
        await api.post('/clientes', corpo);
      }
      onCriado();
    } catch {
      setErroMsg(`Falha ao ${edicao ? 'salvar' : 'cadastrar'} o cliente. Verifique os dados e tente de novo.`);
      setSalvando(false);
    }
  }

  return (
    <Modal
      titulo={edicao ? 'Editar cliente' : 'Novo cliente'}
      onFechar={onFechar}
      rodape={
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variante="secondary" onClick={onFechar} disabled={salvando}>Cancelar</Btn>
          <Btn variante="primary" type="submit" form="form-novo-cliente" disabled={!valido || salvando}>
            {salvando ? 'Salvando…' : edicao ? 'Salvar' : 'Cadastrar'}
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
        <CampoNovo
          rotulo="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="contato@restaurante.com (opcional)"
        />
        <CampoNovo
          rotulo="Telefone / WhatsApp"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          placeholder="(11) 99999-9999 (opcional)"
        />
        <CampoSelect rotulo="Plano" value={planoId} onChange={(e) => setPlanoId(e.target.value)}>
          <option value="">Sem plano (definir depois)</option>
          {planos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </CampoSelect>
        <CampoSelect rotulo="Squad" value={squadId} onChange={(e) => setSquadId(e.target.value)}>
          <option value="">Sem squad (definir depois)</option>
          {squads.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </CampoSelect>
        {edicao && (
          <CampoSelect rotulo="Status" value={status} onChange={(e) => setStatus(e.target.value as ClienteStatus)}>
            {Object.keys(STATUS_ROTULO).map((s) => (
              <option key={s} value={s}>{STATUS_ROTULO[s as ClienteStatus]}</option>
            ))}
          </CampoSelect>
        )}
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
