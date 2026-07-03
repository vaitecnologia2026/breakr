// Aprovação de estratégia — tela da estrategista (B6, req. l.202-208). Cria a
// estratégia/funil, envia ao cliente (aparece no portal) e acompanha o status /
// feedback do cliente. A aprovação/ajuste em si acontecem no portal do cliente.
import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { PaginaHeader, Btn, Carregando, Alerta } from '../components/ui';

type StatusEstrategia = 'RASCUNHO' | 'ENVIADA' | 'APROVADA' | 'AJUSTE';

interface Estrategia {
  id: string;
  titulo: string;
  descricao: string | null;
  status: StatusEstrategia;
  comentarioCliente: string | null;
  enviadaEm: string | null;
  criadoEm: string;
  cliente?: { id: string; nomeFantasia: string; codigoUnico: string } | null;
  estrategista?: { id: string; nome: string } | null;
}
interface ClienteOpt { id: string; nomeFantasia: string }

const STATUS_META: Record<StatusEstrategia, { label: string; cor: string }> = {
  RASCUNHO: { label: 'Rascunho', cor: 'var(--texto-fraco)' },
  ENVIADA: { label: 'Aguardando cliente', cor: '#f59e0b' },
  APROVADA: { label: 'Aprovada', cor: '#10b981' },
  AJUSTE: { label: 'Ajuste solicitado', cor: '#ef4444' },
};

export function Estrategia() {
  const [lista, setLista] = useState<Estrategia[]>([]);
  const [clientes, setClientes] = useState<ClienteOpt[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Formulário de nova estratégia
  const [clienteId, setClienteId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const [est, cli] = await Promise.all([
        api.get<Estrategia[]>('/estrategias'),
        api.get<ClienteOpt[]>('/clientes'),
      ]);
      setLista(est.data);
      setClientes(cli.data);
    } catch {
      setErro('Não foi possível carregar as estratégias.');
    } finally {
      setCarregando(false);
    }
  }
  useEffect(() => { carregar(); }, []);

  async function criar() {
    if (!clienteId || titulo.trim().length < 2 || salvando) return;
    setSalvando(true);
    setFeedback(null);
    try {
      await api.post('/estrategias', {
        clienteId,
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
      });
      setTitulo('');
      setDescricao('');
      setClienteId('');
      setFeedback({ tipo: 'sucesso', msg: 'Estratégia criada como rascunho.' });
      await carregar();
    } catch {
      setFeedback({ tipo: 'erro', msg: 'Erro ao criar a estratégia.' });
    } finally {
      setSalvando(false);
    }
  }

  async function enviar(id: string) {
    setFeedback(null);
    try {
      await api.post(`/estrategias/${id}/enviar`);
      setFeedback({ tipo: 'sucesso', msg: 'Estratégia enviada ao cliente para aprovação.' });
      await carregar();
    } catch {
      setFeedback({ tipo: 'erro', msg: 'Erro ao enviar a estratégia.' });
    }
  }

  const podeCriar = useMemo(() => !!clienteId && titulo.trim().length >= 2, [clienteId, titulo]);

  if (carregando) return <Carregando />;

  return (
    <>
      <PaginaHeader
        titulo="Aprovação de estratégia"
        subtitulo="Monte a estratégia/funil, envie ao cliente e acompanhe a aprovação no portal"
      />

      {erro && <Alerta tipo="erro">{erro}</Alerta>}
      {feedback && <Alerta tipo={feedback.tipo}>{feedback.msg}</Alerta>}

      {/* Nova estratégia */}
      <section className="brk-card brk-card-p" style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Nova estratégia</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <select
            className="brk-input"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            disabled={clientes.length === 0}
          >
            <option value="" disabled>
              {clientes.length === 0 ? 'Nenhum cliente disponível' : 'Selecione o cliente'}
            </option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nomeFantasia}</option>
            ))}
          </select>
          <input
            className="brk-input"
            placeholder="Título da estratégia (ex.: Funil de captação Q3)"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
          <textarea
            className="brk-input"
            placeholder="Descreva a estratégia / funil (etapas, canais, metas)…"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={5}
            style={{ resize: 'vertical' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Btn onClick={criar} disabled={!podeCriar || salvando}>{salvando ? 'Salvando…' : 'Criar rascunho'}</Btn>
          </div>
        </div>
      </section>

      {/* Lista de estratégias */}
      {lista.length === 0 ? (
        <div className="brk-card brk-card-p">
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Nenhuma estratégia criada ainda.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {lista.map((e) => {
            const meta = STATUS_META[e.status];
            const podeEnviar = e.status === 'RASCUNHO' || e.status === 'AJUSTE';
            return (
              <div key={e.id} className="brk-card brk-card-p">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <h3 style={{ fontSize: 14.5, fontWeight: 700 }}>{e.titulo}</h3>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: meta.cor, border: `1px solid ${meta.cor}`, borderRadius: 999, padding: '1px 8px' }}>{meta.label}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>
                      {e.cliente?.nomeFantasia ?? 'Cliente'}{e.estrategista?.nome ? ` · por ${e.estrategista.nome}` : ''}
                    </div>
                    {e.descricao && (
                      <p style={{ fontSize: 13, color: 'var(--texto-suave)', marginTop: 8, whiteSpace: 'pre-wrap' }}>{e.descricao}</p>
                    )}
                    {e.comentarioCliente && (
                      <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--superficie-2)', borderLeft: `3px solid ${meta.cor}` }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--texto-fraco)' }}>Comentário do cliente</div>
                        <div style={{ fontSize: 13, color: 'var(--texto-suave)' }}>{e.comentarioCliente}</div>
                      </div>
                    )}
                  </div>
                  {podeEnviar && (
                    <Btn onClick={() => enviar(e.id)}>Enviar ao cliente</Btn>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
