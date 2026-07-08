// Tela "Atividades" (CRM Comercial) — lista de atividades do vendedor.
// Baseada no wireframe DMhub CRM (tela 4), reproduzida com o design system atual
// do Breakr. Página de apresentação: dados estáticos do wireframe — não consome
// API nem altera estruturas existentes.
import type { ReactNode } from 'react';
import { PaginaShell } from '../components/primitivos';
import { Card, Badge } from '../components/ui';

// Ícones de linha (mesmo padrão SVG monocromático dos demais ícones do app).
function Ico({ children }: { children: ReactNode }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
const IcoTelefone = () => <Ico><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></Ico>;
const IcoChat = () => <Ico><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="13" y2="14"/></Ico>;

const SUBTABS = ['Hoje', 'Amanhã', 'Esta semana', 'Próxima semana', 'Vencido', 'Selecionar período', 'Concluídas'];

interface Atividade {
  icone: ReactNode;
  titulo: string;
  meta: string;
  tipo: string;
}

const HOJE: Atividade[] = [
  { icone: <IcoTelefone />, titulo: '10:10 · tentativa de contato via ligação', meta: '08 de jul. 10:10 · KI PIZZA TEUTÔNIA · Gustavo Costa (você)', tipo: 'Ligação' },
  { icone: <IcoTelefone />, titulo: '11:00 · tentativa de contato via ligação', meta: '08 de jul. 11:00 · Top Fabuloso | FISPAL · Gustavo Costa (você)', tipo: 'Ligação' },
  { icone: <IcoChat />, titulo: '12:00 · tentativa de agendar reunião', meta: '08 de jul. 12:00 · E Tenho Ditto Pizzaria - Bento Gonçalves', tipo: 'WhatsApp' },
  { icone: <IcoTelefone />, titulo: '12:00 · Ligação', meta: '08 de jul. 12:00 · Maranata Delivery - Lajeado · Gustavo Costa (você)', tipo: 'Ligação' },
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
              <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--superficie-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', color: 'var(--texto-suave)' }}>{a.icone}</span>
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
