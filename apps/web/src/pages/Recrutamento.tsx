import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import { api } from '../lib/api';
import { comDemo, mockSeDemo } from '../lib/demo';
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
 * Tela de Recrutamento (M19 — vagas e candidatos / RH).
 * Quadro kanban: colunas = status do candidato; cards = candidatos.
 * O usuário cadastra vagas e candidatos, filtra o quadro por vaga e move
 * cada candidato pelo funil trocando o status no card. Trata loading /
 * erro / vazio e mostra erro inline em falhas de ação.
 *
 * Contrato (API):
 *  GET   /rh/vagas → Vaga[]
 *  POST  /rh/vagas { titulo, departamento? } → Vaga
 *  GET   /rh/candidatos → Candidato[]   (aceita ?vagaId=)
 *  POST  /rh/candidatos { vagaId, nome, email?, telefone? } → Candidato
 *  PATCH /rh/candidatos/:id/status { status } → Candidato
 */

type StatusCandidato =
  | 'INSCRITO'
  | 'TRIAGEM'
  | 'ENTREVISTA'
  | 'TESTE'
  | 'APROVADO'
  | 'REPROVADO';

interface Vaga {
  id: string;
  titulo: string;
  departamento: string | null;
  aberta: boolean;
  codigoUnico?: string;
  _count?: { candidatos: number };
  // Perfil ideal DISC (Job Fit) — percentis 0..100. Aditivos.
  reqPercD?: number | null;
  reqPercI?: number | null;
  reqPercS?: number | null;
  reqPercC?: number | null;
}

type FitNivel = 'ALTO' | 'MEDIO' | 'BAIXO';

// Resultado DISC computado do candidato (subconjunto usado no funil).
interface DiscResultado {
  percentis?: { D: number; I: number; S: number; C: number };
  anomalia?: string | null;
}

interface Candidato {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  status: StatusCandidato;
  perfilDisc: string | null;
  vagaId: string;
  vaga?: { titulo: string };
  // Aditivos (InHire): origem (Source of Hire) e Fit da Triagem com IA.
  origem?: string | null;
  indicadoPor?: string | null;
  fitNivel?: FitNivel | null;
  fitPontuacao?: number | null;
  fitJustificativa?: string | null;
  // DISC computado (modelo do documento) e Job Fit calculado no cliente.
  discResultado?: DiscResultado | null;
  _match?: number | null;
}

// Job Fit: distância euclidiana entre os percentis do candidato e o perfil ideal
// da vaga → Match Score 0..100 (0 = vetores idênticos). null se faltar dado.
function calcularMatch(vaga: Vaga | undefined, disc: DiscResultado | null | undefined): number | null {
  if (!vaga) return null;
  const { reqPercD, reqPercI, reqPercS, reqPercC } = vaga;
  if (reqPercD == null || reqPercI == null || reqPercS == null || reqPercC == null) return null;
  const p = disc?.percentis;
  if (!p) return null;
  const dist = Math.sqrt(
    (p.D - reqPercD) ** 2 + (p.I - reqPercI) ** 2 + (p.S - reqPercS) ** 2 + (p.C - reqPercC) ** 2,
  );
  return Math.max(0, Math.min(100, Math.round((1 - dist / 200) * 100)));
}

// Rótulo + cor por nível de Fit (Triagem com IA).
const FIT_META: Record<FitNivel, { rotulo: string; cor: string; bg: string }> = {
  ALTO: { rotulo: 'Alto Fit', cor: '#2ecc71', bg: 'rgba(46,204,113,0.14)' },
  MEDIO: { rotulo: 'Médio Fit', cor: '#ff9406', bg: 'rgba(255,148,6,0.14)' },
  BAIXO: { rotulo: 'Baixo Fit', cor: '#ff6b6b', bg: 'rgba(255,107,107,0.14)' },
};

// Ordem das colunas do funil (esquerda → direita).
const ORDEM_STATUS: StatusCandidato[] = [
  'INSCRITO',
  'TRIAGEM',
  'ENTREVISTA',
  'TESTE',
  'APROVADO',
  'REPROVADO',
];

