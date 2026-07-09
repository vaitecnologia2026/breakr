// Tela "Meu Painel" (CRM Comercial) — visão do vendedor com dados REAIS:
// KPIs e listas computados dos Leads (/comercial/leads) e das Atividades
// (/comercial/atividades). Estados carregando/erro no padrão do app.
import { useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { comDemo, mockSeDemo } from '../lib/demo';
import { PaginaShell, EstadoCarregando, EstadoErro } from '../components/primitivos';
import { Card, Badge } from '../components/ui';

type StatusLead = 'NOVO' | 'CONTATADO' | 'QUALIFICADO' | 'PROPOSTA' | 'GANHO' | 'PERDIDO';

interface Lead {
  id: string; nome: string; empresa: string | null; status: StatusLead;
  valorEstimado: string | null; atualizadoEm: string; responsavel?: { nome: string } | null;
}
interface Atividade {
  id: string; titulo: string; tipo: string; status: 'PENDENTE' | 'CONCLUIDA';
  vencimento: string | null; lead?: { nome: string } | null;
}

const MOCK_LEADS: Lead[] = [
  { id: 'm1', nome: 'Guria Doceira', empresa: 'Guria Doceira Ltda', status: 'NOVO', valorEstimado: null, atualizadoEm: '2026-07-03T12:00:00Z' },
  { id: 'm2', nome: 'Fornalha Pizzaria', empresa: null, status: 'QUALIFICADO', valorEstimado: '4150', atualizadoEm: '2026-06-12T12:00:00Z' },
  { id: 'm3', nome: 'Bolonhê', empresa: 'Bolonhê Lasanhas', status: 'GANHO', valorEstimado: '8000', atualizadoEm: '2026-07-06T12:00:00Z' },
];
const MOCK_ATIV: Atividade[] = [
  { id: 'a1', titulo: 'Ligação de contato', tipo: 'LIGACAO', status: 'PENDENTE', vencimento: new Date().toISOString(), lead: { nome: 'KI PIZZA TEUTÔNIA' } },
];

const ETAPAS: { status: StatusLead; rotulo: string }[] = [
  { status: 'NOVO', rotulo: 'Novo' },
  { status: 'CONTATADO', rotulo: 'Contatado' },
  { status: 'QUALIFICADO', rotulo: 'Qualificado' },
  { status: 'PROPOSTA', rotulo: 'Proposta' },
  { status: 'GANHO', rotulo: 'Ganho' },
  { status: 'PERDIDO', rotulo: 'Perdido' },
];

function brl(n: number): string {
  return `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function dias(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

function Kpi({ rotulo, valor, hint, cor }: { rotulo: string; valor: string; hint?: string; cor?: string }) {
  return (
    <Card>
      <div style={{ color: 'var(--texto-fraco)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{rotulo}</div>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 0.3, color: cor ?? 'var(--texto)' }}>{valor}</div>
      {hint && <div style={{ color: 'var(--texto-fraco)', fontSize: 11.5, marginTop: 3 }}>{hint}</div>}
    </Card>
  );
}
function Painel({ titulo, children }: { titulo: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{titulo}</h3>
      {children}
    </Card>
  );
}

export function MeuPainel() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [ativ, setAtiv] = useState<Atividade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

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

  if (carregando) {
    return <PaginaShell titulo="Meu Painel" subtitulo="Visão geral do vendedor"><EstadoCarregando /></PaginaShell>;
  }
  if (erro) {
    return <PaginaShell titulo="Meu Painel" subtitulo="Visão geral do vendedor"><EstadoErro mensagem={erro} onTentar={carregar} /></PaginaShell>;
  }

  const abertos = leads.filter((l) => l.status !== 'GANHO' && l.status !== 'PERDIDO');
  const ganhos = leads.filter((l) => l.status === 'GANHO');
  const perdidos = leads.filter((l) => l.status === 'PERDIDO');
  const totalPipeline = abertos.reduce((s, l) => s + (l.valorEstimado ? Number(l.valorEstimado) : 0), 0);
  const valorGanhos = ganhos.reduce((s, l) => s + (l.valorEstimado ? Number(l.valorEstimado) : 0), 0);
  const fechados = ganhos.length + perdidos.length;
  const taxa = fechados > 0 ? Math.round((ganhos.length / fechados) * 100) : 0;
  const hoje = new Date();
  const ativHoje = ativ.filter((a) => a.status === 'PENDENTE' && a.vencimento && new Date(a.vencimento).toDateString() === hoje.toDateString());
  const parados = [...abertos].sort((a, b) => new Date(a.atualizadoEm).getTime() - new Date(b.atualizadoEm).getTime()).slice(0, 3);

  return (
    <PaginaShell titulo="Meu Painel" subtitulo="Visão geral do vendedor — pipeline, atividades e etapas">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <Kpi rotulo="Total em Pipeline" valor={brl(totalPipeline)} hint={`${abertos.length} negócios abertos`} />
        <Kpi rotulo="Ganhos" valor={brl(valorGanhos)} hint={`${ganhos.length} negócios fechados`} cor="var(--verde)" />
        <Kpi rotulo="Taxa de Conversão" valor={`${taxa}%`} hint="negócios ganhos/fechados" />
        <Kpi rotulo="Atividades Hoje" valor={String(ativHoje.length)} hint="pendentes" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Painel titulo={<>⚠️ Negócios parados <Badge cor="neutro">{parados.length} negócios</Badge></>}>
          {parados.length === 0 ? (
            <div style={{ color: 'var(--texto-fraco)', fontSize: 12.5 }}>Nenhum negócio parado.</div>
          ) : parados.map((l) => {
            const d = dias(l.atualizadoEm);
            return (
              <div key={l.id} style={{ border: '1px solid var(--borda)', borderRadius: 10, padding: 10, marginBottom: 8, background: 'var(--superficie-2)' }}>
                <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 4 }}>{l.nome}</div>
                <div style={{ color: 'var(--texto-fraco)', fontSize: 11, marginBottom: 6 }}>{l.empresa || '—'}</div>
                <Badge cor={d >= 7 ? 'vermelho' : 'amarelo'}>{d} dias parado</Badge>
              </div>
            );
          })}
        </Painel>
        <Painel titulo="Atividades de Hoje">
          {ativHoje.length === 0 ? (
            <div style={{ color: 'var(--texto-fraco)', fontSize: 12.5 }}>Sem atividades para hoje.</div>
          ) : ativHoje.map((a) => (
            <div key={a.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', border: '1px solid var(--borda)', borderRadius: 10, padding: 10, marginBottom: 8, background: 'var(--superficie-2)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 12.5 }}>{a.titulo}</div>
                <div style={{ fontSize: 11.5, marginTop: 4, color: 'var(--amarelo-fagulha)' }}>{a.lead?.nome ?? '—'}</div>
              </div>
              <Badge cor="neutro">{a.tipo}</Badge>
            </div>
          ))}
        </Painel>
      </div>

      <Painel titulo="Negócios por Etapa">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12 }}>
          {ETAPAS.map((e) => (
            <div key={e.status}>
              {e.rotulo} <b>{leads.filter((l) => l.status === e.status).length}</b>
            </div>
          ))}
        </div>
      </Painel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        <Kpi rotulo="Ganhos" valor={String(ganhos.length)} cor="var(--verde)" />
        <Kpi rotulo="Perdidos" valor={String(perdidos.length)} cor="var(--vermelho)" />
      </div>
    </PaginaShell>
  );
}
