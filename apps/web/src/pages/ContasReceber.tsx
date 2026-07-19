// Contas a Receber (Administração › Financeiro). Reaproveita a API existente
// /faturas (listar/pagar). Nenhum backend novo.
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { PaginaHeader, Btn, Carregando, Alerta } from '../components/ui';

interface Fatura {
  id: string;
  valor: string | number;
  vencimento: string;
  status: string;
  meio: string | null;
  pagaEm: string | null;
  cliente?: { nomeFantasia?: string | null } | null;
}

const BRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');

export function ContasReceber() {
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<Fatura[]>('/faturas');
      setFaturas(data);
    } catch {
      setErro('Não foi possível carregar as faturas.');
    } finally {
      setCarregando(false);
    }
  }
  useEffect(() => {
    carregar();
  }, []);

  async function marcarPaga(id: string) {
    setFeedback(null);
    try {
      await api.post(`/faturas/${id}/pagar`, {});
      setFeedback({ tipo: 'sucesso', msg: 'Fatura marcada como paga.' });
      await carregar();
    } catch {
      setFeedback({ tipo: 'erro', msg: 'Erro ao confirmar o pagamento (acesso restrito ao financeiro).' });
    }
  }

  if (carregando) return <Carregando />;

  const paga = (s: string) => ['PAGA', 'PAGO', 'CONFIRMADA'].includes((s || '').toUpperCase());
  const totalReceber = faturas.filter((f) => !paga(f.status)).reduce((s, f) => s + Number(f.valor), 0);

  return (
    <>
      <PaginaHeader
        titulo="Contas a Receber"
        subtitulo="Faturas dos clientes — pendentes, pagas e baixa de recebimento"
      />

      {erro && <Alerta tipo="erro">{erro}</Alerta>}
      {feedback && <Alerta tipo={feedback.tipo}>{feedback.msg}</Alerta>}

      <div className="brk-card brk-card-p" style={{ marginBottom: 14 }}>
        <span style={{ fontSize: 13 }}>A receber (em aberto): <b>{BRL(totalReceber)}</b> · {faturas.length} fatura(s)</span>
      </div>

      {faturas.length === 0 ? (
        <div className="brk-card brk-card-p">
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Nenhuma fatura cadastrada.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {faturas.map((f) => (
            <div key={f.id} className="brk-card brk-card-p">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 700 }}>{f.cliente?.nomeFantasia ?? 'Cliente'}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>
                    vence {dataBR(f.vencimento)}{f.meio ? ` · ${f.meio}` : ''}
                    {paga(f.status) && f.pagaEm ? ` · paga em ${dataBR(f.pagaEm)}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>{BRL(Number(f.valor))}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: paga(f.status) ? '#10b981' : '#f5a623' }}>
                    {f.status}
                  </span>
                  {!paga(f.status) && <Btn onClick={() => marcarPaga(f.id)}>Confirmar pagamento</Btn>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
