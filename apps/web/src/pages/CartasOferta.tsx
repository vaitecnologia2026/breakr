import { useEffect, useState, type FormEvent } from 'react';
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
} from '../components/primitivos';

/**
 * Carta Oferta parametrizável (inspirado no InHire). Modelos com variáveis
 * {{campo}} ou {{campo;tipo}} e geração da carta por candidato.
 *  GET/POST/PATCH/DELETE /carta-oferta/templates
 *  POST /carta-oferta/variaveis { conteudo } → [{ campo, tipo }]
 *  POST /carta-oferta/previa { conteudo, valores } → { renderizado }
 *  GET  /carta-oferta → CartaOferta[]
 *  POST /carta-oferta/gerar { candidatoId, templateId, valores?, titulo? }
 *  PATCH /carta-oferta/:id/status { status }
 */

interface Template {
  id: string;
  nome: string;
  assunto: string | null;
  conteudo: string;
  ativo: boolean;
}
type StatusCarta = 'RASCUNHO' | 'ENVIADA' | 'ACEITA' | 'RECUSADA';
interface Carta {
  id: string;
  titulo: string;
  conteudoRenderizado: string;
  status: StatusCarta;
  criadoEm: string;
  candidato?: { nome: string; email: string | null };
  template?: { nome: string } | null;
}
interface CandidatoLite {
  id: string;
  nome: string;
  vaga?: { titulo: string };
}
interface Variavel {
  campo: string;
  tipo: string;
}

const STATUS_CARTA: Record<StatusCarta, { rotulo: string; cor: string }> = {
  RASCUNHO: { rotulo: 'Rascunho', cor: '#9aa0ad' },
  ENVIADA: { rotulo: 'Enviada', cor: '#4aa3f0' },
  ACEITA: { rotulo: 'Aceita', cor: '#2ecc71' },
  RECUSADA: { rotulo: 'Recusada', cor: '#ff6b6b' },
};

// Variáveis automáticas preenchidas pelo servidor (dados do candidato/vaga).
const AUTO_VARS = ['nome_candidato', 'email_candidato', 'telefone_candidato', 'vaga', 'departamento', 'data'];

