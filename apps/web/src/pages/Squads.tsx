import { useState, useEffect, type FormEvent } from 'react';
import { FuncaoSquad } from '@breakr/shared';
import { api } from '../lib/api';
import { comDemo, mockSeDemo } from '../lib/demo';
import { useAuth } from '../lib/auth';
import {
  PaginaShell,
  BotaoPrimario,
  BotaoSecundario,
  Campo,
  Overlay,
  MensagemErro,
  EstadoCarregando,
  EstadoErro,
  PainelVazio,
} from '../components/primitivos';

/**
 * Tela de Squads (Fase 0 — leitura + criação).
 * Mostra cada squad como um card com seus membros em chips coloridos por
 * função. Permite criar um novo squad (vazio) via modal.
 *
 * Contrato:
 *  GET  /squads → Squad[]
 *  POST /squads { nome }
 */

interface MembroSquad {
  id: string;
  funcao: FuncaoSquad;
  usuario: { id: string; nome: string; cargo: string; whatsapp?: string | null };
}

// Usuário disponível para vincular ao squad (picker de "adicionar membro").
interface UsuarioOpcao {
  id: string;
  nome: string;
  cargo: string;
  whatsapp?: string | null;
}

interface Squad {
  id: string;
  nome: string;
  ativo: boolean;
  membros: MembroSquad[];
  clientes: { id: string }[];
}

// Rótulo amigável + cor de acento por função no squad.
const FUNCOES: Record<FuncaoSquad, { rotulo: string; cor: string }> = {
  [FuncaoSquad.CS]: { rotulo: 'CS', cor: '#2ecc71' },
  [FuncaoSquad.ESTRATEGISTA]: { rotulo: 'Estrategista', cor: '#ff9406' },
  [FuncaoSquad.COPYWRITER]: { rotulo: 'Copywriter', cor: '#ca3f17' },
  [FuncaoSquad.DESIGNER]: { rotulo: 'Designer', cor: '#b06cf0' },
  [FuncaoSquad.EDITOR_VIDEO]: { rotulo: 'Editor de vídeo', cor: '#4aa3f0' },
  [FuncaoSquad.GESTOR_TRAFEGO]: { rotulo: 'Tráfego', cor: '#f0c34a' },
};

const MOCK_SQUADS: Squad[] = [
  {
    id: 'sq1', nome: 'Squad Restaurantes', ativo: true,
    membros: [
      { id: 'ms1', funcao: FuncaoSquad.CS, usuario: { id: 'u1', nome: 'Marina Alves', cargo: 'CS' } },
      { id: 'ms2', funcao: FuncaoSquad.ESTRATEGISTA, usuario: { id: 'u2', nome: 'Bruno Castro', cargo: 'ESTRATEGISTA' } },
      { id: 'ms3', funcao: FuncaoSquad.COPYWRITER, usuario: { id: 'u3', nome: 'Letícia Dias', cargo: 'COPYWRITER' } },
      { id: 'ms4', funcao: FuncaoSquad.GESTOR_TRAFEGO, usuario: { id: 'u4', nome: 'Pedro Rocha', cargo: 'DESIGNER' } },
    ],
    clientes: [{ id: 'cl1' }, { id: 'cl2' }, { id: 'cl3' }],
  },
  {
    id: 'sq2', nome: 'Squad Premium', ativo: true,
    membros: [
      { id: 'ms5', funcao: FuncaoSquad.CS, usuario: { id: 'u5', nome: 'Ana Paula Souza', cargo: 'CS' } },
      { id: 'ms6', funcao: FuncaoSquad.ESTRATEGISTA, usuario: { id: 'u6', nome: 'Carlos Menezes', cargo: 'ESTRATEGISTA' } },
      { id: 'ms7', funcao: FuncaoSquad.DESIGNER, usuario: { id: 'u7', nome: 'Fernanda Costa', cargo: 'DESIGNER' } },
      { id: 'ms8', funcao: FuncaoSquad.EDITOR_VIDEO, usuario: { id: 'u8', nome: 'João Vitor Lima', cargo: 'CS' } },
    ],
    clientes: [{ id: 'cl4' }, { id: 'cl5' }],
  },
  {
    id: 'sq3', nome: 'Squad Growth', ativo: true,
    membros: [
      { id: 'ms9', funcao: FuncaoSquad.CS, usuario: { id: 'u9', nome: 'Ricardo Barros', cargo: 'CS' } },
      { id: 'ms10', funcao: FuncaoSquad.GESTOR_TRAFEGO, usuario: { id: 'u10', nome: 'Thiago Mendes', cargo: 'CS' } },
      { id: 'ms11', funcao: FuncaoSquad.COPYWRITER, usuario: { id: 'u11', nome: 'Sabrina Torres', cargo: 'COPYWRITER' } },
    ],
    clientes: [{ id: 'cl6' }, { id: 'cl7' }, { id: 'cl8' }, { id: 'cl9' }],
  },
];

