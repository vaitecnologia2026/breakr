import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { PaginaShell, BotaoPrimario, BotaoSecundario } from '../components/primitivos';
import { Card } from '../components/ui';

/**
 * Central de ouvidoria — qualquer usuário abre manifestação; jurídico/admin trata.
 *  POST  /ouvidoria { assunto, mensagem, anonima? }
 *  GET   /ouvidoria                       (jurídico/admin)
 *  PATCH /ouvidoria/:id/resolver { resolucao?, status? }
 */

interface Manifestacao {
  id: string;
  assunto: string;
  mensagem: string;
  status: string;
  resolucao: string | null;
  criadoEm: string;
  autor: string | null;
  anonima: boolean;
}

const rotulo: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)', marginBottom: 4, display: 'block' };

const MOCK_OUVIDORIA: Manifestacao[] = [
  { id: 'o1', assunto: 'Sugestão de melhoria no onboarding', mensagem: 'O processo de onboarding com novos clientes poderia ter mais touchpoints nas primeiras duas semanas. Sugiro uma call de 30 min na semana 1 e outra na semana 2.', status: 'ABERTA', resolucao: null, criadoEm: '2026-06-10T11:20:00Z', autor: null, anonima: true },
  { id: 'o2', assunto: 'Falta de feedback nas avaliações de desempenho', mensagem: 'As avaliações têm nota mas não temos retorno claro sobre como melhorar. Seria importante ter uma reunião após cada ciclo.', status: 'EM_ANALISE', resolucao: null, criadoEm: '2026-06-05T09:00:00Z', autor: null, anonima: true },
  { id: 'o3', assunto: 'Ajuste no horário da daily', mensagem: 'A daily às 8h30 fica difícil para quem tem filho pequeno. Poderia ser às 9h?', status: 'RESOLVIDA', resolucao: 'Horário ajustado para 9h a partir de 20/06. Obrigado pelo feedback!', criadoEm: '2026-06-01T08:00:00Z', autor: 'Marina Alves', anonima: false },
];

export function Ouvidoria() {
  const { usuario } = useAuth();
  const ehTrata = ['SUPERADMIN', 'ADMIN', 'JURIDICO'].includes(usuario?.cargo ?? '');

  const [assunto, setAssunto] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [anonima, setAnonima] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [ok, setOk] = useState(false);

  const [itens, setItens] = useState<Manifestacao[]>([]);

  async function carregar() {
    if (!ehTrata) return;
    try {
      const { data } = await api.get<Manifestacao[]>('/ouvidoria');
      setItens(data.length ? data : MOCK_OUVIDORIA);
    } catch {
      /* sem permissão */
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ehTrata]);

  async function enviar() {
    if (!assunto.trim() || !mensagem.trim() || enviando) return;
    setEnviando(true);
    try {
      await api.post('/ouvidoria', { assunto: assunto.trim(), mensagem: mensagem.trim(), anonima });
      setOk(true);
      setAssunto('');
      setMensagem('');
      setAnonima(false);
      carregar();
    } finally {
      setEnviando(false);
    }
  }

  async function resolver(id: string) {
    const resolucao = window.prompt('Resolução / parecer do jurídico:') ?? undefined;
    await api.patch(`/ouvidoria/${id}/resolver`, { resolucao, status: 'RESOLVIDA' });
    carregar();
  }

  return (
    <PaginaShell titulo="Ouvidoria" subtitulo="Canal de manifestações do time (vai para o jurídico).">
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Abrir manifestação</h3>
        {ok && <p style={{ fontSize: 13, color: '#67e0a3', marginBottom: 8 }}>Manifestação enviada. Obrigado!</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div><label style={rotulo}>Assunto</label><input className="brk-input" style={{ width: '100%' }} value={assunto} onChange={(e) => setAssunto(e.target.value)} /></div>
          <div><label style={rotulo}>Mensagem</label><textarea className="brk-input" style={{ width: '100%', minHeight: 90, resize: 'vertical' }} value={mensagem} onChange={(e) => setMensagem(e.target.value)} /></div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--texto-suave)', cursor: 'pointer' }}>
            <input type="checkbox" checked={anonima} onChange={(e) => setAnonima(e.target.checked)} />
            Enviar de forma anônima
          </label>
          <div>
            <BotaoPrimario onClick={enviar} disabled={enviando || !assunto.trim() || !mensagem.trim()}>
              {enviando ? 'Enviando…' : 'Enviar manifestação'}
            </BotaoPrimario>
          </div>
        </div>
      </Card>

      {ehTrata && (
        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Manifestações recebidas</h3>
          {itens.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Nenhuma manifestação.</p>
          ) : (
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {itens.map((m) => (
                <li key={m.id} style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--superficie-2)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{m.assunto}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: m.status === 'RESOLVIDA' ? '#67e0a3' : 'var(--amarelo)' }}>{m.status}</span>
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--texto-suave)', whiteSpace: 'pre-line' }}>{m.mensagem}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--texto-fraco)' }}>
                    {m.anonima ? 'Anônimo' : m.autor ?? '—'} · {new Date(m.criadoEm).toLocaleString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                  {m.resolucao && <span style={{ fontSize: 12.5, color: 'var(--texto-suave)' }}>Resolução: {m.resolucao}</span>}
                  {m.status !== 'RESOLVIDA' && (
                    <div><BotaoSecundario onClick={() => resolver(m.id)}>Marcar como resolvida</BotaoSecundario></div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </PaginaShell>
  );
}
