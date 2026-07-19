// Gestão de Públicos (Marketing › Tráfego Pago). Lista os públicos personalizados
// (custom audiences) da conta Meta via /trafego/meta/publicos (read-only, sem
// model). Degrada com elegância se a integração Meta não estiver configurada.
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { PaginaHeader, Btn, Carregando, Alerta } from '../components/ui';

interface MetaResp<T> {
  ok: boolean;
  dados?: T;
  erro?: string;
}
interface Publico {
  id?: string;
  name?: string;
  subtype?: string;
  approximate_count?: number;
  description?: string;
  operation_status?: { code?: number; description?: string };
}

export function GestaoPublicos() {
  const [publicos, setPublicos] = useState<Publico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<MetaResp<{ data?: Publico[] }>>('/trafego/meta/publicos');
      if (!data.ok) {
        setPublicos([]);
        setErro(data.erro ?? 'Não foi possível listar os públicos (Meta não configurado).');
      } else {
        setPublicos(data.dados?.data ?? []);
        if (!data.dados?.data?.length) setErro('Nenhum público personalizado encontrado na conta.');
      }
    } catch {
      setErro('Não foi possível listar os públicos.');
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
        titulo="Gestão de Públicos"
        subtitulo="Públicos personalizados (custom audiences) da conta Meta Ads"
      />

      <div style={{ marginBottom: 14 }}>
        <Btn onClick={carregar}>Atualizar</Btn>
      </div>

      {erro && <Alerta tipo="info">{erro}</Alerta>}

      {publicos.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {publicos.map((p) => (
            <div key={p.id} className="brk-card brk-card-p">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700 }}>{p.name ?? p.id}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>
                    {p.subtype ?? '—'}{p.description ? ` · ${p.description}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                    {p.approximate_count != null ? p.approximate_count.toLocaleString('pt-BR') : '—'}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--texto-fraco)' }}>
                    {p.operation_status?.description ?? 'tamanho aprox.'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