export function Squads() {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const { usuario } = useAuth();
  const ehAdmin = usuario?.cargo === 'SUPERADMIN' || usuario?.cargo === 'ADMIN';
  const [usuarios, setUsuarios] = useState<UsuarioOpcao[]>([]);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<Squad[]>('/squads');
      setSquads(comDemo(data, MOCK_SQUADS));
    } catch {
      setSquads(mockSeDemo(MOCK_SQUADS));
      setErro(null);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // Lista de usuários para o picker de "adicionar membro" (só admin acessa /usuarios).
    api.get<UsuarioOpcao[]>('/usuarios').then(({ data }) => setUsuarios(data)).catch(() => setUsuarios([]));
  }, []);

  const q = busca.toLowerCase().trim();
  const filtrados = q
    ? squads.filter((s) => s.nome.toLowerCase().includes(q))
    : squads;

  return (
    <PaginaShell
      titulo="Squads"
      subtitulo="Times multidisciplinares que atendem a carteira"
      acao={
        <BotaoPrimario onClick={() => setModalAberto(true)}>+ Novo squad</BotaoPrimario>
      }
    >
      <div className="brk-filtros">
        <div className="brk-search">
          <span className="brk-search-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            className="brk-input"
            type="search"
            placeholder="Buscar squad por nome…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            disabled={carregando}
          />
        </div>
      </div>

      {carregando ? (
        <EstadoCarregando />
      ) : erro ? (
        <EstadoErro mensagem={erro} onTentar={carregar} />
      ) : squads.length === 0 ? (
        <PainelVazio
          titulo="Nenhum squad ainda"
          descricao="Crie o primeiro squad para organizar o time que atende os clientes."
          acao={<BotaoPrimario onClick={() => setModalAberto(true)}>+ Novo squad</BotaoPrimario>}
        />
      ) : filtrados.length === 0 ? (
        <PainelVazio
          titulo="Nenhum resultado"
          descricao={`Nenhum squad corresponde a "${busca}".`}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 18,
          }}
        >
          {filtrados.map((s) => (
            <CardSquad key={s.id} squad={s} aoAtualizar={carregar} usuarios={usuarios} ehAdmin={ehAdmin} />
          ))}
        </div>
      )}

      {modalAberto && (
        <ModalNovoSquad
          onFechar={() => setModalAberto(false)}
          onCriado={() => {
            setModalAberto(false);
            carregar();
          }}
        />
      )}
    </PaginaShell>
  );
}

/* ------------------------------ Card ------------------------------ */

