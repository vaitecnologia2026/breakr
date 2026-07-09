// Tela "Atividades" (CRM Comercial) — ligada ao backend real
// (/comercial/atividades). Lista, cria e conclui atividades (ligações, WhatsApp,
// reuniões...). Abas de período (Hoje / Vencidas / Concluídas / Todas). Estados
// carregando/erro/vazio no padrão do app; em modo demo usa mock.
import { useEffect, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import { comDemo, mockSeDemo } from '../lib/demo';
import { PaginaShell, EstadoCarregando, EstadoErro, PainelVazio, MensagemErro } from '../components/primitivos';
import { Card, Badge, Btn, Modal, Campo, CampoSelect } from '../components/ui';

type TipoAtividade = 'LIGACAO' | 'WHATSAPP' | 'EMAIL' | 'INSTAGRAM' | 'REUNIAO' | 'OUTRO';
type StatusAtividade = 'PENDENTE' | 'CONCLUIDA';

interface Atividade {
  id: string;
  titulo: string;
  tipo: TipoAtividade;
  status: StatusAtividade;
  vencimento: string | null;
  criadoEm: string;
  lead?: { id: string; nome: string; empresa: string | null } | null;
  responsavel?: { nome: string } | null;
}

const ROTULO_TIPO: Record<TipoAtividade, string> = {
  LIGACAO: 'Ligação', WHATSAPP: 'WhatsApp', EMAIL: 'E-mail', INSTAGRAM: 'Instagram', REUNIAO: 'Reunião', OUTRO: 'Outro',
};

const MOCK_ATIVIDADES: Atividade[] = [
  { id: 'm1', titulo: 'Tentativa de contato via ligação', tipo: 'LIGACAO', status: 'PENDENTE', vencimento: new Date().toISOString(), criadoEm: new Date().toISOString(), lead: { id: 'l1', nome: 'KI PIZZA TEUTÔNIA', empresa: null }, responsavel: { nome: 'Gustavo Costa' } },
  { id: 'm2', titulo: 'Tentativa de agendar reunião', tipo: 'WHATSAPP', status: 'PENDENTE', vencimento: new Date().toISOString(), criadoEm: new Date().toISOString(), lead: { id: 'l2', nome: 'Ditto Pizzaria', empresa: null }, responsavel: { nome: 'Gustavo Costa' } },
];

// Ícone de linha (padrão SVG monocromático do app).
function Ico({ children }: { children: ReactNode }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
  );
}
const IcoTelefone = () => <Ico><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></Ico>;
const IcoChat = () => <Ico><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="13" y2="14"/></Ico>;

function iconeDoTipo(t: TipoAtividade) {
  return t === 'LIGACAO' ? <IcoTelefone /> : <IcoChat />;
}

function mesmaData(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

type Aba = 'Hoje' | 'Vencidas' | 'Concluídas' | 'Todas';
const ABAS: Aba[] = ['Hoje', 'Vencidas', 'Concluídas', 'Todas'];

export function Atividades() {
  const [lista, setLista] = useState<Atividade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>('Hoje');
  const [modal, setModal] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState<{ titulo: string; tipo: TipoAtividade; vencimento: string }>({ titulo: '', tipo: 'LIGACAO', vencimento: '' });

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<Atividade[]>('/comercial/atividades');
      setLista(comDemo(data, MOCK_ATIVIDADES));
    } catch {
      setLista(mockSeDemo(MOCK_ATIVIDADES));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function concluir(id: string) {
    setErroAcao(null);
    try {
      await api.patch(`/comercial/atividades/${id}`, { status: 'CONCLUIDA' });
      await carregar();
    } catch {
      setErroAcao('Não foi possível concluir a atividade.');
    }
  }

  async function salvar() {
    if (!form.titulo.trim()) return;
    setSalvando(true);
    setErroAcao(null);
    try {
      await api.post('/comercial/atividades', {
        titulo: form.titulo.trim(),
        tipo: form.tipo,
        ...(form.vencimento ? { vencimento: new Date(form.vencimento).toISOString() } : {}),
      });
      setModal(false);
      setForm({ titulo: '', tipo: 'LIGACAO', vencimento: '' });
      await carregar();
    } catch {
      setErroAcao('Não foi possível criar a atividade.');
    } finally {
      setSalvando(false);
    }
  }

  const hoje = new Date();
  const filtradas = lista.filter((a) => {
    if (aba === 'Todas') return true;
    if (aba === 'Concluídas') return a.status === 'CONCLUIDA';
    if (a.status !== 'PENDENTE' || !a.vencimento) return false;
    const v = new Date(a.vencimento);
    if (aba === 'Hoje') return mesmaData(v, hoje);
    if (aba === 'Vencidas') return v.getTime() < hoje.getTime() && !mesmaData(v, hoje);
    return true;
  });

  return (
    <PaginaShell
      titulo="Atividades"
      subtitulo="Ligações, WhatsApp e tarefas do comercial"
      acao={<Btn variante="primary" onClick={() => setModal(true)}>+ Nova Atividade</Btn>}
    >
      {carregando ? (
        <EstadoCarregando />
      ) : erro ? (
        <EstadoErro mensagem={erro} onTentar={carregar} />
      ) : (
        <>
          {erroAcao && <MensagemErro texto={erroAcao} />}
          <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid var(--borda)', flexWrap: 'wrap' }}>
            {ABAS.map((t) => (
              <span key={t} onClick={() => setAba(t)} style={{
                padding: '8px 2px', fontSize: 12.5, cursor: 'pointer',
                color: aba === t ? 'var(--texto)' : 'var(--texto-fraco)',
                borderBottom: aba === t ? '2px solid var(--amarelo-fagulha)' : '2px solid transparent',
                fontWeight: aba === t ? 600 : 400,
              }}>{t}</span>
            ))}
          </div>

          {filtradas.length === 0 ? (
            <PainelVazio titulo="Nenhuma atividade" descricao="Crie uma atividade ou troque o período." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtradas.map((a) => (
                <Card key={a.id}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--superficie-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', color: 'var(--texto-suave)' }}>{iconeDoTipo(a.tipo)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{a.titulo}</div>
                      <div style={{ fontSize: 11.5, marginTop: 4, color: 'var(--amarelo-fagulha)' }}>
                        {[
                          a.vencimento ? new Date(a.vencimento).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : null,
                          a.lead?.nome,
                          a.responsavel?.nome,
                        ].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <Badge cor={a.status === 'CONCLUIDA' ? 'verde' : 'neutro'}>{ROTULO_TIPO[a.tipo]}</Badge>
                    {a.status === 'PENDENTE' && (
                      <Btn variante="secondary" tamanho="sm" onClick={() => concluir(a.id)}>Concluir</Btn>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {modal && (
        <Modal
          titulo="Nova atividade"
          onFechar={() => setModal(false)}
          rodape={<><Btn variante="secondary" onClick={() => setModal(false)}>Cancelar</Btn><Btn variante="primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</Btn></>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Campo rotulo="Título" value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} placeholder="Ex.: Ligar para o cliente" autoFocus />
            <CampoSelect rotulo="Tipo" value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoAtividade }))}>
              {(Object.keys(ROTULO_TIPO) as TipoAtividade[]).map((t) => <option key={t} value={t}>{ROTULO_TIPO[t]}</option>)}
            </CampoSelect>
            <Campo rotulo="Vencimento" type="datetime-local" value={form.vencimento} onChange={(e) => setForm((f) => ({ ...f, vencimento: e.target.value }))} />
          </div>
        </Modal>
      )}
    </PaginaShell>
  );
}
