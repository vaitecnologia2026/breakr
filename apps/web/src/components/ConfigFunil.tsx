// Tela "Configurações do Pipeline" (Configurar funil) — aberta pelo menu ⋮ de
// "Negócios". Overlay em tela cheia. Permite, por pipeline: reordenar etapas
// (arrastar), renomear, ajustar a meta de dias no estágio e excluir; além de
// criar uma nova etapa. Usa as rotas de config já existentes do backend.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { MensagemErro } from './primitivos';
import { Btn } from './ui';

type StatusLead = 'NOVO' | 'CONTATADO' | 'QUALIFICADO' | 'PROPOSTA' | 'GANHO' | 'PERDIDO';
interface Etapa { id: string; nome: string; ordem: number; status: StatusLead; metaDias?: number }
interface Pipeline { id: string; nome: string; ordem: number; etapas: Etapa[] }

interface Props {
  pipelinesIniciais: Pipeline[];
  pipelineSelInicial: string | null;
  onFechar: () => void;
  onMudou: () => void;
}

function Ico({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>{children}</svg>;
}
const IcoVoltar = () => <Ico size={18}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></Ico>;
const IcoLixeira = () => <Ico size={15}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></Ico>;
const IcoChevron = () => <Ico size={14}><polyline points="6 9 12 15 18 9" /></Ico>;
const IcoGrip = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
    <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
    <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
  </svg>
);

