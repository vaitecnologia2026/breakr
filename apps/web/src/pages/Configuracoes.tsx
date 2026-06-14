import { useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import {
  PaginaShell,
  BotaoPrimario,
  BotaoSecundario,
  Campo,
  MensagemErro,
  EstadoCarregando,
  EstadoErro,
} from './Clientes';

/**
 * Tela de Configurações — Integrações de IA (Fase 1).
 * Um admin cola as chaves de API dos 3 provedores de LLM (OpenAI, Anthropic,
 * Google), escolhe o provedor ativo, liga/desliga a IA do sistema e testa a
 * conexão. As chaves NUNCA voltam por inteiro: a API só devolve `temChave` e um
 * `preview` mascarado. Trata loading / erro de carga / erro e sucesso por ação.
 *
 * Contrato (API):
 *  GET   /config/ia        → ConfigIa
 *  PATCH /config/ia        body parcial → ConfigIa
 *                          (chave ""  limpa; chave omitida não muda; chave preenchida define)
 *  POST  /config/ia/testar → { ok, mensagem }
 */

type ProvedorIa = 'OPENAI' | 'ANTHROPIC' | 'GEMINI';

interface ProvedorInfo {
  temChave: boolean;
  preview: string | null;
  modelo: string | null;
}

interface ConfigIa {
  ativo: boolean;
  provedorAtivo: ProvedorIa;
  provedores: {
    openai: ProvedorInfo;
    anthropic: ProvedorInfo;
    gemini: ProvedorInfo;
  };
}

interface RespostaTeste {
  ok: boolean;
  mensagem: string;
}

// Corpo do PATCH: tudo opcional, montado só com o que mudou.
interface PatchConfigIa {
  ativo?: boolean;
  provedorAtivo?: ProvedorIa;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  geminiApiKey?: string;
  modeloOpenai?: string;
  modeloAnthropic?: string;
  modeloGemini?: string;
}

// Chave do provedor dentro de `config.provedores` (objeto enviado pela API).
type ChaveProvedor = 'openai' | 'anthropic' | 'gemini';

// Metadados estáticos de cada card, na ordem de exibição pedida.
interface MetaProvedor {
  id: ProvedorIa;
  chave: ChaveProvedor;
  nome: string;
  placeholderModelo: string;
  // Campos do corpo do PATCH para este provedor.
  campoChave: 'openaiApiKey' | 'anthropicApiKey' | 'geminiApiKey';
  campoModelo: 'modeloOpenai' | 'modeloAnthropic' | 'modeloGemini';
}

const PROVEDORES: MetaProvedor[] = [
  {
    id: 'OPENAI',
    chave: 'openai',
    nome: 'ChatGPT — OpenAI',
    placeholderModelo: 'gpt-4o-mini',
    campoChave: 'openaiApiKey',
    campoModelo: 'modeloOpenai',
  },
  {
    id: 'ANTHROPIC',
    chave: 'anthropic',
    nome: 'Claude — Anthropic',
    placeholderModelo: 'claude-3-5-sonnet-latest',
    campoChave: 'anthropicApiKey',
    campoModelo: 'modeloAnthropic',
  },
  {
    id: 'GEMINI',
    chave: 'gemini',
    nome: 'Gemini — Google',
    placeholderModelo: 'gemini-1.5-flash',
    campoChave: 'geminiApiKey',
    campoModelo: 'modeloGemini',
  },
];

// Estado editável por provedor mantido localmente até o Salvar.
interface RascunhoProvedor {
  // Chave digitada agora (string vazia = nada digitado). Só vai no PATCH se preenchida.
  chaveDigitada: string;
  // Armado para limpar: envia "" no PATCH para apagar a chave já salva.
  limpar: boolean;
  // Modelo no input (pré-preenchido com o atual; "" usa o default do backend).
  modelo: string;
}

function rascunhoVazio(): RascunhoProvedor {
  return { chaveDigitada: '', limpar: false, modelo: '' };
}

type Rascunhos = Record<ChaveProvedor, RascunhoProvedor>;

function rascunhosDeConfig(config: ConfigIa): Rascunhos {
  return {
    openai: { ...rascunhoVazio(), modelo: config.provedores.openai.modelo ?? '' },
    anthropic: { ...rascunhoVazio(), modelo: config.provedores.anthropic.modelo ?? '' },
    gemini: { ...rascunhoVazio(), modelo: config.provedores.gemini.modelo ?? '' },
  };
}

export function Configuracoes() {
  const [config, setConfig] = useState<ConfigIa | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);

  // Estado editável (espelha o config carregado e acumula as mudanças pendentes).
  const [ativo, setAtivo] = useState(false);
  const [provedorAtivo, setProvedorAtivo] = useState<ProvedorIa>('OPENAI');
  const [rascunhos, setRascunhos] = useState<Rascunhos>(rascunhosDeConfig({
    ativo: false,
    provedorAtivo: 'OPENAI',
    provedores: {
      openai: { temChave: false, preview: null, modelo: null },
      anthropic: { temChave: false, preview: null, modelo: null },
      gemini: { temChave: false, preview: null, modelo: null },
    },
  }));

  // Estados de ação (salvar / testar), mostrados inline acima dos cards.
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [resultadoTeste, setResultadoTeste] = useState<RespostaTeste | null>(null);

  // Aplica um ConfigIa recém-carregado a todo o estado editável.
  function aplicarConfig(novo: ConfigIa) {
    setConfig(novo);
    setAtivo(novo.ativo);
    setProvedorAtivo(novo.provedorAtivo);
    setRascunhos(rascunhosDeConfig(novo));
  }

  async function carregar() {
    setCarregando(true);
    setErroCarga(null);
    try {
      const { data } = await api.get<ConfigIa>('/config/ia');
      aplicarConfig(data);
    } catch {
      setErroCarga('Não foi possível carregar as configurações de IA. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function atualizarRascunho(chave: ChaveProvedor, parcial: Partial<RascunhoProvedor>) {
    setRascunhos((atual) => ({ ...atual, [chave]: { ...atual[chave], ...parcial } }));
    // Qualquer edição invalida o feedback transitório anterior.
    setSucesso(null);
    setErroAcao(null);
  }

  // Monta o corpo do PATCH só com o que mudou frente ao config carregado.
  function montarCorpo(base: ConfigIa): PatchConfigIa {
    const corpo: PatchConfigIa = {};

    if (ativo !== base.ativo) corpo.ativo = ativo;
    if (provedorAtivo !== base.provedorAtivo) corpo.provedorAtivo = provedorAtivo;

    for (const meta of PROVEDORES) {
      const r = rascunhos[meta.chave];
      const info = base.provedores[meta.chave];

      // Chave: digitada (não vazia) define; armada para limpar envia "".
      const digitada = r.chaveDigitada.trim();
      if (digitada) {
        corpo[meta.campoChave] = digitada;
      } else if (r.limpar && info.temChave) {
        corpo[meta.campoChave] = '';
      }

      // Modelo: envia quando o texto difere do salvo (tratando null como "").
      const modeloAtual = info.modelo ?? '';
      if (r.modelo.trim() !== modeloAtual.trim()) {
        corpo[meta.campoModelo] = r.modelo.trim();
      }
    }

    return corpo;
  }

  const corpoPendente = config ? montarCorpo(config) : {};
  const temMudancas = Object.keys(corpoPendente).length > 0;

  async function salvar() {
    if (!config || salvando || !temMudancas) return;
    setSalvando(true);
    setErroAcao(null);
    setSucesso(null);
    setResultadoTeste(null);
    try {
      const { data } = await api.patch<ConfigIa>('/config/ia', corpoPendente);
      aplicarConfig(data); // recarrega do retorno e limpa as chaves digitadas
      setSucesso('Configurações salvas');
    } catch {
      setErroAcao('Não foi possível salvar as configurações. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  async function testar() {
    if (testando) return;
    setTestando(true);
    setErroAcao(null);
    setSucesso(null);
    setResultadoTeste(null);
    try {
      const { data } = await api.post<RespostaTeste>('/config/ia/testar');
      setResultadoTeste(data);
    } catch {
      setResultadoTeste({
        ok: false,
        mensagem: 'Não foi possível testar a conexão agora. Tente novamente.',
      });
    } finally {
      setTestando(false);
    }
  }

  return (
    <PaginaShell
      titulo="Configurações"
      subtitulo="Integrações de IA do sistema"
      acao={
        <BotaoPrimario onClick={salvar} disabled={salvando || carregando || !temMudancas}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </BotaoPrimario>
      }
    >
      <p style={{ fontSize: 12.5, color: 'var(--texto-fraco)', maxWidth: 620, marginTop: -8 }}>
        As chaves ficam guardadas no sistema e nunca são exibidas de volta — só um trecho
        mascarado.
      </p>

      {carregando ? (
        <EstadoCarregando />
      ) : erroCarga ? (
        <EstadoErro mensagem={erroCarga} onTentar={carregar} />
      ) : config ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Linha de topo: toggle "IA ativa" + testar conexão + feedback. */}
          <BarraTopo
            ativo={ativo}
            aoAlternar={(v) => {
              setAtivo(v);
              setSucesso(null);
              setErroAcao(null);
            }}
            testando={testando}
            aoTestar={testar}
            resultadoTeste={resultadoTeste}
          />

          {erroAcao && <MensagemErro texto={erroAcao} />}
          {sucesso && <LinhaSucesso texto={sucesso} />}

          {/* Três cards de provedor. */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {PROVEDORES.map((meta) => (
              <CardProvedor
                key={meta.id}
                meta={meta}
                info={config.provedores[meta.chave]}
                rascunho={rascunhos[meta.chave]}
                ehAtivo={provedorAtivo === meta.id}
                aoUsarEste={() => {
                  setProvedorAtivo(meta.id);
                  setSucesso(null);
                  setErroAcao(null);
                }}
                aoMudar={(parcial) => atualizarRascunho(meta.chave, parcial)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </PaginaShell>
  );
}

/* ----------------------------- Barra de topo ----------------------------- */

function BarraTopo({
  ativo,
  aoAlternar,
  testando,
  aoTestar,
  resultadoTeste,
}: {
  ativo: boolean;
  aoAlternar: (v: boolean) => void;
  testando: boolean;
  aoTestar: () => void;
  resultadoTeste: RespostaTeste | null;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        background: 'var(--superficie)',
        border: '1px solid var(--borda)',
        borderRadius: 16,
        padding: '16px 18px',
        boxShadow: 'var(--sombra-card)',
      }}
    >
      <Interruptor ativo={ativo} aoAlternar={aoAlternar} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        {resultadoTeste && (
          <MensagemTeste ok={resultadoTeste.ok} mensagem={resultadoTeste.mensagem} />
        )}
        <BotaoSecundario onClick={aoTestar} disabled={testando}>
          {testando ? 'Testando…' : 'Testar conexão'}
        </BotaoSecundario>
      </div>
    </div>
  );
}

// Interruptor acessível "IA ativa" (botão com role=switch + trilho/alça animados).
function Interruptor({
  ativo,
  aoAlternar,
}: {
  ativo: boolean;
  aoAlternar: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ativo}
      aria-label="IA ativa"
      onClick={() => aoAlternar(!ativo)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'relative',
          width: 46,
          height: 26,
          flexShrink: 0,
          borderRadius: 999,
          background: ativo ? 'var(--laranja-brasa)' : 'var(--superficie-3)',
          border: `1px solid ${ativo ? 'var(--laranja-brasa)' : 'var(--borda-forte)'}`,
          boxShadow: ativo ? '0 0 0 3px var(--foco)' : 'none',
          transition: 'background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: ativo ? 22 : 2,
            width: 20,
            height: 20,
            borderRadius: 999,
            background: '#fff',
            transition: 'left 0.18s ease',
          }}
        />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--cinza-vapor)' }}>
          IA ativa
        </span>
        <span style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>
          {ativo ? 'A IA está ligada para o sistema' : 'A IA está desligada'}
        </span>
      </span>
    </button>
  );
}

// Mensagem inline do teste de conexão: verde se ok, vermelha se não.
function MensagemTeste({ ok, mensagem }: { ok: boolean; mensagem: string }) {
  const cor = ok ? '#67e0a3' : '#e2738a';
  return (
    <span
      role="status"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 13,
        fontWeight: 600,
        color: cor,
        maxWidth: 360,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          flexShrink: 0,
          borderRadius: 999,
          background: cor,
          boxShadow: `0 0 6px ${cor}`,
        }}
      />
      {mensagem}
    </span>
  );
}

/* ----------------------------- Card de provedor ----------------------------- */

function CardProvedor({
  meta,
  info,
  rascunho,
  ehAtivo,
  aoUsarEste,
  aoMudar,
}: {
  meta: MetaProvedor;
  info: ProvedorInfo;
  rascunho: RascunhoProvedor;
  ehAtivo: boolean;
  aoUsarEste: () => void;
  aoMudar: (parcial: Partial<RascunhoProvedor>) => void;
}) {
  const idChave = `chave-${meta.chave}`;
  // Quando a chave digitada está armada para limpar, o texto some até o save.
  const placeholderChave = info.temChave
    ? 'Cole para substituir a chave'
    : 'Cole a chave da API';

  return (
    <div
      className={ehAtivo ? 'brk-gradient-border' : undefined}
      style={{
        background: 'var(--superficie)',
        border: ehAtivo ? undefined : '1px solid var(--borda)',
        borderRadius: 16,
        padding: 18,
        boxShadow: 'var(--sombra-card)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {/* Cabeçalho: nome + badge "Ativo" + botão "Usar este". */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--cinza-vapor)' }}>
            {meta.nome}
          </h2>
          {ehAtivo && <BadgeAtivo />}
        </div>
        {ehAtivo ? (
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--texto-fraco)' }}>
            Provedor em uso
          </span>
        ) : (
          <BotaoSecundario onClick={aoUsarEste}>Usar este</BotaoSecundario>
        )}
      </div>

      {/* Status da chave salva. */}
      <LinhaStatusChave info={info} />

      {/* Input de chave (password). */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <CampoSenha
          id={idChave}
          rotulo="Chave da API"
          valor={rascunho.chaveDigitada}
          aoMudar={(v) => aoMudar({ chaveDigitada: v, limpar: v.trim() ? false : rascunho.limpar })}
          placeholder={placeholderChave}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 11.5, color: 'var(--texto-fraco)' }}>
            A chave nunca é exibida de volta.
          </span>
          {info.temChave && !rascunho.chaveDigitada.trim() && (
            <button
              type="button"
              onClick={() => aoMudar({ limpar: !rascunho.limpar })}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                color: rascunho.limpar ? '#e2738a' : 'var(--amarelo-fagulha)',
              }}
            >
              {rascunho.limpar ? 'Cancelar remoção' : 'Limpar chave'}
            </button>
          )}
        </div>
        {rascunho.limpar && !rascunho.chaveDigitada.trim() && (
          <span style={{ fontSize: 11.5, color: '#e2738a' }}>(será removida ao salvar)</span>
        )}
      </div>

      {/* Modelo. */}
      <Campo
        rotulo="Modelo"
        valor={rascunho.modelo}
        aoMudar={(v) => aoMudar({ modelo: v })}
        placeholder={meta.placeholderModelo}
      />
    </div>
  );
}

