// Painel do designer (B8, req. l.407-415): fila de peças por prioridade + prazo,
// atalhos dos clientes, notas pessoais e calendário semanal/mensal das demandas.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { PaginaHeader, Btn, Carregando, Alerta } from '../components/ui';

interface PecaDesigner {
  id: string;
  titulo: string;
  tipo: string;
  status: string;
  dataAgendada: string | null;
  midiaUrl: string | null;
  cliente?: { id: string; nomeFantasia: string } | null;
}

// Prioridade derivada do prazo (dataAgendada) — sem novo campo no banco.
function prioridade(p: PecaDesigner): { nivel: string; label: string; cor: string } {
  if (!p.dataAgendada) return { nivel: 'normal', label: 'Sem prazo', cor: 'var(--texto-fraco)' };
  const prazo = new Date(p.dataAgendada).getTime();
  const dias = (prazo - Date.now()) / (1000 * 60 * 60 * 24);
  if (dias < 0) return { nivel: 'urgente', label: 'Atrasada', cor: '#ef4444' };
  if (dias <= 2) return { nivel: 'alta', label: 'Prazo próximo', cor: '#f59e0b' };
  return { nivel: 'normal', label: 'No prazo', cor: '#10b981' };
}

function formatarData(iso: string | null): string {
  if (!iso) return 'sem prazo';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function chaveDia(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
function inicioSemana(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}
function diasCalendario(modo: 'semana' | 'mes', ref: Date): Date[] {
  if (modo === 'semana') {
    const ini = inicioSemana(ref);
    return Array.from({ length: 7 }, (_, i) => {
      const x = new Date(ini);
      x.setDate(ini.getDate() + i);
      return x;
    });
  }
  const primeiro = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const ini = inicioSemana(primeiro);
  return Array.from({ length: 42 }, (_, i) => {
    const x = new Date(ini);
    x.setDate(ini.getDate() + i);
    return x;
  });
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function PainelDesigner() {
  const [pecas, setPecas] = useState<PecaDesigner[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Notas pessoais
  const [notas, setNotas] = useState('');
  const [salvandoNotas, setSalvandoNotas] = useState(false);
  const [feedbackNotas, setFeedbackNotas] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  // Calendário
  const [modoCal, setModoCal] = useState<'semana' | 'mes'>('semana');

  useEffect(() => {
    let vivo = true;
    Promise.all([
      api.get<PecaDesigner[]>('/painel-designer/minhas-pecas').then(({ data }) => data).catch(() => null),
      api.get<{ notasPessoais: string | null }>('/painel-designer/notas').then(({ data }) => data).catch(() => null),
    ]).then(([ps, n]) => {
      if (!vivo) return;
      if (ps === null) { setErro('Não foi possível carregar suas peças.'); }
      else setPecas(ps);
      if (n) setNotas(n.notasPessoais ?? '');
    }).finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, []);

  async function salvarNotas() {
    setSalvandoNotas(true);
    setFeedbackNotas(null);
    try {
      await api.put('/painel-designer/notas', { notas });
      setFeedbackNotas({ tipo: 'sucesso', msg: 'Notas salvas.' });
    } catch {
      setFeedbackNotas({ tipo: 'erro', msg: 'Erro ao salvar as notas.' });
    } finally {
      setSalvandoNotas(false);
    }
  }

  // Atalhos: clientes distintos das minhas peças.
  const clientes = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const p of pecas) if (p.cliente) mapa.set(p.cliente.id, p.cliente.nomeFantasia);
    return [...mapa.entries()].map(([id, nome]) => ({ id, nome }));
  }, [pecas]);

  // Peças por dia (para o calendário).
  const pecasPorDia = useMemo(() => {
    const mapa = new Map<string, PecaDesigner[]>();
    for (const p of pecas) {
      if (!p.dataAgendada) continue;
      const k = chaveDia(new Date(p.dataAgendada));
      const arr = mapa.get(k) ?? [];
      arr.push(p);
      mapa.set(k, arr);
    }
    return mapa;
  }, [pecas]);

  const dias = useMemo(() => diasCalendario(modoCal, new Date()), [modoCal]);
  const mesAtual = new Date().getMonth();

  if (carregando) return <Carregando />;

  return (
    <>
      <PaginaHeader
        titulo="Painel do designer"
        subtitulo="Suas peças por prioridade e prazo, atalhos, notas e calendário"
      />

      {erro && <Alerta tipo="erro">{erro}</Alerta>}

      {/* Atalhos de clientes */}
      {clientes.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
          {clientes.map((c) => (
            <Link
              key={c.id}
              to="/conteudos"
              style={{ fontSize: 12.5, fontWeight: 600, padding: '5px 12px', borderRadius: 999, border: '1px solid var(--borda)', background: 'var(--superficie-2)', color: 'var(--cinza-vapor)', textDecoration: 'none' }}
            >
              {c.nome}
            </Link>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>
        {/* Inbox por prioridade */}
        <section className="brk-card brk-card-p">
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Fila por prioridade</h2>
          {pecas.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Nenhuma peça sob sua responsabilidade no momento. 🎉</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pecas.map((p) => {
                const pr = prioridade(p);
                return (
                  <div
                    key={p.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--superficie-2)', borderLeft: `3px solid ${pr.cor}` }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--cinza-vapor)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.titulo}</div>
                      <div style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>
                        {p.cliente?.nomeFantasia ?? 'Cliente'} · {p.tipo} · {p.status}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: pr.cor }}>{pr.label}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--texto-fraco)' }}>{formatarData(p.dataAgendada)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Notas pessoais */}
        <section className="brk-card brk-card-p">
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Minhas notas</h2>
          <p style={{ fontSize: 12.5, color: 'var(--texto-fraco)', marginBottom: 10 }}>
            Anotações pessoais (só você vê). São salvas na sua conta.
          </p>
          {feedbackNotas && <Alerta tipo={feedbackNotas.tipo}>{feedbackNotas.msg}</Alerta>}
          <textarea
            className="brk-input"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Escreva suas anotações…"
            rows={8}
            style={{ width: '100%', resize: 'vertical', marginTop: 8 }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
            <Btn onClick={salvarNotas} disabled={salvandoNotas}>{salvandoNotas ? 'Salvando…' : 'Salvar notas'}</Btn>
          </div>
        </section>
      </div>

      {/* Calendário */}
      <section className="brk-card brk-card-p" style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>Calendário de demandas</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['semana', 'mes'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModoCal(m)}
                style={{ fontSize: 12.5, fontWeight: 700, padding: '5px 12px', borderRadius: 8, border: '1px solid var(--borda)', cursor: 'pointer', background: modoCal === m ? 'var(--superficie-3)' : 'transparent', color: modoCal === m ? 'var(--cinza-vapor)' : 'var(--texto-fraco)' }}
              >
                {m === 'semana' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
          {DIAS_SEMANA.map((d) => (
            <div key={d} style={{ fontSize: 11, fontWeight: 700, color: 'var(--texto-fraco)', textAlign: 'center', paddingBottom: 4 }}>{d}</div>
          ))}
          {dias.map((dia) => {
            const doMes = dia.getMonth() === mesAtual;
            const doDia = pecasPorDia.get(chaveDia(dia)) ?? [];
            const ehHoje = chaveDia(dia) === chaveDia(new Date());
            return (
              <div
                key={dia.toISOString()}
                style={{ minHeight: modoCal === 'mes' ? 64 : 96, padding: 6, borderRadius: 8, border: `1px solid ${ehHoje ? 'var(--amarelo-fagulha, #f59e0b)' : 'var(--borda)'}`, background: doMes ? 'var(--superficie-2)' : 'transparent', opacity: doMes || modoCal === 'semana' ? 1 : 0.5 }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: ehHoje ? 'var(--amarelo-fagulha, #f59e0b)' : 'var(--texto-fraco)', marginBottom: 4 }}>{dia.getDate()}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {doDia.slice(0, 4).map((p) => (
                    <div
                      key={p.id}
                      title={`${p.titulo} — ${p.cliente?.nomeFantasia ?? ''}`}
                      style={{ fontSize: 10.5, padding: '2px 5px', borderRadius: 5, background: 'var(--superficie-3)', color: 'var(--cinza-vapor)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderLeft: `2px solid ${prioridade(p).cor}` }}
                    >
                      {p.titulo}
                    </div>
                  ))}
                  {doDia.length > 4 && (
                    <div style={{ fontSize: 10, color: 'var(--texto-fraco)' }}>+{doDia.length - 4}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
