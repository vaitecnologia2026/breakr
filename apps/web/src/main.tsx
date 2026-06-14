import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { App } from './App';
import './index.css';

// Ponto de entrada do front do Breakr OS.
// Monta a aplicação dentro do roteador e do provedor de autenticação.
const elementoRaiz = document.getElementById('root');
if (!elementoRaiz) {
  throw new Error('Elemento #root não encontrado no index.html.');
}

createRoot(elementoRaiz).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
