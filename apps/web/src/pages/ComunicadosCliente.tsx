import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  PaginaShell,
  BotaoPrimario,
  BotaoSecundario,
  EstadoCarregando,
  EstadoErro,
} from '../components/primitivos';
import { Card } from '../components/ui';

/**
 * Comunicar clientes — banner que aparece no portal de cada cliente.
 *  GET   /comunicados-cliente
 *  POST  /comunicados-cliente { mensagem }
 *  PATCH /comunicados-cliente/:id/desativar
 */

interface Comunicado {
  id: string;
  mensagem: string;
  ativo: boolean;
  criadoEm: string;
}

export function ComunicadosCliente() {
  const [itens, setItens] = useState<Comunicado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true); setErro(false);
    try {
      const { data } = await api.get<Comunicado[]>('/comunicados-cliente');
      setItens(data);
    } catch { setErro(true); }
    finally { setCarregando(false); }
  }
  useEffect(() => { carregar(); }, []);

  async function enviar() {
    if (mensagem.trim().length < 2 || salvando) return;
    setSalvando(true);
    try {
      await api.post('/comunicados-cliente', { mensagem: mensagem.trim() });
      setMensagem('');
      carregar();
    } finally { setSalvando(false); }
  }
  async function desativar(id: string) { await api.patch(`/comunicados-cliente/${id}/desativar`); carregar(); }

  if (carregando) return <EstadoCarregando />;
  if (erro) return <EstadoErro mensagem="Falha ao carregar os comunicados." onTentar={carregar} />;

  return (
    <PaginaShell titulo="Comunicar clientes" subtitulo="Mensagem que aparece como banner no portal de todos os clientes.">
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Novo comunicado</h3>
        <textarea
          className="brk-input"
          style={{ width: '100%', minHeight: 80, resize: 'vertical' }}
          placeholder="Ex.: Amanhã é feriado, não teremos expediente."
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
        />
        <div style={{ marginTop: 10 }}>
          <BotaoPrimario onClick={enviar} disabled={salvando || mensagem.trim().length < 2}>
            {salvando ? 'Enviando…' : 'Publicar para todos os clientes'}
          </BotaoPrimario>
        </div>
      </Card>

      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Comunicados</h3>
        {itens.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Nenhum comunicado.</p>
        ) : (
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {itens.map((c) => (
              <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--superficie-2)', opacity: c.ativo ? 1 : 0.55 }}>
                <div>
                  <div style={{ fontSize: 13.5 }}>{c.mensagem}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--texto-fraco)' }}>
                    {new Date(c.criadoEm).toLocaleDateString('pt-BR')} · {c.ativo ? 'ativo (no portal)' : 'inativo'}
                  </div>
                </div>
                {c.ativo && <BotaoSecundario onClick={() => desativar(c.id)}>Desativar</BotaoSecundario>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </PaginaShell>
  );
}