export function ConfigFunil({ pipelinesIniciais, pipelineSelInicial, onFechar, onMudou }: Props) {
  const [pipelines, setPipelines] = useState<Pipeline[]>(pipelinesIniciais);
  const [pipelineSel, setPipelineSel] = useState<string | null>(pipelineSelInicial ?? pipelinesIniciais[0]?.id ?? null);
  const [erro, setErro] = useState<string | null>(null);
  const [dropdown, setDropdown] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [criando, setCriando] = useState(false);
  const [addAberto, setAddAberto] = useState(false);
  const arrastando = useRef<number | null>(null);
  const [alvo, setAlvo] = useState<number | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onFechar(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFechar]);

  const pipelineAtual = pipelines.find((p) => p.id === pipelineSel) ?? pipelines[0] ?? null;
  const etapas = [...(pipelineAtual?.etapas ?? [])].sort((a, b) => a.ordem - b.ordem);

  async function recarregar() {
    try {
      const { data } = await api.get<Pipeline[]>('/comercial/pipelines');
      setPipelines(data);
      onMudou();
    } catch { /* mantém estado atual */ }
  }

  async function renomear(etapa: Etapa, nome: string) {
    const limpo = nome.trim();
    if (!limpo || limpo === etapa.nome) return;
    setErro(null);
    try { await api.patch(`/comercial/etapas/${etapa.id}`, { nome: limpo }); await recarregar(); }
    catch (e: any) { setErro(e?.response?.data?.message ?? 'Erro ao renomear etapa.'); }
  }
  async function ajustarDias(etapa: Etapa, delta: number) {
    const atual = etapa.metaDias ?? 7;
    const novo = Math.max(1, atual + delta);
    if (novo === atual) return;
    setErro(null);
    try { await api.patch(`/comercial/etapas/${etapa.id}`, { metaDias: novo }); await recarregar(); }
    catch (e: any) { setErro(e?.response?.data?.message ?? 'Erro ao ajustar dias.'); }
  }
  async function excluir(etapa: Etapa) {
    if (!window.confirm('Excluir esta etapa? Os negócios nela deixam de aparecer no quadro (não são apagados).')) return;
    setErro(null);
    try { await api.delete(`/comercial/etapas/${etapa.id}`); await recarregar(); }
    catch (e: any) { setErro(e?.response?.data?.message ?? 'Erro ao excluir etapa.'); }
  }
  async function criarEtapa() {
    const nome = novoNome.trim();
    if (!nome || !pipelineSel) return;
    setCriando(true); setErro(null);
    try { await api.post(`/comercial/pipelines/${pipelineSel}/etapas`, { nome, status: 'NOVO' }); setNovoNome(''); setAddAberto(false); await recarregar(); }
    catch (e: any) { setErro(e?.response?.data?.message ?? 'Erro ao criar etapa.'); }
    finally { setCriando(false); }
  }
  async function reordenar(destino: number) {
    const origem = arrastando.current;
    arrastando.current = null; setAlvo(null);
    if (origem === null || origem === destino || !pipelineSel) return;
    const arr = [...etapas];
    const [m] = arr.splice(origem, 1);
    arr.splice(destino, 0, m);
    setErro(null);
    try { await api.patch(`/comercial/pipelines/${pipelineSel}/etapas/ordem`, { ids: arr.map((e) => e.id) }); await recarregar(); }
    catch (e: any) { setErro(e?.response?.data?.message ?? 'Erro ao reordenar.'); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'var(--fundo, var(--preto-fumaca))', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--borda)', background: 'var(--superficie)', position: 'sticky', top: 0, zIndex: 5 }}>
        <button type="button" onClick={onFechar} title="Voltar" style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid var(--borda)', background: 'var(--superficie-2)', color: 'var(--texto)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><IcoVoltar /></button>
        <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--texto)' }}>Configurações do Pipeline</span>
        <div style={{ position: 'relative' }}>
          <button type="button" onClick={() => setDropdown((v) => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 9, border: '1px solid var(--borda)', background: 'var(--superficie-2)', color: 'var(--texto)', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
            {pipelineAtual?.nome ?? 'Pipeline'} <IcoChevron />
          </button>
          {dropdown && (
            <div style={{ position: 'absolute', top: 40, left: 0, zIndex: 30, minWidth: 220, background: 'var(--superficie)', border: '1px solid var(--borda)', borderRadius: 10, padding: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
              {pipelines.map((p) => (
                <div key={p.id} onClick={() => { setPipelineSel(p.id); setDropdown(false); setAddAberto(false); }}
                  style={{ padding: '7px 8px', borderRadius: 7, cursor: 'pointer', fontSize: 13, color: 'var(--texto)', background: p.id === pipelineSel ? 'var(--superficie-3)' : 'transparent' }}>
                  {p.id === pipelineSel ? '✓ ' : ''}{p.nome}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 820, width: '100%', margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {erro && <MensagemErro texto={erro} />}
        <div style={{ fontSize: 14, color: 'var(--texto-suave)', marginBottom: 4 }}>
          Etapas de <b style={{ color: 'var(--amarelo-fagulha)' }}>{pipelineAtual?.nome ?? '—'}</b>
        </div>

        {etapas.map((et, idx) => (
          <div key={et.id} draggable
            onDragStart={() => { arrastando.current = idx; }}
            onDragOver={(e) => { e.preventDefault(); if (alvo !== idx) setAlvo(idx); }}
            onDragLeave={(e) => { if (e.currentTarget === e.target) setAlvo((a) => (a === idx ? null : a)); }}
            onDrop={() => reordenar(idx)}
            onDragEnd={() => { arrastando.current = null; setAlvo(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'var(--superficie)', border: `1px solid ${alvo === idx ? 'var(--amarelo-fagulha)' : 'var(--borda)'}` }}>
            <span title="Arraste para reordenar" style={{ cursor: 'grab', color: 'var(--texto-fraco)', display: 'flex' }}><IcoGrip /></span>
            <span style={{ width: 11, height: 11, borderRadius: 999, background: 'var(--borda-forte)', flex: '0 0 auto' }} />
            <input
              defaultValue={et.nome}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              onBlur={(e) => renomear(et, e.target.value)}
              className="brk-input"
              style={{ flex: 1, minWidth: 0, background: 'transparent', border: '1px solid transparent', fontSize: 14, fontWeight: 600, color: 'var(--texto)', padding: '6px 8px' }}
              onFocus={(e) => { e.currentTarget.style.border = '1px solid var(--borda-forte)'; e.currentTarget.style.background = 'var(--preto-fumaca)'; }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}>
              <span style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>Estág.</span>
              <button type="button" onClick={() => ajustarDias(et, -1)} title="Menos um dia" style={btnDia}>–</button>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--texto)', minWidth: 20, textAlign: 'center' }}>{et.metaDias ?? 7}</span>
              <button type="button" onClick={() => ajustarDias(et, 1)} title="Mais um dia" style={btnDia}>+</button>
              <span style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>dias</span>
            </div>
            <button type="button" onClick={() => excluir(et)} title="Excluir etapa" style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--texto-fraco)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><IcoLixeira /></button>
          </div>
        ))}

        {/* + Nova Etapa */}
        {addAberto ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'color-mix(in srgb, var(--amarelo-fagulha) 8%, transparent)', border: '1px solid var(--amarelo-fagulha)' }}>
            <input autoFocus className="brk-input" placeholder="Nome da etapa" value={novoNome} onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') criarEtapa(); if (e.key === 'Escape') { setAddAberto(false); setNovoNome(''); } }}
              style={{ flex: 1, minWidth: 0 }} />
            <Btn tamanho="sm" onClick={criarEtapa} disabled={criando || !novoNome.trim()}>{criando ? 'Criando…' : '+ Criar'}</Btn>
            <Btn variante="secondary" tamanho="sm" onClick={() => { setAddAberto(false); setNovoNome(''); }}>Cancelar</Btn>
          </div>
        ) : (
          <button type="button" onClick={() => setAddAberto(true)}
            style={{ padding: '14px', borderRadius: 12, border: '1px dashed var(--borda-forte)', background: 'transparent', color: 'var(--texto-fraco)', fontSize: 13.5, cursor: 'pointer', textAlign: 'center' }}>
            + Nova Etapa
          </button>
        )}
      </div>
    </div>
  );
}

const btnDia: React.CSSProperties = { width: 26, height: 26, borderRadius: 7, border: '1px solid var(--borda)', background: 'var(--superficie-2)', color: 'var(--texto)', cursor: 'pointer', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 };
