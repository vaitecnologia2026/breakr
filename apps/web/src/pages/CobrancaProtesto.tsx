// Cobrança e Protesto (Administração › Jurídico). Reaproveita a API existente
// /faturas (vencendo + envio de cobrança por WhatsApp). Sinaliza "protesto
// sugerido" para faturas vencidas há mais de 30 dias. Nenhum backend novo.
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { PaginaHeader, Btn, Carregando, Alerta } from '../components/ui';

interface Fatura {
  id: string;
  valor: string | number;
  vencimento: string;
  status: string;
  cliente?: { nomeFantasia?: string | null } | null;
}

const BRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (iso: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');
const diasVencido = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

export function CobrancaProtesto() {
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [dias, setDias] = useState('30');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<Fatura[]>(`/faturas/vencendo?dias=${encodeURIComponent(dias || '30')}`);
      setFaturas(data);
    } catch {
      setErro('Não foi possível carregar as cobranças.');
    } finally {
      setCarregando(false);
    }
  }
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function enviarCobranca(id: string) {
    setFeedback(null);
    try {
      await api.post(`/faturas/${id}/whatsapp`, {});
      setFeedback({ tipo: 'sucesso', msg: 'Cobrança enviada ao cliente por WhatsApp.' });
    } catch {
      setFeedback({ tipo: 'erro', msg: 'Erro ao enviar a cobrança (acesso restrito).' });
    }
  }

  if (carregando) return <Carregando />;

  return (
    <>
      <PaginaHeader
        titulo="Cobrança e Protesto"
        subtitulo="Faturas a vencer/vencidas — envie a cobrança e acompanhe casos para protesto"
      />

      {erro && <Alerta tipo="erro">{erro}</Alerta>}
      {feedback && <Alerta tipo={feedback.tipo}>{feedback.msg}</Alerta>}

      <section className="brk-card brk-card-p" style={{ marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13 }}>Janela (dias):</span>
        <input className="brk-input" value={dias} inputMode="numeric" onChange={(e) => setDias(e.target.value)} style={{ width: 90 }} />
        <Btn onClick={carregar}>Atualizar</Btn>
      </section>

      {faturas.length === 0 ? (
        <div className="brk-card brk-card-p">
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Nenhuma cobrança na janela selecionada.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {faturas.map((f) => {
            const atraso = diasVencido(f.vencimento);
            const protesto = atraso > 30;
            return (
              <div key={f.id} className="brk-card brk-card-p">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 700 }}>{f.cliente?.nomeFantasia ?? 'Cliente'}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>
                      vence {dataBR(f.vencimento)}{atraso > 0 ? ` · vencida há ${atraso}d` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>{BRL(Number(f.valor))}</span>
                    {protesto && (
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#ef4444' }}>Protesto sugerido</span>
                    )}
                    <Btn onClick={() => enviarCobranca(f.id)}>Enviar cobrança</Btn>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
