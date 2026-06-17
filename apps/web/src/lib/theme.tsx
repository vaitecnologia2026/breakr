import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Tema = 'dark' | 'light';
const TEMA_KEY = 'brk.tema';

interface TemaContextValue {
  tema: Tema;
  alternarTema: () => void;
}

const TemaContext = createContext<TemaContextValue | undefined>(undefined);

export function TemaProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(() => {
    try { return (localStorage.getItem(TEMA_KEY) as Tema) ?? 'dark'; } catch { return 'dark'; }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema);
  }, [tema]);

  useEffect(() => {
    const saved = (localStorage.getItem(TEMA_KEY) as Tema) ?? 'dark';
    document.documentElement.setAttribute('data-tema', saved);
  }, []);

  function alternarTema() {
    setTema((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(TEMA_KEY, next); } catch { /* noop */ }
      return next;
    });
  }

  return <TemaContext.Provider value={{ tema, alternarTema }}>{children}</TemaContext.Provider>;
}

export function useTema(): TemaContextValue {
  const ctx = useContext(TemaContext);
  if (!ctx) throw new Error('useTema deve ser usado dentro de <TemaProvider>');
  return ctx;
}
