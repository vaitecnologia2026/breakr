// Campanhas de Marketing (produção) — Briefing Marketing (Seção 3).
// Lista de campanhas + board do pipeline de materiais por status (9 etapas).
// Aditivo e isolado do Tráfego pago (página Trafego).
import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  PaginaHeader, Btn, Campo, CampoSelect, Modal, Badge,
  Carregando, Vazio, ErroEstado, Alerta,
} from '../components/ui';
import { GuiaJornadaMarketing } from '../components/GuiaJornadaMarketing';

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

// Estilo dos mini-botões de gestão de coluna no cabeçalho (só admin/superadmin).
const ESTILO_BTN_COLUNA = {
  background: 'var(--superficie)', border: '1px solid var(--borda)', borderRadius: 4,
  color: 'var(--texto-suave)', cursor: 'pointer', fontSize: 10, lineHeight: 1, padding: '2px 4px',
};

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
  // Modelo de Mensagem escolhido para este card ser usado na campanha (id escalar;
  // título/corpo resolvidos pela lista de /modelos-mensagem). Null quando não definido.
  modeloMensagemId?: string | null;
}
// Modelo de Mensagem (template de texto) — usado no seletor do card do board.
interface ModeloMensagemOpt { id: string; titulo: string; corpo: string }
interface CampanhaDetalhe {
  id: string; nome: string; objetivo: string | null; situacao: string; prazo: string | null;
  cliente: { nomeFantasia: string; pilares: string[] } | null; squad: { nome: string } | null;
  materiais: Material[];
  // Aprovacao interdepartamental (Seção 8). Null = não requer.
  statusAprovacaoInterna: string | null;
  aprovacaoInternaComentario: string | null;
}
// Coluna do board (config global, vinda de GET /colunas-material). `chave` = valor
// gravado em Material.status. `nucleo` = uma das 9 etapas validadas (não excluível).
interface Coluna {
  id: string; chave: string; rotulo: string; ordem: number; nucleo: boolean; oculta: boolean;
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
  const { usuario } = useAuth();
  // Excluir campanha é ação destrutiva (cascata nos materiais) — só ADMIN/SUPERADMIN,
  // mesmo padrão já validado na exclusão de peça em Produção de Conteúdo.
  const podeExcluir = usuario?.cargo === 'SUPERADMIN' || usuario?.cargo === 'ADMIN';
  const [campanhas, setCampanhas] = useState<CampanhaLista[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalNova, setModalNova] = useState(false);
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  function carregar() {
    setCarregando(true);
    setErro(null);
    api.get<CampanhaLista[]>('/campanhas-marketing')
      .then(({ data }) => setCampanhas(data))
      .catch(() => setErro('Não foi possível carregar as campanhas.'))
      .finally(() => setCarregando(false));
  }
  useEffect(() => { carregar(); }, []);

  async function excluirCampanha(c: CampanhaLista) {
    if (excluindoId) return;
    if (!window.confirm(`Excluir a campanha "${c.nome}" definitivamente? Os materiais dela também serão removidos. Esta ação não pode ser desfeita.`)) return;
    setExcluindoId(c.id);
    setErro(null);
    try {
      await api.delete(`/campanhas-marketing/${c.id}`);
      carregar();
    } catch {
      setErro('Não foi possível excluir a campanha.');
    } finally {
      setExcluindoId(null);
    }
  }

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

      <GuiaJornadaMarketing etapaAtual="planejamento" />

      {carregando ? (
        <Carregando />
      ) : erro ? (
        <ErroEstado mensagem={erro} onTentar={carregar} />
      ) : campanhas.length === 0 ? (
        <Vazio titulo="Nenhuma campanha" subtitulo="Crie a primeira campanha de produção." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {campanhas.map((c) => (
            <div key={c.id} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setAbertaId(c.id)}
                className="brk-card brk-card-p"
                style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: '1px solid var(--borda)', display: 'flex', flexDirection: 'column', gap: 8 }}
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
              {podeExcluir && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); excluirCampanha(c); }}
                  disabled={excluindoId === c.id}
                  title="Excluir campanha definitivamente"
                  style={{ position: 'absolute', bottom: 8, right: 8, background: 'var(--superficie)', border: '1px solid var(--borda)', borderRadius: 6, color: 'var(--vermelho)', cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: '4px 7px' }}
                >
                  {excluindoId === c.id ? '…' : '🗑'}
                </button>
              )}
            </div>
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

