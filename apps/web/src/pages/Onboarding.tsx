import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  PaginaShell,
  BotaoPrimario,
  BotaoSecundario,
  EstadoCarregando,
  EstadoErro,
  PainelVazio,
} from '../components/primitivos';
import { Card, CampoSelect } from '../components/ui';
import { comDemo, mockSeDemo } from '../lib/demo';

/**
 * Gestão do onboarding do cliente (visão interna — CS/Admin).
 * Permite popular o que o cliente vê no portal:
 *  - link da área de membros do cliente
 *  - link/material por etapa do checklist
 *  - agenda de eventos (coleta de dados, reuniões) com "o que levar"
 *  - catálogo de aulas do onboarding educativo
 */

interface ClienteItem {
  id: string;
  nomeFantasia: string;
  codigoUnico: string;
  linkAreaMembros: string | null;
}

interface Etapa {
  id: string;
  titulo: string;
  descricao: string | null;
  link: string | null;
  concluido: boolean;
  ordem: number;
  // Item adicionado manualmente (ex.: agendamentos). Só estes podem ser removidos.
  personalizado: boolean;
}

interface OnboardingCliente {
  id: string;
  progresso: number;
  concluido: boolean;
  etapas: Etapa[];
  // Informacoes da empresa que esta sendo onboardada (texto livre).
  infoEmpresa: string | null;
}

interface Evento {
  id: string;
  titulo: string;
  descricao: string | null;
  data: string;
  oQueLevar: string | null;
  meetLink: string | null;
}

interface Aula {
  id: string;
  titulo: string;
  descricao: string | null;
  videoUrl: string;
  ordem: number;
  ativo: boolean;
}

interface ChecklistModeloItem {
  id: string;
  titulo: string;
  ordem: number;
}

interface ChecklistModelo {
  id: string;
  nome: string;
  itens: ChecklistModeloItem[];
}

const rotuloInput: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 600,
  color: 'var(--texto-suave)',
  marginBottom: 4,
  display: 'block',
};

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="brk-input" style={{ width: '100%', ...props.style }} />;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="brk-input"
      style={{ width: '100%', minHeight: 64, resize: 'vertical', ...props.style }}
    />
  );
}

const MOCK_CLIENTES_OB: ClienteItem[] = [
  { id: 'c1', nomeFantasia: 'Tua Pizza', codigoUnico: 'CLI-001', linkAreaMembros: null },
  { id: 'c2', nomeFantasia: 'Rikai Sushi', codigoUnico: 'CLI-002', linkAreaMembros: null },
  { id: 'c3', nomeFantasia: 'Bigger Pizzaria', codigoUnico: 'CLI-003', linkAreaMembros: null },
  { id: 'c5', nomeFantasia: 'Taco Loco', codigoUnico: 'CLI-005', linkAreaMembros: null },
  { id: 'c7', nomeFantasia: 'Brasils Pizzeria', codigoUnico: 'CLI-007', linkAreaMembros: null },
];

export function Onboarding() {
  const [clientes, setClientes] = useState<ClienteItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [clienteId, setClienteId] = useState('');

  async function carregarClientes() {
    setCarregando(true);
    setErro(false);
    try {
      const { data } = await api.get<ClienteItem[]>('/clientes');
      setClientes(comDemo(data, MOCK_CLIENTES_OB));
    } catch {
      setClientes(mockSeDemo(MOCK_CLIENTES_OB));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarClientes();
  }, []);

  if (carregando) return <EstadoCarregando />;
  if (erro) return <EstadoErro mensagem="Falha ao carregar clientes." onTentar={carregarClientes} />;

  const clienteSel = clientes.find((c) => c.id === clienteId) ?? null;

  return (
    <PaginaShell
      titulo="Onboarding"
      subtitulo="Configure o que o cliente vê no portal: materiais, agenda e aulas."
    >
      <Card>
        <CampoSelect
          rotulo="Cliente"
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
        >
          <option value="">Selecione um cliente…</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nomeFantasia} ({c.codigoUnico})
            </option>
          ))}
        </CampoSelect>
      </Card>

      {clienteSel ? (
        <>
          <EtapasCliente clienteId={clienteSel.id} />
          <AgendaCliente clienteId={clienteSel.id} />
        </>
      ) : (
        <PainelVazio
          titulo="Nenhum cliente selecionado"
          descricao="Escolha um cliente acima para configurar o onboarding dele."
        />
      )}

      <ModelosChecklist />

      <CatalogoAulas />
    </PaginaShell>
  );
}