function BadgeAtivo() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        padding: '3px 9px',
        borderRadius: 999,
        background: 'rgba(255, 148, 6, 0.16)',
        color: '#ffb44d',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: 'var(--amarelo-fagulha)',
          boxShadow: '0 0 6px var(--amarelo-fagulha)',
        }}
      />
      Ativo
    </span>
  );
}

function LinhaStatusChave({ info }: { info: ProvedorInfo }) {
  if (!info.temChave) {
    return (
      <span style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Sem chave</span>
    );
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 13,
        color: 'var(--texto-suave)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          flexShrink: 0,
          borderRadius: 999,
          background: '#2ecc71',
          boxShadow: '0 0 6px #2ecc71',
        }}
      />
      Chave salva
      {info.preview && (
        <code
          style={{
            fontSize: 12.5,
            color: 'var(--texto-suave)',
            background: 'var(--superficie-3)',
            padding: '2px 8px',
            borderRadius: 6,
          }}
        >
          {info.preview}
        </code>
      )}
    </span>
  );
}

/* ----------------------------- Primitivos locais ----------------------------- */

// Espelha o Campo de Clientes, mas com type=password e autoComplete=off.
function CampoSenha({
  id,
  rotulo,
  valor,
  aoMudar,
  placeholder,
}: {
  id: string;
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  placeholder?: string;
}): ReactNode {
  return (
    <label htmlFor={id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)' }}>
        {rotulo}
      </span>
      <input
        id={id}
        type="password"
        autoComplete="off"
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        placeholder={placeholder}
        style={{
          background: 'var(--superficie-2)',
          border: '1px solid var(--borda-forte)',
          borderRadius: 10,
          padding: '11px 13px',
          color: 'var(--texto)',
          fontSize: 14,
          outline: 'none',
          fontFamily: 'inherit',
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
      />
    </label>
  );
}

// Linha de sucesso transitória (verde), reaproveitando o tom de erro inline.
function LinhaSucesso({ texto }: { texto: string }): ReactNode {
  return (
    <div
      role="status"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 13,
        fontWeight: 600,
        color: '#67e0a3',
        background: 'rgba(46, 204, 113, 0.12)',
        border: '1px solid rgba(46, 204, 113, 0.4)',
        borderRadius: 10,
        padding: '10px 12px',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          flexShrink: 0,
          borderRadius: 999,
          background: '#2ecc71',
          boxShadow: '0 0 6px #2ecc71',
        }}
      />
      {texto}
    </div>
  );
}
