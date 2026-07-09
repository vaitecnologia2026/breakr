// Tela "Métricas" (CRM Comercial) — Insights ligado a dados REAIS. Submenu com
// "Meu Painel" + os 35 relatórios (agrupados por funil, do wireframe DMhub) na
// esquerda; à direita, as métricas computadas dos Leads (/comercial/leads) e das
// Atividades (/comercial/atividades). Cada relatório mostra os registros reais
// que o mapeiam. Estados carregando/erro no padrão do app.
import { useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { comDemo, mockSeDemo } from '../lib/demo';
import { PaginaShell, EstadoCarregando, EstadoErro } from '../components/primitivos';
import { Card, Badge, Th, Td } from '../components/ui';

type StatusLead = 'NOVO' | 'CONTATADO' | 'QUALIFICADO' | 'PROPOSTA' | 'GANHO' | 'PERDIDO';
interface Lead {
  id: string; nome: string; empresa: string | null; origem: string | null; status: StatusLead;
  valorEstimado: string | null; criadoEm: string; responsavel?: { nome: string } | null;
}
interface Atividade {
  id: string; titulo: string; tipo: string; status: 'PENDENTE' | 'CONCLUIDA';
  vencimento: string | null; responsavel?: { nome: string } | null;
}

const MOCK_LEADS: Lead[] = [
  { id: 'm1', nome: 'Casa de assados Morsch', empresa: null, origem: 'Inbound', status: 'PROPOSTA', valorEstimado: '4150', criadoEm: '2026-07-07T16:08:00Z', responsavel: { nome: 'Gustavo Costa' } },
  { id: 'm2', nome: 'Cyborg Lanches', empresa: null, origem: 'Prospecção', status: 'GANHO', valorEstimado: '0', criadoEm: '2026-07-02T16:51:00Z', responsavel: { nome: 'Gustavo Costa' } },
  { id: 'm3', nome: 'Empório da Lasanha', empresa: null, origem: 'Prospecção', status: 'PERDIDO', valorEstimado: '0', criadoEm: '2026-07-02T12:05:00Z', responsavel: { nome: 'Gustavo Costa' } },
];
const MOCK_ATIV: Atividade[] = [
  { id: 'a1', titulo: 'WhatsApp', tipo: 'WHATSAPP', status: 'CONCLUIDA', vencimento: '2026-07-08T18:00:00Z', responsavel: { nome: 'Gustavo Costa' } },
];

const ROTULO_STATUS: Record<StatusLead, string> = {
  NOVO: 'Novo', CONTATADO: 'Contatado', QUALIFICADO: 'Qualificado', PROPOSTA: 'Proposta', GANHO: 'Ganho', PERDIDO: 'Perdido',
};

interface Report { g: string; n: string; e: string; v: string; vp: string; d: string; }
// Metadados dos 35 relatórios (do wireframe DMhub) — os NÚMEROS/registros vêm do banco.
const REPORTS: Report[] = [
  { g: 'Geral', n: 'Ganhos vs Perdidos', e: 'Negócios', v: 'Pizza', vp: 'Status', d: 'Proporção de negócios por status.' },
  { g: 'Geral', n: 'Receita Mensal', e: 'Negócios', v: 'Barras', vp: 'Data de fechamento (mês)', d: 'Receita ganha mês a mês (apenas ganhos).' },
  { g: 'Geral', n: 'Negócios Criados por Dia', e: 'Negócios', v: 'Barras', vp: 'Data de criação (dia)', d: 'Volume de negócios criados.' },
  { g: 'Geral', n: 'Receita por Responsável', e: 'Negócios', v: 'Barras', vp: 'Responsável', d: 'Receita ganha por vendedor (apenas ganhos).' },
  { g: 'Geral', n: 'Negócios por Responsável', e: 'Negócios', v: 'Barras empilhadas', vp: 'Responsável', d: 'Negócios por vendedor, por status.' },
  { g: 'Prospecção', n: 'Mix de Atividades', e: 'Atividades', v: 'Barras empilhadas', vp: 'Responsável', d: 'Atividades por vendedor, por tipo.' },
  { g: 'Prospecção', n: 'Atividades por Responsável', e: 'Atividades', v: 'Barras empilhadas', vp: 'Responsável', d: 'Atividades por vendedor: concluídas vs pendentes.' },
  { g: 'Prospecção', n: 'Negócios Abertos por Etapa', e: 'Negócios', v: 'Barras', vp: 'Etapa', d: 'Negócios em aberto por etapa.' },
  { g: 'Prospecção', n: 'Funil de Conversão', e: 'Negócios', v: 'Funil', vp: 'Etapa', d: 'Conversão entre etapas do funil.' },
  { g: 'Prospecção', n: 'Leads Ganhos', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Total de negócios ganhos.' },
  { g: 'Prospecção', n: 'Reuniões Agendadas', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios na etapa de proposta/reunião.' },
  { g: 'Prospecção', n: 'Contatos Realizados com Decisor', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios que atingiram contato/qualificação.' },
  { g: 'Prospecção', n: 'Novos Leads no Funil', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios na 1ª etapa do funil.' },
  { g: 'Inbound', n: 'Mix de Atividades', e: 'Atividades', v: 'Barras empilhadas', vp: 'Responsável', d: 'Atividades por vendedor, por tipo.' },
  { g: 'Inbound', n: 'Atividades por Responsável', e: 'Atividades', v: 'Barras empilhadas', vp: 'Responsável', d: 'Atividades por vendedor: concluídas vs pendentes.' },
  { g: 'Inbound', n: 'Negócios Abertos por Etapa', e: 'Negócios', v: 'Barras', vp: 'Etapa', d: 'Negócios em aberto por etapa.' },
  { g: 'Inbound', n: 'Funil de Conversão', e: 'Negócios', v: 'Funil', vp: 'Etapa', d: 'Conversão entre etapas do funil.' },
  { g: 'Inbound', n: 'Leads Ganhos', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Total de negócios ganhos.' },
  { g: 'Inbound', n: 'Reuniões Agendadas', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios na etapa de proposta/reunião.' },
  { g: 'Inbound', n: 'Leads Qualificados pelo Formulário', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios qualificados.' },
  { g: 'Inbound', n: 'Leads em Formulário Preenchido', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios novos no funil.' },
  { g: 'Social Selling', n: 'Mix de Atividades', e: 'Atividades', v: 'Barras empilhadas', vp: 'Responsável', d: 'Atividades por vendedor, por tipo.' },
  { g: 'Social Selling', n: 'Atividades por Responsável', e: 'Atividades', v: 'Barras empilhadas', vp: 'Responsável', d: 'Atividades por vendedor: concluídas vs pendentes.' },
  { g: 'Social Selling', n: 'Negócios Abertos por Etapa', e: 'Negócios', v: 'Barras', vp: 'Etapa', d: 'Negócios em aberto por etapa.' },
  { g: 'Social Selling', n: 'Funil de Conversão', e: 'Negócios', v: 'Funil', vp: 'Etapa', d: 'Conversão entre etapas do funil.' },
  { g: 'Social Selling', n: 'Leads Ganhos', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Total de negócios ganhos.' },
  { g: 'Social Selling', n: 'Reuniões Agendadas', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios na etapa de proposta/reunião.' },
  { g: 'Social Selling', n: 'Novos Leads no Funil', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios na 1ª etapa do funil.' },
  { g: 'Negociação', n: 'Mix de Atividades', e: 'Atividades', v: 'Barras empilhadas', vp: 'Responsável', d: 'Atividades por vendedor, por tipo.' },
  { g: 'Negociação', n: 'Atividades por Responsável', e: 'Atividades', v: 'Barras empilhadas', vp: 'Responsável', d: 'Atividades por vendedor: concluídas vs pendentes.' },
  { g: 'Negociação', n: 'Negócios Abertos por Etapa', e: 'Negócios', v: 'Barras', vp: 'Etapa', d: 'Negócios em aberto por etapa.' },
  { g: 'Negociação', n: 'Funil de Conversão', e: 'Negócios', v: 'Funil', vp: 'Etapa', d: 'Conversão entre etapas do funil.' },
  { g: 'Negociação', n: 'Leads Ganhos', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Total de negócios ganhos.' },
  { g: 'Negociação', n: 'Reuniões Agendadas', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios na etapa de proposta/reunião.' },
  { g: 'Negociação', n: 'Novos Leads no Funil', e: 'Negócios', v: 'Cartão nº', vp: '', d: 'Negócios na 1ª etapa do funil.' },
];
const GRUPOS = ['Geral', 'Prospecção', 'Inbound', 'Social Selling', 'Negociação'];

function brl(v: string | null): string {
  const n = v ? Number(v) : 0;
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function statusTag(s: StatusLead): ReactNode {
  if (s === 'GANHO') return <Badge cor="verde">Ganho</Badge>;
  if (s === 'PERDIDO') return <Badge cor="vermelho">Perdido</Badge>;
  return ROTULO_STATUS[s];
}

// Filtra os leads reais conforme o relatório selecionado (mapeamento aproximado
// para os status do sistema — GANHO/PERDIDO/abertos/etapas).
function leadsDoRelatorio(n: string, leads: Lead[]): Lead[] {
  const abertos = (l: Lead) => l.status !== 'GANHO' && l.status !== 'PERDIDO';
  if (n.includes('Ganhos vs Perdidos')) return leads.filter((l) => l.status === 'GANHO' || l.status === 'PERDIDO');
  if (n.includes('Leads Ganhos') || n.includes('Receita')) return leads.filter((l) => l.status === 'GANHO');
  if (n.includes('Reuniões')) return leads.filter((l) => l.status === 'PROPOSTA');
  if (n.includes('Decisor')) return leads.filter((l) => l.status === 'CONTATADO' || l.status === 'QUALIFICADO');
  if (n.includes('Qualificados')) return leads.filter((l) => l.status === 'QUALIFICADO');
  if (n.includes('Formulário') || n.includes('Novos Leads')) return leads.filter((l) => l.status === 'NOVO');
  if (n.includes('Abertos') || n.includes('Funil')) return leads.filter(abertos);
  return leads;
}

function Kpi({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <Card>
      <div style={{ color: 'var(--texto-fraco)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{rotulo}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: cor ?? 'var(--texto)' }}>{valor}</div>
    </Card>
  );
}

function MeuPainelView({ leads }: { leads: Lead[] }) {
  const cont = (s: StatusLead) => leads.filter((l) => l.status === s).length;
  const ganhos = cont('GANHO');
  const perdidos = cont('PERDIDO');
  const fechados = ganhos + perdidos;
  const taxa = fechados > 0 ? Math.round((ganhos / fechados) * 100) : 0;
  return (
    <>
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 12px' }}>Meu Painel</h2>
      <div className="brk-rgrid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <Kpi rotulo="Novos Leads" valor={String(cont('NOVO'))} />
        <Kpi rotulo="Em contato/qualificação" valor={String(cont('CONTATADO') + cont('QUALIFICADO'))} />
        <Kpi rotulo="Em proposta" valor={String(cont('PROPOSTA'))} />
        <Kpi rotulo="Ganhos" valor={String(ganhos)} cor="var(--verde)" />
      </div>
      <Card>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Negócios por etapa</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12 }}>
          {(Object.keys(ROTULO_STATUS) as StatusLead[]).map((s) => (
            <div key={s}>{ROTULO_STATUS[s]} <b>{cont(s)}</b></div>
          ))}
        </div>
      </Card>
      <div className="brk-rgrid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <Kpi rotulo="Ganhos" valor={String(ganhos)} cor="var(--verde)" />
        <Kpi rotulo="Perdidos" valor={String(perdidos)} cor="var(--vermelho)" />
        <Kpi rotulo="Taxa de conversão" valor={`${taxa}%`} />
      </div>
    </>
  );
}

function ReportView({ report, leads, ativ }: { report: Report; leads: Lead[]; ativ: Atividade[] }) {
  const ehAtividade = report.e === 'Atividades';
  const linhas = ehAtividade ? ativ : leadsDoRelatorio(report.n, leads);
  const count = linhas.length;
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{report.n}</h2>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <Badge cor="azul">{report.g}</Badge>
        <Badge cor="neutro">{report.e}</Badge>
        <Badge cor="neutro">{report.v}</Badge>
        {report.vp && <Badge cor="neutro">Ver por: {report.vp}</Badge>}
      </div>
      <Card>
        <div style={{ color: 'var(--texto-fraco)', fontSize: 12.5, marginBottom: 10 }}>{report.d}</div>
        {report.v.indexOf('Cartão') >= 0 && (
          <div style={{ textAlign: 'center', margin: '18px 0' }}>
            <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1 }}>{count}</div>
            <div style={{ color: 'var(--texto-fraco)', fontSize: 12 }}>no período</div>
          </div>
        )}
        <div style={{ fontSize: 10, letterSpacing: 1, color: 'var(--texto-fraco)', textTransform: 'uppercase', fontWeight: 700, margin: '4px 0 6px' }}>Registros · {count}</div>
        {count === 0 ? (
          <div style={{ color: 'var(--texto-fraco)', fontSize: 12.5 }}>Sem registros para este relatório.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="brk-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              {ehAtividade ? (
                <>
                  <thead><tr><Th>Título</Th><Th>Tipo</Th><Th>Status</Th><Th>Vencimento</Th><Th>Responsável</Th></tr></thead>
                  <tbody>
                    {ativ.map((a) => (
                      <tr key={a.id}>
                        <Td>{a.titulo}</Td>
                        <Td>{a.tipo}</Td>
                        <Td>{a.status === 'CONCLUIDA' ? <Badge cor="verde">Concluída</Badge> : 'Pendente'}</Td>
                        <Td>{a.vencimento ? new Date(a.vencimento).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</Td>
                        <Td>{a.responsavel?.nome ?? '—'}</Td>
                      </tr>
                    ))}
                  </tbody>
                </>
              ) : (
                <>
                  <thead><tr><Th>Título</Th><Th>Valor</Th><Th>Etapa</Th><Th>Origem</Th><Th>Responsável</Th><Th>Criado em</Th><Th>Status</Th></tr></thead>
                  <tbody>
                    {(linhas as Lead[]).map((l) => (
                      <tr key={l.id}>
                        <Td>{l.nome}</Td>
                        <Td>{brl(l.valorEstimado)}</Td>
                        <Td>{ROTULO_STATUS[l.status]}</Td>
                        <Td>{l.origem ?? '—'}</Td>
                        <Td>{l.responsavel?.nome ?? '—'}</Td>
                        <Td>{new Date(l.criadoEm).toLocaleDateString('pt-BR')}</Td>
                        <Td>{statusTag(l.status)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </>
              )}
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

function Submenu({ sel, onSel }: { sel: number | null; onSel: (v: number | null) => void }) {
  const itemStyle = (ativo: boolean): React.CSSProperties => ({
    padding: '7px 10px', borderRadius: 8, fontSize: 12.5, cursor: 'pointer',
    color: ativo ? 'var(--texto)' : 'var(--texto-suave)',
    background: ativo ? 'var(--superficie-3)' : 'transparent', fontWeight: ativo ? 600 : 400,
  });
  return (
    <Card>
      <div onClick={() => onSel(null)} style={itemStyle(sel === null)}>▦ Meu Painel</div>
      <div style={{ fontSize: 10, letterSpacing: 1, color: 'var(--texto-fraco)', textTransform: 'uppercase', fontWeight: 700, padding: '12px 10px 4px' }}>Relatórios · {REPORTS.length}</div>
      <div style={{ maxHeight: 460, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {GRUPOS.map((g) => (
          <div key={g}>
            <div style={{ fontSize: 10.5, color: 'var(--texto-fraco)', fontWeight: 700, padding: '8px 10px 2px' }}>{g}</div>
            {REPORTS.map((r, i) => (r.g === g ? (
              <div key={i} onClick={() => onSel(i)} style={itemStyle(sel === i)}>{r.n}</div>
            ) : null))}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function Metricas() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [ativ, setAtiv] = useState<Atividade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sel, setSel] = useState<number | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<Lead[]>('/comercial/leads');
      setLeads(comDemo(data, MOCK_LEADS));
      api.get<Atividade[]>('/comercial/atividades')
        .then(({ data: a }) => setAtiv(comDemo(a, MOCK_ATIV)))
        .catch(() => setAtiv(mockSeDemo(MOCK_ATIV)));
    } catch {
      setLeads(mockSeDemo(MOCK_LEADS));
      setAtiv(mockSeDemo(MOCK_ATIV));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <PaginaShell titulo="Métricas" subtitulo="Insights (BI) — painel próprio + 35 relatórios (dados reais)">
      {carregando ? (
        <EstadoCarregando />
      ) : erro ? (
        <EstadoErro mensagem={erro} onTentar={carregar} />
      ) : (
        <div className="brk-rsplit" style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 240px) 1fr', gap: 16, alignItems: 'start' }}>
          <Submenu sel={sel} onSel={setSel} />
          <div>{sel === null ? <MeuPainelView leads={leads} /> : <ReportView report={REPORTS[sel]} leads={leads} ativ={ativ} />}</div>
        </div>
      )}
    </PaginaShell>
  );
}
