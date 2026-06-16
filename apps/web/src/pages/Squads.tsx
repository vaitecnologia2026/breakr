import { useState, useEffect, type FormEvent } from 'react';
import { FuncaoSquad } from '@breakr/shared';
import { api } from '../lib/api';
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
} from './Clientes';

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
  usuario: { id: string; nome: string; cargo: string };
}

interface Squad {
  id: string;
  nome: string;
  ativo: boolean;
  membros: MembroSquad[];
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

export function Squads() {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [busca, setBusca] = useState('');

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<Squad[]>('/squads');
      setSquads(data);
    } catch {
      setErro('Não foi possível carregar os squads. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
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
            <CardSquad key={s.id} squad={s} />
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

function CardSquad({ squad }: { squad: Squad }) {
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
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {squad.nome}
            </h3>
            <span style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>
              {squad.membros.length}{' '}
              {squad.membros.length === 1 ? 'membro' : 'membros'}
            </span>
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
                <ChipFuncao funcao={m.funcao} />
              </li>
            ))}
          </ul>
        )}
      </div>
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