export function CartasOferta() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [cartas, setCartas] = useState<Carta[]>([]);
  const [candidatos, setCandidatos] = useState<CandidatoLite[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [modalTemplate, setModalTemplate] = useState<Template | 'novo' | null>(null);
  const [modalGerar, setModalGerar] = useState(false);
  const [cartaAberta, setCartaAberta] = useState<Carta | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const [t, c, cand] = await Promise.all([
        api.get<Template[]>('/carta-oferta/templates'),
        api.get<Carta[]>('/carta-oferta'),
        api.get<CandidatoLite[]>('/rh/candidatos'),
      ]);
      setTemplates(t.data);
      setCartas(c.data);
      setCandidatos(cand.data);
    } catch {
      setErro('Não foi possível carregar as cartas oferta.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function removerTemplate(id: string) {
    try {
      await api.delete(`/carta-oferta/templates/${id}`);
      carregar();
    } catch {
      setErro('Falha ao remover o modelo.');
    }
  }

  async function mudarStatus(id: string, status: StatusCarta) {
    try {
      await api.patch(`/carta-oferta/${id}/status`, { status });
      carregar();
    } catch {
      setErro('Falha ao atualizar o status da carta.');
    }
  }

  return (
    <PaginaShell
      titulo="Cartas Oferta"
      subtitulo="Modelos parametrizáveis e geração de cartas por candidato"
      acao={
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <BotaoSecundario onClick={() => setModalTemplate('novo')}>+ Novo modelo</BotaoSecundario>
          <BotaoPrimario onClick={() => setModalGerar(true)}>+ Gerar carta</BotaoPrimario>
        </div>
      }
    >
      {carregando ? (
        <EstadoCarregando />
      ) : erro ? (
        <EstadoErro mensagem={erro} onTentar={carregar} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          {/* Modelos */}
          <section>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Modelos</h2>
            {templates.length === 0 ? (
              <PainelVazio
                titulo="Nenhum modelo ainda"
                descricao="Crie um modelo com variáveis {{campo}} para gerar cartas personalizadas."
                acao={<BotaoPrimario onClick={() => setModalTemplate('novo')}>+ Novo modelo</BotaoPrimario>}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {templates.map((t) => (
                  <div key={t.id} className="brk-card brk-card-p" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>
                        {t.nome} {!t.ativo && <span style={{ fontSize: 11, color: 'var(--texto-fraco)' }}>(inativo)</span>}
                      </div>
                      {t.assunto && <div style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>{t.assunto}</div>}
                    </div>
                    <BotaoSecundario onClick={() => setModalTemplate(t)}>Editar</BotaoSecundario>
                    <BotaoSecundario onClick={() => removerTemplate(t.id)}>Excluir</BotaoSecundario>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Cartas geradas */}
          <section>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Cartas geradas</h2>
            {cartas.length === 0 ? (
              <PainelVazio
                titulo="Nenhuma carta gerada"
                descricao="Gere a primeira carta oferta escolhendo um candidato e um modelo."
                acao={<BotaoPrimario onClick={() => setModalGerar(true)}>+ Gerar carta</BotaoPrimario>}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {cartas.map((c) => (
                  <div key={c.id} className="brk-card brk-card-p" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{c.titulo}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>
                        {c.candidato?.nome ?? '—'}
                        {c.template?.nome ? ` · ${c.template.nome}` : ''}
                      </div>
                    </div>
                    <StatusPill status={c.status} />
                    <select
                      aria-label="Status da carta"
                      value={c.status}
                      onChange={(e) => mudarStatus(c.id, e.target.value as StatusCarta)}
                      style={{
                        background: 'var(--superficie-2)', border: '1px solid var(--borda-forte)',
                        borderRadius: 8, padding: '6px 8px', color: 'var(--texto)', fontSize: 12.5,
                      }}
                    >
                      {(Object.keys(STATUS_CARTA) as StatusCarta[]).map((s) => (
                        <option key={s} value={s}>{STATUS_CARTA[s].rotulo}</option>
                      ))}
                    </select>
                    <BotaoSecundario onClick={() => setCartaAberta(c)}>Ver</BotaoSecundario>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {modalTemplate && (
        <ModalTemplate
          template={modalTemplate === 'novo' ? null : modalTemplate}
          onFechar={() => setModalTemplate(null)}
          onSalvo={() => {
            setModalTemplate(null);
            carregar();
          }}
        />
      )}

      {modalGerar && (
        <ModalGerar
          templates={templates.filter((t) => t.ativo)}
          candidatos={candidatos}
          onFechar={() => setModalGerar(false)}
          onGerado={() => {
            setModalGerar(false);
            carregar();
          }}
        />
      )}

      {cartaAberta && <ModalVer carta={cartaAberta} onFechar={() => setCartaAberta(null)} />}
    </PaginaShell>
  );
}

function StatusPill({ status }: { status: StatusCarta }) {
  const meta = STATUS_CARTA[status];
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999,
      color: meta.cor, background: 'var(--superficie-3)', whiteSpace: 'nowrap',
    }}>
      {meta.rotulo}
    </span>
  );
}

/* --------------------------- Modal modelo --------------------------- */
function ModalTemplate({
  template,
  onFechar,
  onSalvo,
}: {
  template: Template | null;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [nome, setNome] = useState(template?.nome ?? '');
  const [assunto, setAssunto] = useState(template?.assunto ?? '');
  const [conteudo, setConteudo] = useState(
    template?.conteudo ??
      'Olá {{nome_candidato}},\n\nTemos o prazer de oferecer a você a posição de {{vaga}} na Breakr.\n\nSalário: {{salario;moeda}}\nData de início: {{data_inicio;data}}\n\nAtenciosamente,\nEquipe Breakr',
  );
  const [ativo, setAtivo] = useState(template?.ativo ?? true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const valido = nome.trim().length >= 2 && conteudo.trim().length >= 2;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || salvando) return;
    setSalvando(true);
    setErro(null);
    const body = { nome: nome.trim(), assunto: assunto.trim() || undefined, conteudo, ativo };
    try {
      if (template) await api.patch(`/carta-oferta/templates/${template.id}`, body);
      else await api.post('/carta-oferta/templates', body);
      onSalvo();
    } catch {
      setErro('Falha ao salvar o modelo. Verifique os dados.');
      setSalvando(false);
    }
  }

  return (
    <Overlay onFechar={onFechar}>
      <form onSubmit={enviar} className="brk-gradient-border" style={modalStyle}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>{template ? 'Editar modelo' : 'Novo modelo'}</h2>
        <p style={{ fontSize: 12.5, color: 'var(--texto-fraco)', marginTop: -6 }}>
          Use variáveis no formato <code>{'{{campo}}'}</code> ou <code>{'{{campo;tipo}}'}</code>.
          As chaves duplas são obrigatórias. Variáveis automáticas: {AUTO_VARS.join(', ')}.
        </p>

        <Campo rotulo="Nome do modelo" obrigatorio valor={nome} aoMudar={setNome} placeholder="Ex.: Carta padrão CLT" autoFocus />
        <Campo rotulo="Assunto (e-mail)" valor={assunto} aoMudar={setAssunto} placeholder="Ex.: Proposta Breakr — {{vaga}} (opcional)" />

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)' }}>Conteúdo *</span>
          <textarea
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            style={{
              minHeight: 200, resize: 'vertical', background: 'var(--superficie-2)',
              border: '1px solid var(--borda-forte)', borderRadius: 10, padding: '11px 13px',
              color: 'var(--texto)', fontSize: 13.5, fontFamily: 'inherit', outline: 'none',
            }}
          />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          Modelo ativo
        </label>

        {erro && <MensagemErro texto={erro} />}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <BotaoSecundario onClick={onFechar} disabled={salvando}>Cancelar</BotaoSecundario>
          <BotaoPrimario type="submit" disabled={!valido || salvando}>
            {salvando ? 'Salvando…' : 'Salvar modelo'}
          </BotaoPrimario>
        </div>
      </form>
    </Overlay>
  );
}

/* --------------------------- Modal gerar --------------------------- */
function ModalGerar({
  templates,
  candidatos,
  onFechar,
  onGerado,
}: {
  templates: Template[];
  candidatos: CandidatoLite[];
  onFechar: () => void;
  onGerado: () => void;
}) {
  const [candidatoId, setCandidatoId] = useState(candidatos[0]?.id ?? '');
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [variaveis, setVariaveis] = useState<Variavel[]>([]);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [previa, setPrevia] = useState('');
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const template = templates.find((t) => t.id === templateId);

  // Extrai as variáveis do modelo selecionado.
  useEffect(() => {
    if (!template) {
      setVariaveis([]);
      return;
    }
    let ativo = true;
    api
      .post<Variavel[]>('/carta-oferta/variaveis', { conteudo: template.conteudo })
      .then(({ data }) => {
        if (ativo) setVariaveis(data.filter((v) => !AUTO_VARS.includes(v.campo)));
      })
      .catch(() => {
        if (ativo) setVariaveis([]);
      });
    return () => {
      ativo = false;
    };
  }, [templateId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Atualiza a prévia (renderizada no servidor) ao mudar valores/modelo.
  useEffect(() => {
    if (!template) {
      setPrevia('');
      return;
    }
    let ativo = true;
    api
      .post<{ renderizado: string }>('/carta-oferta/previa', { conteudo: template.conteudo, valores })
      .then(({ data }) => {
        if (ativo) setPrevia(data.renderizado);
      })
      .catch(() => {
        /* silencioso */
      });
    return () => {
      ativo = false;
    };
  }, [templateId, valores]); // eslint-disable-line react-hooks/exhaustive-deps

  const valido = candidatoId !== '' && templateId !== '';

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (!valido || gerando) return;
    setGerando(true);
    setErro(null);
    // Envia só os valores preenchidos (vazios deixam o auto-preenchimento agir).
    const limpos: Record<string, string> = {};
    for (const [k, v] of Object.entries(valores)) if (v.trim()) limpos[k] = v.trim();
    try {
      await api.post('/carta-oferta/gerar', { candidatoId, templateId, valores: limpos });
      onGerado();
    } catch {
      setErro('Falha ao gerar a carta. Verifique o candidato e o modelo.');
      setGerando(false);
    }
  }

  return (
    <Overlay onFechar={onFechar}>
      <form onSubmit={enviar} className="brk-gradient-border" style={{ ...modalStyle, width: 'min(620px, 94vw)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Gerar carta oferta</h2>

        {candidatos.length === 0 || templates.length === 0 ? (
          <MensagemErro texto="É preciso ter ao menos um candidato e um modelo ativo para gerar cartas." />
        ) : (
          <>
            <label style={selectLabel}>
              <span style={selectSpan}>Candidato *</span>
              <select value={candidatoId} onChange={(e) => setCandidatoId(e.target.value)} style={selectStyle}>
                {candidatos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}{c.vaga?.titulo ? ` — ${c.vaga.titulo}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label style={selectLabel}>
              <span style={selectSpan}>Modelo *</span>
              <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} style={selectStyle}>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </label>

            {variaveis.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)' }}>
                  Preencha as variáveis do modelo
                </span>
                {variaveis.map((v) => (
                  <Campo
                    key={v.campo}
                    rotulo={`${v.campo}${v.tipo && v.tipo !== 'texto' ? ` (${v.tipo})` : ''}`}
                    valor={valores[v.campo] ?? ''}
                    aoMudar={(val) => setValores((s) => ({ ...s, [v.campo]: val }))}
                    placeholder={`Valor de ${v.campo}`}
                  />
                ))}
              </div>
            )}

            <div>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)' }}>Prévia</span>
              <pre style={{
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 6,
                background: 'var(--superficie-2)', border: '1px solid var(--borda)', borderRadius: 10,
                padding: 14, fontSize: 13, color: 'var(--texto-suave)', fontFamily: 'inherit', maxHeight: 220, overflow: 'auto',
              }}>
                {previa || '—'}
              </pre>
            </div>
          </>
        )}

        {erro && <MensagemErro texto={erro} />}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <BotaoSecundario onClick={onFechar} disabled={gerando}>Cancelar</BotaoSecundario>
          <BotaoPrimario type="submit" disabled={!valido || gerando || candidatos.length === 0 || templates.length === 0}>
            {gerando ? 'Gerando…' : 'Gerar carta'}
          </BotaoPrimario>
        </div>
      </form>
    </Overlay>
  );
}

/* --------------------------- Modal ver --------------------------- */
function ModalVer({ carta, onFechar }: { carta: Carta; onFechar: () => void }) {
  return (
    <Overlay onFechar={onFechar}>
      <div className="brk-gradient-border" style={{ ...modalStyle, width: 'min(640px, 94vw)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>{carta.titulo}</h2>
        <div style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>
          {carta.candidato?.nome ?? '—'}{carta.candidato?.email ? ` · ${carta.candidato.email}` : ''}
        </div>
        <pre style={{
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          background: 'var(--superficie-2)', border: '1px solid var(--borda)', borderRadius: 10,
          padding: 16, fontSize: 13.5, color: 'var(--texto)', fontFamily: 'inherit', maxHeight: 420, overflow: 'auto',
        }}>
          {carta.conteudoRenderizado}
        </pre>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <BotaoPrimario onClick={onFechar}>Fechar</BotaoPrimario>
        </div>
      </div>
    </Overlay>
  );
}

const modalStyle: React.CSSProperties = {
  width: 'min(520px, 94vw)', maxHeight: '90vh', overflow: 'auto', background: 'var(--superficie)',
  borderRadius: 18, padding: 24, boxShadow: 'var(--sombra-card)', display: 'flex', flexDirection: 'column', gap: 16,
};
const selectLabel: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 };
const selectSpan: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)' };
const selectStyle: React.CSSProperties = {
  background: 'var(--superficie-2)', border: '1px solid var(--borda-forte)', borderRadius: 10,
  padding: '11px 13px', color: 'var(--texto)', fontSize: 14, outline: 'none', cursor: 'pointer',
};
