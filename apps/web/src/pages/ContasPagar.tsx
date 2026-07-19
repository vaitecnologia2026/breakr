// Contas a Pagar (Administração › Financeiro). Reaproveita a API existente
// /contas-pagar (listar/criar/marcar pago/remover). Nenhum backend novo.
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { PaginaHeader, Btn, Carregando, Alerta } from '../components/ui';

interface ContaPagar {
  id: string;
  descricao: string;
  categoria: string | null;
  valor: string | number;
  vencimento: string;
  pago: boolean;
  pagoEm: string | null;
}

const BRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (iso: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');

export function ContasPagar() {
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [valor, setValor] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<ContaPagar[]>('/contas-pagar');
      setContas(data);
    } catch {
      setErro('Não foi possível carregar as contas a pagar (acesso restrito ao financeiro).');
    } finally {
      setCarregando(false);
    }
  }
  useEffect(() => {
    carregar();
  }, []);

  async function criar() {
    if (descricao.trim().length < 2 || !valor.trim() || !vencimento || salvando) return;
    setSalvando(true);
    setFeedback(null);
    try {
      await api.post('/contas-pagar', {
        descricao: descricao.trim(),
        categoria: categoria.trim() || undefined,
        valor: Number(valor),
        vencimento,
      });
      setDescricao('');
      setCategoria('');
      setValor('');
      setVencimento('');
      setFeedback({ tipo: 'sucesso', msg: 'Conta lançada.' });
      await carregar();
    } catch {
      setFeedback({ tipo: 'erro', msg: 'Erro ao lançar a conta.' });
    } finally {
      setSalvando(false);
    }
  }

  async function marcarPago(id: string, pago: boolean) {
    try {
      await api.patch(`/contas-pagar/${id}/pago`, { pago });
      await carregar();
    } catch {
      setFeedback({ tipo: 'erro', msg: 'Erro ao atualizar o pagamento.' });
    }
  }

  async function remover(id: string) {
    try {
      await api.delete(`/contas-pagar/${id}`);
      await carregar();
    } catch {
      setFeedback({ tipo: 'erro', msg: 'Erro ao remover a conta.' });
    }
  }

  if (carregando) return <Carregando />;

  const totalAberto = contas.filter((c) => !c.pago).reduce((s, c) => s + Number(c.valor), 0);

  return (
    <>
      <PaginaHeader
        titulo="Contas a Pagar"
        subtitulo="Lançamentos financeiros a pagar — total em aberto e baixa de pagamento"
      />

      {erro && <Alerta tipo="erro">{erro}</Alerta>}
      {feedback && <Alerta tipo={feedback.tipo}>{feedback.msg}</Alerta>}

      <section className="brk-card brk-card-p" style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Nova conta a pagar</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <input className="brk-input" placeholder="Descrição" value={descricao}
            onChange={(e) => setDescricao(e.target.value)} style={{ flex: '1 1 200px' }} />
          <input className="brk-input" placeholder="Categoria" value={categoria}
            onChange={(e) => setCategoria(e.target.value)} style={{ flex: '1 1 150px' }} />
          <input className="brk-input" placeholder="Valor (R$)" value={valor} inputMode="decimal"
            onChange={(e) => setValor(e.target.value)} style={{ flex: '0 1 130px' }} />
          <input className="brk-input" type="date" value={vencimento}
            onChange={(e) => setVencimento(e.target.value)} style={{ flex: '0 1 160px' }} />
          <Btn onClick={criar} disabled={descricao.trim().length < 2 || !valor.trim() || !vencimento || salvando}>
            {salvando ? 'Salvando…' : 'Lançar'}
          </Btn>
        </div>
      </section>

      <div className="brk-card brk-card-p" style={{ marginBottom: 14 }}>
        <span style={{ fontSize: 13 }}>Total em aberto: <b>{BRL(totalAberto)}</b> · {contas.length} lançamento(s)</span>
      </div>

      {contas.length === 0 ? (
        <div className="brk-card brk-card-p">
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Nenhuma conta a pagar cadastrada.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {contas.map((c) => (
            <div key={c.id} className="brk-card brk-card-p">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700 }}>{c.descricao}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>
                    {c.categoria ?? 'sem categoria'} · vence {dataBR(c.vencimento)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>{BRL(Number(c.valor))}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: c.pago ? '#10b981' : '#f5a623' }}>
                    {c.pago ? 'Pago' : 'Em aberto'}
                  </span>
                  <Btn onClick={() => marcarPago(c.id, !c.pago)}>{c.pago ? 'Reabrir' : 'Marcar pago'}</Btn>
                  <Btn onClick={() => remover(c.id)}>Remover</Btn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
