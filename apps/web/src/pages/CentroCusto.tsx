// Centro de custo (financeiro interno, req. l.469-476). Lista os centros com o
// gasto agregado (das compras de mesma categoria) x teto, e permite criar novos.
// Acesso restrito a financeiro/admin/superadmin (guard no backend).
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { PaginaHeader, Btn, Carregando, Alerta } from '../components/ui';

interface ResumoCentro {
  id: string;
  nome: string;
  categoria: string | null;
  teto: number | null;
  gasto: number;
  saldo: number | null;
  status: 'ok' | 'estourado' | 'sem_teto';
}

const BRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function CentroCusto() {
  const [resumo, setResumo] = useState<ResumoCentro[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [teto, setTeto] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<ResumoCentro[]>('/centro-custo/resumo');
      setResumo(data);
    } catch {
      setErro('Não foi possível carregar os centros de custo.');
    } finally {
      setCarregando(false);
    }
  }
  useEffect(() => {
    carregar();
  }, []);

  async function criar() {
    if (nome.trim().length < 2 || salvando) return;
    setSalvando(true);
    setFeedback(null);
    try {
      await api.post('/centro-custo', {
        nome: nome.trim(),
        categoria: categoria.trim() || undefined,
        teto: teto.trim() || undefined,
      });
      setNome('');
      setCategoria('');
      setTeto('');
      setFeedback({ tipo: 'sucesso', msg: 'Centro de custo criado.' });
      await carregar();
    } catch {
      setFeedback({ tipo: 'erro', msg: 'Erro ao criar o centro de custo.' });
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <Carregando />;

  const cor = (s: ResumoCentro['status']) =>
    s === 'estourado' ? '#ef4444' : s === 'ok' ? '#10b981' : 'var(--texto-fraco)';

  return (
    <>
      <PaginaHeader
        titulo="Centro de custo"
        subtitulo="Categorias com teto de gasto — o gasto é somado das compras da mesma categoria"
      />

      {erro && <Alerta tipo="erro">{erro}</Alerta>}
      {feedback && <Alerta tipo={feedback.tipo}>{feedback.msg}</Alerta>}

      <section className="brk-card brk-card-p" style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Novo centro de custo</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <input
            className="brk-input"
            placeholder="Nome (ex.: Marketing)"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            style={{ flex: '1 1 180px' }}
          />
          <input
            className="brk-input"
            placeholder="Categoria (casa com a da compra)"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            style={{ flex: '1 1 180px' }}
          />
          <input
            className="brk-input"
            placeholder="Teto (R$)"
            value={teto}
            onChange={(e) => setTeto(e.target.value)}
            inputMode="decimal"
            style={{ flex: '0 1 140px' }}
          />
          <Btn onClick={criar} disabled={nome.trim().length < 2 || salvando}>
            {salvando ? 'Salvando…' : 'Criar'}
          </Btn>
        </div>
      </section>

      {resumo.length === 0 ? (
        <div className="brk-card brk-card-p">
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Nenhum centro de custo cadastrado.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {resumo.map((c) => (
            <div key={c.id} className="brk-card brk-card-p">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700 }}>{c.nome}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>
                    {c.categoria ?? 'sem categoria'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13 }}>
                    Gasto: <b>{BRL(c.gasto)}</b>
                    {c.teto !== null ? ` / teto ${BRL(c.teto)}` : ''}
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: cor(c.status) }}>
                    {c.status === 'estourado'
                      ? 'Teto estourado'
                      : c.status === 'ok'
                        ? `Saldo ${BRL(c.saldo ?? 0)}`
                        : 'Sem teto definido'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
