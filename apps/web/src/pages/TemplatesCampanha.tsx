// Templates de campanha + Geração em lote — Briefing Marketing (Seção 4).
// Cria/edita templates (materiais padrão) e gera, num clique, campanhas+tarefas
// para vários clientes de uma vez, atribuídas ao squad de cada cliente.
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { api } from '../lib/api';
import {
  PaginaHeader, Btn, Campo, CampoSelect, Modal, Badge,
  Carregando, Vazio, ErroEstado, Alerta,
} from '../components/ui';

const DESTINOS: { v: string; r: string }[] = [
  { v: 'TRAFEGO_PAGO', r: 'Tráfego pago' },
  { v: 'ORGANICO', r: 'Orgânico' },
  { v: 'IMPRESSAO', r: 'Impressão' },
];
const DESTINO_ROTULO: Record<string, string> = Object.fromEntries(DESTINOS.map((d) => [d.v, d.r]));

interface TemplateLista {
  id: string; nome: string; tipoCampanha: string | null; tipoServico: string | null;
  arquivado: boolean; totalMateriais: number;
}
interface TemplateMaterial { id: string; titulo: string; tipo: string | null; destino: string; ordem: number }
interface TemplateDetalheT {
  id: string; nome: string; tipoCampanha: string | null; tipoServico: string | null;
  arquivado: boolean; materiais: TemplateMaterial[];
}

export function TemplatesCampanha() {
  const [templates, setTemplates] = useState<TemplateLista[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [incluirArquivados, setIncluirArquivados] = useState(false);
  const [modalNovo, setModalNovo] = useState(false);
  const [abertoId, setAbertoId] = useState<string | null>(null);

  function carregar() {
    setCarregando(true);
    setErro(null);
    api.get<TemplateLista[]>('/templates-campanha', { params: { incluirArquivados } })
      .then(({ data }) => setTemplates(data))
      .catch(() => setErro('Não foi possível carregar os templates.'))
      .finally(() => setCarregando(false));
  }
  useEffect(() => { carregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [incluirArquivados]);

  if (abertoId) {
    return <TemplateDetalhe id={abertoId} onVoltar={() => { setAbertoId(null); carregar(); }} />;
  }

  return (
    <div>
      <PaginaHeader
        titulo="Templates & Geração em lote"
        subtitulo="Modelos de campanha para gerar tarefas de vários clientes num clique (Seção 4 do briefing)."
        acoes={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 12, color: 'var(--texto-suave)', display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={incluirArquivados} onChange={(e) => setIncluirArquivados(e.target.checked)} />
              Ver arquivados
            </label>
            <Btn onClick={() => setModalNovo(true)}>+ Novo template</Btn>
          </div>
        }
      />

      {carregando ? (
        <Carregando />
      ) : erro ? (
        <ErroEstado mensagem={erro} onTentar={carregar} />
      ) : templates.length === 0 ? (
        <Vazio titulo="Nenhum template" subtitulo="Crie um template de campanha para gerar tarefas em lote." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setAbertoId(t.id)}
              className="brk-card brk-card-p"
              style={{ textAlign: 'left', cursor: 'pointer', border: '1px solid var(--borda)', display: 'flex', flexDirection: 'column', gap: 8, opacity: t.arquivado ? 0.6 : 1 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--texto)' }}>{t.nome}</span>
                {t.arquivado && <Badge cor="neutro">Arquivado</Badge>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {t.tipoCampanha && <Badge cor="azul">{t.tipoCampanha}</Badge>}
                {t.tipoServico && <Badge cor="amarelo">{t.tipoServico}</Badge>}
              </div>
              <span style={{ fontSize: 11.5, color: 'var(--texto-suave)' }}>{t.totalMateriais} material(is) padrão</span>
            </button>
          ))}
        </div>
      )}

      {modalNovo && (
        <ModalNovoTemplate
          onFechar={() => setModalNovo(false)}
          onCriado={(idNovo) => { setModalNovo(false); carregar(); setAbertoId(idNovo); }}
        />
      )}
    </div>
  );
}

