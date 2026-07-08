// Tela "Meu Painel" (CRM Comercial) — visão geral do vendedor.
// Baseada no wireframe DMhub CRM (tela 1), reproduzida com o design system atual
// do Breakr (PaginaShell / Card / Badge). Página de apresentação: os números são
// os do wireframe (estáticos) — não consome API nem altera nenhuma estrutura.
import type { ReactNode } from 'react';
import { PaginaShell } from '../components/primitivos';
import { Card, Badge } from '../components/ui';

function Kpi({ rotulo, valor, hint, cor }: { rotulo: string; valor: string; hint?: string; cor?: string }) {
  return (
    <Card>
      <div style={{ color: 'var(--texto-fraco)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{rotulo}</div>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 0.3, color: cor ?? 'var(--texto)' }}>{valor}</div>
      {hint && <div style={{ color: 'var(--texto-fraco)', fontSize: 11.5, marginTop: 3 }}>{hint}</div>}
    </Card>
  );
}

function Painel({ titulo, extra, children }: { titulo: ReactNode; extra?: ReactNode; children: ReactNode }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700 }}>{titulo}</h3>
        {extra && <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--texto-fraco)' }}>{extra}</span>}
      </div>
      {children}
    </Card>
  );
}

function ItemDeal({ titulo, contexto, tag }: { titulo: string; contexto: string; tag: ReactNode }) {
  return (
    <div style={{ border: '1px solid var(--borda)', borderRadius: 10, padding: 10, marginBottom: 8, background: 'var(--superficie-2)' }}>
      <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 4 }}>{titulo}</div>
      <div style={{ color: 'var(--texto-fraco)', fontSize: 11, marginBottom: 6 }}>{contexto}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>{tag}</div>
    </div>
  );
}

function ItemAtividade({ icone, titulo, meta, tag }: { icone: string; titulo: string; meta: string; tag: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', border: '1px solid var(--borda)', borderRadius: 10, padding: 10, marginBottom: 8, background: 'var(--superficie-2)' }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--superficie-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>{icone}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 12.5 }}>{titulo}</div>
        <div style={{ fontSize: 11.5, marginTop: 4, color: 'var(--amarelo-fagulha)' }}>{meta}</div>
      </div>
      {tag}
    </div>
  );
}

export function MeuPainel() {
  return (
    <PaginaShell titulo="Meu Painel" subtitulo="Visão geral do vendedor — pipeline, atividades e ações rápidas">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <Kpi rotulo="Total em Pipeline" valor="R$ 68.700,00" hint="159 negócios abertos" />
        <Kpi rotulo="Ganhos no Mês" valor="R$ 10.840,00" hint="9 negócios fechados" cor="var(--verde)" />
        <Kpi rotulo="Taxa de Conversão" valor="16%" hint="negócios fechados" />
        <Kpi rotulo="Atividades Hoje" valor="4" hint="pendentes" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Painel titulo={<>⚠️ Negócios parados <Badge cor="neutro">2 negócios</Badge></>}>
          <ItemDeal titulo="Isma Pastéis | Lajeado" contexto="Contato realizado com o decisor · Do Isma Pastéis" tag={<Badge cor="vermelho">26 dias parado</Badge>} />
          <ItemDeal titulo="Sergius Pasteis | Fispal" contexto="Reunião Agendada · Sergius Pasteis Irmaos Sborchia LTDA" tag={<Badge cor="amarelo">7 dias parado</Badge>} />
        </Painel>
        <Painel titulo="Atividades de Hoje" extra="Ver todas">
          <ItemAtividade icone="📞" titulo="10:10 · tentativa de contato via ligação" meta="KI PIZZA TEUTÔNIA" tag={<Badge cor="neutro">Ligação</Badge>} />
          <ItemAtividade icone="📞" titulo="11:00 · tentativa de contato via ligação" meta="Top Fabuloso | FISPAL" tag={<Badge cor="neutro">Ligação</Badge>} />
          <ItemAtividade icone="💬" titulo="12:00 · tentativa de agendar reunião" meta="E Tenho Ditto Pizzaria - Bento Gonçalves" tag={<Badge cor="neutro">WhatsApp</Badge>} />
        </Painel>
      </div>

      <Painel titulo="Negócios por Etapa">
        <div style={{ fontSize: 12, marginBottom: 4 }}>
          <div style={{ fontSize: 10, letterSpacing: 1, color: 'var(--texto-fraco)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Prospecção</div>
          Entrada de Leads <b>28</b> · Tentando contato <b>6</b> · Contato empresa <b>2</b> · Contato decisor <b>7</b> · Reunião <b>6</b>
        </div>
        <div style={{ height: 1, background: 'var(--borda)', margin: '10px 0' }} />
        <div style={{ fontSize: 12 }}>
          <div style={{ fontSize: 10, letterSpacing: 1, color: 'var(--texto-fraco)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>Negociação</div>
          Apresentar proposta <b>5</b> · R$ 26.300 &nbsp;|&nbsp; Negociação <b>2</b> · R$ 23.350 &nbsp;|&nbsp; Contrato <b>2</b> · R$ 13.050 &nbsp;|&nbsp; Pagamento <b>1</b> · R$ 6.000
        </div>
      </Painel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <Kpi rotulo="Este mês · Ganhos" valor="9" cor="var(--verde)" />
        <Kpi rotulo="Este mês · Perdidos" valor="36" cor="var(--vermelho)" />
        <Card>
          <div style={{ color: 'var(--texto-fraco)', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Ações Rápidas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Badge cor="neutro">+ Novo Negócio</Badge>
            <Badge cor="neutro">+ Nova Atividade</Badge>
            <Badge cor="neutro">📊 Ver Relatórios</Badge>
          </div>
        </Card>
      </div>
    </PaginaShell>
  );
}
