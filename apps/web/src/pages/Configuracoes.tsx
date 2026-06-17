import { useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import {
  PaginaHeader, Btn, Campo, Tabs, Switch, Card,
  Carregando, ErroEstado, Alerta, Badge,
} from '../components/ui';

/* ── Tipos ── */
type ProvedorIa = 'OPENAI' | 'ANTHROPIC' | 'GEMINI';
interface ProvedorInfo { temChave: boolean; preview: string | null; modelo: string | null }
interface ConfigIa {
  ativo: boolean; provedorAtivo: ProvedorIa;
  provedores: { openai: ProvedorInfo; anthropic: ProvedorInfo; gemini: ProvedorInfo };
}
interface ConfigIntegracoes {
  asaas: { temChave: boolean; preview: string | null; sandbox: boolean };
  speed: { temChave: boolean; preview: string | null };
  autentique: { temChave: boolean; preview: string | null };
  whatsapp: { temToken: boolean; preview: string | null; instancia: string | null };
}

/* ── Aba IA ── */
function AbaIA() {
  const [config, setConfig] = useState<ConfigIa | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [ativo, setAtivo] = useState(false);
  const [provedorAtivo, setProvedorAtivo] = useState<ProvedorIa>('OPENAI');
  const [rascunhos, setRascunhos] = useState<Record<string, { chave: string; modelo: string; limpar: boolean }>>({
    openai: { chave: '', modelo: '', limpar: false },
    anthropic: { chave: '', modelo: '', limpar: false },
    gemini: { chave: '', modelo: '', limpar: false },
  });
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro' | 'info'; msg: string } | null>(null);

  async function carregar() {
    setCarregando(true); setErroCarga(null);
    try {
      const { data } = await api.get<ConfigIa>('/config/ia');
      setConfig(data); setAtivo(data.ativo); setProvedorAtivo(data.provedorAtivo);
      setRascunhos({
        openai: { chave: '', modelo: data.provedores.openai.modelo ?? '', limpar: false },
        anthropic: { chave: '', modelo: data.provedores.anthropic.modelo ?? '', limpar: false },
        gemini: { chave: '', modelo: data.provedores.gemini.modelo ?? '', limpar: false },
      });
    } catch { setErroCarga('Erro ao carregar configurações.'); }
    finally { setCarregando(false); }
  }
  useEffect(() => { carregar(); }, []);

  async function salvar() {
    if (!config || salvando) return;
    setSalvando(true); setFeedback(null);
    try {
      const corpo: Record<string, unknown> = {};
      if (ativo !== config.ativo) corpo.ativo = ativo;
      if (provedorAtivo !== config.provedorAtivo) corpo.provedorAtivo = provedorAtivo;
      for (const [chave, r] of Object.entries(rascunhos)) {
        const mapa: Record<string, string> = { openai: 'openaiApiKey', anthropic: 'anthropicApiKey', gemini: 'geminiApiKey' };
        const mapaM: Record<string, string> = { openai: 'modeloOpenai', anthropic: 'modeloAnthropic', gemini: 'modeloGemini' };
        if (r.chave.trim()) corpo[mapa[chave]] = r.chave.trim();
        else if (r.limpar) corpo[mapa[chave]] = '';
        const info = config.provedores[chave as keyof typeof config.provedores];
        if (r.modelo.trim() !== (info.modelo ?? '').trim()) corpo[mapaM[chave]] = r.modelo.trim();
      }
      const { data } = await api.patch<ConfigIa>('/config/ia', corpo);
      setConfig(data);
      setFeedback({ tipo: 'sucesso', msg: 'Configurações de IA salvas.' });
    } catch { setFeedback({ tipo: 'erro', msg: 'Erro ao salvar. Tente novamente.' }); }
    finally { setSalvando(false); }
  }

  async function testar() {
    if (testando) return;
    setTestando(true); setFeedback(null);
    try {
      const { data } = await api.post<{ ok: boolean; mensagem: string }>('/config/ia/testar');
      setFeedback({ tipo: data.ok ? 'sucesso' : 'erro', msg: data.mensagem });
    } catch { setFeedback({ tipo: 'erro', msg: 'Não foi possível testar agora.' }); }
    finally { setTestando(false); }
  }

  if (carregando) return <Carregando />;
  if (erroCarga) return <ErroEstado mensagem={erroCarga} onTentar={carregar} />;
  if (!config) return null;

  const PROVEDORES = [
    { id: 'OPENAI' as ProvedorIa, chave: 'openai', nome: 'ChatGPT — OpenAI', placeholder: 'sk-…', placeholderModelo: 'gpt-4o-mini' },
    { id: 'ANTHROPIC' as ProvedorIa, chave: 'anthropic', nome: 'Claude — Anthropic', placeholder: 'sk-ant-…', placeholderModelo: 'claude-3-5-sonnet-latest' },
    { id: 'GEMINI' as ProvedorIa, chave: 'gemini', nome: 'Gemini — Google', placeholder: 'AIza…', placeholderModelo: 'gemini-1.5-flash' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <Switch ativo={ativo} aoAlternar={setAtivo} rotulo="IA ativa no sistema" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Btn variante="secondary" onClick={testar} disabled={testando}>
              {testando ? 'Testando…' : 'Testar conexão'}
            </Btn>
            <Btn onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</Btn>
          </div>
        </div>
      </Card>

      {feedback && <Alerta tipo={feedback.tipo}>{feedback.msg}</Alerta>}

      {PROVEDORES.map((p) => {
        const info = config.provedores[p.chave as keyof typeof config.provedores];
        const r = rascunhos[p.chave];
        const ehAtivo = provedorAtivo === p.id;
        return (
          <div
            key={p.id}
            className={ehAtivo ? 'brk-card brk-card-p brk-gradient-border' : 'brk-card brk-card-p'}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>{p.nome}</h3>
                {ehAtivo && <Badge cor="amarelo">Em uso</Badge>}
                {info.temChave && !ehAtivo && <Badge cor="verde">Configurado</Badge>}
              </div>
              {!ehAtivo && (
                <Btn variante="secondary" tamanho="sm" onClick={() => setProvedorAtivo(p.id)}>
                  Usar este
                </Btn>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>
                  {info.temChave ? 'Chave salva:' : 'Sem chave'}
                </span>
                {info.preview && (
                  <code style={{ fontSize: 12, background: 'var(--superficie-3)', padding: '2px 8px', borderRadius: 'var(--r-sm)', color: 'var(--texto-suave)' }}>
                    {info.preview}
                  </code>
                )}
              </div>
              <Campo
                rotulo="Chave da API"
                type="password"
                autoComplete="off"
                placeholder={info.temChave ? 'Cole para substituir' : p.placeholder}
                value={r.chave}
                onChange={(e) => setRascunhos((prev) => ({ ...prev, [p.chave]: { ...prev[p.chave], chave: e.target.value } }))}
              />
              <Campo
                rotulo="Modelo"
                placeholder={p.placeholderModelo}
                value={r.modelo}
                onChange={(e) => setRascunhos((prev) => ({ ...prev, [p.chave]: { ...prev[p.chave], modelo: e.target.value } }))}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Aba Integrações ── */
function AbaIntegracoes() {
  const [config, setConfig] = useState<ConfigIntegracoes | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [form, setForm] = useState({
    asaasApiKey: '', asaasSandbox: false,
    speedApiKey: '', autentiqueToken: '',
    whatsappToken: '', whatsappInstancia: '',
  });
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  async function carregar() {
    setCarregando(true); setErroCarga(null);
    try {
      const { data } = await api.get<ConfigIntegracoes>('/config/integracoes');
      setConfig(data);
      setForm({ asaasApiKey: '', asaasSandbox: data.asaas.sandbox, speedApiKey: '', autentiqueToken: '', whatsappToken: '', whatsappInstancia: data.whatsapp.instancia ?? '' });
    } catch { setErroCarga('Erro ao carregar integrações.'); }
    finally { setCarregando(false); }
  }
  useEffect(() => { carregar(); }, []);

  async function salvar() {
    setSalvando(true); setFeedback(null);
    try {
      await api.patch('/config/integracoes', {
        ...(form.asaasApiKey && { asaasApiKey: form.asaasApiKey }),
        asaasSandbox: form.asaasSandbox,
        ...(form.speedApiKey && { speedApiKey: form.speedApiKey }),
        ...(form.autentiqueToken && { autentiqueToken: form.autentiqueToken }),
        ...(form.whatsappToken && { whatsappToken: form.whatsappToken }),
        ...(form.whatsappInstancia && { whatsappInstancia: form.whatsappInstancia }),
      });
      await carregar();
      setFeedback({ tipo: 'sucesso', msg: 'Integrações salvas com sucesso.' });
    } catch { setFeedback({ tipo: 'erro', msg: 'Erro ao salvar integrações.' }); }
    finally { setSalvando(false); }
  }

  if (carregando) return <Carregando />;
  if (erroCarga) return <ErroEstado mensagem={erroCarga} onTentar={carregar} />;

  const INTEGRACOES: { chave: keyof ConfigIntegracoes; nome: string; descricao: string; campos: ReactNode }[] = [
    {
      chave: 'asaas',
      nome: 'Asaas — Cobranças',
      descricao: 'Geração de boletos, PIX e cartão. Chave na aba "Financeiro" do Asaas.',
      campos: (
        <>
          <Campo
            rotulo="Chave da API Asaas"
            type="password" autoComplete="off"
            placeholder={config?.asaas.temChave ? 'Cole para substituir' : '$aact_…'}
            value={form.asaasApiKey}
            onChange={(e) => setForm((f) => ({ ...f, asaasApiKey: e.target.value }))}
          />
          <Switch
            ativo={form.asaasSandbox}
            aoAlternar={(v) => setForm((f) => ({ ...f, asaasSandbox: v }))}
            rotulo="Modo Sandbox (testes)"
          />
        </>
      ),
    },
    {
      chave: 'speed',
      nome: 'Speed — Nota Fiscal',
      descricao: 'Emissão de NFS-e. Credenciais disponíveis no painel Speed.',
      campos: (
        <Campo
          rotulo="Chave da API Speed"
          type="password" autoComplete="off"
          placeholder={config?.speed.temChave ? 'Cole para substituir' : 'API key da Speed…'}
          value={form.speedApiKey}
          onChange={(e) => setForm((f) => ({ ...f, speedApiKey: e.target.value }))}
        />
      ),
    },
    {
      chave: 'autentique',
      nome: 'Autentique — Assinatura Digital',
      descricao: 'Envio de contratos para assinatura eletrônica. Token na aba API do Autentique.',
      campos: (
        <Campo
          rotulo="Token da API Autentique"
          type="password" autoComplete="off"
          placeholder={config?.autentique.temChave ? 'Cole para substituir' : 'Token GraphQL…'}
          value={form.autentiqueToken}
          onChange={(e) => setForm((f) => ({ ...f, autentiqueToken: e.target.value }))}
        />
      ),
    },
    {
      chave: 'whatsapp',
      nome: 'WhatsApp — MegaAPI',
      descricao: 'Mensagens automáticas para clientes via MegaAPI. Configure a instância conectada.',
      campos: (
        <>
          <Campo
            rotulo="Token MegaAPI"
            type="password" autoComplete="off"
            placeholder={config?.whatsapp.temToken ? 'Cole para substituir' : 'Token da instância…'}
            value={form.whatsappToken}
            onChange={(e) => setForm((f) => ({ ...f, whatsappToken: e.target.value }))}
          />
          <Campo
            rotulo="Nome da instância"
            placeholder="Ex: breakr-main"
            value={form.whatsappInstancia}
            onChange={(e) => setForm((f) => ({ ...f, whatsappInstancia: e.target.value }))}
          />
        </>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 13, color: 'var(--texto-fraco)', marginBottom: 4 }}>
        As chaves ficam guardadas criptografadas e nunca são exibidas por completo.
        Deixe o campo em branco para manter a chave atual.
      </p>

      {feedback && <Alerta tipo={feedback.tipo}>{feedback.msg}</Alerta>}

      {INTEGRACOES.map(({ chave, nome, descricao, campos }) => {
        const status = config?.[chave];
        const conectado = ('temChave' in (status ?? {}) ? (status as { temChave: boolean }).temChave : false)
          || ('temToken' in (status ?? {}) ? (status as { temToken: boolean }).temToken : false);
        const preview = ('preview' in (status ?? {}) ? (status as { preview: string | null }).preview : null);
        return (
          <div key={chave} className="brk-card brk-card-p">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h3 style={{ fontSize: 14.5, fontWeight: 700 }}>{nome}</h3>
                  <Badge cor={conectado ? 'verde' : 'neutro'}>{conectado ? 'Conectado' : 'Não configurado'}</Badge>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--texto-fraco)', maxWidth: 420 }}>{descricao}</p>
                {preview && (
                  <div style={{ marginTop: 6 }}>
                    <code style={{ fontSize: 12, background: 'var(--superficie-3)', padding: '2px 8px', borderRadius: 'var(--r-sm)', color: 'var(--texto-suave)' }}>
                      {preview}
                    </code>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {campos}
            </div>
          </div>
        );
      })}

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
        <Btn onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar integrações'}</Btn>
      </div>
    </div>
  );
}

/* ── Componente principal ── */
export function Configuracoes() {
  const [aba, setAba] = useState('IA');

  return (
    <>
      <PaginaHeader
        titulo="Configurações"
        subtitulo="Integrações, IA e parâmetros do sistema"
      />
      <Tabs abas={['IA', 'Integrações', 'Teste DISC']} ativa={aba} aoMudar={setAba} />
      {aba === 'IA' && <AbaIA />}
      {aba === 'Integrações' && <AbaIntegracoes />}
      {aba === 'Teste DISC' && <AbaDisc />}
    </>
  );
}

/* ── Aba: Teste DISC (banco de perguntas configurável) ── */
type Dim = 'D' | 'I' | 'S' | 'C';
interface OpcaoDisc { texto: string; dimensao: Dim }
interface PerguntaDisc { id: string; enunciado: string | null; ordem: number; ativo: boolean; opcoes: OpcaoDisc[] }

const DIM_ROTULO: Record<Dim, string> = { D: 'D — Dominância', I: 'I — Influência', S: 'S — Estabilidade', C: 'C — Conformidade' };

function AbaDisc() {
  const [perguntas, setPerguntas] = useState<PerguntaDisc[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [enunciado, setEnunciado] = useState('');
  const [opcoes, setOpcoes] = useState<OpcaoDisc[]>([
    { texto: '', dimensao: 'D' }, { texto: '', dimensao: 'I' },
    { texto: '', dimensao: 'S' }, { texto: '', dimensao: 'C' },
  ]);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true); setErro(null);
    try {
      const { data } = await api.get<PerguntaDisc[]>('/config/disc/perguntas');
      setPerguntas(data);
    } catch { setErro('Não foi possível carregar as perguntas.'); }
    finally { setCarregando(false); }
  }
  useEffect(() => { carregar(); }, []);

  function setOpcao(i: number, patch: Partial<OpcaoDisc>) {
    setOpcoes((prev) => prev.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  }

  async function adicionar() {
    const validas = opcoes.filter((o) => o.texto.trim());
    if (validas.length < 2 || salvando) return;
    setSalvando(true);
    try {
      await api.post('/config/disc/perguntas', {
        enunciado: enunciado.trim() || undefined,
        ordem: perguntas.length,
        opcoes: validas.map((o) => ({ texto: o.texto.trim(), dimensao: o.dimensao })),
      });
      setEnunciado('');
      setOpcoes([{ texto: '', dimensao: 'D' }, { texto: '', dimensao: 'I' }, { texto: '', dimensao: 'S' }, { texto: '', dimensao: 'C' }]);
      carregar();
    } finally { setSalvando(false); }
  }

  async function alternarAtivo(p: PerguntaDisc) {
    await api.patch(`/config/disc/perguntas/${p.id}`, { ativo: !p.ativo, opcoes: p.opcoes });
    carregar();
  }
  async function remover(id: string) {
    await api.delete(`/config/disc/perguntas/${id}`);
    carregar();
  }

  if (carregando) return <Carregando />;
  if (erro) return <ErroEstado mensagem={erro} onTentar={carregar} />;

  const ativas = perguntas.filter((p) => p.ativo).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Banco de perguntas</h3>
        <p style={{ fontSize: 12.5, color: 'var(--texto-fraco)', marginBottom: 12 }}>
          {perguntas.length} perguntas ({ativas} ativas). O teste do candidato usa as perguntas ativas. Quanto mais perguntas, mais preciso o perfil.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Campo rotulo="Enunciado (opcional)" value={enunciado} onChange={(e) => setEnunciado(e.target.value)} placeholder="Ex.: Escolha a frase com que mais se identifica" />
          {opcoes.map((o, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <Campo rotulo={`Opção ${i + 1}`} value={o.texto} onChange={(e) => setOpcao(i, { texto: e.target.value })} placeholder="Texto da opção" />
              </div>
              <select className="brk-input" style={{ width: 150 }} value={o.dimensao} onChange={(e) => setOpcao(i, { dimensao: e.target.value as Dim })}>
                {(['D', 'I', 'S', 'C'] as Dim[]).map((d) => <option key={d} value={d}>{DIM_ROTULO[d]}</option>)}
              </select>
            </div>
          ))}
          <div><Btn onClick={adicionar} disabled={salvando}>{salvando ? 'Salvando…' : 'Adicionar pergunta'}</Btn></div>
        </div>
      </Card>

      {perguntas.map((p, idx) => (
        <Card key={p.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{idx + 1}. {p.enunciado ?? '(sem enunciado)'} {!p.ativo && <span style={{ fontSize: 11, color: 'var(--texto-fraco)' }}>· inativa</span>}</div>
              <ul style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {p.opcoes.map((o, i) => (
                  <li key={i} style={{ fontSize: 12.5, color: 'var(--texto-suave)' }}>
                    <strong style={{ color: 'var(--cinza-vapor)' }}>{o.dimensao}</strong> · {o.texto}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn variante="secondary" tamanho="sm" onClick={() => alternarAtivo(p)}>{p.ativo ? 'Desativar' : 'Ativar'}</Btn>
              <Btn variante="secondary" tamanho="sm" onClick={() => remover(p.id)}>Remover</Btn>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
