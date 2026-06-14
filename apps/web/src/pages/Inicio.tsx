import { useAuth } from '../lib/auth';

/**
 * Página inicial do Núcleo (rota "/", dentro do shell do Dashboard).
 * Saudação + aviso da fase + card "Hoje & Atrasados" (placeholder) e atalhos
 * para os módulos já navegáveis na Fase 0.
 */
export function Inicio() {
  const { usuario } = useAuth();
  const primeiroNome = usuario?.nome?.split(' ')[0] ?? 'usuário';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Bom dia, {primeiroNome}</h1>
        <p style={{ fontSize: 13.5, color: 'var(--texto-fraco)', marginTop: 2 }}>
          Painel do Núcleo
        </p>
      </div>

      <AvisoFase />

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 18,
        }}
      >
        <CardHojeAtrasados />
        <CardPlaceholder
          titulo="Meus clientes"
          descricao="Sua carteira aparecerá aqui assim que o módulo Comercial entrar no ar."
          fase="Fase 3"
        />
        <CardPlaceholder
          titulo="Squad"
          descricao="Composição e atribuição automática do seu squad — em breve."
          fase="Fase 1"
        />
      </section>
    </div>
  );
}

/** Faixa de destaque indicando a fase atual do produto. */
function AvisoFase() {
  return (
    <div
      className="brk-gradient-border"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 18px',
        borderRadius: 14,
        background: 'var(--superficie)',
      }}
    >
      <span
        className="brk-gradient-bg"
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.08em',
          color: '#fff',
          padding: '4px 10px',
          borderRadius: 999,
          flexShrink: 0,
        }}
      >
        FASE 0
      </span>
      <p style={{ fontSize: 13.5, color: 'var(--texto-suave)' }}>
        <strong style={{ color: 'var(--cinza-vapor)' }}>Fundação.</strong> Autenticação,
        usuários e o esqueleto do Núcleo estão de pé. Os módulos operacionais chegam nas
        próximas fases.
      </p>
    </div>
  );
}

/** Card placeholder do painel "Hoje & Atrasados" (cargo-aware na Fase 1+). */
function CardHojeAtrasados() {
  return (
    <article
      style={{
        gridColumn: '1 / -1',
        background: 'var(--superficie)',
        border: '1px solid var(--borda)',
        borderRadius: 16,
        padding: 22,
        boxShadow: 'var(--sombra-card)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: 17, fontWeight: 700 }}>Hoje &amp; Atrasados</h2>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--texto-fraco)',
            border: '1px solid var(--borda-forte)',
            borderRadius: 999,
            padding: '3px 10px',
          }}
        >
          PLACEHOLDER
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          textAlign: 'center',
          padding: '34px 16px',
          border: '1px dashed var(--borda-forte)',
          borderRadius: 12,
          color: 'var(--texto-fraco)',
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--texto-suave)' }}>
          Nenhuma tarefa por aqui ainda.
        </span>
        <span style={{ fontSize: 13 }}>
          Suas pendências de hoje e os itens atrasados aparecerão neste painel conforme seu
          cargo, quando os módulos de tarefas entrarem no ar.
        </span>
      </div>
    </article>
  );
}

interface CardPlaceholderProps {
  titulo: string;
  descricao: string;
  fase: string;
}

function CardPlaceholder({ titulo, descricao, fase }: CardPlaceholderProps) {
  return (
    <article
      style={{
        background: 'var(--superficie)',
        border: '1px solid var(--borda)',
        borderRadius: 16,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        opacity: 0.92,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>{titulo}</h3>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--texto-fraco)',
            background: 'var(--superficie-3)',
            borderRadius: 999,
            padding: '2px 8px',
          }}
        >
          {fase}
        </span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--texto-fraco)', lineHeight: 1.5 }}>{descricao}</p>
    </article>
  );
}
