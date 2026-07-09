import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  PaginaShell,
  BotaoPrimario,
  BotaoSecundario,
  EstadoCarregando,
  EstadoErro,
  PainelVazio,
} from '../components/primitivos';
import { Card } from '../components/ui';
import { comDemo, mockSeDemo } from '../lib/demo';

/**
 * Inventário interno — equipamentos/materiais da empresa.
 *  GET    /inventario
 *  POST   /inventario { nome, categoria?, valor?, notaFiscalUrl?, plaqueta?, responsavelId? }
 *  PATCH  /inventario/:id/receber
 *  DELETE /inventario/:id
 */

interface Item {
  id: string;
  nome: string;
  categoria: string | null;
  valor: string | null;
  notaFiscalUrl: string | null;
  plaqueta: string | null;
  recebidoEm: string | null;
  responsavel: { nome: string } | null;
}

interface UsuarioOpt {
  id: string;
  nome: string;
}

const rotulo: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)', marginBottom: 4, display: 'block' };
function inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="brk-input" style={{ width: '100%', ...props.style }} />;
}

const MOCK_INVENTARIO: Item[] = [
  { id: 'i1', nome: 'MacBook Pro 16"', categoria: 'Computador', valor: '18500.00', notaFiscalUrl: null, plaqueta: 'BRK-001', recebidoEm: '2025-03-10T00:00:00Z', responsavel: { nome: 'Rafael Lima' } },
  { id: 'i2', nome: 'Monitor LG UltraWide 34"', categoria: 'Monitor', valor: '3200.00', notaFiscalUrl: null, plaqueta: 'BRK-002', recebidoEm: '2025-03-10T00:00:00Z', responsavel: { nome: 'Marina Alves' } },
  { id: 'i3', nome: 'iPhone 15 Pro', categoria: 'Celular', valor: '9200.00', notaFiscalUrl: null, plaqueta: 'BRK-003', recebidoEm: '2025-05-01T00:00:00Z', responsavel: { nome: 'Admin' } },
  { id: 'i4', nome: 'Mesa de Reunião 8 lugares', categoria: 'Móvel', valor: '4500.00', notaFiscalUrl: null, plaqueta: 'BRK-004', recebidoEm: '2025-01-15T00:00:00Z', responsavel: null },
  { id: 'i5', nome: 'Câmera Sony ZV-E10', categoria: 'Equipamento', valor: '4100.00', notaFiscalUrl: null, plaqueta: 'BRK-005', recebidoEm: '2025-09-20T00:00:00Z', responsavel: { nome: 'Pedro Rocha' } },
];

export function Inventario() {
  const { usuario } = useAuth();
  const ehGestao = usuario?.cargo === 'SUPERADMIN' || usuario?.cargo === 'ADMIN' || usuario?.cargo === 'FINANCEIRO';

  const [itens, setItens] = useState<Item[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioOpt[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [valor, setValor] = useState('');
  const [plaqueta, setPlaqueta] = useState('');
  const [notaFiscalUrl, setNotaFiscalUrl] = useState('');
  const [responsavelId, setResponsavelId] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    setErro(false);
    try {
      const { data } = await api.get<Item[]>('/inventario');
      setItens(comDemo(data, MOCK_INVENTARIO));
    } catch {
      setItens(mockSeDemo(MOCK_INVENTARIO));
      setErro(false);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // Tenta carregar usuários para atribuir responsável (pode falhar p/ não-admin).
    api.get<UsuarioOpt[]>('/usuarios').then(({ data }) => setUsuarios(data)).catch(() => setUsuarios([]));
  }, []);

  async function adicionar() {
    if (!nome.trim() || salvando) return;
    setSalvando(true);
    try {
      await api.post('/inventario', {
        nome: nome.trim(),
        categoria: categoria.trim() || undefined,
        valor: valor.trim() || undefined,
        plaqueta: plaqueta.trim() || undefined,
        notaFiscalUrl: notaFiscalUrl.trim() || undefined,
        responsavelId: responsavelId || undefined,
      });
      setNome(''); setCategoria(''); setValor(''); setPlaqueta(''); setNotaFiscalUrl(''); setResponsavelId('');
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function receber(id: string) {
    await api.patch(`/inventario/${id}/receber`);
    carregar();
  }
  async function remover(id: string) {
    await api.delete(`/inventario/${id}`);
    carregar();
  }

  if (carregando) return <EstadoCarregando />;
  if (erro) return <EstadoErro mensagem="Falha ao carregar o inventário." onTentar={carregar} />;

  return (
    <PaginaShell titulo="Inventário" subtitulo="Equipamentos e materiais da empresa.">
      {ehGestao && (
        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Novo item</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 10 }}>
            <div><label style={rotulo}>Nome</label>{inp({ value: nome, onChange: (e) => setNome(e.target.value), placeholder: 'Notebook Dell' })}</div>
            <div><label style={rotulo}>Categoria</label>{inp({ value: categoria, onChange: (e) => setCategoria(e.target.value), placeholder: 'Equipamento' })}</div>
            <div><label style={rotulo}>Valor (R$)</label>{inp({ value: valor, onChange: (e) => setValor(e.target.value), placeholder: '4500' })}</div>
            <div><label style={rotulo}>Plaqueta</label>{inp({ value: plaqueta, onChange: (e) => setPlaqueta(e.target.value), placeholder: 'BRK-0001' })}</div>
            <div><label style={rotulo}>Link da nota fiscal</label>{inp({ value: notaFiscalUrl, onChange: (e) => setNotaFiscalUrl(e.target.value), placeholder: 'https://...' })}</div>
            {usuarios.length > 0 && (
              <div>
                <label style={rotulo}>Responsável</label>
                <select className="brk-input" style={{ width: '100%' }} value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)}>
                  <option value="">— ninguém —</option>
                  {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
            )}
          </div>
          <div style={{ marginTop: 10 }}>
            <BotaoPrimario onClick={adicionar} disabled={salvando || !nome.trim()}>
              {salvando ? 'Adicionando…' : 'Adicionar item'}
            </BotaoPrimario>
          </div>
        </Card>
      )}

      {itens.length === 0 ? (
        <PainelVazio titulo="Inventário vazio" descricao="Nenhum item cadastrado ainda." />
      ) : (
        <Card>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {itens.map((it) => (
              <li key={it.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 14px', borderRadius: 10, background: 'var(--superficie-2)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {it.nome}
                    {it.plaqueta && <span style={{ fontSize: 11, color: 'var(--texto-fraco)', marginLeft: 8 }}>#{it.plaqueta}</span>}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>
                    {[it.categoria, it.valor ? `R$ ${Number(it.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null, it.responsavel?.nome ? `com ${it.responsavel.nome}` : null].filter(Boolean).join(' · ')}
                  </div>
                  {it.notaFiscalUrl && (
                    <a href={it.notaFiscalUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--cinza-vapor)', textDecoration: 'none' }}>Nota fiscal →</a>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {it.recebidoEm ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#67e0a3' }}>Recebido ✓</span>
                  ) : (
                    <BotaoSecundario onClick={() => receber(it.id)}>Confirmar recebimento</BotaoSecundario>
                  )}
                  {ehGestao && <BotaoSecundario onClick={() => remover(it.id)}>Remover</BotaoSecundario>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </PaginaShell>
  );
}
