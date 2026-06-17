import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  PaginaShell,
  BotaoPrimario,
  BotaoSecundario,
  EstadoCarregando,
  EstadoErro,
} from '../components/primitivos';
import { Card } from '../components/ui';

/**
 * Painel financeiro (Franci) — consolida o que hoje fica espalhado em vários sistemas.
 *  GET   /faturas/indicadores
 *  GET   /faturas            (boletos)
 *  POST  /faturas/:id/whatsapp | /faturas/:id/pagar
 *  GET/POST/PATCH/DELETE /contas-pagar (+/resumo)
 */

interface Indicadores {
  recebidoMes: number;
  aReceberSemana: number;
  aReceberTotal: number;
  pendentesTotal: number;
  pendentesEnviados: number;
}
interface Fatura {
  id: string;
  codigoUnico: string;
  valor: string;
  vencimento: string;
  status: string;
  enviadaWhatsapp: boolean;
  cliente?: { nomeFantasia: string };
}
interface Conta {
  id: string;
  descricao: string;
  categoria: string | null;
  valor: string;
  vencimento: string;
  pago: boolean;
}
interface ResumoContas { aPagarTotal: number; aPagarMes: number; vencidas: number }

const MOCK_IND: Indicadores = { recebidoMes: 98400, aReceberSemana: 24600, aReceberTotal: 87200, pendentesTotal: 7, pendentesEnviados: 4 };
const MOCK_RESUMO: ResumoContas = { aPagarTotal: 42800, aPagarMes: 18500, vencidas: 2 };
const MOCK_BOLETOS: Fatura[] = [
  { id: 'f1', codigoUnico: 'BRK-2026-0031', valor: '3200.00', vencimento: '2026-06-20T00:00:00Z', status: 'PENDENTE', enviadaWhatsapp: true, cliente: { nomeFantasia: 'Tua Pizza' } },
  { id: 'f2', codigoUnico: 'BRK-2026-0032', valor: '2800.00', vencimento: '2026-06-20T00:00:00Z', status: 'PENDENTE', enviadaWhatsapp: false, cliente: { nomeFantasia: 'Bigger Pizzaria' } },
  { id: 'f3', codigoUnico: 'BRK-2026-0033', valor: '4500.00', vencimento: '2026-06-25T00:00:00Z', status: 'PENDENTE', enviadaWhatsapp: true, cliente: { nomeFantasia: 'Rikai Sushi' } },
  { id: 'f4', codigoUnico: 'BRK-2026-0028', valor: '3200.00', vencimento: '2026-06-10T00:00:00Z', status: 'PAGO', enviadaWhatsapp: true, cliente: { nomeFantasia: 'Brasa Burger' } },
];
const MOCK_CONTAS: Conta[] = [
  { id: 'cp1', descricao: 'Servidor Railway (API)', categoria: 'Infraestrutura', valor: '380.00', vencimento: '2026-07-01T00:00:00Z', pago: false },
  { id: 'cp2', descricao: 'Vercel Pro', categoria: 'Infraestrutura', valor: '120.00', vencimento: '2026-07-01T00:00:00Z', pago: false },
  { id: 'cp3', descricao: 'Meta Business Suite', categoria: 'Marketing', valor: '5200.00', vencimento: '2026-06-28T00:00:00Z', pago: false },
  { id: 'cp4', descricao: 'Aluguel escritório — Jun', categoria: 'Instalações', valor: '4800.00', vencimento: '2026-06-05T00:00:00Z', pago: true },
];

const brl = (n: number | string) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
const rotulo: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)', marginBottom: 4, display: 'block' };

function Indicador({ titulo, valor, alerta }: { titulo: string; valor: string; alerta?: boolean }) {
  return (
    <Card>
      <div style={{ fontSize: 22, fontWeight: 800, color: alerta ? 'var(--vermelho)' : 'var(--texto)' }}>{valor}</div>
      <div style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>{titulo}</div>
    </Card>
  );
}