// Rótulo amigável + cor de acento (ponto) por status.
const STATUS_META: Record<StatusCandidato, { rotulo: string; cor: string }> = {
  INSCRITO: { rotulo: 'Inscrito', cor: '#9aa0ad' },
  TRIAGEM: { rotulo: 'Triagem', cor: '#4aa3f0' },
  ENTREVISTA: { rotulo: 'Entrevista', cor: '#ff9406' },
  TESTE: { rotulo: 'Teste', cor: '#ca3f17' },
  APROVADO: { rotulo: 'Aprovado', cor: '#2ecc71' },
  REPROVADO: { rotulo: 'Reprovado', cor: '#94122c' },
};

// Valor sentinela do filtro: mostra candidatos de todas as vagas.
const TODAS = '';

const MOCK_VAGAS: Vaga[] = [
  { id: 'v1', titulo: 'CS (Customer Success)', departamento: 'Atendimento', aberta: true, _count: { candidatos: 5 } },
  { id: 'v2', titulo: 'Gestor de Trafego Pago', departamento: 'Trafego', aberta: true, _count: { candidatos: 3 } },
  { id: 'v3', titulo: 'Copywriter Pleno', departamento: 'Conteudo', aberta: false, _count: { candidatos: 8 } },
];
const MOCK_CANDIDATOS: Candidato[] = [
  { id: 'cd1', nome: 'Thiago Andrade', email: 'thiago.a@gmail.com', telefone: '47 99111-2222', status: 'INSCRITO', perfilDisc: null, vagaId: 'v1', vaga: { titulo: 'CS (Customer Success)' } },
  { id: 'cd2', nome: 'Daniela Ramos', email: 'dani.ramos@gmail.com', telefone: '47 99333-4444', status: 'TRIAGEM', perfilDisc: null, vagaId: 'v1', vaga: { titulo: 'CS (Customer Success)' } },
  { id: 'cd3', nome: 'Lucas Ferreira', email: 'lucas.f@gmail.com', telefone: '47 99555-6666', status: 'ENTREVISTA', perfilDisc: 'D', vagaId: 'v2', vaga: { titulo: 'Gestor de Trafego Pago' } },
  { id: 'cd4', nome: 'Camila Oliveira', email: 'cami.oli@gmail.com', telefone: '47 99777-8888', status: 'TESTE', perfilDisc: 'I', vagaId: 'v2', vaga: { titulo: 'Gestor de Trafego Pago' } },
  { id: 'cd5', nome: 'Bruno Santana', email: null, telefone: '47 99999-0000', status: 'INSCRITO', perfilDisc: 'S', vagaId: 'v1', vaga: { titulo: 'CS (Customer Success)' } },
  { id: 'cd6', nome: 'Mariana Costa', email: 'mari.costa@gmail.com', telefone: '47 98888-1111', status: 'APROVADO', perfilDisc: 'C', vagaId: 'v3', vaga: { titulo: 'Copywriter Pleno' } },
  { id: 'cd7', nome: 'Felipe Gomes', email: 'felipe.g@gmail.com', telefone: null, status: 'REPROVADO', perfilDisc: null, vagaId: 'v3', vaga: { titulo: 'Copywriter Pleno' } },
];

