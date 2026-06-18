import { Link } from 'react-router-dom';

/** Página 404 — rota inexistente. */
export function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        background: 'var(--bg)',
        color: 'var(--texto)',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 64, fontWeight: 800, color: 'var(--texto-fraco)' }}>404</div>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Página não encontrada</h1>
      <p style={{ fontSize: 14, color: 'var(--texto-fraco)', maxWidth: 380 }}>
        O endereço que você tentou acessar não existe ou foi movido.
      </p>
      <Link
        to="/"
        style={{
          marginTop: 8,
          padding: '10px 18px',
          borderRadius: 'var(--r-md)',
          background: 'var(--gradiente-brasa)',
          color: '#fff',
          fontWeight: 600,
          fontSize: 14,
          textDecoration: 'none',
        }}
      >
        Voltar ao início
      </Link>
    </main>
  );
}
