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

const KEYFRAMES = `
@keyframes brk-raio-strike {
  0%   { opacity: 0; transform: scale(0.4) translateY(-6px); filter: brightness(3); }
  40%  { opacity: 1; transform: scale(1.18) translateY(0);   filter: brightness(2.5); }
  65%  { transform: scale(0.94);                              filter: brightness(1); }
  80%  { transform: scale(1.06); }
  100% { transform: scale(1);    filter: brightness(1); }
}
@keyframes brk-text-enter {
  0%   { opacity: 0; transform: translateX(-8px); }
  100% { opacity: 1; transform: translateX(0); }
}
`;

export function Logo({ tamanho = 28, comTexto = true }: LogoProps) {
  return (
    <>
      <style>{KEYFRAMES}</style>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          userSelect: 'none',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            animation: 'brk-raio-strike 0.65s cubic-bezier(0.22,1,0.36,1) both',
          }}
        >
          <Raio tamanho={tamanho} />
        </span>
        {comTexto && (
          <span
            style={{
              fontWeight: 800,
              fontSize: tamanho * 0.72,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              color: 'var(--cinza-vapor)',
              animation: 'brk-text-enter 0.45s 0.25s cubic-bezier(0.22,1,0.36,1) both',
            }}
          >
            Breakr{' '}
            <span className="brk-gradient-text" style={{ fontWeight: 800 }}>
              OS
            </span>
          </span>
        )}
      </span>
    </>
  );
}

/** Apenas o raio (ícone), em gradiente brasa. */
export function Raio({ tamanho = 28 }: { tamanho?: number }) {
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