export function Recrutamento() {
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modalCandidato, setModalCandidato] = useState(false);
  const [modalVaga, setModalVaga] = useState(false);
  const [filtroVaga, setFiltroVaga] = useState<string>(TODAS);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [triando, setTriando] = useState(false);
  const [busca, setBusca] = useState('');

  async function carregarVagas() {
    try {
      const { data } = await api.get<Vaga[]>('/rh/vagas');
      setVagas(comDemo(data, MOCK_VAGAS));
    } catch {
      setVagas(mockSeDemo(MOCK_VAGAS));
    }
  }

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const [{ data: cands }] = await Promise.all([
        api.get<Candidato[]>('/rh/candidatos'),
        carregarVagas(),
      ]);
      setCandidatos(comDemo(cands, MOCK_CANDIDATOS));
    } catch {
      setCandidatos(mockSeDemo(MOCK_CANDIDATOS));
      setErro(null);
      return;
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  // Triagem com IA (Fit) — roda para a vaga selecionada no filtro (InHire).
  async function rodarTriagem() {
    if (triando) return;
    if (!filtroVaga) {
      setAviso(null);
      setErroAcao('Selecione uma vaga no filtro acima para rodar a Triagem com IA.');
      return;
    }
    setTriando(true);
    setErroAcao(null);
    setAviso(null);
    try {
      const { data } = await api.post<{ total: number }>(`/rh/vagas/${filtroVaga}/triagem-ia`);
      setAviso(`Triagem concluída: ${data.total} candidato(s) avaliados com IA.`);
      await carregar();
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Falha na triagem. Verifique se a IA está ativa em Configurações → Integrações.';
      setErroAcao(msg);
    } finally {
      setTriando(false);
    }
  }

  // Copia o link da Página de Carreiras (da vaga filtrada, ou o portal geral).
  async function copiarLinkCarreiras() {
    const base = window.location.origin;
    const vagaSel = vagas.find((v) => v.id === filtroVaga);
    const url =
      vagaSel?.codigoUnico ? `${base}/carreiras/${vagaSel.codigoUnico}` : `${base}/carreiras`;
    try {
      await navigator.clipboard.writeText(url);
      setErroAcao(null);
      setAviso(`Link da Página de Carreiras copiado: ${url}`);
    } catch {
      setAviso(`Link da Página de Carreiras: ${url}`);
    }
  }

  const porVaga =
    filtroVaga === TODAS
      ? candidatos
      : candidatos.filter((c) => c.vagaId === filtroVaga);

  const buscaQ = busca.toLowerCase().trim();
  const visiveis = buscaQ
    ? porVaga.filter(
        (c) =>
          c.nome.toLowerCase().includes(buscaQ) ||
          (c.vaga?.titulo ?? '').toLowerCase().includes(buscaQ) ||
          (c.email ?? '').toLowerCase().includes(buscaQ),
      )
    : porVaga;

  return (
    <PaginaShell
      titulo="Recrutamento"
      subtitulo="Vagas e candidatos"
      acao={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <BotaoSecundario onClick={copiarLinkCarreiras}>Link de Carreiras</BotaoSecundario>
          <BotaoSecundario onClick={rodarTriagem} disabled={triando}>
            {triando ? 'Triando…' : 'Triagem IA'}
          </BotaoSecundario>
          <BotaoSecundario onClick={() => setModalVaga(true)}>+ Nova vaga</BotaoSecundario>
          <BotaoPrimario onClick={() => setModalCandidato(true)}>+ Novo candidato</BotaoPrimario>
        </div>
      }
    >
      {carregando ? (
        <EstadoCarregando />
      ) : erro ? (
        <EstadoErro mensagem={erro} onTentar={carregar} />
      ) : candidatos.length === 0 ? (
        <PainelVazio
          titulo="Nenhum candidato ainda"
          descricao="Cadastre o primeiro candidato para começar a mover o funil de recrutamento."
          acao={<BotaoPrimario onClick={() => setModalCandidato(true)}>+ Novo candidato</BotaoPrimario>}
        />
      ) : (
        <>
          <div className="brk-filtros">
            <FiltroVagas
              vagas={vagas}
              valor={filtroVaga}
              aoMudar={setFiltroVaga}
            />
            <div className="brk-search">
              <span className="brk-search-icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                className="brk-input"
                type="search"
                placeholder="Buscar candidato por nome, vaga ou e-mail…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>
          {filtroVaga !== TODAS && vagas.find((v) => v.id === filtroVaga) && (
            <EditorPerfilIdeal
              vaga={vagas.find((v) => v.id === filtroVaga)!}
              aoSalvar={carregar}
              aoErro={setErroAcao}
            />
          )}
          {erroAcao && <MensagemErro texto={erroAcao} />}
          {aviso && (
            <div
              style={{
                fontSize: 13,
                color: '#67e0a3',
                background: 'rgba(103,224,163,0.10)',
                border: '1px solid rgba(103,224,163,0.35)',
                borderRadius: 10,
                padding: '9px 12px',
                marginBottom: 10,
                wordBreak: 'break-all',
              }}
            >
              {aviso}
            </div>
          )}
          <FontesResumo />
          {visiveis.length === 0 ? (
            <PainelVazio
              titulo="Nenhum resultado"
              descricao={
                busca
                  ? `Nenhum candidato corresponde a "${busca}".`
                  : 'Nenhum candidato encontrado para os filtros ativos.'
              }
            />
          ) : (
            <Kanban
              candidatos={visiveis.map((c) => ({
                ...c,
                _match: calcularMatch(vagas.find((v) => v.id === c.vagaId), c.discResultado),
              }))}
              aoAtualizar={carregar}
              aoErroAcao={setErroAcao}
            />
          )}
        </>
      )}

      {modalCandidato && (
        <ModalNovoCandidato
          vagas={vagas}
          onFechar={() => setModalCandidato(false)}
          onCriado={() => {
            setModalCandidato(false);
            carregar();
          }}
        />
      )}

      {modalVaga && (
        <ModalNovaVaga
          onFechar={() => setModalVaga(false)}
          onCriado={() => {
            setModalVaga(false);
            carregar();
          }}
        />
      )}
    </PaginaShell>
  );
}

