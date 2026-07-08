// Tela "Métricas" (CRM Comercial) — módulo de BI / Insights.
// Baseada no wireframe DMhub CRM (tela 5), reproduzida com o design system atual
// do Breakr. Página de apresentação: dados estáticos do wireframe — não consome
// API nem altera estruturas existentes.
import type { ReactNode } from 'react';
import { PaginaShell } from '../components/primitivos';
import { Card, Badge, Th, Td } from '../components/ui';

function Kpi({ rotulo, valor, hint, cor }: { rotulo: string; valor: string; hint?: string; cor?: string }) {
  return (
    <Card>
      <div style={{ color: 'var(--texto-fraco)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{rotulo}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: cor ?? 'var(--texto)' }}>{valor}</div>
      {hint && <div style={{ color: 'var(--texto-fraco)', fontSize: 11.5, marginTop: 3 }}>{hint}</div>}
    </Card>
  );
}

function Barras({ alturas }: { alturas: number[] }) {
  return (
    <div style={{ height: 150, border: '1px dashed var(--borda-forte)', borderRadius: 10, display: 'flex', alignItems: 'flex-end', gap: 6, padding: 12 }}>
      {alturas.map((h, i) => (
        <div key={i} style={{ flex: 1, height: `${h}%`, background: 'linear-gradient(180deg, var(--amarelo), var(--amarelo-fagulha))', borderRadius: '4px 4px 0 0', opacity: 0.85 }} />
      ))}
    </div>
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

const REGISTROS: string[][] = [
  ['[R1] - Casa de assados Morsch', 'R$ 4.150', 'Apresentar proposta', 'Negociação', 'Gustavo Costa', '07 jul 16:08', '—'],
  ['[R1] - House Sushi SCS', 'R$ 8.000', 'Apresentar proposta', 'Negociação', 'Gustavo Costa', '06 jul 15:53', '—'],
  ['Cyborg Lanches', 'R$ 0', 'Reunião Agendada', 'Prospecção', 'Gustavo Costa', '02 jul 16:51', 'Ganho'],
  ['Empório da Lasanha', 'R$ 0', 'Contato c/ empresa', 'Prospecção', 'Gustavo Costa', '02 jul 12:05', 'Perdido'],
  ['[R1] - Pizza Brabos', 'R$ 6.000', 'Pagamento', 'Negociação', 'Gustavo Costa', '02 jul 15:17', '—'],
];

function statusTag(v: string) {
  if (v === 'Ganho') return <Badge cor="verde">Ganho</Badge>;
  if (v === 'Perdido') return <Badge cor="vermelho">Perdido</Badge>;
  return v;
}

export function Metricas() {
  return (
    <PaginaShell titulo="Métricas" subtitulo="Insights (BI) — painel próprio + 35 relatórios por funil">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Badge cor="neutro">Este mês ▾</Badge>
        <Badge cor="neutro">Todos os usuários ▾</Badge>
      </div>

      <div style={{ fontSize: 10, letterSpacing: 1, color: 'var(--texto-fraco)', textTransform: 'uppercase', fontWeight: 700 }}>Prospecção</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <Kpi rotulo="Novos Leads no Funil" valor="46" hint="Entrada de Leads" />
        <Kpi rotulo="Contatos c/ Decisor" valor="8" hint="no período" />
        <Kpi rotulo="Reuniões Agendadas" valor="3" hint="no período" />
        <Kpi rotulo="Leads Ganhos" valor="1" hint="no período" cor="var(--verde)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Painel titulo={<>Funil de Conversão <Badge cor="azul">Prospecção</Badge></>}>
          <div style={{ color: 'var(--texto-fraco)', fontSize: 11, marginBottom: 6 }}>Taxa de ganho: 2%</div>
          <Barras alturas={[90, 70, 45, 30, 18, 8]} />
        </Painel>
        <Painel titulo="Negócios Abertos por Etapa">
          <Barras alturas={[95, 25, 12, 28, 22]} />
        </Painel>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <Kpi rotulo="Inbound · Ganhos" valor="1" hint="taxa 100%" cor="var(--verde)" />
        <Kpi rotulo="Social Selling · Ganhos" valor="2" hint="taxa 100%" cor="var(--verde)" />
        <Kpi rotulo="Negociação · Ganhos" valor="0" hint="taxa 0%" />
      </div>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px' }}>
          <b>Ganhos vs Perdidos</b>
          <div style={{ flex: 1 }} />
          <Badge cor="neutro">📊 tipo de gráfico</Badge>
          <Badge cor="neutro">Salvar</Badge>
          <Badge cor="neutro">⭳ Exportar</Badge>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <Badge cor="neutro">NEGÓCIO</Badge>
          <Badge cor="neutro">Negócio criado em ▾</Badge>
          <Badge cor="neutro">Este mês ▾</Badge>
          <div style={{ flex: 1 }} />
          <Badge cor="neutro">Ver por: Status ▾</Badge>
        </div>
        <div style={{ height: 120, border: '1px dashed var(--borda-forte)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--texto-fraco)', fontSize: 12 }}>
          🟣 Em aberto (110) &nbsp; 🔵 Ganho (9) &nbsp; 🟢 Perdido (36)
        </div>
        <div style={{ fontSize: 10, letterSpacing: 1, color: 'var(--texto-fraco)', textTransform: 'uppercase', fontWeight: 700, margin: '10px 0 6px' }}>Registros · 55</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="brk-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr><Th>Título</Th><Th>Valor</Th><Th>Etapa</Th><Th>Funil</Th><Th>Responsável</Th><Th>Criado em</Th><Th>Status</Th></tr>
            </thead>
            <tbody>
              {REGISTROS.map((r, i) => (
                <tr key={i}>
                  {r.map((c, ci) => <Td key={ci}>{ci === 6 ? statusTag(c) : c}</Td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ color: 'var(--texto-fraco)', fontSize: 11, marginTop: 6 }}>Exibindo 5 de 55 registros.</div>
      </Card>
    </PaginaShell>
  );
}
