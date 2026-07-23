// Painel de Tipos de Tarefa × Etapas (fluxo de produção — Marketing), inspirado na
// tela "TIPOS DE TAREFA" do eKyte. Renderizado como aba dentro de /conteudos.
// Tabela: Id | Tipo de tarefa | Criado por | Controle Esforço | Dias para concluir |
// Esforço previsto | matriz de 9 ETAPAS (aplicável + responsável por etapa).
// Backend real: /tipos-tarefa (CRUD) + /tipos-tarefa/:id/etapa (célula da matriz).
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  BotaoPrimario,
  BotaoSecundario,
  Campo,
  Overlay,
  MensagemErro,
  EstadoCarregando,
  EstadoErro,
  PainelVazio,
} from './primitivos';

type EtapaChave =
  | 'BRIEFING'
  | 'ANALISE'
  | 'REDACAO'
  | 'DESIGN'
  | 'REVISAO_INTERNA'
  | 'APROVACAO_CLIENTE'
  | 'PUBLICACAO'
  | 'DIVULGACAO'
  | 'MONITORAMENTO';

type ControleEsforco = 'AGIL' | 'POR_ETAPA';

type EtapaTT = {
  id: string;
  etapa: EtapaChave;
  aplicavel: boolean;
  responsavelId: string | null;
};

type TipoTarefa = {
  id: string;
  titulo: string;
  controleEsforco: ControleEsforco;
  diasConcluir: number | null;
  esforcoPrevistoMin: number | null;
  criadoPorId: string | null;
  criadoEm: string;
  etapas: EtapaTT[];
};

type UsuarioOpt = { id: string; nome: string };

// Ordem/rótulos das 9 etapas (colunas da matriz), igual ao wireframe.
const ETAPAS: { chave: EtapaChave; rotulo: string }[] = [
  { chave: 'BRIEFING', rotulo: 'Briefing' },
  { chave: 'ANALISE', rotulo: 'Análise' },
  { chave: 'REDACAO', rotulo: 'Redação' },
  { chave: 'DESIGN', rotulo: 'Design' },
  { chave: 'REVISAO_INTERNA', rotulo: 'Revisão interna' },
  { chave: 'APROVACAO_CLIENTE', rotulo: 'Aprovação cliente' },
  { chave: 'PUBLICACAO', rotulo: 'Publicação' },
  { chave: 'DIVULGACAO', rotulo: 'Divulgação' },
  { chave: 'MONITORAMENTO', rotulo: 'Monitoramento' },
];

const CONTROLE_ROTULO: Record<ControleEsforco, string> = {
  AGIL: 'Ágil',
  POR_ETAPA: 'Por Etapa',
};

// Cargos com permissão de configurar (mesma regra do backend).
const CARGOS_GESTAO = ['SUPERADMIN', 'ADMIN', 'ESTRATEGISTA', 'CS'];

// Iniciais para o "avatar" do responsável na célula.
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

// Minutos → "3h", "1h30", "45min" (ou "—" quando vazio).
function formatEsforco(min: number | null): string {
  if (min == null) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h && m) return `${h}h${m.toString().padStart(2, '0')}`;
  if (h) return `${h}h`;
  return `${m}min`;
}

