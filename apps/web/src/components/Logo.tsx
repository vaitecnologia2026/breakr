/**
 * Logo do Breakr OS: raio (relâmpago) em gradiente brasa + wordmark.
 * O raio é o ícone-assinatura da marca ("rápida e disruptiva").
 */
interface LogoProps {
  /** Tamanho do raio em px (o texto acompanha proporcionalmente). */
  tamanho?: number;
  /** Mostra o texto "Breakr OS" ao lado do raio. */
  comTexto?: boolean;
}

export function Logo({ tamanho = 28, comTexto = true }: LogoProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        userSelect: 'none',
      }}
    >
      <Raio tamanho={tamanho} />
      {comTexto && (
        <span
          style={{
            fontWeight: 800,
            fontSize: tamanho * 0.72,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            color: 'var(--cinza-vapor)',
          }}
        >
          Breakr{' '}
          <span className="brk-gradient-text" style={{ fontWeight: 800 }}>
            OS
          </span>
        </span>
      )}
    </span>
  );
}

/** Apenas o raio (ícone), em gradiente brasa. */
export function Raio({ tamanho = 28 }: { tamanho?: number }) {
  // gradientId único por instância evita colisão de <defs> em SVGs múltiplos.
  const gradientId = `brk-raio-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="6"
          y1="4"
          x2="26"
          y2="28"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#94122C" />
          <stop offset="0.48" stopColor="#CA3F17" />
          <stop offset="1" stopColor="#FF9406" />
        </linearGradient>
      </defs>
      <path
        d="M18.5 4 9 18h6l-2.5 10L23 13h-6.2L18.5 4Z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}
