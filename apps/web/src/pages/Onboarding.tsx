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
}

interface OnboardingCliente {
  id: string;
  progresso: number;
  concluido: boolean;
  etapas: Etapa[];
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
      setClientes(data);
    } catch {
      setErro(true);
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
          <AreaMembros cliente={clienteSel} aoSalvar={carregarClientes} />
          <EtapasCliente clienteId={clienteSel.id} />
          <AgendaCliente clienteId={clienteSel.id} />
        </>
      ) : (
        <PainelVazio
          titulo="Nenhum cliente selecionado"
          descricao="Escolha um cliente acima para configurar o onboarding dele."
        />
      )}

      <CatalogoAulas />
    </PaginaShell>
  );
}

/* --------------------------- Área de membros -------------------------- */

function AreaMembros({ cliente, aoSalvar }: { cliente: ClienteItem; aoSalvar: () => void }) {
  const [link, setLink] = useState(cliente.linkAreaMembros ?? '');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setLink(cliente.linkAreaMembros ?? '');
  }, [cliente.id, cliente.linkAreaMembros]);

  async function salvar() {
    setSalvando(true);
    try {
      await api.patch(`/clientes/${cliente.id}`, { linkAreaMembros: link || undefined });
      aoSalvar();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Área de membros</h3>
      <label style={rotuloInput}>Link da área de membros</label>
      <Input
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="https://..."
      />
      <div style={{ marginTop: 10 }}>
        <BotaoPrimario onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar link'}
        </BotaoPrimario>
      </div>
    </Card>
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
      </Card>
    );
  }

  return (
    <Card>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
        Etapas do checklist ({onb.progresso}%)
      </h3>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
        {[...onb.etapas]
          .sort((a, b) => a.ordem - b.ordem)
          .map((etapa) => (
            <EtapaLinha key={etapa.id} etapa={etapa} aoSalvar={carregar} />
          ))}
      </ul>
    </Card>
  );
}

function EtapaLinha({ etapa, aoSalvar }: { etapa: Etapa; aoSalvar: () => void }) {
  const [link, setLink] = useState(etapa.link ?? '');
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    try {
      await api.patch(`/onboarding/etapa/${etapa.id}`, { link: link || undefined });
      aoSalvar();
    } finally {
      setSalvando(false);
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
        <Input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Link/material desta etapa (https://...)"
        />
        <BotaoSecundario onClick={salvar} disabled={salvando}>
          {salvando ? '…' : 'Salvar'}
        </BotaoSecundario>
      </div>
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
                <div style={{ fontSize: 12.5, color: '#f0814f', fontWeight: 700 }}>
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
                  <a href={ev.meetLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: '#f0814f', textDecoration: 'none' }}>
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
                    style={{ fontSize: 12.5, color: '#f0814f', textDecoration: 'none' }}
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