export function PainelTiposTarefa() {
  const { usuario } = useAuth();
  const podeEditar = CARGOS_GESTAO.includes(usuario?.cargo ?? '');

  const [tipos, setTipos] = useState<TipoTarefa[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioOpt[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  const [modalNovo, setModalNovo] = useState(false);
  const [editando, setEditando] = useState<TipoTarefa | null>(null);
  const [celula, setCelula] = useState<{ tipo: TipoTarefa; etapa: EtapaChave } | null>(null);
  const [excluindo, setExcluindo] = useState<TipoTarefa | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const [tt, us] = await Promise.all([
        api.get<TipoTarefa[]>('/tipos-tarefa'),
        api.get<UsuarioOpt[]>('/usuarios').catch(() => ({ data: [] as UsuarioOpt[] })),
      ]);
      setTipos(tt.data);
      setUsuarios(us.data);
    } catch {
      setErro('Não foi possível carregar os tipos de tarefa.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function nomeUsuario(id: string | null): string {
    if (!id) return '';
    return usuarios.find((u) => u.id === id)?.nome ?? '';
  }

  function etapaDo(tipo: TipoTarefa, chave: EtapaChave): EtapaTT | undefined {
    return tipo.etapas.find((e) => e.etapa === chave);
  }

  async function removerTipo(tipo: TipoTarefa) {
    setErroAcao(null);
    try {
      await api.delete(`/tipos-tarefa/${tipo.id}`);
      setExcluindo(null);
      carregar();
    } catch {
      setErroAcao('Não foi possível excluir o tipo de tarefa.');
    }
  }

  if (carregando) return <EstadoCarregando />;
  if (erro) return <EstadoErro mensagem={erro} onTentar={carregar} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>
          Modelos de tarefa e as etapas do fluxo de produção. Cada célula da matriz é a etapa
          daquele tipo — clique para definir o responsável ou marcar como não aplicável.
        </p>
        {podeEditar && (
          <BotaoPrimario onClick={() => setModalNovo(true)}>+ Novo tipo de tarefa</BotaoPrimario>
        )}
      </div>

      {erroAcao && <MensagemErro texto={erroAcao} />}

      {tipos.length === 0 ? (
        <PainelVazio
          titulo="Nenhum tipo de tarefa ainda"
          descricao="Crie o primeiro tipo para organizar a produção por etapas."
          acao={podeEditar ? <BotaoPrimario onClick={() => setModalNovo(true)}>+ Novo tipo de tarefa</BotaoPrimario> : undefined}
        />
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid var(--borda)', borderRadius: 12, background: 'var(--superficie)', boxShadow: 'var(--sombra-card)' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 1100, fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--superficie-2)' }}>
                <th style={thBase}>Id</th>
                <th style={{ ...thBase, textAlign: 'left', minWidth: 220 }}>Tipo de tarefa</th>
                <th style={thBase}>Criado por</th>
                <th style={thBase}>Controle Esforço</th>
                <th style={thBase}>Dias para concluir</th>
                <th style={thBase}>Esforço previsto</th>
                {ETAPAS.map((e) => (
                  <th key={e.chave} style={{ ...thBase, minWidth: 92 }}>{e.rotulo}</th>
                ))}
                {podeEditar && <th style={thBase}></th>}
              </tr>
            </thead>
            <tbody>
              {tipos.map((t) => (
                <tr key={t.id} style={{ borderTop: '1px solid var(--borda)' }}>
                  <td style={{ ...tdBase, fontFamily: 'monospace', color: 'var(--texto-fraco)', fontSize: 11.5 }}>
                    {t.id.slice(0, 8)}
                  </td>
                  <td style={{ ...tdBase, textAlign: 'left', fontWeight: 600, color: 'var(--cinza-vapor)' }}>
                    {t.titulo}
                  </td>
                  <td style={tdBase}>{nomeUsuario(t.criadoPorId) || '—'}</td>
                  <td style={tdBase}>{CONTROLE_ROTULO[t.controleEsforco]}</td>
                  <td style={tdBase}>{t.diasConcluir ?? '—'}</td>
                  <td style={tdBase}>{formatEsforco(t.esforcoPrevistoMin)}</td>
                  {ETAPAS.map((col) => {
                    const et = etapaDo(t, col.chave);
                    const aplicavel = et ? et.aplicavel : true;
                    const respId = et?.responsavelId ?? null;
                    const respNome = nomeUsuario(respId);
                    const conteudoCelula = !aplicavel ? (
                      <span style={{ color: 'var(--texto-fraco)', fontSize: 16 }}>–</span>
                    ) : respId ? (
                      <span
                        title={respNome}
                        style={{ display: 'inline-grid', placeItems: 'center', width: 26, height: 26, borderRadius: 999, fontSize: 10.5, fontWeight: 800, color: '#fff' }}
                        className="brk-gradient-bg"
                      >
                        {respNome ? iniciais(respNome) : '?'}
                      </span>
                    ) : (
                      <span title="Sem responsável" style={{ color: 'var(--texto-fraco)' }} aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" />
                        </svg>
                      </span>
                    );
                    return (
                      <td key={col.chave} style={{ ...tdBase, padding: 4 }}>
                        {podeEditar ? (
                          <button
                            type="button"
                            onClick={() => setCelula({ tipo: t, etapa: col.chave })}
                            title={`Configurar ${col.rotulo}`}
                            style={{ display: 'grid', placeItems: 'center', width: '100%', minHeight: 40, background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                          >
                            {conteudoCelula}
                          </button>
                        ) : (
                          <div style={{ display: 'grid', placeItems: 'center', minHeight: 40 }}>{conteudoCelula}</div>
                        )}
                      </td>
                    );
                  })}
                  {podeEditar && (
                    <td style={{ ...tdBase, whiteSpace: 'nowrap' }}>
                      <button type="button" onClick={() => setEditando(t)} title="Editar" style={btnIcone}>✎</button>
                      <button type="button" onClick={() => setExcluindo(t)} title="Excluir" style={{ ...btnIcone, color: 'var(--vermelho, #e5484d)' }}>🗑</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalNovo && (
        <ModalTipo
          usuarios={usuarios}
          onFechar={() => setModalNovo(false)}
          onSalvo={() => { setModalNovo(false); carregar(); }}
        />
      )}
      {editando && (
        <ModalTipo
          tipo={editando}
          usuarios={usuarios}
          onFechar={() => setEditando(null)}
          onSalvo={() => { setEditando(null); carregar(); }}
        />
      )}
      {celula && (
        <ModalEtapa
          tipo={celula.tipo}
          etapaChave={celula.etapa}
          usuarios={usuarios}
          onFechar={() => setCelula(null)}
          onSalvo={() => { setCelula(null); carregar(); }}
        />
      )}
      {excluindo && (
        <Overlay onFechar={() => setExcluindo(null)}>
          <div style={caixaModal}>
            <h2 style={{ fontSize: 17, fontWeight: 700 }}>Excluir tipo de tarefa</h2>
            <p style={{ fontSize: 13.5, color: 'var(--texto-suave)' }}>
              Remover <strong>{excluindo.titulo}</strong> e a matriz de etapas dele? Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <BotaoSecundario onClick={() => setExcluindo(null)}>Cancelar</BotaoSecundario>
              <BotaoPrimario onClick={() => removerTipo(excluindo)}>Excluir</BotaoPrimario>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}

// Modal de criar/editar os atributos de um Tipo de Tarefa.
function ModalTipo({
  tipo,
  usuarios: _usuarios,
  onFechar,
  onSalvo,
}: {
  tipo?: TipoTarefa;
  usuarios: UsuarioOpt[];
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [titulo, setTitulo] = useState(tipo?.titulo ?? '');
  const [controle, setControle] = useState<ControleEsforco>(tipo?.controleEsforco ?? 'AGIL');
  const [dias, setDias] = useState(tipo?.diasConcluir != null ? String(tipo.diasConcluir) : '');
  const [horas, setHoras] = useState(
    tipo?.esforcoPrevistoMin != null ? String(tipo.esforcoPrevistoMin / 60) : '',
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const valido = titulo.trim().length >= 2;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!valido || salvando) return;
    setSalvando(true);
    setErro(null);
    const diasNum = dias.trim() === '' ? undefined : Math.max(0, Math.round(Number(dias)));
    const horasNum = horas.trim() === '' ? undefined : Number(horas);
    const esforcoMin =
      horasNum === undefined || Number.isNaN(horasNum)
        ? undefined
        : Math.max(0, Math.round(horasNum * 60));
    const corpo = {
      titulo: titulo.trim(),
      controleEsforco: controle,
      diasConcluir: diasNum,
      esforcoPrevistoMin: esforcoMin,
    };
    try {
      if (tipo) await api.patch(`/tipos-tarefa/${tipo.id}`, corpo);
      else await api.post('/tipos-tarefa', corpo);
      onSalvo();
    } catch {
      setErro('Não foi possível salvar. Verifique os dados e tente novamente.');
      setSalvando(false);
    }
  }

  return (
    <Overlay onFechar={onFechar}>
      <form onSubmit={enviar} className="brk-gradient-border" style={{ ...caixaModal, width: 'min(460px, 92vw)' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>{tipo ? 'Editar tipo de tarefa' : 'Novo tipo de tarefa'}</h2>
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)', marginTop: 2 }}>
            {tipo ? 'Ajuste os atributos de planejamento.' : 'As 9 etapas do fluxo são criadas automaticamente (todas aplicáveis).'}
          </p>
        </div>

        <Campo rotulo="Tipo de tarefa" obrigatorio valor={titulo} aoMudar={setTitulo} placeholder="Ex.: Criação Anúncio Digital (Ads)" autoFocus />

        <label style={rotuloCampo}>
          Controle de Esforço
          <select value={controle} onChange={(e) => setControle(e.target.value as ControleEsforco)} style={selectEstilo}>
            <option value="AGIL">Ágil</option>
            <option value="POR_ETAPA">Por Etapa</option>
          </select>
        </label>

        <Campo rotulo="Dias para concluir" valor={dias} aoMudar={setDias} placeholder="Ex.: 180 (dias corridos, inclui esperas)" />
        <Campo rotulo="Esforço previsto (horas)" valor={horas} aoMudar={setHoras} placeholder="Ex.: 3 (horas de trabalho efetivo)" />

        {erro && <MensagemErro texto={erro} />}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <BotaoSecundario onClick={onFechar} disabled={salvando}>Cancelar</BotaoSecundario>
          <BotaoPrimario type="submit" disabled={!valido || salvando}>
            {salvando ? 'Salvando…' : tipo ? 'Salvar' : 'Criar tipo'}
          </BotaoPrimario>
        </div>
      </form>
    </Overlay>
  );
}

// Modal de configurar UMA célula da matriz (aplicável + responsável).
function ModalEtapa({
  tipo,
  etapaChave,
  usuarios,
  onFechar,
  onSalvo,
}: {
  tipo: TipoTarefa;
  etapaChave: EtapaChave;
  usuarios: UsuarioOpt[];
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const atual = tipo.etapas.find((e) => e.etapa === etapaChave);
  const rotulo = ETAPAS.find((e) => e.chave === etapaChave)?.rotulo ?? etapaChave;
  const [aplicavel, setAplicavel] = useState(atual ? atual.aplicavel : true);
  const [responsavelId, setResponsavelId] = useState(atual?.responsavelId ?? '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      await api.patch(`/tipos-tarefa/${tipo.id}/etapa`, {
        etapa: etapaChave,
        aplicavel,
        responsavelId: aplicavel ? (responsavelId || null) : null,
      });
      onSalvo();
    } catch {
      setErro('Não foi possível salvar a etapa.');
      setSalvando(false);
    }
  }

  return (
    <Overlay onFechar={onFechar}>
      <div style={{ ...caixaModal, width: 'min(420px, 92vw)' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>{rotulo}</h2>
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)', marginTop: 2 }}>{tipo.titulo}</p>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--texto-suave)', cursor: 'pointer' }}>
          <input type="checkbox" checked={aplicavel} onChange={(e) => setAplicavel(e.target.checked)} />
          Esta etapa faz parte do fluxo deste tipo
        </label>

        {aplicavel && (
          <label style={rotuloCampo}>
            Responsável
            <select value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)} style={selectEstilo}>
              <option value="">Sem responsável</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </label>
        )}

        {erro && <MensagemErro texto={erro} />}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <BotaoSecundario onClick={onFechar} disabled={salvando}>Cancelar</BotaoSecundario>
          <BotaoPrimario onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</BotaoPrimario>
        </div>
      </div>
    </Overlay>
  );
}

const thBase: React.CSSProperties = {
  padding: '10px 8px',
  textAlign: 'center',
  fontSize: 11.5,
  fontWeight: 700,
  color: 'var(--texto-fraco)',
  whiteSpace: 'nowrap',
};

const tdBase: React.CSSProperties = {
  padding: '8px',
  textAlign: 'center',
  color: 'var(--texto-suave)',
  verticalAlign: 'middle',
};

const btnIcone: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  fontSize: 15,
  padding: '4px 6px',
  color: 'var(--texto-suave)',
};

const caixaModal: React.CSSProperties = {
  background: 'var(--superficie)',
  borderRadius: 18,
  padding: 24,
  boxShadow: 'var(--sombra-card)',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  width: 'min(440px, 92vw)',
};

const rotuloCampo: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--texto-suave)',
};

const selectEstilo: React.CSSProperties = {
  padding: '9px 10px',
  borderRadius: 10,
  border: '1px solid var(--borda-forte)',
  background: 'var(--superficie)',
  color: 'var(--cinza-vapor)',
  fontSize: 13.5,
};
