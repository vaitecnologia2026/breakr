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
  asaas: { temChave: boolean; preview: string | null; sandbox: boolean; webhook: string | null };
  speed: { temChave: boolean; preview: string | null };
  autentique: { temChave: boolean; preview: string | null };
  whatsapp: { temToken: boolean; preview: string | null; instancia: string | null };
  vaicrm: { temToken: boolean; preview: string | null; email: string | null; temSenha: boolean; configurado: boolean };
  google: { configurado: boolean; calendarId: string | null; email: string | null; conectado: boolean; contaConectada: string | null };
  adsMeta: { temToken: boolean; preview: string | null; contaId: string | null; temAppId: boolean; temAppSecret: boolean; appId: string | null; pageId: string | null; pixelId: string | null };
  adsGoogle: { temToken: boolean; preview: string | null; contaId: string | null };
  receita: { temToken: boolean; preview: string | null };
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
    asaasApiKey: '', asaasSandbox: false, asaasWebhook: '',
    speedApiKey: '', autentiqueToken: '',
    whatsappToken: '', whatsappInstancia: '',
    vaicrmToken: '', vaicrmEmail: '', vaicrmSenha: '',
    googleServiceAccount: '', googleCalendarId: '', googleImpersonateEmail: '',
    adsMetaToken: '', adsMetaContaId: '', adsMetaAppId: '', adsMetaAppSecret: '', adsMetaPageId: '', adsMetaPixelId: '',
    adsGoogleToken: '', adsGoogleContaId: '',
    receitaToken: '',
  });
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  async function carregar() {
    setCarregando(true); setErroCarga(null);
    try {
      const { data } = await api.get<ConfigIntegracoes>('/config/integracoes');
      setConfig(data);
      setForm({ asaasApiKey: '', asaasSandbox: data.asaas.sandbox, asaasWebhook: data.asaas.webhook ?? '', speedApiKey: '', autentiqueToken: '', whatsappToken: '', whatsappInstancia: data.whatsapp.instancia ?? '', vaicrmToken: '', vaicrmEmail: data.vaicrm.email ?? '', vaicrmSenha: '', googleServiceAccount: '', googleCalendarId: data.google.calendarId ?? '', googleImpersonateEmail: data.google.email ?? '', adsMetaToken: '', adsMetaContaId: data.adsMeta.contaId ?? '', adsMetaAppId: data.adsMeta.appId ?? '', adsMetaAppSecret: '', adsMetaPageId: data.adsMeta.pageId ?? '', adsMetaPixelId: data.adsMeta.pixelId ?? '', adsGoogleToken: '', adsGoogleContaId: data.adsGoogle.contaId ?? '', receitaToken: '' });
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
        asaasWebhook: form.asaasWebhook,
        ...(form.speedApiKey && { speedApiKey: form.speedApiKey }),
        ...(form.autentiqueToken && { autentiqueToken: form.autentiqueToken }),
        ...(form.whatsappToken && { whatsappToken: form.whatsappToken }),
        ...(form.whatsappInstancia && { whatsappInstancia: form.whatsappInstancia }),
        ...(form.vaicrmToken && { vaicrmToken: form.vaicrmToken }),
        ...(form.vaicrmEmail && { vaicrmEmail: form.vaicrmEmail }),
        ...(form.vaicrmSenha && { vaicrmSenha: form.vaicrmSenha }),
        ...(form.googleServiceAccount && { googleServiceAccount: form.googleServiceAccount }),
        googleCalendarId: form.googleCalendarId,
        googleImpersonateEmail: form.googleImpersonateEmail,
        ...(form.adsMetaToken && { adsMetaToken: form.adsMetaToken }),
        adsMetaContaId: form.adsMetaContaId,
        adsMetaAppId: form.adsMetaAppId,
        ...(form.adsMetaAppSecret && { adsMetaAppSecret: form.adsMetaAppSecret }),
        adsMetaPageId: form.adsMetaPageId,
        adsMetaPixelId: form.adsMetaPixelId,
        ...(form.adsGoogleToken && { adsGoogleToken: form.adsGoogleToken }),
        adsGoogleContaId: form.adsGoogleContaId,
        ...(form.receitaToken && { receitaToken: form.receitaToken }),
      });
      await carregar();
      setFeedback({ tipo: 'sucesso', msg: 'Integrações salvas com sucesso.' });
    } catch { setFeedback({ tipo: 'erro', msg: 'Erro ao salvar integrações.' }); }
    finally { setSalvando(false); }
  }

  // Feedback ao retornar do consentimento OAuth do Google (/configuracoes?google=...).
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const g = qs.get('google');
    if (g === 'ok') setFeedback({ tipo: 'sucesso', msg: 'Google Agenda conectado com sucesso.' });
    else if (g === 'erro') setFeedback({ tipo: 'erro', msg: qs.get('motivo') || 'Não foi possível conectar o Google Agenda. Tente novamente.' });
    if (g) window.history.replaceState({}, '', window.location.pathname);
  }, []);

  async function conectarGoogle() {
    setFeedback(null);
    try {
      const { data } = await api.get<{ url: string }>('/agendamento/google/oauth/url');
      window.location.href = data.url;
    } catch (e: any) {
      setFeedback({ tipo: 'erro', msg: e?.response?.data?.message ?? 'Salve o JSON do cliente OAuth do Google e tente novamente.' });
    }
  }

  if (carregando) return <Carregando />;
  if (erroCarga) return <ErroEstado mensagem={erroCarga} onTentar={carregar} />;

  const INTEGRACOES: { chave: keyof ConfigIntegracoes; nome: string; descricao: string; campos: ReactNode }[] = [
    {
      chave: 'asaas',
      nome: 'Asaas — Cobranças',
      descricao: 'Geração de boletos, PIX e cartão. Use a Chave da API OU o Webhook n8n. Com o Webhook configurado, ao criar o contrato o Breakr envia o cadastro para o n8n gerar a cobrança no Asaas.',
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
          <Campo
            rotulo="Webhook Asaas (n8n)"
            autoComplete="off"
            placeholder="https://webhook.breakr.com.br/webhook/…/criacao-e-registro-de-contratos"
            value={form.asaasWebhook}
            onChange={(e) => setForm((f) => ({ ...f, asaasWebhook: e.target.value }))}
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
      nome: 'WhatsApp',
      descricao: 'Mensagens automáticas para clientes via WhatsApp. Configure o token e a instância conectada.',
      campos: (
        <>
          <Campo
            rotulo="Token do WhatsApp"
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
    {
      chave: 'vaicrm',
      nome: 'VAI CRM — Atendimento',
      descricao: 'Chats e mensagens do VAI CRM na aba "VAI CRM" do Atendimento. Configure o Token da API OU o e-mail/senha.',
      campos: (
        <>
          <Campo
            rotulo="Token da API VAI CRM"
            type="password" autoComplete="off"
            placeholder={config?.vaicrm.temToken ? 'Cole para substituir' : 'vai_… (opcional se usar e-mail/senha)'}
            value={form.vaicrmToken}
            onChange={(e) => setForm((f) => ({ ...f, vaicrmToken: e.target.value }))}
          />
          <Campo
            rotulo="E-mail (login)"
            autoComplete="off"
            placeholder="usuario@empresa.com"
            value={form.vaicrmEmail}
            onChange={(e) => setForm((f) => ({ ...f, vaicrmEmail: e.target.value }))}
          />
          <Campo
            rotulo="Senha (login)"
            type="password" autoComplete="off"
            placeholder={config?.vaicrm.temSenha ? 'Cole para substituir' : 'Senha do login VAI CRM'}
            value={form.vaicrmSenha}
            onChange={(e) => setForm((f) => ({ ...f, vaicrmSenha: e.target.value }))}
          />
        </>
      ),
    },
    {
      chave: 'google',
      nome: 'Google Agenda — Meet',
      descricao: 'Gera automaticamente um link do Google Meet ao criar um agendamento de vídeo. Cole o JSON do cliente OAuth Web (recomendado, funciona com conta Google comum) OU de uma Service Account. Depois de salvar o JSON OAuth, clique em "Conectar Google" para autorizar. Habilite a Google Calendar API no projeto.',
      campos: (
        <>
          <div className="brk-campo">
            <label className="brk-campo-label">JSON de credenciais do Google (OAuth Web ou Service Account)</label>
            <textarea
              className="brk-input" rows={4} autoComplete="off"
              placeholder={config?.google.configurado ? 'Cole para substituir' : '{ "web": { "client_id": "…", "client_secret": "…", "redirect_uris": ["…"] } }'}
              value={form.googleServiceAccount}
              onChange={(e) => setForm((f) => ({ ...f, googleServiceAccount: e.target.value }))}
              style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
            />
          </div>
          <Campo
            rotulo="ID do calendário (opcional)"
            autoComplete="off"
            placeholder="agenda@empresa.com (ou 'primary')"
            value={form.googleCalendarId}
            onChange={(e) => setForm((f) => ({ ...f, googleCalendarId: e.target.value }))}
          />
          <Campo
            rotulo="E-mail para impersonar (só Service Account / domain-wide)"
            autoComplete="off"
            placeholder="usuario@empresa.com"
            value={form.googleImpersonateEmail}
            onChange={(e) => setForm((f) => ({ ...f, googleImpersonateEmail: e.target.value }))}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingTop: 4 }}>
            <Btn variante="secondary" tamanho="sm" type="button" onClick={conectarGoogle} disabled={!config?.google.configurado}>
              {config?.google.conectado ? 'Reconectar Google' : 'Conectar Google'}
            </Btn>
            {config?.google.conectado
              ? <Badge cor="verde">Conectado{config?.google.contaConectada ? ` — ${config.google.contaConectada}` : ''}</Badge>
              : <span style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>Salve o JSON OAuth e clique em Conectar para autorizar.</span>}
          </div>
        </>
      ),
    },
    {
      chave: 'adsMeta',
      nome: 'Meta Ads — Anúncios',
      descricao: 'Credenciais da conta de anúncios do Meta (Facebook/Instagram): token, ID da conta, App ID/Secret, página e pixel. Com credenciais válidas e o app Meta liberado (fora do "Data Use Checkup"), o sistema já lê dados reais — Públicos, Criativos, insights de campanhas e conversões (CAPI) aparecem nas telas de Marketing/Tráfego. Enquanto não estiver configurado ou liberado, essas telas degradam com aviso e o tráfego segue sendo alimentado pela tela de Tráfego.',
      campos: (
        <>
          <Campo
            rotulo="Token de acesso Meta"
            type="password" autoComplete="off"
            placeholder={config?.adsMeta.temToken ? 'Cole para substituir' : 'EAAB… (token de acesso)'}
            value={form.adsMetaToken}
            onChange={(e) => setForm((f) => ({ ...f, adsMetaToken: e.target.value }))}
          />
          <Campo
            rotulo="ID da conta de anúncios (act_…)"
            autoComplete="off"
            placeholder="act_1234567890"
            value={form.adsMetaContaId}
            onChange={(e) => setForm((f) => ({ ...f, adsMetaContaId: e.target.value }))}
          />
          <Campo
            rotulo="App ID (aplicativo Meta)"
            autoComplete="off"
            placeholder={config?.adsMeta.temAppId ? config.adsMeta.appId ?? '' : '1234567890123456'}
            value={form.adsMetaAppId}
            onChange={(e) => setForm((f) => ({ ...f, adsMetaAppId: e.target.value }))}
          />
          <Campo
            rotulo="App Secret (chave secreta)"
            type="password" autoComplete="off"
            placeholder={config?.adsMeta.temAppSecret ? 'Cole para substituir' : 'Chave secreta do app'}
            value={form.adsMetaAppSecret}
            onChange={(e) => setForm((f) => ({ ...f, adsMetaAppSecret: e.target.value }))}
          />
          <Campo
            rotulo="Page ID (página do anúncio)"
            autoComplete="off"
            placeholder="1234567890"
            value={form.adsMetaPageId}
            onChange={(e) => setForm((f) => ({ ...f, adsMetaPageId: e.target.value }))}
          />
          <Campo
            rotulo="Pixel ID (rastreamento de conversão)"
            autoComplete="off"
            placeholder="1234567890"
            value={form.adsMetaPixelId}
            onChange={(e) => setForm((f) => ({ ...f, adsMetaPixelId: e.target.value }))}
          />
        </>
      ),
    },
    {
      chave: 'adsGoogle',
      nome: 'Google Ads — Anúncios',
      descricao: 'Credenciais da conta do Google Ads. Guarda o token e o ID da conta; a leitura automática de métricas é etapa futura (Fase 2). Enquanto isso, os dados de tráfego alimentam o portal pela tela de Tráfego.',
      campos: (
        <>
          <Campo
            rotulo="Token de acesso Google Ads"
            type="password" autoComplete="off"
            placeholder={config?.adsGoogle.temToken ? 'Cole para substituir' : 'Token de acesso / developer token'}
            value={form.adsGoogleToken}
            onChange={(e) => setForm((f) => ({ ...f, adsGoogleToken: e.target.value }))}
          />
          <Campo
            rotulo="ID da conta (Customer ID)"
            autoComplete="off"
            placeholder="123-456-7890"
            value={form.adsGoogleContaId}
            onChange={(e) => setForm((f) => ({ ...f, adsGoogleContaId: e.target.value }))}
          />
        </>
      ),
    },
    {
      chave: 'receita',
      nome: 'Receita Federal (ReceitaWS) — Consulta de CNPJ',
      descricao: 'Auto-preenchimento do Cadastro Completo pelo CNPJ. Token opcional da ReceitaWS (plano pago, para não cair no limite de 3 consultas/min da API pública).',
      campos: (
        <Campo
          rotulo="Token ReceitaWS"
          type="password" autoComplete="off"
          placeholder={config?.receita.temToken ? 'Cole para substituir' : 'Token da ReceitaWS (opcional)'}
          value={form.receitaToken}
          onChange={(e) => setForm((f) => ({ ...f, receitaToken: e.target.value }))}
        />
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
          || ('temToken' in (status ?? {}) ? (status as { temToken: boolean }).temToken : false)
          || ('configurado' in (status ?? {}) ? (status as { configurado: boolean }).configurado : false);
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

/* ── Aba Portal (frase motivacional exibida ao cliente) ── */
function AbaPortal() {
  const [frase, setFrase] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null);

  async function carregar() {
    setCarregando(true); setErroCarga(null);
    try {
      const { data } = await api.get<{ fraseMotivacional: string | null }>('/config/portal');
      setFrase(data.fraseMotivacional ?? '');
    } catch { setErroCarga('Erro ao carregar configuração do portal.'); }
    finally { setCarregando(false); }
  }
  useEffect(() => { carregar(); }, []);

  async function salvar() {
    setSalvando(true); setFeedback(null);
    try {
      await api.patch('/config/portal', { fraseMotivacional: frase });
      await carregar();
      setFeedback({ tipo: 'sucesso', msg: 'Frase do portal salva com sucesso.' });
    } catch { setFeedback({ tipo: 'erro', msg: 'Erro ao salvar a frase do portal.' }); }
    finally { setSalvando(false); }
  }

  if (carregando) return <Carregando />;
  if (erroCarga) return <ErroEstado mensagem={erroCarga} onTentar={carregar} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 13, color: 'var(--texto-fraco)', marginBottom: 4 }}>
        Frase motivacional exibida no portal do cliente, abaixo do nome do CS.
        Deixe em branco para não exibir nenhuma frase.
      </p>

      {feedback && <Alerta tipo={feedback.tipo}>{feedback.msg}</Alerta>}

      <div className="brk-card brk-card-p">
        <Campo
          rotulo="Frase motivacional do portal"
          placeholder="Ex: Cada entrega aproxima você do próximo nível. Conte com a gente! 🚀"
          value={frase}
          onChange={(e) => setFrase(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
        <Btn onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar frase'}</Btn>
      </div>
    </div>
  );
}

/* ── Componente principal ── */
export function Configuracoes() {
  // Ao voltar do consentimento do Google (/configuracoes?google=ok|erro) abre
  // direto a aba Integracoes.
  const [aba, setAba] = useState(() =>
    new URLSearchParams(window.location.search).has('google') ? 'Integrações' : 'IA',
  );

  return (
    <>
      <PaginaHeader
        titulo="Configurações"
        subtitulo="Integrações, IA e parâmetros do sistema"
      />
      <Tabs abas={['IA', 'Integrações', 'WhatsApp', 'Teste DISC', 'Otimização', 'Avaliação', 'Portal', 'Acessos']} ativa={aba} aoMudar={setAba} />
      {aba === 'IA' && <AbaIA />}
      {aba === 'Integrações' && <AbaIntegracoes />}
      {aba === 'WhatsApp' && <AbaWhatsApp />}
      {aba === 'Teste DISC' && <AbaDisc />}
      {aba === 'Otimização' && <AbaCronograma />}
      {aba === 'Avaliação' && <AbaCriterios />}
      {aba === 'Portal' && <AbaPortal />}
      {aba === 'Acessos' && <AbaAcessos />}
    </>
  );
}

/* ── Aba: Acessos (logins recentes — auditoria) ── */
interface Acesso { id: string; ator: string; criadoEm: string; dados: { nome?: string; cargo?: string; ip?: string | null } | null }

function AbaAcessos() {
  const [lista, setLista] = useState<Acesso[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api.get<Acesso[]>('/auth/acessos')
      .then(({ data }) => setLista(data))
      .catch(() => setLista([]))
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) return <Carregando />;

  return (
    <Card>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Acessos recentes</h3>
      <p style={{ fontSize: 12.5, color: 'var(--texto-fraco)', marginBottom: 12 }}>
        Últimos logins no sistema (quem entrou, quando e de qual IP).
      </p>
      {lista.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Nenhum acesso registrado ainda.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.2fr 1fr 1fr', gap: 8, fontSize: 11.5, color: 'var(--texto-fraco)', padding: '6px 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <span>Data / Hora</span><span>Usuário</span><span>Cargo</span><span>IP</span>
          </div>
          {lista.map((a) => (
            <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.2fr 1fr 1fr', gap: 8, fontSize: 13, padding: '8px', borderTop: '1px solid var(--borda)', alignItems: 'center' }}>
              <span style={{ color: 'var(--texto-suave)' }}>{new Date(a.criadoEm).toLocaleString('pt-BR')}</span>
              <span style={{ color: 'var(--texto)', fontWeight: 600 }}>{a.dados?.nome ?? a.ator}</span>
              <span style={{ color: 'var(--texto-fraco)' }}>{a.dados?.cargo ?? '—'}</span>
              <span style={{ color: 'var(--texto-fraco)' }}>{a.dados?.ip ?? '—'}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ── Aba: WhatsApp / Atendimento (credenciais Meta/WhatsApp Business) ── */
interface ConfigWa { ativo: boolean; phoneNumberId: string | null; waBaId: string | null; temWebhookVerifyToken: boolean; accessToken: string | null }

function AbaWhatsApp() {
  const [carregando, setCarregando] = useState(true);
  const [cfg, setCfg] = useState<ConfigWa | null>(null);
  const [ativo, setAtivo] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [waBaId, setWaBaId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [webhookVerifyToken, setWebhookVerifyToken] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const { data } = await api.get<ConfigWa>('/atendimento/config');
      setCfg(data);
      setAtivo(data.ativo);
      setPhoneNumberId(data.phoneNumberId ?? '');
      setWaBaId(data.waBaId ?? '');
    } finally { setCarregando(false); }
  }
  useEffect(() => { carregar(); }, []);

  async function salvar() {
    setSalvando(true); setSalvo(false);
    // Só envia segredos se o usuário digitou um novo valor (não sobrescreve com a máscara).
    const corpo: Record<string, unknown> = { ativo, phoneNumberId: phoneNumberId.trim(), waBaId: waBaId.trim() };
    if (accessToken.trim()) corpo.accessToken = accessToken.trim();
    if (webhookVerifyToken.trim()) corpo.webhookVerifyToken = webhookVerifyToken.trim();
    try {
      await api.put('/atendimento/config', corpo);
      setAccessToken(''); setWebhookVerifyToken('');
      setSalvo(true);
      carregar();
    } finally { setSalvando(false); }
  }

  if (carregando) return <Carregando />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>WhatsApp Business (Meta)</h3>
        <p style={{ fontSize: 12.5, color: 'var(--texto-fraco)', marginBottom: 14 }}>
          Credenciais da API oficial do WhatsApp para a centralização do atendimento.
          Os campos de segredo ficam em branco por segurança — preencha só para alterar.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480 }}>
          <Switch ativo={ativo} aoAlternar={setAtivo} rotulo="Integração ativa" />
          <Campo rotulo="Phone Number ID" value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} placeholder="Ex.: 1029384756" />
          <Campo rotulo="WABA ID (WhatsApp Business Account)" value={waBaId} onChange={(e) => setWaBaId(e.target.value)} placeholder="Ex.: 5647382910" />
          <Campo
            rotulo={`Access Token${cfg?.accessToken ? ` (atual: ${cfg.accessToken})` : ''}`}
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder={cfg?.accessToken ? 'Preencha para substituir' : 'Cole o token permanente'}
          />
          <Campo
            rotulo={`Webhook Verify Token${cfg?.temWebhookVerifyToken ? ' (configurado)' : ''}`}
            type="password"
            value={webhookVerifyToken}
            onChange={(e) => setWebhookVerifyToken(e.target.value)}
            placeholder={cfg?.temWebhookVerifyToken ? 'Preencha para substituir' : 'Token de verificação do webhook'}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Btn onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</Btn>
            {salvo && <Alerta tipo="sucesso">Configuração salva.</Alerta>}
          </div>
        </div>
      </Card>
      <Card>
        <p style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>
          URL do webhook (configure na Meta): <code style={{ color: 'var(--cinza-vapor)' }}>https://api-production-fc29.up.railway.app/atendimento/webhooks/meta</code>
        </p>
      </Card>
    </div>
  );
}

/* ── Aba: Cronograma de otimização (dia × objetivo) ── */
const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const OBJETIVOS_OTIM = ['Vendas', 'Leads', 'Engajamento', 'Reconhecimento', 'Tráfego'];
interface RegraOtim { id: string; diaSemana: number; objetivo: string; ativo: boolean }

function AbaCronograma() {
  const [regras, setRegras] = useState<RegraOtim[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [dia, setDia] = useState(1);
  const [objetivo, setObjetivo] = useState(OBJETIVOS_OTIM[0]);

  async function carregar() {
    setCarregando(true);
    try { const { data } = await api.get<RegraOtim[]>('/trafego/cronograma'); setRegras(data); }
    finally { setCarregando(false); }
  }
  useEffect(() => { carregar(); }, []);

  async function adicionar() { await api.post('/trafego/cronograma', { diaSemana: dia, objetivo }); carregar(); }
  async function remover(id: string) { await api.delete(`/trafego/cronograma/${id}`); carregar(); }

  if (carregando) return <Carregando />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Cronograma de otimização</h3>
        <p style={{ fontSize: 12.5, color: 'var(--texto-fraco)', marginBottom: 12 }}>
          Em que dia o gestor otimiza campanhas de cada objetivo. Configurável — pode mudar quando quiser.
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)', display: 'block', marginBottom: 4 }}>Dia</span>
            <select className="brk-input" value={dia} onChange={(e) => setDia(Number(e.target.value))}>
              {DIAS_SEMANA.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <div>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)', display: 'block', marginBottom: 4 }}>Objetivo</span>
            <select className="brk-input" value={objetivo} onChange={(e) => setObjetivo(e.target.value)}>
              {OBJETIVOS_OTIM.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <Btn onClick={adicionar}>Adicionar</Btn>
        </div>
      </Card>
      {DIAS_SEMANA.map((d, i) => {
        const doDia = regras.filter((r) => r.diaSemana === i);
        if (doDia.length === 0) return null;
        return (
          <Card key={i}>
            <strong style={{ fontSize: 14 }}>{d}</strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {doDia.map((r) => (
                <span key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: 'var(--superficie-2)', fontSize: 12.5 }}>
                  {r.objetivo}
                  <button type="button" onClick={() => remover(r.id)} style={{ background: 'none', border: 'none', color: 'var(--texto-fraco)', cursor: 'pointer' }}>×</button>
                </span>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* ── Aba: Critérios de avaliação (CSAT) por tipo ── */
const TIPOS_AVALIACAO = ['CAMPANHA', 'TEXTO', 'CS', 'CONCILIACAO', 'OUTRO'];
interface Criterio { id: string; tipo: string; label: string; ordem: number }

function AbaCriterios() {
  const [criterios, setCriterios] = useState<Criterio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [tipo, setTipo] = useState(TIPOS_AVALIACAO[0]);
  const [label, setLabel] = useState('');

  async function carregar() {
    setCarregando(true);
    try { const { data } = await api.get<Criterio[]>('/qualidade/criterios'); setCriterios(data); }
    finally { setCarregando(false); }
  }
  useEffect(() => { carregar(); }, []);

  async function adicionar() { if (!label.trim()) return; await api.post('/qualidade/criterios', { tipo, label: label.trim(), ordem: criterios.filter((c) => c.tipo === tipo).length }); setLabel(''); carregar(); }
  async function remover(id: string) { await api.delete(`/qualidade/criterios/${id}`); carregar(); }

  if (carregando) return <Carregando />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Critérios de avaliação (CSAT)</h3>
        <p style={{ fontSize: 12.5, color: 'var(--texto-fraco)', marginBottom: 12 }}>
          O que mede a qualidade de cada tipo (campanha, texto, CS…). Editável.
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)', display: 'block', marginBottom: 4 }}>Tipo</span>
            <select className="brk-input" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS_AVALIACAO.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)', display: 'block', marginBottom: 4 }}>Pergunta/critério</span>
            <input className="brk-input" style={{ width: '100%' }} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Qualidade do texto" />
          </div>
          <Btn onClick={adicionar} disabled={!label.trim()}>Adicionar</Btn>
        </div>
      </Card>
      {TIPOS_AVALIACAO.map((t) => {
        const doTipo = criterios.filter((c) => c.tipo === t);
        if (doTipo.length === 0) return null;
        return (
          <Card key={t}>
            <strong style={{ fontSize: 14 }}>{t}</strong>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
              {doTipo.map((c) => (
                <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}>
                  <span>{c.label}</span>
                  <button type="button" onClick={() => remover(c.id)} style={{ background: 'none', border: 'none', color: 'var(--texto-fraco)', cursor: 'pointer' }}>remover</button>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
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
