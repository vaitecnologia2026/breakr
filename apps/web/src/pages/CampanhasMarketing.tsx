// Campanhas de Marketing (produção) — Briefing Marketing (Seção 3).
// Lista de campanhas + board do pipeline de materiais por status (9 etapas).
// Aditivo e isolado do Tráfego pago (página Trafego).
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import {
  PaginaHeader, Btn, Campo, CampoSelect, Modal, Badge,
  Carregando, Vazio, ErroEstado, Alerta,
} from '../components/ui';

// 9 status do pipeline (Briefing Marketing — Seção 3).
const STATUS: { v: string; r: string }[] = [
  { v: 'PLANEJADO', r: 'Planejado' },
  { v: 'EM_COPY', r: 'Em Copy' },
  { v: 'COPY_CONCLUIDA', r: 'Copy Concluída' },
  { v: 'EM_DESIGN', r: 'Em Design' },
  { v: 'AGUARDANDO_APROVACAO', r: 'Aguard. Aprovação' },
  { v: 'APROVADO', r: 'Aprovado' },
  { v: 'EM_AJUSTE', r: 'Em Ajuste' },
  { v: 'ATIVO_TRAFEGO', r: 'Ativo no Tráfego' },
  { v: 'CONCLUIDO', r: 'Concluído' },
];

const DESTINOS: { v: string; r: string }[] = [
  { v: 'TRAFEGO_PAGO', r: 'Tráfego pago' },
  { v: 'ORGANICO', r: 'Orgânico' },
  { v: 'IMPRESSAO', r: 'Impressão' },
];
const DESTINO_ROTULO: Record<string, string> = Object.fromEntries(DESTINOS.map((d) => [d.v, d.r]));

const SITUACAO_ROTULO: Record<string, string> = {
  PLANEJADA: 'Planejada', EM_ANDAMENTO: 'Em andamento', CONCLUIDA: 'Concluída',
};

interface CampanhaLista {
  id: string; nome: string; objetivo: string | null; situacao: string;
  prazo: string | null; cliente: string | null; squad: string | null;
  totalMateriais: number; materiaisPorStatus: Record<string, number>;
}
interface Material {
  id: string; titulo: string; tipo: string | null; destino: string; status: string;
  prazo: string | null; reworkCount: number;
  responsavel: { id: string; nome: string } | null;
}
interface CampanhaDetalhe {
  id: string; nome: string; objetivo: string | null; situacao: string; prazo: string | null;
  cliente: { nomeFantasia: string; pilares: string[] } | null; squad: { nome: string } | null;
  materiais: Material[];
  // Aprovacao interdepartamental (Seção 8). Null = não requer.
  statusAprovacaoInterna: string | null;
  aprovacaoInternaComentario: string | null;
}

// Rótulos do status de aprovação interdepartamental (Seção 8).
const APROVACAO_INTERNA_ROTULO: Record<string, string> = {
  AGUARDANDO_GESTAO: 'Aguard. Gestão',
  AGUARDANDO_FINANCEIRO: 'Aguard. Financeiro',
  APROVADO_INT: 'Aprovado Int.',
  EM_ALINHAMENTO: 'Em Alinhamento',
};
interface Opcao { id: string; nome: string }