function CardSquad({ squad, aoAtualizar, usuarios, ehAdmin }: { squad: Squad; aoAtualizar: () => void; usuarios: UsuarioOpcao[]; ehAdmin: boolean }) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(squad.nome);
  const [salvando, setSalvando] = useState(false);
  const [novoUsuario, setNovoUsuario] = useState('');
  const [novaFuncao, setNovaFuncao] = useState<FuncaoSquad>(FuncaoSquad.CS);
  const [addSalvando, setAddSalvando] = useState(false);
  const [addErro, setAddErro] = useState<string | null>(null);

  // Vincula um usuário ao squad (função + WhatsApp/ID vêm do próprio usuário) — req. l.140.
  async function adicionarMembro() {
    if (!novoUsuario || addSalvando) return;
    setAddSalvando(true);
    setAddErro(null);
    try {
      await api.post(`/squads/${squad.id}/membros`, { usuarioId: novoUsuario, funcao: novaFuncao });
      setNovoUsuario('');
      aoAtualizar();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setAddErro(msg ?? 'Não foi possível adicionar o membro.');
    } finally {
      setAddSalvando(false);
    }
  }

  async function removerMembro(membroId: string) {
    try {
      await api.delete(`/squads/${squad.id}/membros/${membroId}`);
      aoAtualizar();
    } catch { /* silencioso */ }
  }

  async function salvarNome() {
    if (!nome.trim() || salvando) return;
    setSalvando(true);
    try {
      await api.patch(`/squads/${squad.id}`, { nome: nome.trim() });
      setEditando(false);
      aoAtualizar();
    } finally { setSalvando(false); }
  }

  return (
    <article
      style={{
        background: 'var(--superficie)',
        border: '1px solid var(--borda)',
        borderRadius: 16,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        boxShadow: 'var(--sombra-card)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span
            aria-hidden="true"
            className="brk-gradient-bg"
            style={{
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: 12,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            {squad.nome.charAt(0).toUpperCase()}
          </span>
          <div style={{ minWidth: 0 }}>
            {editando ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  className="brk-input"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') salvarNome(); if (e.key === 'Escape') { setEditando(false); setNome(squad.nome); } }}
                  autoFocus
                  style={{ fontSize: 14, padding: '4px 8px' }}
                />
                <BotaoPrimario onClick={salvarNome} disabled={salvando}>{salvando ? '…' : 'OK'}</BotaoPrimario>
                <BotaoSecundario onClick={() => { setEditando(false); setNome(squad.nome); }}>×</BotaoSecundario>
              </div>
            ) : (
              <h3
                onClick={() => setEditando(true)}
                title="Clique para renomear"
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                {squad.nome}
              </h3>
            )}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
              <span style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>
                {squad.membros.length}{' '}
                {squad.membros.length === 1 ? 'membro' : 'membros'}
              </span>
              {squad.clientes.length > 0 && (
                <span style={{ fontSize: 12, color: 'var(--amarelo-fagulha)', fontWeight: 600 }}>
                  {squad.clientes.length}{' '}
                  {squad.clientes.length === 1 ? 'cliente' : 'clientes'}
                </span>
              )}
            </div>
          </div>
        </div>
        <BadgeAtivo ativo={squad.ativo} />
      </header>

      <div style={{ borderTop: '1px solid var(--borda)', paddingTop: 14 }}>
        {squad.membros.length === 0 ? (
          <p
            style={{
              fontSize: 13,
              color: 'var(--texto-fraco)',
              textAlign: 'center',
              padding: '10px 0',
            }}
          >
            Squad sem membros atribuídos.
          </p>
        ) : (
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {squad.membros.map((m) => (
              <li
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span
                    style={{
                      fontSize: 13.5,
                      color: 'var(--texto-suave)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.usuario.nome}
                  </span>
                  <span style={{ fontSize: 10.5, color: 'var(--texto-fraco)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.usuario.whatsapp ? `WhatsApp: ${m.usuario.whatsapp} · ` : ''}ID: {m.usuario.id}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <ChipFuncao funcao={m.funcao} />
                  {ehAdmin && (
                    <button
                      type="button"
                      onClick={() => removerMembro(m.id)}
                      title="Remover membro"
                      aria-label="Remover membro"
                      style={{ background: 'none', border: 'none', color: 'var(--texto-fraco)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px' }}
                    >
                      ×
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {ehAdmin && (
        <div style={{ borderTop: '1px solid var(--borda)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--texto-fraco)', textTransform: 'uppercase' }}>
            Adicionar membro
          </span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <select
              className="brk-input"
              value={novoUsuario}
              onChange={(e) => setNovoUsuario(e.target.value)}
              style={{ flex: '1 1 140px', minWidth: 0, fontSize: 12.5, padding: '6px 8px' }}
            >
              <option value="">Selecione o usuário…</option>
              {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
            <select
              className="brk-input"
              value={novaFuncao}
              onChange={(e) => setNovaFuncao(e.target.value as FuncaoSquad)}
              style={{ flex: '0 1 140px', fontSize: 12.5, padding: '6px 8px' }}
            >
              {Object.values(FuncaoSquad).map((f) => <option key={f} value={f}>{FUNCOES[f]?.rotulo ?? f}</option>)}
            </select>
            <BotaoPrimario onClick={adicionarMembro} disabled={!novoUsuario || addSalvando}>
              {addSalvando ? '…' : '+ Add'}
            </BotaoPrimario>
          </div>
          {addErro && <MensagemErro texto={addErro} />}
        </div>
      )}
    </article>
  );
}

function ChipFuncao({ funcao }: { funcao: FuncaoSquad }) {
  const cfg = FUNCOES[funcao] ?? { rotulo: funcao, cor: 'var(--texto-fraco)' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.02em',
        padding: '3px 9px',
        borderRadius: 999,
        color: cfg.cor,
        background: 'var(--superficie-3)',
        border: `1px solid ${cfg.cor}40`,
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 6, height: 6, borderRadius: 999, background: cfg.cor }}
      />
      {cfg.rotulo}
    </span>
  );
}

function BadgeAtivo({ ativo }: { ativo: boolean }) {
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.05em',
        padding: '3px 9px',
        borderRadius: 999,
        flexShrink: 0,
        color: ativo ? '#67e0a3' : 'var(--texto-fraco)',
        background: ativo ? 'rgba(46, 204, 113, 0.14)' : 'var(--superficie-3)',
      }}
    >
      {ativo ? 'ATIVO' : 'INATIVO'}
    </span>
  );
}

/* --------------------------- Modal novo --------------------------- */

function ModalNovoSquad({
  onFechar,
  onCriado,
}: {
  onFechar: () => void;
  onCriado: () => void;
}) {
  const [nome, setNome] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const valido = nome.trim().length >= 2;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      await api.post('/squads', { nome: nome.trim() });
      onCriado();
    } catch {
      setErro('Falha ao criar o squad. Tente novamente.');
      setSalvando(false);
    }
  }

  return (
    <Overlay onFechar={onFechar}>
      <form
        onSubmit={enviar}
        className="brk-gradient-border"
        style={{
          width: 'min(440px, 92vw)',
          background: 'var(--superficie)',
          borderRadius: 18,
          padding: 24,
          boxShadow: 'var(--sombra-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Novo squad</h2>
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)', marginTop: 2 }}>
            Os membros são atribuídos depois, conforme a função de cada um.
          </p>
        </div>

        <Campo
          rotulo="Nome do squad"
          obrigatorio
          valor={nome}
          aoMudar={setNome}
          placeholder="Ex.: Squad Fênix"
          autoFocus
        />

        {erro && <MensagemErro texto={erro} />}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <BotaoSecundario onClick={onFechar} disabled={salvando}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={!valido || salvando}>
            {salvando ? 'Criando…' : 'Criar squad'}
          </BotaoPrimario>
        </div>
      </form>
    </Overlay>
  );
}
