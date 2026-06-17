import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { TemaProvider } from './lib/theme';
import { FavoritosProvider } from './lib/favoritos';
import { App } from './App';
import './index.css';

const elementoRaiz = document.getElementById('root');
if (!elementoRaiz) {
  throw new Error('Elemento #root não encontrado no index.html.');
}

createRoot(elementoRaiz).render(
  <StrictMode>
    <BrowserRouter>
      <TemaProvider>
        <AuthProvider>
          <FavoritosProvider>
            <App />
          </FavoritosProvider>
        </AuthProvider>
      </TemaProvider>
    </BrowserRouter>
  </StrictMode>,
);
