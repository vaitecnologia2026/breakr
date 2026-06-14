import { MODULOS } from '@breakr/shared';
import { Logo } from './Logo';

/**
 * Navegação lateral do Breakr OS.
 * Lista os MODULOS do contrato compartilhado com um badge da fase.
 * Na Fase 0 apenas o Núcleo está ativo; os demais aparecem como "em breve".
 */

// Na Fase 0, somente módulos desta fase são navegáveis.
const FASE_ATIVA = 0;

// Rótulo curto da fase exibido no badge.
function rotuloFase(fase: number): string {
  return `F${fase}`;
}

export function Sidebar() {
  return (
    <aside
      style={{
        width: 264,
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--superficie)',
        borderRight: '1px solid var(--borda)',
        padding: '22px 16px',
        gap: 18,
      }}
    >
      <div style={{ padding: '4px 8px 6px' }}>
        <Logo tamanho={26} />
      </div>

      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--texto-fraco)',
          padding: '0 8px',
        }}
      >
        Módulos
      </div>

      <nav style={{ flex: 1, overflowY: 'auto' }}>
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {MODULOS.map((modulo) => {
            const ativo = modulo.fase === FASE_ATIVA;
            return (
              <li key={modulo.id}>
                <ItemModulo
                  nome={modulo.nome}
                  fase={modulo.fase}
                  ativo={ativo}
                />
              </li>
            );
          })}
        </ul>
      </nav>

      <div
        style={{
          fontSize: 11,
          color: 'var(--texto-fraco)',
          padding: '12px 8px 0',
          borderTop: '1px solid var(--borda)',
        }}
      >
        Breakr OS · v0.1 — Fase 0
      </div>
    </aside>
  );
}

interface ItemModuloProps {
  nome: string;
  fase: number;
  ativo: boolean;
}

function ItemModulo({ nome, fase, ativo }: ItemModuloProps) {
  return (
    <div
      aria-current={ativo ? 'page' : undefined}
      title={ativo ? nome : `${nome} — em breve (Fase ${fase})`}
      className={ativo ? 'brk-gradient-border' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: '10px 12px',
        borderRadius: 10,
        background: ativo ? 'rgba(202, 63, 23, 0.14)' : 'transparent',
        color: ativo ? 'var(--cinza-vapor)' : 'var(--texto-fraco)',
        fontWeight: ativo ? 600 : 500,
        cursor: ativo ? 'pointer' : 'not-allowed',
        transition: 'background 0.15s ease, color 0.15s ease',
        position: 'relative',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          minWidth: 0,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 7,
            height: 7,
            borderRadius: 999,
            flexShrink: 0,
            background: ativo ? 'var(--amarelo-fagulha)' : 'var(--borda-forte)',
            boxShadow: ativo ? '0 0 8px var(--amarelo-fagulha)' : 'none',
          }}
        />
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {nome}
        </span>
      </span>

      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.04em',
          padding: '2px 7px',
          borderRadius: 999,
          flexShrink: 0,
          color: ativo ? '#fff' : 'var(--texto-fraco)',
          background: ativo ? 'var(--gradiente-brasa)' : 'var(--superficie-3)',
        }}
      >
        {ativo ? 'ATIVO' : rotuloFase(fase)}
      </span>
    </div>
  );
}