// Converte o corpo (HTML) do modelo em texto puro para o preview no card.
function textoDoCorpo(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function CampanhaBoard({ id, onVoltar }: { id: string; onVoltar: () => void }) {
  const [campanha, setCampanha] = useState<CampanhaDetalhe | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<Opcao[]>([]);
  const [modalMaterial, setModalMaterial] = useState(false);
  // Modelos de Mensagem (para o seletor de cada card) + seleção ainda não salva por
  // material (modeloSel[materialId]) e o id do material sendo salvo (trava o botão).
  const [modelos, setModelos] = useState<ModeloMensagemOpt[]>([]);
  const [modeloSel, setModeloSel] = useState<Record<string, string>>({});
  const [salvandoModelo, setSalvandoModelo] = useState<string | null>(null);
  // Drag-and-drop dos cards entre colunas (aditivo — reusa mudarStatus).
  const [arrastandoId, setArrastandoId] = useState<string | null>(null);
  const [colunaAlvo, setColunaAlvo] = useState<string | null>(null);
  // Drag-and-drop das COLUNAS (reordenar arrastando — reusa a ordem/endpoint das setas ◀▶).
  const [arrastandoColunaId, setArrastandoColunaId] = useState<string | null>(null);
  // Gestão das colunas do board (config global). Só admin/superadmin vê os controles.
  const { usuario } = useAuth();
  const podeGerir = usuario?.cargo === 'SUPERADMIN' || usuario?.cargo === 'ADMIN';
  // Colunas do board. Inicia com o núcleo padrão (fallback até o fetch) para o board
  // nunca aparecer vazio; é substituído pelos dados reais de GET /colunas-material.
  const [colunas, setColunas] = useState<Coluna[]>(() =>
    STATUS.map((s, i) => ({ id: s.v, chave: s.v, rotulo: s.r, ordem: i, nucleo: true, oculta: false })),
  );

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
    carregarColunas();
    api.get<{ id: string; nome: string }[]>('/usuarios').then(({ data }) => setUsuarios(data.map((u) => ({ id: u.id, nome: u.nome })))).catch(() => setUsuarios([]));
    api.get<ModeloMensagemOpt[]>('/modelos-mensagem').then(({ data }) => setModelos(data.map((m) => ({ id: m.id, titulo: m.titulo, corpo: m.corpo })))).catch(() => setModelos([]));
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
  // Salva o Modelo de Mensagem escolhido para o material (vazio = limpa/null).
  // Reusa o mesmo PATCH dos demais campos do material.
  async function salvarModeloMaterial(materialId: string, valor: string) {
    if (salvandoModelo) return;
    setSalvandoModelo(materialId);
    try {
      await api.patch(`/campanhas-marketing/materiais/${materialId}`, { modeloMensagemId: valor || null });
      setModeloSel((prev) => { const n = { ...prev }; delete n[materialId]; return n; });
      carregar();
    } catch (err) {
      alert(msgErro(err, 'Não foi possível salvar o modelo de mensagem.'));
    } finally {
      setSalvandoModelo(null);
    }
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

  // --- Gestão das colunas do board (config global; só admin/superadmin) ---
  function carregarColunas() {
    api.get<Coluna[]>('/colunas-material')
      .then(({ data }) => { if (Array.isArray(data) && data.length) setColunas(data); })
      .catch(() => { /* mantém o fallback do núcleo */ });
  }
  function msgErro(err: unknown, fallback: string) {
    const m = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
    return (Array.isArray(m) ? m.join(' ') : m) || fallback;
  }
  async function addColuna() {
    const rotulo = window.prompt('Nome da nova coluna:');
    if (!rotulo || !rotulo.trim()) return;
    try { await api.post('/colunas-material', { rotulo: rotulo.trim() }); carregarColunas(); }
    catch (err) { alert(msgErro(err, 'Não foi possível criar a coluna.')); }
  }
  async function renomearColuna(c: Coluna) {
    const rotulo = window.prompt('Renomear coluna:', c.rotulo);
    if (rotulo == null) return;
    const novo = rotulo.trim();
    if (!novo || novo === c.rotulo) return;
    try { await api.patch(`/colunas-material/${c.id}`, { rotulo: novo }); carregarColunas(); }
    catch (err) { alert(msgErro(err, 'Não foi possível renomear a coluna.')); }
  }
  async function moverColuna(c: Coluna, dir: -1 | 1) {
    const ord = [...colunas].sort((a, b) => a.ordem - b.ordem);
    const i = ord.findIndex((x) => x.id === c.id);
    const j = i + dir;
    if (j < 0 || j >= ord.length) return;
    const outra = ord[j];
    try {
      await api.patch(`/colunas-material/${c.id}`, { ordem: outra.ordem });
      await api.patch(`/colunas-material/${outra.id}`, { ordem: c.ordem });
      carregarColunas();
    } catch (err) { alert(msgErro(err, 'Não foi possível reordenar a coluna.')); }
  }
  // Reordena arrastando: solta a coluna de origem na posição da coluna de destino
  // e regrava a ordem sequencial (mesmo endpoint/campo das setas ◀▶). Só colunas
  // reais (com id) participam; órfãs (id vazio) são ignoradas.
  async function reordenarColunaDrag(origemId: string, destino: Coluna) {
    if (!origemId || !destino.id || origemId === destino.id) return;
    const ord = [...colunas].sort((a, b) => a.ordem - b.ordem);
    const from = ord.findIndex((x) => x.id === origemId);
    const to = ord.findIndex((x) => x.id === destino.id);
    if (from < 0 || to < 0 || from === to) return;
    const nova = [...ord];
    const [movida] = nova.splice(from, 1);
    nova.splice(to, 0, movida);
    try {
      await Promise.all(
        nova
          .map((c, i) => (c.ordem === i ? null : api.patch(`/colunas-material/${c.id}`, { ordem: i })))
          .filter(Boolean) as Promise<unknown>[],
      );
      carregarColunas();
    } catch (err) { alert(msgErro(err, 'Não foi possível reordenar a coluna.')); }
  }
  async function excluirColuna(c: Coluna) {
    if (!window.confirm(`Excluir a coluna "${c.rotulo}"? Os materiais nela serão movidos para outra coluna.`)) return;
    try { await api.delete(`/colunas-material/${c.id}`); carregarColunas(); carregar(); }
    catch (err) { alert(msgErro(err, 'Não foi possível excluir a coluna.')); }
  }

  const pilares = campanha?.cliente?.pilares ?? [];
  // Colunas a exibir: todas as do backend + colunas "sintéticas" para status órfãos
  // (material cujo status não tem mais coluna — ex.: coluna excluída) para nada sumir.
  const chavesCol = new Set(colunas.map((c) => c.chave));
  const orfaos: Coluna[] = [...new Set((campanha?.materiais ?? []).map((m) => m.status))]
    .filter((s) => !chavesCol.has(s))
    .map((s, i) => ({ id: '', chave: s, rotulo: s, ordem: 10000 + i, nucleo: false, oculta: false }));
  const colsRender = [...colunas, ...orfaos].sort((a, b) => a.ordem - b.ordem);
  // Opções do seletor de status de um card: as colunas reais + a coluna atual do card
  // (caso o status atual seja órfão, para o seletor conseguir exibir o valor corrente).
  const colunasSelect = (statusAtual: string) => {
    const reais = [...colunas].sort((a, b) => a.ordem - b.ordem);
    return reais.some((c) => c.chave === statusAtual)
      ? reais
      : [...reais, { id: '', chave: statusAtual, rotulo: statusAtual, ordem: 99999, nucleo: false, oculta: false } as Coluna];
  };
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
            {podeGerir && <Btn variante="secondary" onClick={addColuna}>+ Coluna</Btn>}
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
        <div
          className="brk-kanban-scroll"
          onDragOver={(e) => {
            // Auto-rolagem horizontal durante o arraste: leva o card (ou coluna) até
            // colunas fora da área visível — o drag-and-drop nativo não rola sozinho.
            const el = e.currentTarget;
            const r = el.getBoundingClientRect();
            const margem = 90;
            if (e.clientX - r.left < margem) el.scrollLeft -= 28;
            else if (r.right - e.clientX < margem) el.scrollLeft += 28;
          }}
          style={{ overflowX: 'auto', width: '100%', maxWidth: '100%' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${colsRender.length}, minmax(180px, 1fr))`, gap: 10, alignItems: 'stretch' }}>
            {colsRender.map((col) => {
              const itens = campanha.materiais.filter((m) => m.status === col.chave);
              return (
                <div
                  key={col.chave}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (colunaAlvo !== col.chave) setColunaAlvo(col.chave); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    // Arraste de COLUNA tem prioridade (chave própria no dataTransfer);
                    // se não for coluna, cai na lógica de card já existente.
                    const colId = e.dataTransfer.getData('application/x-breakr-coluna') || arrastandoColunaId;
                    if (colId) {
                      setColunaAlvo(null);
                      setArrastandoColunaId(null);
                      reordenarColunaDrag(colId, col);
                      return;
                    }
                    const mid = e.dataTransfer.getData('text/plain') || arrastandoId;
                    setColunaAlvo(null);
                    setArrastandoId(null);
                    if (mid) {
                      const mat = campanha.materiais.find((x) => x.id === mid);
                      if (mat && mat.status !== col.chave) mudarStatus(mid, col.chave);
                    }
                  }}
                  style={{
                    background: colunaAlvo === col.chave ? 'var(--borda)' : 'var(--superficie-2)',
                    border: `1px solid ${colunaAlvo === col.chave ? 'var(--texto-suave)' : 'var(--borda)'}`,
                    borderRadius: 8, padding: 8, minWidth: 0, minHeight: 140,
                  }}
                >
                  <div
                    draggable={!!(podeGerir && col.id)}
                    onDragStart={podeGerir && col.id ? (e) => {
                      e.stopPropagation();
                      setArrastandoColunaId(col.id);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('application/x-breakr-coluna', col.id);
                    } : undefined}
                    onDragEnd={() => { setArrastandoColunaId(null); setColunaAlvo(null); }}
                    title={(podeGerir && col.id) ? 'Arraste para reordenar a coluna' : undefined}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: (podeGerir && col.id) ? 6 : 8, gap: 4, cursor: (podeGerir && col.id) ? 'grab' : 'default' }}
                  >
                    <span title={col.rotulo} style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--texto-suave)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.rotulo}</span>
                    <span style={{ fontSize: 11, color: 'var(--texto-fraco)', flexShrink: 0 }}>{itens.length}</span>
                  </div>
                  {podeGerir && col.id && (
                    <div style={{ display: 'flex', gap: 2, marginBottom: 8, flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => moverColuna(col, -1)} title="Mover para a esquerda" style={ESTILO_BTN_COLUNA}>◀</button>
                      <button type="button" onClick={() => moverColuna(col, 1)} title="Mover para a direita" style={ESTILO_BTN_COLUNA}>▶</button>
                      <button type="button" onClick={() => renomearColuna(col)} title="Renomear coluna" style={ESTILO_BTN_COLUNA}>✎</button>
                      <button type="button" onClick={() => excluirColuna(col)} title="Excluir coluna" style={{ ...ESTILO_BTN_COLUNA, color: 'var(--vermelho)' }}>🗑</button>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {itens.map((m) => (
                      <div
                        key={m.id}
                        className="brk-card"
                        draggable
                        onDragStart={(e) => { setArrastandoId(m.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', m.id); }}
                        onDragEnd={() => { setArrastandoId(null); setColunaAlvo(null); }}
                        title="Arraste para mover de coluna"
                        // user-select: auto contorna o bug do Chrome (draggable + user-select:none
                        // não dispara dragstart no mouse real), garantindo o arraste do card.
                        style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6, cursor: 'grab', opacity: arrastandoId === m.id ? 0.5 : 1, userSelect: 'auto', WebkitUserSelect: 'auto' }}
                      >
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
                          {colunasSelect(m.status).map((s) => <option key={s.chave} value={s.chave}>{s.rotulo}</option>)}
                        </select>
                        {/* Modelo de Mensagem usado na campanha: seleciona, mostra a mensagem e salva. */}
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--texto-fraco)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Modelo de mensagem</span>
                          <select
                            value={modeloSel[m.id] ?? (m.modeloMensagemId ?? '')}
                            onChange={(e) => setModeloSel((prev) => ({ ...prev, [m.id]: e.target.value }))}
                            className="brk-input"
                            style={{ fontSize: 11.5, padding: '3px 6px' }}
                          >
                            <option value="">Sem mensagem</option>
                            {modelos.map((mm) => <option key={mm.id} value={mm.id}>{mm.titulo}</option>)}
                          </select>
                        </label>
                        {(() => {
                          const sel = modeloSel[m.id] ?? (m.modeloMensagemId ?? '');
                          const mod = modelos.find((x) => x.id === sel);
                          const alterado = sel !== (m.modeloMensagemId ?? '');
                          return (
                            <>
                              {mod && (
                                <div style={{ fontSize: 11, lineHeight: 1.35, color: 'var(--texto-suave)', background: 'var(--superficie-2)', border: '1px solid var(--borda)', borderRadius: 6, padding: '5px 7px', maxHeight: 66, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                                  {textoDoCorpo(mod.corpo)}
                                </div>
                              )}
                              {alterado && (
                                <button
                                  type="button"
                                  onClick={() => salvarModeloMaterial(m.id, sel)}
                                  disabled={salvandoModelo === m.id}
                                  style={{ fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--borda-forte)', background: 'var(--superficie-3)', color: 'var(--cinza-vapor)', cursor: salvandoModelo === m.id ? 'default' : 'pointer' }}
                                >
                                  {salvandoModelo === m.id ? 'Salvando…' : 'Salvar mensagem'}
                                </button>
                              )}
                            </>
                          );
                        })()}
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
