// Comissão (Área administrativa) — Calculadora de comissões.
// Reproduz o arquivo "calcauladora de comissões.html" (planos, faixa ativa por
// MRR, sliders de fechamentos, resultado, breakdown e regras) com o design
// system Breakr (cards do app). Cálculo 100% no cliente — mesma lógica do
// arquivo original. As faixas (% e MRR mínimo) são editáveis na tela.
import { useMemo, useState, type CSSProperties } from 'react';
import { PaginaHeader } from '../components/ui';

/* ── Parâmetros (iguais ao arquivo) ── */
const PRICES = [1890, 2790, 4150];
const SISTEMA = 83;
const LEAD = 10;
const FAIXAS_PADRAO = [
  { mrrMin: 0, pctPercent: 4, n: 'base' },
  { mrrMin: 10000, pctPercent: 6, n: 'meta' },
  { mrrMin: 21000, pctPercent: 8, n: 'meta+' },
  { mrrMin: 35000, pctPercent: 10, n: 'super meta' },
];

/* Cores por categoria (mapeadas no design system; rosa do BDR mantido do arquivo). */
const C = {
  accent: 'var(--amarelo-fagulha)',
  green: 'var(--verde)',
  blue: 'var(--azul)',
  pink: '#d67abf',
  muted: 'var(--texto-fraco)',
  text: 'var(--texto)',
};

function fmt(n: number) { return 'R$ ' + Math.round(n).toLocaleString('pt-BR'); }

interface Faixa { mrrMin: number; pctPercent: number; n: string }
function getFaixa(mrr: number, faixas: Faixa[]) {
  let idx = 0;
  faixas.forEach((f, i) => { if (mrr >= f.mrrMin) idx = i; });
  const f = faixas[idx];
  return { idx, mrrMin: f.mrrMin, pct: f.pctPercent / 100, label: `${f.pctPercent}%` };
}

