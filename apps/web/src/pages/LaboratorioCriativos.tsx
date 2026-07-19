// Laboratório de Criativos (Marketing › Tráfego Pago). Lista os criativos
// (adcreatives) da conta Meta via /trafego/meta/criativos (read-only, sem model).
// Degrada com elegância se a integração Meta não estiver configurada.
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { PaginaHeader, Btn, Carregando, Alerta } from '../components/ui';

interface MetaResp<T> {
  ok: boolean;
  dados?: T;
  erro?: string;
}
interface Criativo {
  id?: string;
  name?: string;
  title?: string;
  body?: string;
  thumbnail_url?: string;
  object_type?: string;
}

export function LaboratorioCriativos() {
  const [criativos, setCriativos] = useState<Criativo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<MetaResp<{ data?: Criativo[] }>>('/trafego/meta/criativos');
      if (!data.ok) {
        setCriativos([]);
        setErro(data.erro ?? 'Não foi possível listar os criativos (Meta não configurado).');
      } else {
        setCriativos(data.dados?.data ?? []);
        if (!data.dados?.data?.length) setErro('Nenhum criativo encontrado na conta.');
      }
    } catch {
      setErro('Não foi possível listar os criativos.');
    } finally {
      setCarregando(false);
    }
  }
  useEffect(() => {
    carregar();
  }, []);

  if (carregando) return <Carregando />;

  return (
    <>
      <PaginaHeader
        titulo="Laboratório de Criativos"
        subtitulo="Criativos (adcreatives) da conta Meta Ads — biblioteca para análise"
      />

      <div style={{ marginBottom: 14 }}>
        <Btn onClick={carregar}>Atualizar</Btn>
      </div>

      {erro && <Alerta tipo="info">{erro}</Alerta>}

      {criativos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {criativos.map((c) => (
            <div key={c.id} className="brk-card brk-card-p">
              <div style={{ display: 'flex', gap: 10 }}>
                {c.thumbnail_url ? (
                  <img src={c.thumbnail_url} alt={c.name ?? 'criativo'} style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: 8, background: 'var(--superficie-2)', flexShrink: 0 }} />
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.name ?? c.title ?? c.id}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--texto-fraco)' }}>{c.object_type ?? '—'}</div>
                  {c.body && (
                    <div style={{ fontSize: 11.5, color: 'var(--texto-suave)', marginTop: 4, maxHeight: 34, overflow: 'hidden' }}>
                      {c.body}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
