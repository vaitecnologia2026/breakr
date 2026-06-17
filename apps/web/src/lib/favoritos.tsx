import { createContext, useContext, useState, type ReactNode } from 'react';

const FAV_KEY = 'brk.favoritos';

export interface FavItem { para: string; rotulo: string; iconeIdx?: number; }

function lerFavoritos(): FavItem[] {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) ?? '[]'); } catch { return []; }
}
function gravarFavoritos(favs: FavItem[]) {
  try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch { /* noop */ }
}

interface FavoritosContextValue {
  favoritos: FavItem[];
  toggleFav: (item: FavItem) => void;
  isFav: (para: string) => boolean;
}

const FavoritosContext = createContext<FavoritosContextValue | undefined>(undefined);

export function FavoritosProvider({ children }: { children: ReactNode }) {
  const [favoritos, setFavoritos] = useState<FavItem[]>(lerFavoritos);

  function toggleFav(item: FavItem) {
    setFavoritos((prev) => {
      const existe = prev.some((f) => f.para === item.para);
      const next = existe ? prev.filter((f) => f.para !== item.para) : [...prev, item];
      gravarFavoritos(next);
      return next;
    });
  }

  function isFav(para: string) {
    return favoritos.some((f) => f.para === para);
  }

  return (
    <FavoritosContext.Provider value={{ favoritos, toggleFav, isFav }}>
      {children}
    </FavoritosContext.Provider>
  );
}

export function useFavoritos(): FavoritosContextValue {
  const ctx = useContext(FavoritosContext);
  if (!ctx) throw new Error('useFavoritos deve ser usado dentro de <FavoritosProvider>');
  return ctx;
}