function ModalNovoTemplate({ onFechar, onCriado }: { onFechar: () => void; onCriado: (id: string) => void }) {
  const [nome, setNome] = useState('');
  const [tipoCampanha, setTipoCampanha] = useState('');
  const [tipoServico, setTipoServico] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroMsg, setErroMsg] = useState<string | null>(null);
  const valido = nome.trim().length >= 2;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || salvando) return;
    setSalvando(true); setErroMsg(null);
    try {
      const { data } = await api.post<{ id: string }>('/templates-campanha', {
        nome: nome.trim(),
        tipoCampanha: tipoCampanha.trim() || undefined,
        tipoServico: tipoServico.trim() || undefined,
      });
      onCriado(data.id);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setErroMsg((Array.isArray(msg) ? msg.join(' ') : msg) || 'Falha ao criar o template.');
      setSalvando(false);
    }
  }

  return (
    <Modal
      titulo="Novo template"
      onFechar={onFechar}
      rodape={
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variante="secondary" onClick={onFechar} disabled={salvando}>Cancelar</Btn>
          <Btn variante="primary" type="submit" form="form-novo-template" disabled={!valido || salvando}>{salvando ? 'Salvando…' : 'Criar'}</Btn>
        </div>
      }
    >
      <form id="form-novo-template" onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {erroMsg && <Alerta tipo="erro">{erroMsg}</Alerta>}
        <Campo rotulo="Nome do template" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Dia dos Namorados — Tráfego Pago" autoFocus required />
        <Campo rotulo="Tipo de campanha" value={tipoCampanha} onChange={(e) => setTipoCampanha(e.target.value)} placeholder="Ex.: Data comemorativa, Lançamento (opcional)" />
        <Campo rotulo="Tipo de serviço" value={tipoServico} onChange={(e) => setTipoServico(e.target.value)} placeholder="Ex.: Tráfego pago, Social media (opcional)" />
      </form>
    </Modal>
  );
}