/* --------------------------- Filtro de vaga --------------------------- */

// Linha de filtro acima do quadro: select "Todas as vagas" + cada vaga.
function FiltroVagas({
  vagas,
  valor,
  aoMudar,
}: {
  vagas: Vaga[];
  valor: string;
  aoMudar: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)' }}>
        Filtrar por vaga
      </span>
      <select
        aria-label="Filtrar candidatos por vaga"
        value={valor}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => aoMudar(e.target.value)}
        style={{
          background: 'var(--superficie-2)',
          border: '1px solid var(--borda-forte)',
          borderRadius: 10,
          padding: '9px 12px',
          color: 'var(--texto)',
          fontSize: 13.5,
          outline: 'none',
          cursor: 'pointer',
          minWidth: 200,
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--amarelo-fagulha)';
          e.currentTarget.style.boxShadow = '0 0 0 3px var(--foco)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--borda-forte)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <option value={TODAS}>Todas as vagas</option>
        {vagas.map((v) => (
          <option key={v.id} value={v.id}>
            {v.titulo}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ------------------------------ Kanban ------------------------------ */

function Kanban({
  candidatos,
  aoAtualizar,
  aoErroAcao,
}: {
  candidatos: Candidato[];
  aoAtualizar: () => void;
  aoErroAcao: (msg: string | null) => void;
}) {
  // Agrupa os candidatos por status preservando a ordem das colunas.
  const porStatus: Record<StatusCandidato, Candidato[]> = {
    INSCRITO: [],
    TRIAGEM: [],
    ENTREVISTA: [],
    TESTE: [],
    APROVADO: [],
    REPROVADO: [],
  };
  for (const c of candidatos) {
    (porStatus[c.status] ?? porStatus.INSCRITO).push(c);
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        overflowX: 'auto',
        paddingBottom: 6,
        alignItems: 'flex-start',
      }}
    >
      {ORDEM_STATUS.map((status) => (
        <Coluna
          key={status}
          status={status}
          itens={porStatus[status]}
          aoAtualizar={aoAtualizar}
          aoErroAcao={aoErroAcao}
        />
      ))}
    </div>
  );
}

function Coluna({
  status,
  itens,
  aoAtualizar,
  aoErroAcao,
}: {
  status: StatusCandidato;
  itens: Candidato[];
  aoAtualizar: () => void;
  aoErroAcao: (msg: string | null) => void;
}) {
  const meta = STATUS_META[status];
  return (
    <div
      style={{
        flex: '0 0 auto',
        width: 240,
        background: 'var(--superficie)',
        border: '1px solid var(--borda)',
        borderRadius: 16,
        boxShadow: 'var(--sombra-card)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '100%',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '13px 14px',
          borderBottom: '1px solid var(--borda)',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: meta.cor,
            boxShadow: `0 0 6px ${meta.cor}`,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            color: 'var(--cinza-vapor)',
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {meta.rotulo}
        </span>
        <ChipContagem total={itens.length} />
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: 12,
          minHeight: 80,
        }}
      >
        {itens.length === 0 ? (
          <span style={{ fontSize: 12.5, color: 'var(--texto-fraco)', padding: '6px 2px' }}>
            Sem candidatos aqui.
          </span>
        ) : (
          itens.map((c) => (
            <CardCandidato
              key={c.id}
              candidato={c}
              aoAtualizar={aoAtualizar}
              aoErroAcao={aoErroAcao}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ChipContagem({ total }: { total: number }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--texto-suave)',
        background: 'var(--superficie-3)',
        borderRadius: 999,
        padding: '2px 8px',
        minWidth: 22,
        textAlign: 'center',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {total}
    </span>
  );
}

/* --------------------- Source of Hire (origem) --------------------- */
interface Fonte {
  origem: string;
  total: number;
  aprovados: number;
  taxaAprovacao: number;
}

// Painel compacto com a origem das candidaturas (total + taxa de aprovação por
// canal) — inspirado no Source of Hire do InHire. Degrada em silêncio se a API
// não responder (não quebra o quadro).
function FontesResumo() {
  const [fontes, setFontes] = useState<Fonte[]>([]);

  useEffect(() => {
    let ativo = true;
    api
      .get<Fonte[]>('/rh/source-of-hire')
      .then(({ data }) => {
        if (ativo) setFontes(data);
      })
      .catch(() => {
        /* silencioso — painel apenas some */
      });
    return () => {
      ativo = false;
    };
  }, []);

  if (fontes.length === 0) return null;

  return (
    <div className="brk-card brk-card-p" style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--texto-suave)', marginBottom: 8 }}>
        Origem das candidaturas (Source of Hire)
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {fontes.map((f) => (
          <div
            key={f.origem}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              padding: '8px 12px',
              borderRadius: 10,
              background: 'var(--superficie-2)',
              border: '1px solid var(--borda)',
              minWidth: 130,
            }}
          >
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--texto)' }}>{f.origem}</span>
            <span style={{ fontSize: 11.5, color: 'var(--texto-fraco)', fontVariantNumeric: 'tabular-nums' }}>
              {f.total} candidato(s) · {f.taxaAprovacao}% aprov.
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------- Card ------------------------------- */

function CardCandidato({
  candidato,
  aoAtualizar,
  aoErroAcao,
}: {
  candidato: Candidato;
  aoAtualizar: () => void;
  aoErroAcao: (msg: string | null) => void;
}) {
  // Trava as ações enquanto um PATCH deste candidato está em voo.
  const [ocupado, setOcupado] = useState(false);

  async function mover(novo: StatusCandidato) {
    if (ocupado || novo === candidato.status) return;
    setOcupado(true);
    aoErroAcao(null);
    try {
      await api.patch(`/rh/candidatos/${candidato.id}/status`, { status: novo });
      aoAtualizar();
      // Sucesso recarrega a lista por aoAtualizar (desmonta este card).
    } catch {
      aoErroAcao('Não foi possível mover o candidato. Tente novamente.');
      setOcupado(false);
    }
  }

  return (
    <div
      style={{
        background: 'var(--superficie-2)',
        border: '1px solid var(--borda)',
        borderRadius: 12,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
        opacity: ocupado ? 0.6 : 1,
        transition: 'opacity 0.15s ease',
      }}
    >
      <span
        style={{
          fontSize: 13.5,
          fontWeight: 600,
          color: 'var(--texto)',
          lineHeight: 1.3,
          minWidth: 0,
        }}
      >
        {candidato.nome}
      </span>

      {candidato.vaga?.titulo && (
        <div style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>{candidato.vaga.titulo}</div>
      )}

      {candidato.perfilDisc && <PilulaPerfil perfil={candidato.perfilDisc} />}

      {candidato._match != null && <MatchBadge match={candidato._match} />}

      {candidato.fitNivel && (
        <FitBadge nivel={candidato.fitNivel} pontuacao={candidato.fitPontuacao} justificativa={candidato.fitJustificativa} />
      )}

      {candidato.origem && (
        <span style={{ fontSize: 11, color: 'var(--texto-fraco)' }}>
          Origem: {candidato.origem}
          {candidato.indicadoPor ? ` · ${candidato.indicadoPor}` : ''}
        </span>
      )}

      {candidato.email && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--texto-suave)',
          }}
        >
          <IconeEmail />
          <span
            style={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {candidato.email}
          </span>
        </div>
      )}

      {candidato.telefone && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: 'var(--texto-suave)',
          }}
        >
          <IconeTelefone />
          <span
            style={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {candidato.telefone}
          </span>
        </div>
      )}

      <SeletorMover
        valor={candidato.status}
        desabilitado={ocupado}
        rotuloAcessivel={`Mover candidato ${candidato.nome}`}
        aoMudar={mover}
      />
    </div>
  );
}

function PilulaPerfil({ perfil }: { perfil: string }) {
  return (
    <span
      style={{
        alignSelf: 'flex-start',
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.03em',
        padding: '3px 8px',
        borderRadius: 999,
        background: 'var(--superficie-3)',
        color: 'var(--texto-suave)',
        whiteSpace: 'nowrap',
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      Perfil {perfil}
    </span>
  );
}

// Selo de Job Fit DISC: Match Score 0..100 (distância euclidiana candidato × vaga).
function MatchBadge({ match }: { match: number }) {
  const cor = match >= 80 ? '#2ecc71' : match >= 60 ? '#ff9406' : '#ff6b6b';
  const bg = match >= 80 ? 'rgba(46,204,113,0.14)' : match >= 60 ? 'rgba(255,148,6,0.14)' : 'rgba(255,107,107,0.14)';
  return (
    <span
      title="Aderência DISC do candidato ao perfil ideal da vaga"
      style={{
        alignSelf: 'flex-start', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.03em',
        padding: '3px 8px', borderRadius: 999, background: bg, color: cor, whiteSpace: 'nowrap',
      }}
    >
      Match DISC {match}%
    </span>
  );
}

// Editor do Perfil Ideal DISC da vaga (Job Fit). PATCH /rh/vagas/:id/perfil-ideal.
function EditorPerfilIdeal({
  vaga,
  aoSalvar,
  aoErro,
}: {
  vaga: Vaga;
  aoSalvar: () => void;
  aoErro: (msg: string | null) => void;
}) {
  const [d, setD] = useState<number>(vaga.reqPercD ?? 50);
  const [i, setI] = useState<number>(vaga.reqPercI ?? 50);
  const [s, setS] = useState<number>(vaga.reqPercS ?? 50);
  const [c, setC] = useState<number>(vaga.reqPercC ?? 50);
  const [salvando, setSalvando] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    setD(vaga.reqPercD ?? 50);
    setI(vaga.reqPercI ?? 50);
    setS(vaga.reqPercS ?? 50);
    setC(vaga.reqPercC ?? 50);
    setOk(false);
  }, [vaga.id, vaga.reqPercD, vaga.reqPercI, vaga.reqPercS, vaga.reqPercC]);

  const limitar = (n: number) => Math.max(0, Math.min(100, Math.round(n) || 0));

  async function salvar() {
    if (salvando) return;
    setSalvando(true);
    aoErro(null);
    try {
      await api.patch(`/rh/vagas/${vaga.id}/perfil-ideal`, {
        reqPercD: limitar(d), reqPercI: limitar(i), reqPercS: limitar(s), reqPercC: limitar(c),
      });
      setOk(true);
      aoSalvar();
    } catch {
      aoErro('Não foi possível salvar o perfil ideal da vaga.');
    } finally {
      setSalvando(false);
    }
  }

  const campoNum: React.CSSProperties = {
    width: 60, background: 'var(--superficie-2)', border: '1px solid var(--borda-forte)',
    borderRadius: 8, padding: '6px 8px', color: 'var(--texto)', fontSize: 13, outline: 'none', textAlign: 'center',
  };
  const par: [string, number, (n: number) => void][] = [
    ['D', d, setD], ['I', i, setI], ['S', s, setS], ['C', c, setC],
  ];

  return (
    <div style={{ background: 'var(--superficie)', border: '1px solid var(--borda)', borderRadius: 12, padding: 12, marginBottom: 10, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--texto-suave)' }}>Perfil ideal DISC (Job Fit):</span>
      {par.map(([rot, val, set]) => (
        <label key={rot} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--texto-suave)' }}>
          <strong>{rot}</strong>
          <input type="number" min={0} max={100} value={val} style={campoNum}
            onChange={(e) => set(limitar(Number(e.target.value)))} aria-label={`Percentil ideal ${rot}`} />
        </label>
      ))}
      <BotaoSecundario onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar perfil ideal'}</BotaoSecundario>
      {ok && <span style={{ fontSize: 12, color: '#67e0a3' }}>Salvo ✓</span>}
    </div>
  );
}

// Selo de Fit (Triagem com IA): nível + pontuação, com justificativa no title.
function FitBadge({
  nivel,
  pontuacao,
  justificativa,
}: {
  nivel: FitNivel;
  pontuacao?: number | null;
  justificativa?: string | null;
}) {
  const meta = FIT_META[nivel];
  return (
    <span
      title={justificativa ?? undefined}
      style={{
        alignSelf: 'flex-start',
        fontSize: 10.5,
        fontWeight: 700,
        letterSpacing: '0.03em',
        padding: '3px 8px',
        borderRadius: 999,
        background: meta.bg,
        color: meta.cor,
        border: `1px solid ${meta.cor}`,
        whiteSpace: 'nowrap',
        cursor: justificativa ? 'help' : 'default',
      }}
    >
      {meta.rotulo}
      {pontuacao != null ? ` · ${pontuacao}` : ''}
    </span>
  );
}

// Seletor compacto "mover" — troca o status do candidato direto no card.
function SeletorMover({
  valor,
  desabilitado,
  rotuloAcessivel,
  aoMudar,
}: {
  valor: StatusCandidato;
  desabilitado: boolean;
  rotuloAcessivel: string;
  aoMudar: (novo: StatusCandidato) => void;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--texto-fraco)' }}>Mover</span>
      <select
        aria-label={rotuloAcessivel}
        value={valor}
        disabled={desabilitado}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => aoMudar(e.target.value as StatusCandidato)}
        style={{
          background: 'var(--superficie-3)',
          border: '1px solid var(--borda-forte)',
          borderRadius: 8,
          padding: '6px 8px',
          color: 'var(--texto)',
          fontSize: 12.5,
          outline: 'none',
          cursor: desabilitado ? 'wait' : 'pointer',
          opacity: desabilitado ? 0.7 : 1,
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--amarelo-fagulha)';
          e.currentTarget.style.boxShadow = '0 0 0 3px var(--foco)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--borda-forte)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {ORDEM_STATUS.map((s) => (
          <option key={s} value={s}>
            {STATUS_META[s].rotulo}
          </option>
        ))}
      </select>
    </label>
  );
}

