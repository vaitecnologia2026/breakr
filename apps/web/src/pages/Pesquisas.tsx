// Pesquisas / surveys do portal do cliente (admin, req. l.44-46). O admin cria
// pesquisas, ativa/desativa e acompanha o nº de respostas. O cliente responde
// pelo portal (a pesquisa ativa aparece lá enquanto ele não respondeu).
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { PaginaHeader, Btn, Carregando, Alerta } from '../components/ui';

interface Pesquisa {
  id: string;
  titulo: string;
  descricao: string | null;
  ativa: boolean;
  criadoEm: string;
  _count?: { respostas: number };
}

export function Pesquisas() {
  const [lista, setLista] = useState<Pesquisa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<Pesquisa[]>('/pesquisas');
      setLista(data);
    } catch {
      setErro('Não foi possível carregar as pesquisas.');
    } finally {
      setCarregando(false);
    }
  }
  useEffect(() => {
    carregar();
  }, []);

  async function criar() {
    if (titulo.trim().length < 2 || salvando) return;
    setSalvando(true);
    setFeedback(null);
    try {
      await api.post('/pesquisas', { titulo: titulo.trim(), descricao: descricao.trim() || undefined });
      setTitulo('');
      setDescricao('');
      setFeedback({ tipo: 'sucesso', msg: 'Pesquisa criada. Já aparece no portal dos clientes.' });
      await carregar();
    } catch {
      setFeedback({ tipo: 'erro', msg: 'Erro ao criar a pesquisa.' });
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtiva(p: Pesquisa) {
    try {
      await api.patch(`/pesquisas/${p.id}`, { ativa: !p.ativa });
      await carregar();
    } catch {
      setErro('Erro ao atualizar a pesquisa.');
    }
  }

  if (carregando) return <Carregando />;

  return (
    <>
      <PaginaHeader
        titulo="Pesquisas"
        subtitulo="Crie pesquisas de satisfação — o cliente responde direto pelo portal"
      />

      {erro && <Alerta tipo="erro">{erro}</Alerta>}
      {feedback && <Alerta tipo={feedback.tipo}>{feedback.msg}</Alerta>}

      <section className="brk-card brk-card-p" style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Nova pesquisa</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            className="brk-input"
            placeholder="Título (ex.: Como foi seu último mês com a gente?)"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
          <textarea
            className="brk-input"
            placeholder="Descrição / pergunta (opcional)"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
            style={{ resize: 'vertical' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Btn onClick={criar} disabled={titulo.trim().length < 2 || salvando}>
              {salvando ? 'Salvando…' : 'Criar pesquisa'}
            </Btn>
          </div>
        </div>
      </section>

      {lista.length === 0 ? (
        <div className="brk-card brk-card-p">
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Nenhuma pesquisa criada ainda.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lista.map((p) => (
            <div key={p.id} className="brk-card brk-card-p">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: 14.5, fontWeight: 700 }}>{p.titulo}</h3>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: p.ativa ? '#10b981' : 'var(--texto-fraco)',
                        border: `1px solid ${p.ativa ? '#10b981' : 'var(--texto-fraco)'}`,
                        borderRadius: 999,
                        padding: '1px 8px',
                      }}
                    >
                      {p.ativa ? 'ativa' : 'inativa'}
                    </span>
                  </div>
                  {p.descricao && (
                    <p style={{ fontSize: 13, color: 'var(--texto-suave)', marginTop: 6, whiteSpace: 'pre-wrap' }}>
                      {p.descricao}
                    </p>
                  )}
                  <div style={{ fontSize: 12, color: 'var(--texto-fraco)', marginTop: 6 }}>
                    {p._count?.respostas ?? 0} resposta(s)
                  </div>
                </div>
                <Btn variante={p.ativa ? 'ghost' : 'primary'} onClick={() => alternarAtiva(p)}>
                  {p.ativa ? 'Desativar' : 'Ativar'}
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