function TemplateDetalhe({ id, onVoltar }: { id: string; onVoltar: () => void }) {
  const [template, setTemplate] = useState<TemplateDetalheT | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalMaterial, setModalMaterial] = useState(false);
  const [modalGerar, setModalGerar] = useState(false);

  function carregar() {
    setCarregando(true); setErro(null);
    api.get<TemplateDetalheT>(`/templates-campanha/${id}`)
      .then(({ data }) => setTemplate(data))
      .catch(() => setErro('Não foi possível carregar o template.'))
      .finally(() => setCarregando(false));
  }
  useEffect(() => { carregar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function removerMaterial(materialId: string) {
    await api.delete(`/templates-campanha/materiais/${materialId}`);
    carregar();
  }
  async function duplicar() {
    await api.post(`/templates-campanha/${id}/duplicar`);
    onVoltar();
  }
  async function arquivar(arquivado: boolean) {
    await api.patch(`/templates-campanha/${id}`, { arquivado });
    carregar();
  }

  return (
    <div>
      <PaginaHeader
        titulo={template?.nome ?? 'Template'}
        subtitulo={template ? [template.tipoCampanha, template.tipoServico].filter(Boolean).join(' · ') || undefined : undefined}
        acoes={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn variante="secondary" onClick={onVoltar}>← Voltar</Btn>
            <Btn variante="secondary" onClick={duplicar}>Duplicar</Btn>
            {template && <Btn variante="secondary" onClick={() => arquivar(!template.arquivado)}>{template.arquivado ? 'Desarquivar' : 'Arquivar'}</Btn>}
            <Btn variante="secondary" onClick={() => setModalMaterial(true)}>+ Material</Btn>
            <Btn onClick={() => setModalGerar(true)}>Gerar em lote</Btn>
          </div>
        }
      />

      {carregando ? (
        <Carregando />
      ) : erro || !template ? (
        <ErroEstado mensagem={erro ?? 'Template não encontrado.'} onTentar={carregar} />
      ) : (
        <div className="brk-card brk-card-p">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Materiais padrão</h3>
          {template.materiais.length === 0 ? (
            <span style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>Nenhum material. Adicione os materiais que serão gerados para cada cliente.</span>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {template.materiais.map((m) => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--superficie-2)', border: '1px solid var(--borda)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--texto)' }}>{m.titulo}</span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <Badge cor="neutro">{DESTINO_ROTULO[m.destino] ?? m.destino}</Badge>
                      {m.tipo && <span style={{ fontSize: 11, color: 'var(--texto-fraco)' }}>{m.tipo}</span>}
                    </div>
                  </div>
                  <button type="button" onClick={() => removerMaterial(m.id)} title="Remover" style={{ background: 'none', border: 'none', color: 'var(--texto-fraco)', cursor: 'pointer', fontSize: 14 }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modalMaterial && (
        <ModalNovoMaterialTemplate templateId={id} onFechar={() => setModalMaterial(false)} onCriado={() => { setModalMaterial(false); carregar(); }} />
      )}
      {modalGerar && template && (
        <ModalGerarLote template={template} onFechar={() => setModalGerar(false)} onGerado={() => setModalGerar(false)} />
      )}
    </div>
  );
}

function ModalNovoMaterialTemplate({ templateId, onFechar, onCriado }: { templateId: string; onFechar: () => void; onCriado: () => void }) {
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState('');
  const [destino, setDestino] = useState('TRAFEGO_PAGO');
  const [salvando, setSalvando] = useState(false);
  const [erroMsg, setErroMsg] = useState<string | null>(null);
  const valido = titulo.trim().length >= 1;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || salvando) return;
    setSalvando(true); setErroMsg(null);
    try {
      await api.post(`/templates-campanha/${templateId}/materiais`, {
        titulo: titulo.trim(), tipo: tipo.trim() || undefined, destino,
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
      titulo="Novo material do template"
      onFechar={onFechar}
      rodape={
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variante="secondary" onClick={onFechar} disabled={salvando}>Cancelar</Btn>
          <Btn variante="primary" type="submit" form="form-novo-material-tpl" disabled={!valido || salvando}>{salvando ? 'Salvando…' : 'Adicionar'}</Btn>
        </div>
      }
    >
      <form id="form-novo-material-tpl" onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {erroMsg && <Alerta tipo="erro">{erroMsg}</Alerta>}
        <Campo rotulo="Título do material" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Criativo de antecipação" autoFocus required />
        <Campo rotulo="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Ex.: Vídeo curto (opcional)" />
        <CampoSelect rotulo="Destino" value={destino} onChange={(e) => setDestino(e.target.value)}>
          {DESTINOS.map((d) => <option key={d.v} value={d.v}>{d.r}</option>)}
        </CampoSelect>
      </form>
    </Modal>
  );
}

interface ClienteOpcao { id: string; nomeFantasia: string; squadId: string | null }
interface PreviewResp {
  templateNome: string; materiaisPorCliente: number; totalCampanhas: number; totalMateriais: number;
  porSquad: Record<string, number>;
  porCliente: { clienteId: string; cliente: string; squad: string | null; semSquad: boolean; responsavel: string | null; materiais: number }[];
}

function ModalGerarLote({ template, onFechar, onGerado }: { template: TemplateDetalheT; onFechar: () => void; onGerado: () => void }) {
  const [clientes, setClientes] = useState<ClienteOpcao[]>([]);
  const [squads, setSquads] = useState<{ id: string; nome: string }[]>([]);
  const [filtroSquad, setFiltroSquad] = useState('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [nome, setNome] = useState(template.nome);
  const [prazo, setPrazo] = useState('');
  const [preview, setPreview] = useState<PreviewResp | null>(null);
  const [gerando, setGerando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [erroMsg, setErroMsg] = useState<string | null>(null);

  useEffect(() => {
    api.get<ClienteOpcao[]>('/clientes').then(({ data }) => setClientes(data)).catch(() => setClientes([]));
    api.get<{ id: string; nome: string }[]>('/squads').then(({ data }) => setSquads(data)).catch(() => setSquads([]));
  }, []);

  const visiveis = useMemo(
    () => clientes.filter((c) => !filtroSquad || c.squadId === filtroSquad),
    [clientes, filtroSquad],
  );

  function toggle(id: string) {
    setSelecionados((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    setPreview(null);
  }
  function selecionarVisiveis() {
    setSelecionados((s) => { const n = new Set(s); visiveis.forEach((c) => n.add(c.id)); return n; });
    setPreview(null);
  }
  function limpar() { setSelecionados(new Set()); setPreview(null); }

  const ids = Array.from(selecionados);

  async function verPreview() {
    if (ids.length === 0) return;
    setErroMsg(null);
    try {
      const { data } = await api.post<PreviewResp>(`/templates-campanha/${template.id}/preview`, { clienteIds: ids });
      setPreview(data);
    } catch {
      setErroMsg('Falha ao gerar o preview.');
    }
  }

  async function gerar() {
    if (ids.length === 0 || gerando) return;
    setGerando(true); setErroMsg(null);
    try {
      const { data } = await api.post<{ campanhasCriadas: number; materiaisCriados: number }>(
        `/templates-campanha/${template.id}/gerar`,
        { clienteIds: ids, nome: nome.trim() || undefined, prazo: prazo ? new Date(prazo).toISOString() : undefined },
      );
      setResultado(`${data.campanhasCriadas} campanha(s) e ${data.materiaisCriados} tarefa(s) geradas.`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setErroMsg((Array.isArray(msg) ? msg.join(' ') : msg) || 'Falha ao gerar as tarefas.');
      setGerando(false);
    }
  }

  return (
    <Modal
      titulo={`Gerar em lote — ${template.nome}`}
      onFechar={onFechar}
      rodape={
        resultado ? (
          <Btn variante="primary" onClick={onGerado}>Concluir</Btn>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variante="secondary" onClick={onFechar} disabled={gerando}>Cancelar</Btn>
            <Btn variante="secondary" onClick={verPreview} disabled={ids.length === 0 || gerando}>Ver preview</Btn>
            <Btn variante="primary" onClick={gerar} disabled={ids.length === 0 || gerando}>{gerando ? 'Gerando…' : `Gerar (${ids.length})`}</Btn>
          </div>
        )
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {erroMsg && <Alerta tipo="erro">{erroMsg}</Alerta>}
        {resultado ? (
          <Alerta tipo="sucesso">{resultado}</Alerta>
        ) : (
          <>
            {template.materiais.length === 0 && <Alerta tipo="aviso">Este template não tem materiais. Adicione materiais antes de gerar.</Alerta>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Campo rotulo="Nome da campanha gerada" value={nome} onChange={(e) => setNome(e.target.value)} />
              <Campo rotulo="Prazo (opcional)" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
              <CampoSelect rotulo="Filtrar por squad" value={filtroSquad} onChange={(e) => setFiltroSquad(e.target.value)}>
                <option value="">Todos os squads</option>
                {squads.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </CampoSelect>
              <Btn variante="secondary" onClick={selecionarVisiveis}>Selecionar visíveis</Btn>
              <Btn variante="secondary" onClick={limpar}>Limpar</Btn>
              <span style={{ fontSize: 12, color: 'var(--texto-suave)' }}>{ids.length} selecionado(s)</span>
            </div>

            <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--borda)', borderRadius: 8, padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {visiveis.length === 0 ? (
                <span style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>Nenhum cliente.</span>
              ) : visiveis.map((c) => (
                <label key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12.5, padding: '3px 4px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={selecionados.has(c.id)} onChange={() => toggle(c.id)} />
                  <span style={{ color: 'var(--texto)' }}>{c.nomeFantasia}</span>
                  {!c.squadId && <span style={{ fontSize: 10.5, color: 'var(--vermelho)' }}>sem squad</span>}
                </label>
              ))}
            </div>

            {preview && (
              <div className="brk-card brk-card-p" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--texto)' }}>Preview</span>
                <span style={{ fontSize: 12.5, color: 'var(--texto-suave)' }}>
                  {preview.totalCampanhas} campanha(s) · <strong style={{ color: 'var(--amarelo-fagulha)' }}>{preview.totalMateriais} tarefa(s)</strong> ({preview.materiaisPorCliente} por cliente)
                </span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(preview.porSquad).map(([sq, n]) => (
                    <Badge key={sq} cor="azul">{sq}: {n}</Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