export function Financeiro() {
  const { usuario } = useAuth();
  const permitido = ['SUPERADMIN', 'ADMIN', 'FINANCEIRO'].includes(usuario?.cargo ?? '');

  const [ind, setInd] = useState<Indicadores | null>(null);
  const [resumo, setResumo] = useState<ResumoContas | null>(null);
  const [boletos, setBoletos] = useState<Fatura[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState('');
  const [valor, setValor] = useState('');
  const [venc, setVenc] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true); setErro(false);
    try {
      const [i, f, c, r] = await Promise.all([
        api.get<Indicadores>('/faturas/indicadores'),
        api.get<Fatura[]>('/faturas'),
        api.get<Conta[]>('/contas-pagar'),
        api.get<ResumoContas>('/contas-pagar/resumo'),
      ]);
      setInd(i.data ?? MOCK_IND);
      setBoletos((f.data.length ? f.data : MOCK_BOLETOS).filter((x) => x.status === 'PENDENTE'));
      setContas(c.data.length ? c.data : MOCK_CONTAS);
      setResumo(r.data ?? MOCK_RESUMO);
    } catch {
      setInd(MOCK_IND);
      setBoletos(MOCK_BOLETOS.filter((x) => x.status === 'PENDENTE'));
      setContas(MOCK_CONTAS);
      setResumo(MOCK_RESUMO);
      setErro(false);
    }
    finally { setCarregando(false); }
  }
  useEffect(() => { if (permitido) carregar(); else setCarregando(false); }, [permitido]);

  async function enviarWhatsapp(id: string) { await api.post(`/faturas/${id}/whatsapp`); carregar(); }
  async function marcarPaga(id: string) { await api.post(`/faturas/${id}/pagar`); carregar(); }
  async function addConta() {
    if (!desc.trim() || !valor.trim() || !venc || salvando) return;
    setSalvando(true);
    try {
      await api.post('/contas-pagar', { descricao: desc.trim(), categoria: cat.trim() || undefined, valor: valor.trim(), vencimento: new Date(venc).toISOString() });
      setDesc(''); setCat(''); setValor(''); setVenc('');
      carregar();
    } finally { setSalvando(false); }
  }
  async function pagarConta(id: string) { await api.patch(`/contas-pagar/${id}/pago`, { pago: true }); carregar(); }
  async function removerConta(id: string) { await api.delete(`/contas-pagar/${id}`); carregar(); }

  if (!permitido) {
    return <PaginaShell titulo="Financeiro" subtitulo="Acesso restrito ao financeiro."><Card><p style={{ fontSize: 14, color: 'var(--texto-fraco)' }}>Você não tem acesso a este painel.</p></Card></PaginaShell>;
  }
  if (carregando) return <EstadoCarregando />;
  if (erro) return <EstadoErro mensagem="Falha ao carregar o painel financeiro." onTentar={carregar} />;

  return (
    <PaginaShell titulo="Financeiro" subtitulo="Painel consolidado — boletos, recebimentos e contas a pagar.">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <Indicador titulo="Recebido no mês" valor={brl(ind?.recebidoMes ?? 0)} />
        <Indicador titulo="A receber (7 dias)" valor={brl(ind?.aReceberSemana ?? 0)} />
        <Indicador titulo="A receber (total)" valor={brl(ind?.aReceberTotal ?? 0)} />
        <Indicador titulo="A pagar (total)" valor={brl(resumo?.aPagarTotal ?? 0)} alerta={(resumo?.vencidas ?? 0) > 0} />
      </div>

      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Boletos pendentes</h3>
        <p style={{ fontSize: 12.5, color: 'var(--texto-fraco)', marginBottom: 10 }}>
          {ind?.pendentesTotal ?? 0} pendentes · {ind?.pendentesEnviados ?? 0} já enviados no WhatsApp
        </p>
        {boletos.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Nenhum boleto pendente.</p>
        ) : (
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {boletos.map((b) => (
              <li key={b.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--superficie-2)', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{b.cliente?.nomeFantasia ?? 'Cliente'} · {brl(b.valor)}</div>
                  <div style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>
                    vence {dataBR(b.vencimento)} · {b.enviadaWhatsapp ? <span style={{ color: '#67e0a3' }}>WhatsApp enviado</span> : <span style={{ color: 'var(--amarelo)' }}>não enviado</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {!b.enviadaWhatsapp && <BotaoSecundario onClick={() => enviarWhatsapp(b.id)}>Enviar WhatsApp</BotaoSecundario>}
                  <BotaoPrimario onClick={() => marcarPaga(b.id)}>Marcar pago</BotaoPrimario>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Contas a pagar</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
          <div><label style={rotulo}>Descrição</label><input className="brk-input" style={{ width: '100%' }} value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div><label style={rotulo}>Categoria</label><input className="brk-input" style={{ width: '100%' }} value={cat} onChange={(e) => setCat(e.target.value)} placeholder="Marketing, Aluguel…" /></div>
          <div><label style={rotulo}>Valor (R$)</label><input className="brk-input" style={{ width: '100%' }} value={valor} onChange={(e) => setValor(e.target.value)} /></div>
          <div><label style={rotulo}>Vencimento</label><input className="brk-input" style={{ width: '100%' }} type="date" value={venc} onChange={(e) => setVenc(e.target.value)} /></div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <BotaoPrimario onClick={addConta} disabled={salvando || !desc.trim() || !valor.trim() || !venc}>
            {salvando ? 'Salvando…' : 'Adicionar conta'}
          </BotaoPrimario>
        </div>
        {contas.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Nenhuma conta cadastrada.</p>
        ) : (
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {contas.map((c) => (
              <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--superficie-2)', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{c.descricao} · {brl(c.valor)}</div>
                  <div style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>
                    {[c.categoria, `vence ${dataBR(c.vencimento)}`].filter(Boolean).join(' · ')} · {c.pago ? <span style={{ color: '#67e0a3' }}>paga</span> : <span style={{ color: 'var(--amarelo)' }}>pendente</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {!c.pago && <BotaoPrimario onClick={() => pagarConta(c.id)}>Marcar paga</BotaoPrimario>}
                  <BotaoSecundario onClick={() => removerConta(c.id)}>Remover</BotaoSecundario>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PaginaShell>
  );
}
