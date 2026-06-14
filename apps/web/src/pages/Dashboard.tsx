import { useAuth } from '../lib/auth';
import { Sidebar } from '../components/Sidebar';

/**
 * Shell pós-login do Breakr OS (Fase 0 — Fundação).
 * Sidebar + header com usuário/logout + área central com o card
 * "Hoje & Atrasados" (placeholder) e o aviso da fase atual.
 */
export function Dashboard() {
  const { usuario, logout } = useAuth();

  // Primeiro nome para a saudação; iniciais para o avatar.
  const primeiroNome = usuario?.nome?.split(' ')[0] ?? 'usuário';
  const iniciais = (usuario?.nome ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--preto-fumaca)',
        }}
      >
        {/* Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '16px 28px',
            borderBottom: '1px solid var(--borda)',
            background: 'rgba(22, 19, 10, 0.6)',
            backdropFilter: 'blur(8px)',
            position: 'sticky',
            top: 0,
            zIndex: 5,
          }}
        >
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700 }}>
              Bom dia, {primeiroNome} 👋
            </h1>
            <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>
              Painel do Núcleo
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                textAlign: 'right',
                lineHeight: 1.2,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>
                {usuario?.nome}
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--texto-fraco)' }}>
                {usuario?.cargo}
              </span>
            </div>

            <div
              aria-hidden="true"
              className="brk-gradient-bg"
              style={{
                width: 38,
                height: 38,
                borderRadius: 999,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              {iniciais}
            </div>

            <button
              onClick={logout}
              style={{
                border: '1px solid var(--borda-forte)',
                background: 'transparent',
                color: 'var(--texto-suave)',
                borderRadius: 9,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 600,
                transition: 'border-color 0.15s ease, color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--laranja-brasa)';
                e.currentTarget.style.color = 'var(--cinza-vapor)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--borda-forte)';
                e.currentTarget.style.color = 'var(--texto-suave)';
              }}
            >
              Sair
            </button>
          </div>
        </header>

        {/* Conteúdo */}
        <main
          style={{
            flex: 1,
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
            maxWidth: 1100,
            width: '100%',
          }}
        >
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
        </main>
      </div>
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
        <strong style={{ color: 'var(--cinza-vapor)' }}>Fundação.</strong>{' '}
        Autenticação, usuários e o esqueleto do Núcleo estão de pé. Os módulos
        operacionais chegam nas próximas fases.
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
          Suas pendências de hoje e os itens atrasados aparecerão neste painel
          conforme seu cargo, quando os módulos de tarefas entrarem no ar.
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
      <p style={{ fontSize: 13, color: 'var(--texto-fraco)', lineHeight: 1.5 }}>
        {descricao}
      </p>
    </article>
  );
}