/* ------------------------------ Etapas -------------------------------- */

function EtapasCliente({ clienteId }: { clienteId: string }) {
  const [onb, setOnb] = useState<OnboardingCliente | null>(null);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    try {
      const { data } = await api.get<OnboardingCliente | null>(`/onboarding/cliente/${clienteId}`);
      setOnb(data);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  if (carregando) return <Card><EstadoCarregando /></Card>;
  if (!onb) {
    return (
      <Card>
        <PainelVazio
          titulo="Sem onboarding"
          descricao="Este cliente ainda não teve o onboarding liberado (gerado após o 1º pagamento)."
        />
        <p style={{ fontSize: 12.5, color: 'var(--texto-fraco)', marginTop: 10 }}>
          Você pode já agendar a reunião e a apresentação da proposta. Ao adicionar o
          primeiro item, o onboarding do cliente é iniciado.
        </p>
        <AdicionarItemChecklist clienteId={clienteId} aoAdicionar={carregar} />
        <AplicarModeloChecklist clienteId={clienteId} aoAplicar={carregar} />
      </Card>
    );
  }

  return (
    <Card>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
        Etapas do checklist ({onb.progresso}%)
      </h3>
      <InfoEmpresaOnboarding
        clienteId={clienteId}
        valorInicial={onb.infoEmpresa ?? ''}
        aoSalvar={carregar}
      />
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
        {[...onb.etapas]
          .sort((a, b) => a.ordem - b.ordem)
          .map((etapa) => (
            <EtapaLinha key={etapa.id} etapa={etapa} aoSalvar={carregar} />
          ))}
      </ul>
      <AdicionarItemChecklist clienteId={clienteId} aoAdicionar={carregar} />
      <AplicarModeloChecklist clienteId={clienteId} aoAplicar={carregar} />
    </Card>
  );
}

// Campo para salvar as informacoes da empresa que esta sendo onboardada (texto
// livre), alem de marcar as etapas do checklist. Persiste no onboarding do
// cliente via PATCH /onboarding/cliente/:id/info-empresa.
function InfoEmpresaOnboarding({
  clienteId,
  valorInicial,
  aoSalvar,
}: {
  clienteId: string;
  valorInicial: string;
  aoSalvar: () => void;
}) {
  const [info, setInfo] = useState(valorInicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    setInfo(valorInicial);
  }, [clienteId, valorInicial]);

  async function salvar() {
    if (salvando) return;
    setSalvando(true);
    setErro(null);
    setSalvo(false);
    try {
      await api.patch(`/onboarding/cliente/${clienteId}/info-empresa`, {
        infoEmpresa: info,
      });
      setSalvo(true);
      aoSalvar();
    } catch {
      setErro('Não foi possível salvar as informações da empresa.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        borderRadius: 10,
        background: 'var(--superficie-2)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <label style={rotuloInput}>Informações da empresa (onboarding)</label>
      <Textarea
        value={info}
        onChange={(e) => {
          setInfo(e.target.value);
          setSalvo(false);
        }}
        placeholder="Dados da empresa que está sendo onboardada: nicho, responsáveis, acessos, particularidades…"
        style={{ minHeight: 90 }}
      />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <BotaoSecundario onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar informações'}
        </BotaoSecundario>
        {salvo && <span style={{ fontSize: 12, color: '#67e0a3' }}>Salvo ✓</span>}
        {erro && <span style={{ fontSize: 12, color: 'var(--vermelho, #e5484d)' }}>{erro}</span>}
      </div>
    </div>
  );
}

// Atalhos de agendamento (boas práticas de onboarding: agendar a reunião de kickoff
// e a apresentação da proposta comercial quando estiver falando com o cliente).
const ATALHOS_AGENDAMENTO = [
  'Agendar reunião',
  'Agendar apresentação da proposta comercial',
];

function AdicionarItemChecklist({
  clienteId,
  aoAdicionar,
}: {
  clienteId: string;
  aoAdicionar: () => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function adicionar(valor: string) {
    const t = valor.trim();
    if (t.length < 1 || salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      await api.post(`/onboarding/cliente/${clienteId}/etapa`, { titulo: t });
      setTitulo('');
      aoAdicionar();
    } catch {
      setErro('Não foi possível adicionar o item ao checklist.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 16,
        paddingTop: 14,
        borderTop: '1px solid var(--borda)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--texto-suave)' }}>
        Agendamento — adicionar ao checklist
      </span>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {ATALHOS_AGENDAMENTO.map((a) => (
          <BotaoSecundario key={a} onClick={() => adicionar(a)} disabled={salvando}>
            + {a}
          </BotaoSecundario>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Outro item do checklist (ex.: Agendar visita)"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              adicionar(titulo);
            }
          }}
        />
        <BotaoSecundario onClick={() => adicionar(titulo)} disabled={salvando || titulo.trim().length < 1}>
          {salvando ? '…' : 'Adicionar'}
        </BotaoSecundario>
      </div>
      {erro && <span style={{ fontSize: 12, color: 'var(--vermelho, #e5484d)' }}>{erro}</span>}
    </div>
  );
}

// Aplica um modelo (template) de checklist ao onboarding do cliente: escolhe um
// modelo e adiciona os itens dele ao checklist. Se o cliente ainda nao tem
// onboarding, o backend o inicia pelo mesmo caminho validado.
function AplicarModeloChecklist({
  clienteId,
  aoAplicar,
}: {
  clienteId: string;
  aoAplicar: () => void;
}) {
  const [modelos, setModelos] = useState<ChecklistModelo[]>([]);
  const [modeloId, setModeloId] = useState('');
  const [aplicando, setAplicando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function carregarModelos() {
    try {
      const { data } = await api.get<ChecklistModelo[]>('/onboarding/checklist-modelos');
      setModelos(data);
    } catch {
      setModelos([]);
    }
  }

  useEffect(() => {
    carregarModelos();
  }, []);

  async function aplicar() {
    if (!modeloId || aplicando) return;
    setAplicando(true);
    setErro(null);
    try {
      await api.post(`/onboarding/cliente/${clienteId}/aplicar-modelo/${modeloId}`);
      setModeloId('');
      aoAplicar();
    } catch {
      setErro('Não foi possível aplicar o modelo ao checklist.');
    } finally {
      setAplicando(false);
    }
  }

  if (modelos.length === 0) return null;

  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 14,
        borderTop: '1px solid var(--borda)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--texto-suave)' }}>
        Aplicar modelo de checklist
      </span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <select
          className="brk-input"
          style={{ width: '100%' }}
          value={modeloId}
          onChange={(e) => setModeloId(e.target.value)}
        >
          <option value="">Selecione um modelo…</option>
          {modelos.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome} ({m.itens.length} {m.itens.length === 1 ? 'item' : 'itens'})
            </option>
          ))}
        </select>
        <BotaoSecundario onClick={aplicar} disabled={aplicando || !modeloId}>
          {aplicando ? '…' : 'Aplicar'}
        </BotaoSecundario>
      </div>
      {erro && <span style={{ fontSize: 12, color: 'var(--vermelho, #e5484d)' }}>{erro}</span>}
    </div>
  );
}