// Ícone de traço (envelope) para o e-mail — sem emoji.
function IconeEmail(): ReactNode {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0, color: 'var(--texto-fraco)' }}
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  );
}

// Ícone de traço (telefone) — sem emoji.
function IconeTelefone(): ReactNode {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0, color: 'var(--texto-fraco)' }}
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

/* ----------------------- Modal novo candidato ----------------------- */

function ModalNovoCandidato({
  vagas,
  onFechar,
  onCriado,
}: {
  vagas: Vaga[];
  onFechar: () => void;
  onCriado: () => void;
}) {
  const [vagaId, setVagaId] = useState(vagas[0]?.id ?? '');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [origem, setOrigem] = useState('Manual');
  const [indicadoPor, setIndicadoPor] = useState('');

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const semVagas = vagas.length === 0;
  const valido = nome.trim().length >= 2 && vagaId !== '';

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      await api.post('/rh/candidatos', {
        vagaId,
        nome: nome.trim(),
        email: email.trim() || undefined,
        telefone: telefone.trim() || undefined,
        origem: origem || undefined,
        indicadoPor: origem === 'Indicação' ? indicadoPor.trim() || undefined : undefined,
      });
      onCriado();
    } catch {
      setErro('Falha ao cadastrar o candidato. Verifique os dados e tente de novo.');
      setSalvando(false);
    }
  }

  return (
    <Overlay onFechar={onFechar}>
      <form
        onSubmit={enviar}
        className="brk-gradient-border"
        style={{
          width: 'min(460px, 92vw)',
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
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Novo candidato</h2>
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)', marginTop: 2 }}>
            O candidato entra no funil em Inscrito, vinculado à vaga escolhida.
          </p>
        </div>

        {semVagas ? (
          <MensagemErro texto="Cadastre uma vaga antes de adicionar candidatos." />
        ) : (
          <CampoSelect rotulo="Vaga" obrigatorio valor={vagaId} aoMudar={setVagaId}>
            {vagas.map((v) => (
              <option key={v.id} value={v.id}>
                {v.titulo}
              </option>
            ))}
          </CampoSelect>
        )}

        <Campo
          rotulo="Nome"
          obrigatorio
          valor={nome}
          aoMudar={setNome}
          placeholder="Ex.: Maria Souza"
          autoFocus
        />
        <Campo
          rotulo="E-mail"
          valor={email}
          aoMudar={setEmail}
          placeholder="contato@email.com (opcional)"
        />
        <Campo
          rotulo="Telefone"
          valor={telefone}
          aoMudar={setTelefone}
          placeholder="(00) 00000-0000 (opcional)"
        />

        <CampoSelect rotulo="Origem" valor={origem} aoMudar={setOrigem}>
          <option value="Manual">Manual</option>
          <option value="Indicação">Indicação</option>
          <option value="LinkedIn">LinkedIn</option>
          <option value="Portal">Portal de vagas</option>
          <option value="Página de Carreiras">Página de Carreiras</option>
        </CampoSelect>

        {origem === 'Indicação' && (
          <Campo
            rotulo="Indicado por"
            valor={indicadoPor}
            aoMudar={setIndicadoPor}
            placeholder="E-mail/nome de quem indicou (opcional)"
          />
        )}

        {erro && <MensagemErro texto={erro} />}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <BotaoSecundario onClick={onFechar} disabled={salvando}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={!valido || salvando}>
            {salvando ? 'Salvando…' : 'Criar candidato'}
          </BotaoPrimario>
        </div>
      </form>
    </Overlay>
  );
}