export function Comissao() {
  const [q, setQ] = useState<number[]>([0, 1, 0]); // Fagulha, Brasa, Chama
  const [qs, setQs] = useState(0); // Sistema SaaS
  const [ql, setQl] = useState(0); // Leads BDR
  const [faixas, setFaixas] = useState<Faixa[]>(FAIXAS_PADRAO);

  const calc = useMemo(() => {
    const totalContratos = q.reduce((a, b) => a + b, 0) + qs;
    const mrrPlanos = q.reduce((acc, v, i) => acc + v * PRICES[i], 0);
    const mrrSistema = qs * SISTEMA;
    const mrr = mrrPlanos + mrrSistema;
    const arr = mrr * 12;
    const faixa = getFaixa(mrr, faixas);
    const commPlanos = mrrPlanos * faixa.pct;
    const commSistema = mrrSistema * faixa.pct;
    const commBDR = ql * LEAD;
    const commTotal = commPlanos + commSistema + commBDR;
    const nextFaixa = faixas[faixa.idx + 1];
    return { totalContratos, mrrPlanos, mrrSistema, mrr, arr, faixa, commPlanos, commSistema, commBDR, commTotal, nextFaixa };
  }, [q, qs, ql, faixas]);

  const setQi = (i: number, v: number) => setQ((arr) => arr.map((x, j) => (j === i ? v : x)));
  const setFaixaCampo = (i: number, campo: 'pctPercent' | 'mrrMin', v: number) =>
    setFaixas((fs) => fs.map((f, j) => (j === i ? { ...f, [campo]: Number.isNaN(v) ? 0 : v } : f)));

  return (
    <div className="brk-comissao">
      <style>{`
        .brk-comissao input[type=range] { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; background: var(--borda); border-radius: 2px; outline: none; cursor: pointer; }
        .brk-comissao input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%; background: var(--amarelo-fagulha); cursor: pointer; transition: transform 0.1s; }
        .brk-comissao input[type=range].sistema-range::-webkit-slider-thumb { background: var(--azul); }
        .brk-comissao input[type=range].bdr-range::-webkit-slider-thumb { background: ${C.pink}; }
        .brk-comissao input[type=range]::-webkit-slider-thumb:hover { transform: scale(1.2); }
        .brk-comissao input[type=range]::-moz-range-thumb { width: 16px; height: 16px; border: none; border-radius: 50%; background: var(--amarelo-fagulha); cursor: pointer; }
        .brk-comissao input[type=range].sistema-range::-moz-range-thumb { background: var(--azul); }
        .brk-comissao input[type=range].bdr-range::-moz-range-thumb { background: ${C.pink}; }
        .brk-comissao .fx-input { width: 100%; background: var(--superficie-3); border: 1px solid var(--borda); border-radius: 6px; color: var(--texto); font-size: 13px; padding: 4px 6px; text-align: center; outline: none; }
        .brk-comissao .fx-input:focus { border-color: var(--amarelo-fagulha); }
      `}</style>

      <PaginaHeader titulo="Comissão" />

      {/* ── Planos ── */}
      <div className="brk-card brk-card-p" style={cardWrap}>
        <h3 style={secTitulo}>Planos</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10 }}>
          <PlanoCard cor="#888" nome="Fagulha" preco="R$ 1.890" sub="/mês" comm={fmt(PRICES[0] * calc.faixa.pct)} commLabel={`comissão base (${calc.faixa.label})`} />
          <PlanoCard cor={C.accent} nome="Brasa" preco="R$ 2.790" sub="/mês" comm={fmt(PRICES[1] * calc.faixa.pct)} commLabel={`comissão base (${calc.faixa.label})`} />
          <PlanoCard cor={C.accent} nome="Chama" preco="R$ 4.150" sub="/mês" comm={fmt(PRICES[2] * calc.faixa.pct)} commLabel={`comissão base (${calc.faixa.label})`} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ ...planCard(C.blue), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ ...planName, color: C.blue }}>Sistema SaaS</div>
              <div style={{ ...planPrice, fontSize: 15 }}>R$ 83<span style={{ fontSize: 11, fontWeight: 400, color: C.muted }}>/mês</span></div>
              <div style={planSub}>ARR R$ 996</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ ...planComm, color: C.blue }}>{fmt(SISTEMA * calc.faixa.pct)}</div>
              <div style={planCommLabel}>base ({calc.faixa.label})</div>
            </div>
          </div>
          <div style={{ ...planCard(C.pink), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ ...planName, color: C.pink }}>Lead BDR</div>
              <div style={{ ...planPrice, fontSize: 15 }}>R$ 10<span style={{ fontSize: 11, fontWeight: 400, color: C.muted }}> / lead</span></div>
              <div style={planSub}>geração ativa qualificada</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: C.pink, fontSize: 13, fontWeight: 600 }}>fixo</div>
              <div style={planCommLabel}>não entra na faixa</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Faixa ativa (editável) ── */}
      <div className="brk-card brk-card-p" style={cardWrap}>
        <h3 style={secTitulo}>Faixa ativa — MRR gerado no mês</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
          {faixas.map((f, i) => {
            const ativo = calc.faixa.idx === i;
            return (
              <div key={i} style={{
                background: ativo ? 'color-mix(in srgb, var(--amarelo-fagulha) 12%, transparent)' : 'var(--superficie-2)',
                border: `1px solid ${ativo ? 'var(--amarelo-fagulha)' : 'var(--borda)'}`,
                borderRadius: 8, padding: 10, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <input
                    className="fx-input" type="number" min={0} max={100} value={f.pctPercent}
                    onChange={(e) => setFaixaCampo(i, 'pctPercent', parseInt(e.target.value, 10))}
                    style={{ width: 52, fontWeight: 700, color: ativo ? C.accent : C.text }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, color: ativo ? C.accent : C.text }}>%</span>
                </div>
                <div style={{ fontSize: 11, color: ativo ? C.accent : C.muted, fontWeight: 500 }}>{f.n}</div>
                {i === 0 ? (
                  <div style={{ fontSize: 10.5, color: C.muted, opacity: 0.85 }}>qualquer MRR</div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10.5, color: C.muted, whiteSpace: 'nowrap' }}>MRR ≥ R$</span>
                    <input
                      className="fx-input" type="number" min={0} step={100} value={f.mrrMin}
                      onChange={(e) => setFaixaCampo(i, 'mrrMin', parseInt(e.target.value, 10))}
                      style={{ fontSize: 11, padding: '3px 4px' }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{
          fontSize: 12, padding: '9px 12px', borderRadius: 8,
          background: 'color-mix(in srgb, var(--verde) 12%, transparent)', color: C.green,
          border: '1px solid color-mix(in srgb, var(--verde) 30%, transparent)',
        }}>
          ✓ ambas condições atendidas — faixa {calc.faixa.label}
        </div>
      </div>

      {/* ── Fechamentos + Resultado ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="brk-card brk-card-p">
          <h3 style={secTitulo}>Fechamentos no mês</h3>
          <SliderBlock nome="Fagulha (R$ 1.890)" valor={q[0]} min={0} max={25} onChange={(v) => setQi(0, v)} />
          <SliderBlock nome="Brasa (R$ 2.790)" valor={q[1]} min={0} max={25} onChange={(v) => setQi(1, v)} />
          <SliderBlock nome="Chama (R$ 4.150)" valor={q[2]} min={0} max={25} onChange={(v) => setQi(2, v)} />
          <hr style={sep} />
          <div style={sepLabel}>Sistema SaaS</div>
          <SliderBlock nome="Sistema (R$ 83/mês)" valor={qs} min={0} max={20} onChange={setQs} cor={C.blue} classe="sistema-range" />
          <hr style={sep} />
          <div style={sepLabel}>Geração de leads (BDR)</div>
          <SliderBlock nome="Leads qualificados (R$ 10/lead)" valor={ql} min={0} max={50} onChange={setQl} cor={C.pink} classe="bdr-range" />
          <div style={{ fontSize: 11, color: C.muted, marginTop: -6 }}>Valor fixo. Não conta na faixa.</div>
        </div>

        <div className="brk-card brk-card-p">
          <h3 style={secTitulo}>Resultado</h3>
          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--borda)' }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>remuneração total</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: C.accent, lineHeight: 1 }}>{fmt(calc.commTotal)}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ResultRow rotulo="% aplicado" valor={calc.faixa.label} cor={C.accent} />
            <ResultRow rotulo="contratos fechados" valor={String(calc.totalContratos)} />
            <ResultRow rotulo="MRR gerado" valor={fmt(calc.mrr)} cor={C.green} />
            <ResultRow rotulo="próxima faixa em" valor={calc.nextFaixa ? fmt(calc.nextFaixa.mrrMin) : 'máximo atingido'} cor={calc.nextFaixa ? C.accent : C.green} />
            <ResultRow rotulo="ARR gerado" valor={fmt(calc.arr)} cor={C.green} />
          </div>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--borda)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <BreakdownRow rotulo="comissão planos" valor={fmt(calc.commPlanos)} />
            <BreakdownRow rotulo="comissão sistema" valor={fmt(calc.commSistema)} cor={C.blue} />
            <BreakdownRow rotulo="leads BDR" valor={fmt(calc.commBDR)} cor={C.pink} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderTop: '1px solid var(--borda)', paddingTop: 6, marginTop: 2 }}>
              <span style={{ color: C.text, fontWeight: 600 }}>total</span>
              <span style={{ color: C.accent, fontSize: 13, fontWeight: 600 }}>{fmt(calc.commTotal)}</span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 16, paddingTop: 14, borderTop: '1px dashed var(--borda)', lineHeight: 1.6 }}>
            Faixa definida pelo <strong style={{ color: C.accent, fontWeight: 600 }}>MRR gerado no mês</strong> (planos + sistemas). % retroativo sobre todos os contratos. Leads BDR são fixos e independentes.
          </div>
        </div>
      </div>

      {/* ── Regras ── */}
      <div className="brk-card brk-card-p" style={cardWrap}>
        <h3 style={secTitulo}>Regras</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <RuleCard titulo="Condicional dupla" desc="Faixa exige contratos E MRR mínimo. Sistemas sozinhos não sobem a faixa sem MRR suficiente." />
          <RuleCard titulo="Retroativo" desc="% aplica sobre todos os contratos do mês quando ambas condições são atingidas." />
          <RuleCard titulo="Chargeback" desc="Cancelamento antes de 60 dias → comissão descontada no ciclo seguinte." />
          <RuleCard titulo="Lead qualificado" desc="Critério definido previamente. Lead frio ou sem fit não é remunerado." />
        </div>
      </div>
    </div>
  );
}

/* ── Subcomponentes ── */
function PlanoCard({ cor, nome, preco, sub, comm, commLabel }: { cor: string; nome: string; preco: string; sub: string; comm: string; commLabel: string }) {
  return (
    <div style={planCard(cor)}>
      <div style={planName}>{nome}</div>
      <div style={planPrice}>{preco}</div>
      <div style={planSub}>{sub}</div>
      <div style={planComm}>{comm}</div>
      <div style={planCommLabel}>{commLabel}</div>
    </div>
  );
}

function SliderBlock({ nome, valor, min, max, onChange, cor, classe }: { nome: string; valor: number; min: number; max: number; onChange: (v: number) => void; cor?: string; classe?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: cor ?? C.text }}>{nome}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: cor ?? C.accent, minWidth: 20, textAlign: 'right' }}>{valor}</span>
      </div>
      <input type="range" className={classe} min={min} max={max} step={1} value={valor} onChange={(e) => onChange(parseInt(e.target.value, 10))} />
    </div>
  );
}