function EtapaLinha({ etapa, aoSalvar }: { etapa: Etapa; aoSalvar: () => void }) {
  // Ações do item do checklist (concluir/remover) — disponíveis em todos os itens.
  const [acaoOcupada, setAcaoOcupada] = useState(false);
  // Informações do item (guardadas na descrição da etapa). O checkbox ao lado do
  // Remover abre o campo para colocar/editar essas informações.
  const [mostrarInfo, setMostrarInfo] = useState(!!etapa.descricao);
  const [info, setInfo] = useState(etapa.descricao ?? '');
  const [salvandoInfo, setSalvandoInfo] = useState(false);

  // Marca o item como concluído (mesmo endpoint já existente do checklist).
  async function concluir() {
    if (acaoOcupada) return;
    setAcaoOcupada(true);
    try {
      await api.post(`/onboarding/etapa/${etapa.id}/concluir`);
      aoSalvar();
    } finally {
      setAcaoOcupada(false);
    }
  }

  // Remove o item do checklist (qualquer item — o usuário controla o checklist).
  async function remover() {
    if (acaoOcupada) return;
    setAcaoOcupada(true);
    try {
      await api.delete(`/onboarding/etapa/${etapa.id}`);
      aoSalvar();
    } finally {
      setAcaoOcupada(false);
    }
  }

  // Salva as informações do item na descrição (endpoint de edição já existente).
  async function salvarInfo() {
    if (salvandoInfo) return;
    setSalvandoInfo(true);
    try {
      await api.patch(`/onboarding/etapa/${etapa.id}`, { descricao: info });
      aoSalvar();
    } finally {
      setSalvandoInfo(false);
    }
  }

  return (
    <li
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        paddingBottom: 12,
        borderBottom: '1px solid var(--borda)',
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--cinza-vapor)' }}>
        {etapa.titulo} {etapa.concluido && <span style={{ color: '#67e0a3' }}>✓</span>}
      </span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {!etapa.concluido && (
          <BotaoSecundario onClick={concluir} disabled={acaoOcupada}>
            {acaoOcupada ? '…' : 'Concluir'}
          </BotaoSecundario>
        )}
        <button
          type="button"
          onClick={remover}
          disabled={acaoOcupada}
          title="Remover item do checklist"
          style={{
            background: 'transparent',
            border: '1px solid var(--borda)',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 13,
            padding: '6px 10px',
            color: 'var(--vermelho, #e5484d)',
          }}
        >
          🗑 Remover
        </button>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12.5,
            color: 'var(--texto-suave)',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={mostrarInfo}
            onChange={(e) => setMostrarInfo(e.target.checked)}
          />
          Informações
        </label>
      </div>
      {mostrarInfo && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          <Textarea
            value={info}
            onChange={(e) => setInfo(e.target.value)}
            placeholder="Informações deste item (ex.: resposta do cliente, observações)…"
          />
          <div>
            <BotaoSecundario onClick={salvarInfo} disabled={salvandoInfo}>
              {salvandoInfo ? 'Salvando…' : 'Salvar informações'}
            </BotaoSecundario>
          </div>
        </div>
      )}
    </li>
  );
}

