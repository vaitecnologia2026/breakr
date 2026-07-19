// Controladoria — DRE e Fluxo de Caixa simplificados (Administração › Financeiro).
// Read-only: agrega as APIs existentes /faturas (receitas) e /contas-pagar
// (despesas). Nenhum backend novo, nenhum model.
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { PaginaHeader, Carregando, Alerta } from '../components/ui';

interface Fatura { valor: string | number; status: string }
interface ContaPagar { valor: string | number; pago: boolean }

const BRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function Controladoria() {
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const [fat, cp] = await Promise.all([
          api.get<Fatura[]>('/faturas'),
          api.get<ContaPagar[]>('/contas-pagar'),
        ]);
        setFaturas(fat.data);
        setContas(cp.data);
      } catch {
        setErro('Não foi possível carregar os dados financeiros (acesso restrito ao financeiro).');
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  if (carregando) return <Carregando />;

  const paga = (s: string) => ['PAGA', 'PAGO', 'CONFIRMADA'].includes((s || '').toUpperCase());
  const receitaRecebida = faturas.filter((f) => paga(f.status)).reduce((s, f) => s + Number(f.valor), 0);
  const receitaAReceber = faturas.filter((f) => !paga(f.status)).reduce((s, f) => s + Number(f.valor), 0);
  const despesaPaga = contas.filter((c) => c.pago).reduce((s, c) => s + Number(c.valor), 0);
  const despesaAPagar = contas.filter((c) => !c.pago).reduce((s, c) => s + Number(c.valor), 0);
  const resultado = receitaRecebida - despesaPaga;
  const saldoProjetado = resultado + receitaAReceber - despesaAPagar;

  const Card = ({ titulo, valor, cor }: { titulo: string; valor: number; cor?: string }) => (
    <div className="brk-card brk-card-p" style={{ flex: '1 1 200px' }}>
      <div style={{ fontSize: 12, color: 'var(--texto-fraco)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{titulo}</div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6, color: cor }}>{BRL(valor)}</div>
    </div>
  );

  return (
    <>
      <PaginaHeader
        titulo="Controladoria"
        subtitulo="DRE e Fluxo de Caixa simplificados — receitas (faturas) x despesas (contas a pagar)"
      />

      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      <h2 style={{ fontSize: 14, fontWeight: 700, margin: '4px 0 10px' }}>Resultado (realizado)</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <Card titulo="Receita recebida" valor={receitaRecebida} cor="#10b981" />
        <Card titulo="Despesa paga" valor={despesaPaga} cor="#ef4444" />
        <Card titulo="Resultado" valor={resultado} cor={resultado >= 0 ? '#10b981' : '#ef4444'} />
      </div>

      <h2 style={{ fontSize: 14, fontWeight: 700, margin: '4px 0 10px' }}>Fluxo de caixa (projetado)</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <Card titulo="A receber" valor={receitaAReceber} cor="#10b981" />
        <Card titulo="A pagar" valor={despesaAPagar} cor="#f5a623" />
        <Card titulo="Saldo projetado" valor={saldoProjetado} cor={saldoProjetado >= 0 ? '#10b981' : '#ef4444'} />
      </div>

      <div className="brk-card brk-card-p" style={{ marginTop: 18 }}>
        <p style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>
          Visão consolidada a partir de {faturas.length} fatura(s) e {contas.length} conta(s) a pagar. Saldo
          projetado = resultado realizado + a receber − a pagar.
        </p>
      </div>
    </>
  );
}
