// Radar DISC em SVG inline (sem dependência externa). Sobrepõe uma ou mais séries
// (ex.: Percentil/Máscara/Essência) nos 4 eixos D/I/S/C, conforme o documento
// "Avaliação DISC em Recrutamento Web" (§3.3, sobreposição de camadas). Valores 0..100.

type Placar4 = { D: number; I: number; S: number; C: number };
export interface SerieRadar { nome: string; cor: string; valores: Placar4 }

const EIXOS: { chave: keyof Placar4; rotulo: string; ang: number }[] = [
  { chave: 'D', rotulo: 'D', ang: -90 }, // topo
  { chave: 'I', rotulo: 'I', ang: 0 }, // direita
  { chave: 'S', rotulo: 'S', ang: 90 }, // base
  { chave: 'C', rotulo: 'C', ang: 180 }, // esquerda
];

function ponto(cx: number, cy: number, raio: number, angGraus: number, valor: number) {
  const r = (Math.max(0, Math.min(100, valor)) / 100) * raio;
  const rad = (angGraus * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function DiscRadar({ series, tamanho = 260 }: { series: SerieRadar[]; tamanho?: number }) {
  const cx = tamanho / 2;
  const cy = tamanho / 2;
  const R = tamanho / 2 - 30;

  // Anéis de referência (25/50/75/100) como losangos ligando os 4 eixos.
  const aneis = [25, 50, 75, 100].map((nivel) =>
    EIXOS.map((e) => {
      const p = ponto(cx, cy, R, e.ang, nivel);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(' '),
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} role="img" aria-label="Radar DISC">
        {/* anéis */}
        {aneis.map((pts, i) => (
          <polygon key={i} points={pts} fill="none" stroke="var(--borda)" strokeWidth={1} opacity={0.6} />
        ))}
        {/* eixos + rótulos */}
        {EIXOS.map((e) => {
          const fim = ponto(cx, cy, R, e.ang, 100);
          const lbl = ponto(cx, cy, R + 16, e.ang, 100);
          return (
            <g key={e.chave}>
              <line x1={cx} y1={cy} x2={fim.x} y2={fim.y} stroke="var(--borda)" strokeWidth={1} opacity={0.6} />
              <text x={lbl.x} y={lbl.y} fontSize={13} fontWeight={700} fill="var(--texto-suave)" textAnchor="middle" dominantBaseline="middle">
                {e.rotulo}
              </text>
            </g>
          );
        })}
        {/* séries */}
        {series.map((s) => {
          const pts = EIXOS.map((e) => {
            const p = ponto(cx, cy, R, e.ang, s.valores[e.chave]);
            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
          }).join(' ');
          return (
            <g key={s.nome}>
              <polygon points={pts} fill={s.cor} fillOpacity={0.14} stroke={s.cor} strokeWidth={2} />
              {EIXOS.map((e) => {
                const p = ponto(cx, cy, R, e.ang, s.valores[e.chave]);
                return <circle key={e.chave} cx={p.x} cy={p.y} r={3} fill={s.cor} />;
              })}
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
        {series.map((s) => (
          <span key={s.nome} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--texto-suave)' }}>
            <span style={{ width: 12, height: 3, background: s.cor, borderRadius: 2, display: 'inline-block' }} />
            {s.nome}
          </span>
        ))}
      </div>
    </div>
  );
}