/* ------------------------- Modal nova vaga ------------------------- */

function ModalNovaVaga({
  onFechar,
  onCriado,
}: {
  onFechar: () => void;
  onCriado: () => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [departamento, setDepartamento] = useState('');

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const valido = titulo.trim().length >= 2;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      await api.post('/rh/vagas', {
        titulo: titulo.trim(),
        departamento: departamento.trim() || undefined,
      });
      onCriado();
    } catch {
      setErro('Falha ao cadastrar a vaga. Verifique os dados e tente de novo.');
      setSalvando(false);
    }
  }

  return (
    <Overlay onFechar={onFechar}>
      <form
        onSubmit={enviar}
        className="brk-gradient-border"
        style={{
          width: 'min(460px, 92vw)',
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
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Nova vaga</h2>
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)', marginTop: 2 }}>
            A vaga é aberta automaticamente e fica disponível para receber candidatos.
          </p>
        </div>

        <Campo
          rotulo="Título"
          obrigatorio
          valor={titulo}
          aoMudar={setTitulo}
          placeholder="Ex.: Analista de marketing"
          autoFocus
        />
        <Campo
          rotulo="Departamento"
          valor={departamento}
          aoMudar={setDepartamento}
          placeholder="Ex.: Mídia paga (opcional)"
        />

        {erro && <MensagemErro texto={erro} />}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <BotaoSecundario onClick={onFechar} disabled={salvando}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={!valido || salvando}>
            {salvando ? 'Salvando…' : 'Criar vaga'}
          </BotaoPrimario>
        </div>
      </form>
    </Overlay>
  );
}

