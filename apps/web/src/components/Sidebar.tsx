import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { MODULOS } from '@breakr/shared';
import { Logo } from './Logo';

/**
 * Navegação lateral do Breakr OS.
 * As telas já entregues na Fase 0 (Início, Clientes, Squads) são NavLinks
 * navegáveis e com estado ativo. Os demais MODULOS do contrato compartilhado
 * aparecem como "em breve", com o badge da fase.
 */

// Fase em foco: os módulos desta fase aparecem com o ponto aceso ("em obra").
const FASE_ATIVA: number = 2;

// Telas reais já disponíveis (entram no topo do menu, acima dos módulos).
const LINKS_ATIVOS = [
  { para: '/', rotulo: 'Início', fim: true },
  { para: '/comercial', rotulo: 'Comercial', fim: false },
  { para: '/clientes', rotulo: 'Clientes', fim: false },
  { para: '/contratos', rotulo: 'Contratos', fim: false },
  { para: '/cobrancas', rotulo: 'Cobranças', fim: false },
  { para: '/conteudos', rotulo: 'Conteúdo', fim: false },
  { para: '/squads', rotulo: 'Squads', fim: false },
  { para: '/recrutamento', rotulo: 'Recrutamento', fim: false },
  { para: '/compras', rotulo: 'Compras', fim: false },
  { para: '/desenvolvimento', rotulo: 'Desenvolvimento', fim: false },
] as const;

// Slugs de MODULOS que já têm tela real (não repetir como "em breve").
// Restam em breve: cs-portal (portal é externo), trafego e qualidade (Fase 2).
const SLUGS_COM_TELA = new Set<string>([
  'nucleo',
  'comercial',
  'contratos',
  'financeiro',
  'marketing',
  'rh',
  'operacoes',
  'desenvolvimento',
]);

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

      <nav style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <TituloGrupo>Navegação</TituloGrupo>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {LINKS_ATIVOS.map((l) => (
              <li key={l.para}>
                <ItemLink para={l.para} rotulo={l.rotulo} fim={l.fim} />
              </li>
            ))}
          </ul>
        </div>

        <div>
          <TituloGrupo>Módulos</TituloGrupo>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {MODULOS.map((modulo) => {
              // Pula os que já viraram tela real (Início, Contratos, Cobranças).
              if (SLUGS_COM_TELA.has(modulo.slug)) return null;
              const ativo = modulo.fase === FASE_ATIVA;
              return (
                <li key={modulo.id}>
                  <ItemModulo nome={modulo.nome} fase={modulo.fase} ativo={ativo} />
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <div
        style={{
          fontSize: 11,
          color: 'var(--texto-fraco)',
          padding: '12px 8px 0',
          borderTop: '1px solid var(--borda)',
        }}
      >
        Breakr OS · v0.4 — Fase 3
      </div>
    </aside>
  );
}

function TituloGrupo({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--texto-fraco)',
        padding: '0 8px 8px',
      }}
    >
      {children}
    </div>
  );
}

/* ----------------------- Item navegável (NavLink) ----------------------- */

interface ItemLinkProps {
  para: string;
  rotulo: string;
  fim: boolean;
}

function ItemLink({ para, rotulo, fim }: ItemLinkProps) {
  return (
    <NavLink
      to={para}
      end={fim}
      className={({ isActive }) => (isActive ? 'brk-gradient-border' : undefined)}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 10,
        background: isActive ? 'rgba(202, 63, 23, 0.14)' : 'transparent',
        color: isActive ? 'var(--cinza-vapor)' : 'var(--texto-suave)',
        fontWeight: isActive ? 600 : 500,
        position: 'relative',
        transition: 'background 0.15s ease, color 0.15s ease',
      })}
    >
      {({ isActive }) => (
        <>
          <span
            aria-hidden="true"
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              flexShrink: 0,
              background: isActive ? 'var(--amarelo-fagulha)' : 'var(--borda-forte)',
              boxShadow: isActive ? '0 0 8px var(--amarelo-fagulha)' : 'none',
            }}
          />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {rotulo}
          </span>
        </>
      )}
    </NavLink>
  );
}

/* ----------------------- Item de módulo (em breve) ----------------------- */

interface ItemModuloProps {
  nome: string;
  fase: number;
  ativo: boolean;
}

function ItemModulo({ nome, fase, ativo }: ItemModuloProps) {
  return (
    <div
      title={`${nome} — em breve (Fase ${fase})`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: '10px 12px',
        borderRadius: 10,
        background: 'transparent',
        color: 'var(--texto-fraco)',
        fontWeight: 500,
        cursor: 'not-allowed',
        position: 'relative',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
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
          color: 'var(--texto-fraco)',
          background: 'var(--superficie-3)',
        }}
      >
        {rotuloFase(fase)}
      </span>
    </div>
  );
}
