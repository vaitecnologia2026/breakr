import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  PaginaShell,
  BotaoPrimario,
  BotaoSecundario,
  EstadoCarregando,
  EstadoErro,
  PainelVazio,
} from '../components/primitivos';
import { Card } from '../components/ui';

/**
 * Reuniões internas do time (alinhamentos, dailies…), independentes de cliente.
 *  GET    /reunioes-internas
 *  POST   /reunioes-internas { titulo, data, descricao?, gerarMeet? }
 *  DELETE /reunioes-internas/:id
 */

interface Reuniao {
  id: string;
  titulo: string;
  descricao: string | null;
  data: string;
  meetLink: string | null;
  tipo: string;
}

const TIPO_REUNIAO: Record<string, { rotulo: string; cor: string }> = {
  GESTAO: { rotulo: 'Gestão', cor: '#2ecc71' },
  VENDAS: { rotulo: 'Vendas', cor: '#a855f7' },
  ESTRATEGICA: { rotulo: 'Estratégica', cor: '#a855f7' },
  FINANCEIRO: { rotulo: 'Financeiro', cor: '#4aa3f0' },
  OUTRO: { rotulo: 'Outro', cor: '#9aa0ad' },
};

const rotulo: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 600,
  color: 'var(--texto-suave)',
  marginBottom: 4,
  display: 'block',
};

export function Reunioes() {
  const [reunioes, setReunioes] = useState<Reuniao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [data, setData] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState('OUTRO');
  const [gerarMeet, setGerarMeet] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    setErro(false);
    try {
      const { data: res } = await api.get<Reuniao[]>('/reunioes-internas');
      setReunioes(res);
    } catch {
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function adicionar() {
    if (!titulo.trim() || !data || salvando) return;
    setSalvando(true);
    try {
      await api.post('/reunioes-internas', {
        titulo: titulo.trim(),
        data: new Date(data).toISOString(),
        descricao: descricao.trim() || undefined,
        tipo,
        gerarMeet,
      });
      setTitulo('');
      setData('');
      setDescricao('');
      setTipo('OUTRO');
      setGerarMeet(false);
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id: string) {
    await api.delete(`/reunioes-internas/${id}`);
    carregar();
  }

  if (carregando) return <EstadoCarregando />;
  if (erro) return <EstadoErro mensagem="Falha ao carregar as reuniões." onTentar={carregar} />;

  return (
    <PaginaShell titulo="Reuniões internas" subtitulo="Alinhamentos e reuniões do time.">
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Nova reunião</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={rotulo}>Título</label>
            <input className="brk-input" style={{ width: '100%' }} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Daily do time" />
          </div>
          <div>
            <label style={rotulo}>Data e hora</label>
            <input className="brk-input" style={{ width: '100%' }} type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div>
            <label style={rotulo}>Descrição (opcional)</label>
            <input className="brk-input" style={{ width: '100%' }} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div>
            <label style={rotulo}>Tipo</label>
            <select className="brk-input" style={{ width: '100%' }} value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {Object.entries(TIPO_REUNIAO).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--texto-suave)', cursor: 'pointer' }}>
            <input type="checkbox" checked={gerarMeet} onChange={(e) => setGerarMeet(e.target.checked)} />
            Gerar link do Google Meet
          </label>
          <div>
            <BotaoPrimario onClick={adicionar} disabled={salvando || !titulo.trim() || !data}>
              {salvando ? 'Adicionando…' : 'Adicionar reunião'}
            </BotaoPrimario>
          </div>
        </div>
      </Card>

      {reunioes.length === 0 ? (
        <PainelVazio titulo="Nenhuma reunião agendada" descricao="Crie a primeira reunião do time acima." />
      ) : (
        <Card>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reunioes.map((r) => (
              <li
                key={r.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'var(--superficie-2)',
                }}
              >
                <div>
                  <div style={{ fontSize: 12.5, color: '#f0814f', fontWeight: 700 }}>
                    {new Date(r.data).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: (TIPO_REUNIAO[r.tipo] ?? TIPO_REUNIAO.OUTRO).cor, flexShrink: 0 }} />
                    {r.titulo}
                  </div>
                  {r.descricao && <div style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>{r.descricao}</div>}
                  {r.meetLink && (
                    <a href={r.meetLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: '#f0814f', textDecoration: 'none' }}>
                      Link do Meet →
                    </a>
                  )}
                </div>
                <BotaoSecundario onClick={() => remover(r.id)}>Remover</BotaoSecundario>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </PaginaShell>
  );
}
