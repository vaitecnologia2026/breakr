// Tela "Atividades" (CRM Comercial) — lista de atividades do vendedor.
// Baseada no wireframe DMhub CRM (tela 4), reproduzida com o design system atual
// do Breakr. Página de apresentação: dados estáticos do wireframe — não consome
// API nem altera estruturas existentes.
import { PaginaShell } from '../components/primitivos';
import { Card, Badge } from '../components/ui';

const SUBTABS = ['Hoje', 'Amanhã', 'Esta semana', 'Próxima semana', 'Vencido', 'Selecionar período', 'Concluídas'];

interface Atividade {
  icone: string;
  titulo: string;
  meta: string;
  tipo: string;
}

const HOJE: Atividade[] = [
  { icone: '📞', titulo: '10:10 · tentativa de contato via ligação', meta: '08 de jul. 10:10 · KI PIZZA TEUTÔNIA · Gustavo Costa (você)', tipo: 'Ligação' },
  { icone: '📞', titulo: '11:00 · tentativa de contato via ligação', meta: '08 de jul. 11:00 · Top Fabuloso | FISPAL · Gustavo Costa (você)', tipo: 'Ligação' },
  { icone: '💬', titulo: '12:00 · tentativa de agendar reunião', meta: '08 de jul. 12:00 · E Tenho Ditto Pizzaria - Bento Gonçalves', tipo: 'WhatsApp' },
  { icone: '📞', titulo: '12:00 · Ligação', meta: '08 de jul. 12:00 · Maranata Delivery - Lajeado · Gustavo Costa (você)', tipo: 'Ligação' },
];

export function Atividades() {
  return (
    <PaginaShell
      titulo="Atividades"
      subtitulo="114 atividades — Lista / Calendário, filtros por período e usuário"
      acao={<Badge cor="amarelo">+ Nova Atividade</Badge>}
    >
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Badge cor="amarelo">☰ Lista</Badge>
        <Badge cor="neutro">📅 Calendário</Badge>
        <Badge cor="neutro">▾ Todos</Badge>
        <Badge cor="neutro">👤 Todos os usuários ▾</Badge>
      </div>

      <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid var(--borda)', flexWrap: 'wrap' }}>
        {SUBTABS.map((t, i) => (
          <span key={t} style={{
            padding: '8px 2px', fontSize: 12.5, cursor: 'pointer',
            color: i === 0 ? 'var(--texto)' : 'var(--texto-fraco)',
            borderBottom: i === 0 ? '2px solid var(--amarelo-fagulha)' : '2px solid transparent',
            fontWeight: i === 0 ? 600 : 400,
          }}>{t}</span>
        ))}
      </div>

      <div style={{ fontSize: 10, letterSpacing: 1, color: 'var(--texto-fraco)', textTransform: 'uppercase', fontWeight: 700 }}>Hoje · 4</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {HOJE.map((a, i) => (
          <Card key={i}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--borda-forte)', marginTop: 2, flex: '0 0 auto' }} />
              <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--superficie-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>{a.icone}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{a.titulo}</div>
                <div style={{ fontSize: 11.5, marginTop: 4, color: 'var(--amarelo-fagulha)' }}>{a.meta}</div>
              </div>
              <Badge cor="neutro">{a.tipo}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </PaginaShell>
  );
}
