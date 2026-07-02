import { Logo } from '../components/Logo';

export function Bloqueio() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#0d0d12',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 56,
        padding: 32,
      }}
    >
      {/* VAI logo */}
      <img
        src="/vai-logo.png"
        alt="VAI Tecnologia"
        style={{
          width: 180,
          opacity: 0.92,
          filter: 'drop-shadow(0 2px 16px rgba(244,121,32,0.18))',
        }}
      />

      {/* Divisor */}
      <div
        style={{
          width: 1,
          height: 64,
          background: 'linear-gradient(to bottom, transparent, #3a3a4a, transparent)',
        }}
      />

      {/* Breakr OS logo */}
      <Logo tamanho={40} comTexto />
    </div>
  );
}