/* ------------------------------ Agenda -------------------------------- */

function AgendaCliente({ clienteId }: { clienteId: string }) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [titulo, setTitulo] = useState('');
  const [data, setData] = useState('');
  const [descricao, setDescricao] = useState('');
  const [oQueLevar, setOQueLevar] = useState('');
  const [gerarMeet, setGerarMeet] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const { data: res } = await api.get<Evento[]>(`/onboarding/cliente/${clienteId}/eventos`);
      setEventos(res);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  async function adicionar() {
    if (!titulo.trim() || !data || salvando) return;
    setSalvando(true);
    try {
      await api.post(`/onboarding/cliente/${clienteId}/eventos`, {
        titulo: titulo.trim(),
        data: new Date(data).toISOString(),
        descricao: descricao.trim() || undefined,
        oQueLevar: oQueLevar.trim() || undefined,
        gerarMeet,
      });
      setTitulo('');
      setData('');
      setDescricao('');
      setOQueLevar('');
      setGerarMeet(false);
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id: string) {
    await api.delete(`/onboarding/evento/${id}`);
    carregar();
  }

  return (
    <Card>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Agenda do cliente</h3>

      {carregando ? (
        <EstadoCarregando />
      ) : eventos.length === 0 ? (
        <p style={{ fontSize: 13.5, color: 'var(--texto-fraco)' }}>Nenhum evento ainda.</p>
      ) : (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {eventos.map((ev) => (
            <li
              key={ev.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 10,
                background: 'var(--superficie-2)',
              }}
            >
              <div>
                <div style={{ fontSize: 12.5, color: 'var(--cinza-vapor)', fontWeight: 700 }}>
                  {new Date(ev.data).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{ev.titulo}</div>
                {ev.oQueLevar && (
                  <div style={{ fontSize: 12.5, color: 'var(--texto-fraco)', whiteSpace: 'pre-line' }}>
                    {ev.oQueLevar}
                  </div>
                )}
                {ev.meetLink && (
                  <a href={ev.meetLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: 'var(--cinza-vapor)', textDecoration: 'none' }}>
                    Link do Meet →
                  </a>
                )}
              </div>
              <BotaoSecundario onClick={() => remover(ev.id)}>Remover</BotaoSecundario>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--borda)', paddingTop: 14 }}>
        <div>
          <label style={rotuloInput}>Título</label>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Reunião de onboarding" />
        </div>
        <div>
          <label style={rotuloInput}>Data e hora</label>
          <Input type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div>
          <label style={rotuloInput}>Descrição (opcional)</label>
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
        <div>
          <label style={rotuloInput}>O que ter em mãos (opcional)</label>
          <Textarea value={oQueLevar} onChange={(e) => setOQueLevar(e.target.value)} placeholder="Ex.: senha do Facebook, acesso ao Instagram…" />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--texto-suave)', cursor: 'pointer' }}>
          <input type="checkbox" checked={gerarMeet} onChange={(e) => setGerarMeet(e.target.checked)} />
          Gerar link do Google Meet para a reunião
        </label>
        <div>
          <BotaoPrimario onClick={adicionar} disabled={salvando || !titulo.trim() || !data}>
            {salvando ? 'Adicionando…' : 'Adicionar evento'}
          </BotaoPrimario>
        </div>
      </div>
    </Card>
  );
}

/* --------------------- Modelos (templates) de checklist --------------- */

// Catalogo global de modelos de checklist reutilizaveis. A CS cria varios
// modelos (nome + itens) e depois os aplica ao onboarding de cada cliente.
function ModelosChecklist() {
  const [modelos, setModelos] = useState<ChecklistModelo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [nome, setNome] = useState('');
  const [itens, setItens] = useState<string[]>(['']);
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState<string | null>(null);
  // Id do modelo em edição (null = criando um novo).
  const [editandoId, setEditandoId] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    try {
      const { data } = await api.get<ChecklistModelo[]>('/onboarding/checklist-modelos');
      setModelos(data);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function alterarItem(indice: number, valor: string) {
    setItens((atual) => atual.map((it, i) => (i === indice ? valor : it)));
  }

  function adicionarLinhaItem() {
    setItens((atual) => [...atual, '']);
  }

  function removerLinhaItem(indice: number) {
    setItens((atual) => (atual.length <= 1 ? atual : atual.filter((_, i) => i !== indice)));
  }

  function editar(m: ChecklistModelo) {
    setEditandoId(m.id);
    setNome(m.nome);
    setItens(m.itens.length > 0 ? m.itens.map((it) => it.titulo) : ['']);
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setNome('');
    setItens(['']);
  }

  async function salvar() {
    const itensLimpos = itens.map((it) => it.trim()).filter((it) => it.length > 0);
    if (!nome.trim() || itensLimpos.length === 0 || salvando) return;
    setSalvando(true);
    try {
      if (editandoId) {
        await api.patch(`/onboarding/checklist-modelos/${editandoId}`, {
          nome: nome.trim(),
          itens: itensLimpos,
        });
      } else {
        await api.post('/onboarding/checklist-modelos', { nome: nome.trim(), itens: itensLimpos });
      }
      cancelarEdicao();
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id: string) {
    setRemovendo(id);
    try {
      await api.delete(`/onboarding/checklist-modelos/${id}`);
      carregar();
    } finally {
      setRemovendo(null);
    }
  }

  return (
    <Card>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
        Modelos de checklist (catálogo global)
      </h3>
      <p style={{ fontSize: 12.5, color: 'var(--texto-fraco)', marginBottom: 10 }}>
        Crie modelos de checklist e aplique nos clientes em onboarding (no card
        “Etapas do checklist” de cada cliente).
      </p>

      {carregando ? (
        <EstadoCarregando />
      ) : modelos.length === 0 ? (
        <p style={{ fontSize: 13.5, color: 'var(--texto-fraco)' }}>Nenhum modelo cadastrado.</p>
      ) : (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {modelos.map((m) => (
            <li
              key={m.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 10,
                background: 'var(--superficie-2)',
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{m.nome}</div>
                <div style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>
                  {m.itens.map((it) => it.titulo).join(' · ')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <BotaoSecundario onClick={() => editar(m)}>Editar</BotaoSecundario>
                <BotaoSecundario onClick={() => remover(m.id)} disabled={removendo === m.id}>
                  {removendo === m.id ? '…' : 'Remover'}
                </BotaoSecundario>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--borda)', paddingTop: 14 }}>
        <div>
          <label style={rotuloInput}>{editandoId ? 'Editar modelo — nome' : 'Nome do modelo'}</label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Onboarding padrão restaurante" />
        </div>
        <div>
          <label style={rotuloInput}>Itens do checklist</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {itens.map((it, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Input
                  value={it}
                  onChange={(e) => alterarItem(i, e.target.value)}
                  placeholder={`Item ${i + 1} (ex.: Agendar reunião)`}
                />
                <button
                  type="button"
                  onClick={() => removerLinhaItem(i)}
                  disabled={itens.length <= 1}
                  title="Remover este item"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--borda)',
                    borderRadius: 8,
                    cursor: itens.length <= 1 ? 'default' : 'pointer',
                    fontSize: 13,
                    padding: '6px 10px',
                    color: 'var(--texto-suave)',
                    opacity: itens.length <= 1 ? 0.5 : 1,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <BotaoSecundario onClick={adicionarLinhaItem}>+ Adicionar item</BotaoSecundario>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <BotaoPrimario
            onClick={salvar}
            disabled={salvando || !nome.trim() || itens.every((it) => it.trim().length === 0)}
          >
            {salvando ? 'Salvando…' : editandoId ? 'Salvar alterações' : 'Salvar modelo'}
          </BotaoPrimario>
          {editandoId && (
            <BotaoSecundario onClick={cancelarEdicao} disabled={salvando}>
              Cancelar
            </BotaoSecundario>
          )}
        </div>
      </div>
    </Card>
  );
}

/* -------------------------- Catálogo de aulas ------------------------- */

function CatalogoAulas() {
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [titulo, setTitulo] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [descricao, setDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const { data } = await api.get<Aula[]>('/onboarding/aulas');
      setAulas(data);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function adicionar() {
    if (!titulo.trim() || !videoUrl.trim() || salvando) return;
    setSalvando(true);
    try {
      await api.post('/onboarding/aulas', {
        titulo: titulo.trim(),
        videoUrl: videoUrl.trim(),
        descricao: descricao.trim() || undefined,
        ordem: aulas.length,
      });
      setTitulo('');
      setVideoUrl('');
      setDescricao('');
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id: string) {
    await api.delete(`/onboarding/aulas/${id}`);
    carregar();
  }

  return (
    <Card>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
        Aulas do onboarding (catálogo global)
      </h3>

      {carregando ? (
        <EstadoCarregando />
      ) : aulas.length === 0 ? (
        <p style={{ fontSize: 13.5, color: 'var(--texto-fraco)' }}>Nenhuma aula cadastrada.</p>
      ) : (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {[...aulas]
            .sort((a, b) => a.ordem - b.ordem)
            .map((a) => (
              <li
                key={a.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'var(--superficie-2)',
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{a.titulo}</div>
                  <a
                    href={a.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12.5, color: 'var(--cinza-vapor)', textDecoration: 'none' }}
                  >
                    {a.videoUrl}
                  </a>
                </div>
                <BotaoSecundario onClick={() => remover(a.id)}>Remover</BotaoSecundario>
              </li>
            ))}
        </ul>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid var(--borda)', paddingTop: 14 }}>
        <div>
          <label style={rotuloInput}>Título da aula</label>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Como funciona a agência" />
        </div>
        <div>
          <label style={rotuloInput}>URL do vídeo (YouTube/Vimeo)</label>
          <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://youtu.be/..." />
        </div>
        <div>
          <label style={rotuloInput}>Descrição (opcional)</label>
          <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>
        <div>
          <BotaoPrimario onClick={adicionar} disabled={salvando || !titulo.trim() || !videoUrl.trim()}>
            {salvando ? 'Adicionando…' : 'Adicionar aula'}
          </BotaoPrimario>
        </div>
      </div>
    </Card>
  );
}