/* --------------------------- Helper local --------------------------- */

/**
 * Select estilizado como o `Campo` de Clientes.tsx (que só cobre texto).
 * Superfície --superficie-2, borda --borda-forte, raio 10 e anel de foco
 * com --amarelo-fagulha. Aceita as <option> como children.
 */
function CampoSelect({
  rotulo,
  valor,
  aoMudar,
  children,
  obrigatorio,
  desabilitado,
}: {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  children: ReactNode;
  obrigatorio?: boolean;
  desabilitado?: boolean;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)' }}>
        {rotulo}
        {obrigatorio && <span style={{ color: 'var(--amarelo-fagulha)' }}> *</span>}
      </span>
      <select
        aria-label={rotulo}
        value={valor}
        disabled={desabilitado}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => aoMudar(e.target.value)}
        style={{
          background: 'var(--superficie-2)',
          border: '1px solid var(--borda-forte)',
          borderRadius: 10,
          padding: '11px 13px',
          color: 'var(--texto)',
          fontSize: 14,
          outline: 'none',
          cursor: desabilitado ? 'not-allowed' : 'pointer',
          opacity: desabilitado ? 0.6 : 1,
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--amarelo-fagulha)';
          e.currentTarget.style.boxShadow = '0 0 0 3px var(--foco)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--borda-forte)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {children}
      </select>
    </label>
  );
}