function ResultRow({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
      <span style={{ color: C.muted }}>{rotulo}</span>
      <span style={{ fontWeight: 600, color: cor ?? C.text }}>{valor}</span>
    </div>
  );
}

function BreakdownRow({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
      <span style={{ color: C.muted }}>{rotulo}</span>
      <span style={{ color: cor ?? C.text }}>{valor}</span>
    </div>
  );
}

function RuleCard({ titulo, desc }: { titulo: string; desc: string }) {
  return (
    <div style={{ background: 'var(--superficie-2)', border: '1px solid var(--borda)', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text, marginBottom: 3 }}>{titulo}</div>
      <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>{desc}</div>
    </div>
  );
}

/* ── Estilos base ── */
const cardWrap: CSSProperties = { marginBottom: 16 };
const secTitulo: CSSProperties = { fontSize: 14, fontWeight: 700, color: 'var(--texto)', marginBottom: 14 };
const sep: CSSProperties = { height: 1, background: 'var(--borda)', margin: '16px 0', border: 'none' };
const sepLabel: CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--texto-suave)', marginBottom: 12, marginTop: -4 };
const planName: CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--texto-suave)', marginBottom: 4 };
const planPrice: CSSProperties = { fontSize: 18, fontWeight: 700, color: 'var(--texto)', marginBottom: 2 };
const planSub: CSSProperties = { fontSize: 11, color: 'var(--texto-fraco)', marginBottom: 12 };
const planComm: CSSProperties = { fontSize: 13, color: 'var(--amarelo-fagulha)', fontWeight: 600 };
const planCommLabel: CSSProperties = { fontSize: 11, color: 'var(--texto-fraco)' };
function planCard(cor: string): CSSProperties {
  return {
    background: 'var(--superficie-2)', border: '1px solid var(--borda)', borderRadius: 8, padding: 14,
    position: 'relative', overflow: 'hidden', borderTop: `2px solid ${cor}`,
  };
}
