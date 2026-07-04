// Banco de talentos (RH, req. l.426-433). Pool reutilizavel de candidatos de
// todas as vagas, filtravel por perfil DISC, tag e texto. Permite editar as tags
// (ex.: "forte", "reavaliacao") para consultar antes de abrir uma nova vaga.
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { PaginaHeader, Btn, Carregando, Alerta } from '../components/ui';

interface Candidato {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  perfilDisc: string | null;
  tags: string | null;
  curriculoUrl: string | null;
  status: string;
  vaga?: { titulo: string } | null;
}

export function BancoTalentos() {
  const [lista, setLista] = useState<Candidato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [perfilDisc, setPerfilDisc] = useState('');
  const [tag, setTag] = useState('');
  const [q, setQ] = useState('');

  // Edicao de tags por candidato.
  const [editId, setEditId] = useState<string | null>(null);
  const [editTags, setEditTags] = useState('');

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const params = new URLSearchParams();
      if (perfilDisc.trim()) params.set('perfilDisc', perfilDisc.trim());
      if (tag.trim()) params.set('tag', tag.trim());
      if (q.trim()) params.set('q', q.trim());
      const qs = params.toString();
      const { data } = await api.get<Candidato[]>(`/rh/banco-talentos${qs ? `?${qs}` : ''}`);
      setLista(data);
    } catch {
      setErro('Não foi possível carregar o banco de talentos.');
    } finally {
      setCarregando(false);
    }
  }
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function salvarTags(id: string) {
    try {
      await api.patch(`/rh/candidatos/${id}/tags`, { tags: editTags.trim() || null });
      setEditId(null);
      await carregar();
    } catch {
      setErro('Erro ao salvar as tags.');
    }
  }

  if (carregando) return <Carregando />;

  return (
    <>
      <PaginaHeader
        titulo="Banco de talentos"
        subtitulo="Pool reutilizável de candidatos — filtre por perfil DISC e tags antes de abrir uma vaga"
      />

      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      {/* Filtros */}
      <section className="brk-card brk-card-p" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <input
            className="brk-input"
            placeholder="Perfil DISC (ex.: C, A)"
            value={perfilDisc}
            onChange={(e) => setPerfilDisc(e.target.value)}
            style={{ flex: '1 1 140px' }}
          />
          <input
            className="brk-input"
            placeholder="Tag (ex.: forte)"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            style={{ flex: '1 1 140px' }}
          />
          <input
            className="brk-input"
            placeholder="Nome ou e-mail"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ flex: '2 1 200px' }}
          />
          <Btn onClick={carregar}>Filtrar</Btn>
        </div>
      </section>

      {lista.length === 0 ? (
        <div className="brk-card brk-card-p">
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Nenhum candidato encontrado.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lista.map((c) => (
            <div key={c.id} className="brk-card brk-card-p">
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
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{c.nome}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>
                    {c.vaga?.titulo ?? 'Sem vaga'}
                    {c.perfilDisc ? ` · DISC ${c.perfilDisc}` : ''}
                    {c.email ? ` · ${c.email}` : ''}
                  </div>
                  {editId === c.id ? (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      <input
                        className="brk-input"
                        placeholder="tags separadas por vírgula"
                        value={editTags}
                        onChange={(e) => setEditTags(e.target.value)}
                        style={{ flex: '1 1 200px' }}
                      />
                      <Btn onClick={() => salvarTags(c.id)}>Salvar</Btn>
                      <Btn variante="ghost" onClick={() => setEditId(null)}>
                        Cancelar
                      </Btn>
                    </div>
                  ) : (
                    <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                      {c.tags
                        ? c.tags.split(',').map((t, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: 11.5,
                                fontWeight: 700,
                                color: 'var(--texto-suave)',
                                background: 'var(--superficie-2)',
                                borderRadius: 999,
                                padding: '1px 8px',
                              }}
                            >
                              {t.trim()}
                            </span>
                          ))
                        : <span style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>sem tags</span>}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {c.curriculoUrl && (
                    <a href={c.curriculoUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12.5 }}>
                      Currículo
                    </a>
                  )}
                  {editId !== c.id && (
                    <Btn
                      variante="ghost"
                      onClick={() => {
                        setEditId(c.id);
                        setEditTags(c.tags ?? '');
                      }}
                    >
                      Tags
                    </Btn>
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