export function CampanhasMarketing() {
  const [campanhas, setCampanhas] = useState<CampanhaLista[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalNova, setModalNova] = useState(false);
  const [abertaId, setAbertaId] = useState<string | null>(null);

  function carregar() {
    setCarregando(true);
    setErro(null);
    api.get<CampanhaLista[]>('/campanhas-marketing')
      .then(({ data }) => setCampanhas(data))
      .catch(() => setErro('Não foi possível carregar as campanhas.'))
      .finally(() => setCarregando(false));
  }
  useEffect(() => { carregar(); }, []);

  if (abertaId) {
    return <CampanhaBoard id={abertaId} onVoltar={() => { setAbertaId(null); carregar(); }} />;
  }

  return (
    <div>
      <PaginaHeader
        titulo="Campanhas de Marketing"
        subtitulo="Produção de campanhas por cliente — pipeline de materiais (Seção 3 do briefing)."
        acoes={<Btn onClick={() => setModalNova(true)}>+ Nova campanha</Btn>}
      />

      {carregando ? (
        <Carregando />
      ) : erro ? (
        <ErroEstado mensagem={erro} onTentar={carregar} />
      ) : campanhas.length === 0 ? (
        <Vazio titulo="Nenhuma campanha" subtitulo="Crie a primeira campanha de produção." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {campanhas.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setAbertaId(c.id)}
              className="brk-card brk-card-p"
              style={{ textAlign: 'left', cursor: 'pointer', border: '1px solid var(--borda)', display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--texto)' }}>{c.nome}</span>
                <Badge cor={c.situacao === 'CONCLUIDA' ? 'verde' : c.situacao === 'EM_ANDAMENTO' ? 'azul' : 'amarelo'}>
                  {SITUACAO_ROTULO[c.situacao] ?? c.situacao}
                </Badge>
              </div>
              <span style={{ fontSize: 12, color: 'var(--texto-suave)' }}>{c.cliente ?? '—'}{c.squad ? ` · ${c.squad}` : ''}</span>
              {c.objetivo && <span style={{ fontSize: 11.5, color: 'var(--texto-fraco)' }}>{c.objetivo}</span>}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                <span style={{ fontSize: 11, color: 'var(--texto-suave)' }}>{c.totalMateriais} material(is)</span>
                {c.prazo && <span style={{ fontSize: 11, color: 'var(--texto-fraco)' }}>· prazo {new Date(c.prazo).toLocaleDateString('pt-BR')}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {modalNova && (
        <ModalNovaCampanha
          onFechar={() => setModalNova(false)}
          onCriada={(idNova) => { setModalNova(false); carregar(); setAbertaId(idNova); }}
        />
      )}
    </div>
  );
}

function ModalNovaCampanha({ onFechar, onCriada }: { onFechar: () => void; onCriada: (id: string) => void }) {
  const [nome, setNome] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [squadId, setSquadId] = useState('');
  const [prazo, setPrazo] = useState('');
  const [clientes, setClientes] = useState<Opcao[]>([]);
  const [squads, setSquads] = useState<Opcao[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ id: string; nomeFantasia: string }[]>('/clientes')
      .then(({ data }) => setClientes(data.map((c) => ({ id: c.id, nome: c.nomeFantasia })))).catch(() => setClientes([]));
    api.get<Opcao[]>('/squads').then(({ data }) => setSquads(data)).catch(() => setSquads([]));
  }, []);

  const valido = nome.trim().length >= 2 && !!clienteId;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || salvando) return;
    setSalvando(true);
    setErroMsg(null);
    try {
      const { data } = await api.post<{ id: string }>('/campanhas-marketing', {
        nome: nome.trim(),
        objetivo: objetivo.trim() || undefined,
        clienteId,
        squadId: squadId || undefined,
        prazo: prazo ? new Date(prazo).toISOString() : undefined,
      });
      onCriada(data.id);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setErroMsg((Array.isArray(msg) ? msg.join(' ') : msg) || 'Falha ao criar a campanha.');
      setSalvando(false);
    }
  }

  return (
    <Modal
      titulo="Nova campanha"
      onFechar={onFechar}
      rodape={
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variante="secondary" onClick={onFechar} disabled={salvando}>Cancelar</Btn>
          <Btn variante="primary" type="submit" form="form-nova-campanha" disabled={!valido || salvando}>
            {salvando ? 'Salvando…' : 'Criar'}
          </Btn>
        </div>
      }
    >
      <form id="form-nova-campanha" onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {erroMsg && <Alerta tipo="erro">{erroMsg}</Alerta>}
        <Campo rotulo="Nome da campanha" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Dia dos Namorados" autoFocus required />
        <Campo rotulo="Objetivo" value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="Ex.: Vendas do cardápio especial (opcional)" />
        <CampoSelect rotulo="Cliente" value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
          <option value="">Selecione o cliente</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </CampoSelect>
        <CampoSelect rotulo="Squad" value={squadId} onChange={(e) => setSquadId(e.target.value)}>
          <option value="">Sem squad (definir depois)</option>
          {squads.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
        </CampoSelect>
        <Campo rotulo="Prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
      </form>
    </Modal>
  );
}

function CampanhaBoard({ id, onVoltar }: { id: string; onVoltar: () => void }) {
  const [campanha, setCampanha] = useState<CampanhaDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<Opcao[]>([]);
  const [modalMaterial, setModalMaterial] = useState(false);

  function carregar() {
    setCarregando(true);
    setErro(null);
    api.get<CampanhaDetalhe>(`/campanhas-marketing/${id}`)
      .then(({ data }) => setCampanha(data))
      .catch(() => setErro('Não foi possível carregar a campanha.'))
      .finally(() => setCarregando(false));
  }
  useEffect(() => {
    carregar();
    api.get<{ id: string; nome: string }[]>('/usuarios').then(({ data }) => setUsuarios(data.map((u) => ({ id: u.id, nome: u.nome })))).catch(() => setUsuarios([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function mudarStatus(materialId: string, status: string) {
    await api.patch(`/campanhas-marketing/materiais/${materialId}`, { status });
    carregar();
  }
  async function mudarResponsavel(materialId: string, responsavelId: string) {
    if (!responsavelId) return;
    await api.patch(`/campanhas-marketing/materiais/${materialId}`, { responsavelId });
    carregar();
  }
  async function removerMaterial(materialId: string) {
    await api.delete(`/campanhas-marketing/materiais/${materialId}`);
    carregar();
  }
  async function enviarAprovacaoInterna(pilar: 'GESTAO' | 'FINANCEIRO') {
    try {
      await api.post(`/campanhas-marketing/${id}/aprovacao-interna/enviar`, { pilar });
      carregar();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      alert((Array.isArray(msg) ? msg.join(' ') : msg) || 'Não foi possível enviar para aprovação.');
    }
  }

  const pilares = campanha?.cliente?.pilares ?? [];
  const temGestao = pilares.includes('GESTAO');
  const temFinanceiro = pilares.includes('FINANCEIRO');
  const emAprovacao =
    campanha?.statusAprovacaoInterna === 'AGUARDANDO_GESTAO' ||
    campanha?.statusAprovacaoInterna === 'AGUARDANDO_FINANCEIRO';

  return (
    <div>
      <PaginaHeader
        titulo={campanha?.nome ?? 'Campanha'}
        subtitulo={campanha ? `${campanha.cliente?.nomeFantasia ?? '—'}${campanha.squad ? ` · ${campanha.squad.nome}` : ''}` : undefined}
        acoes={
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variante="secondary" onClick={onVoltar}>← Voltar</Btn>
            <Btn onClick={() => setModalMaterial(true)}>+ Material</Btn>
          </div>
        }
      />

      {/* Aprovação interdepartamental (Seção 8) — só para clientes multi-pilar. */}
      {campanha && (temGestao || temFinanceiro) && (
        <div className="brk-card brk-card-p" style={{ marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--texto)' }}>Aprovação interna:</span>
          {campanha.statusAprovacaoInterna ? (
            <Badge cor={campanha.statusAprovacaoInterna === 'APROVADO_INT' ? 'verde' : campanha.statusAprovacaoInterna === 'EM_ALINHAMENTO' ? 'vermelho' : 'amarelo'}>
              {APROVACAO_INTERNA_ROTULO[campanha.statusAprovacaoInterna] ?? campanha.statusAprovacaoInterna}
            </Badge>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>não enviada</span>
          )}
          {!emAprovacao && temGestao && (
            <Btn variante="secondary" onClick={() => enviarAprovacaoInterna('GESTAO')}>Enviar p/ Gestão</Btn>
          )}
          {!emAprovacao && temFinanceiro && (
            <Btn variante="secondary" onClick={() => enviarAprovacaoInterna('FINANCEIRO')}>Enviar p/ Financeiro</Btn>
          )}
          {campanha.aprovacaoInternaComentario && (
            <span style={{ fontSize: 12, color: 'var(--texto-suave)' }}>“{campanha.aprovacaoInternaComentario}”</span>
          )}
        </div>
      )}

      {carregando ? (
        <Carregando />
      ) : erro || !campanha ? (
        <ErroEstado mensagem={erro ?? 'Campanha não encontrada.'} onTentar={carregar} />
      ) : (
        <div style={{ overflowX: 'auto', width: '100%', maxWidth: '100%' }} className="brk-kanban-scroll">
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STATUS.length}, minmax(180px, 1fr))`, gap: 10, alignItems: 'start' }}>
            {STATUS.map((col) => {
              const itens = campanha.materiais.filter((m) => m.status === col.v);
              return (
                <div key={col.v} style={{ background: 'var(--superficie-2)', border: '1px solid var(--borda)', borderRadius: 8, padding: 8, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--texto-suave)' }}>{col.r}</span>
                    <span style={{ fontSize: 11, color: 'var(--texto-fraco)' }}>{itens.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {itens.map((m) => (
                      <div key={m.id} className="brk-card" style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--texto)' }}>{m.titulo}</span>
                          <button type="button" onClick={() => removerMaterial(m.id)} title="Remover" style={{ background: 'none', border: 'none', color: 'var(--texto-fraco)', cursor: 'pointer', fontSize: 13, lineHeight: 1 }}>✕</button>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Badge cor="neutro">{DESTINO_ROTULO[m.destino] ?? m.destino}</Badge>
                          {m.tipo && <span style={{ fontSize: 10.5, color: 'var(--texto-fraco)' }}>{m.tipo}</span>}
                          {m.reworkCount > 0 && <span style={{ fontSize: 10.5, color: 'var(--vermelho)' }}>↺ {m.reworkCount}</span>}
                        </div>
                        <select
                          value={m.responsavel?.id ?? ''}
                          onChange={(e) => mudarResponsavel(m.id, e.target.value)}
                          className="brk-input"
                          style={{ fontSize: 11.5, padding: '3px 6px' }}
                        >
                          <option value="">Sem responsável</option>
                          {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                        </select>
                        <select
                          value={m.status}
                          onChange={(e) => mudarStatus(m.id, e.target.value)}
                          className="brk-input"
                          style={{ fontSize: 11.5, padding: '3px 6px' }}
                        >
                          {STATUS.map((s) => <option key={s.v} value={s.v}>{s.r}</option>)}
                        </select>
                        {m.prazo && <span style={{ fontSize: 10.5, color: 'var(--texto-fraco)' }}>prazo {new Date(m.prazo).toLocaleDateString('pt-BR')}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {modalMaterial && (
        <ModalNovoMaterial
          campanhaId={id}
          usuarios={usuarios}
          onFechar={() => setModalMaterial(false)}
          onCriado={() => { setModalMaterial(false); carregar(); }}
        />
      )}
    </div>
  );
}

function ModalNovoMaterial({ campanhaId, usuarios, onFechar, onCriado }: { campanhaId: string; usuarios: Opcao[]; onFechar: () => void; onCriado: () => void }) {
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('');
  const [destino, setDestino] = useState('TRAFEGO_PAGO');
  const [responsavelId, setResponsavelId] = useState('');
  const [prazo, setPrazo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  const valido = titulo.trim().length >= 1;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || salvando) return;
    setSalvando(true);
    setErroMsg(null);
    try {
      await api.post(`/campanhas-marketing/${campanhaId}/materiais`, {
        titulo: titulo.trim(),
        tipo: tipo.trim() || undefined,
        destino,
        responsavelId: responsavelId || undefined,
        prazo: prazo ? new Date(prazo).toISOString() : undefined,
      });
      onCriado();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setErroMsg((Array.isArray(msg) ? msg.join(' ') : msg) || 'Falha ao adicionar o material.');
      setSalvando(false);
    }
  }

  return (
    <Modal
      titulo="Novo material"
      onFechar={onFechar}
      rodape={
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variante="secondary" onClick={onFechar} disabled={salvando}>Cancelar</Btn>
          <Btn variante="primary" type="submit" form="form-novo-material" disabled={!valido || salvando}>
            {salvando ? 'Salvando…' : 'Adicionar'}
          </Btn>
        </div>
      }
    >
      <form id="form-novo-material" onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {erroMsg && <Alerta tipo="erro">{erroMsg}</Alerta>}
        <Campo rotulo="Título do material" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Criativo de antecipação" autoFocus required />
        <Campo rotulo="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Ex.: Vídeo curto, Post carrossel (opcional)" />
        <CampoSelect rotulo="Destino" value={destino} onChange={(e) => setDestino(e.target.value)}>
          {DESTINOS.map((d) => <option key={d.v} value={d.v}>{d.r}</option>)}
        </CampoSelect>
        <CampoSelect rotulo="Responsável" value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)}>
          <option value="">Sem responsável</option>
          {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </CampoSelect>
        <Campo rotulo="Prazo" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
      </form>
    </Modal>
  );
}
