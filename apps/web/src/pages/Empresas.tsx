// Tela "Empresas" (Contatos → Empresas) — lista no layout do wireframe:
// coluna Empresa (avatar + nome) e Website, com busca, Exportar (CSV),
// Nova Empresa e paginação.
//
// ADITIVO: lista as empresas cadastradas (GET /clientes). Não altera a tela
// Clientes nem sua lógica. "Criar Empresa" cria via /comercial/leads (empresa=Nome).
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { api } from '../lib/api';
import { comDemo, mockSeDemo } from '../lib/demo';
import { EstadoCarregando, EstadoErro, PainelVazio, Overlay, BotaoPrimario, BotaoSecundario, MensagemErro } from '../components/primitivos';
import { Card, Th, Td, Btn, Campo, Modal, Alerta } from '../components/ui';

interface Cliente {
  id: string;
  nomeFantasia: string;
  cnpj?: string | null;
  website?: string | null;
  segmento?: string | null;
  porte?: string | null;
  cidade?: string | null;
  estado?: string | null;
  empresaMae?: string | null;
}

interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  website: string;
  segmento: string;
  porte: string;
  cidade: string;
  estado: string;
  empresaMae: string;
}

const MOCK_CLIENTES: Cliente[] = [
  { id: 'c1', nomeFantasia: 'Bonacina Pizzaria e Lancheria LTDA', website: null },
  { id: 'c2', nomeFantasia: 'Santa Sushi Delivery', website: null },
  { id: 'c3', nomeFantasia: 'Octo Sushi LTDA', website: null },
];

const POR_PAGINA = 50;

function empresasDeClientes(clientes: Cliente[]): Empresa[] {
  return clientes
    .map((c) => ({
      id: c.id,
      nome: c.nomeFantasia,
      cnpj: c.cnpj?.trim() || '—',
      website: c.website?.trim() || '—',
      segmento: c.segmento?.trim() || '—',
      porte: c.porte?.trim() || '—',
      cidade: c.cidade?.trim() || '—',
      estado: c.estado?.trim() || '—',
      empresaMae: c.empresaMae?.trim() || '—',
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

function escaparCsv(v: string): string {
  const s = String(v ?? '');
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function Empresas() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);

  // Modal "Nova Empresa".
  const [modalNova, setModalNova] = useState(false);
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [site, setSite] = useState('');
  const [segmento, setSegmento] = useState('');
  const [porte, setPorte] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [empresaMae, setEmpresaMae] = useState('');
  const [maeFoco, setMaeFoco] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  // Edição de uma empresa existente (PATCH no cliente subjacente).
  const [editando, setEditando] = useState<Empresa | null>(null);
  const [formEd, setFormEd] = useState<{ nome: string; cnpj: string; website: string; segmento: string; porte: string; cidade: string; estado: string; empresaMae: string }>({ nome: '', cnpj: '', website: '', segmento: '', porte: '', cidade: '', estado: '', empresaMae: '' });
  const [salvandoEd, setSalvandoEd] = useState(false);
  const [erroEd, setErroEd] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<Cliente[]>('/clientes');
      setClientes(comDemo(data, MOCK_CLIENTES));
    } catch {
      setClientes(mockSeDemo(MOCK_CLIENTES));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const empresas = useMemo(() => empresasDeClientes(clientes), [clientes]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return empresas;
    return empresas.filter((e) => e.nome.toLowerCase().includes(q));
  }, [empresas, busca]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtradas.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  useEffect(() => {
    setPagina(1);
  }, [busca]);

  function exportarCsv() {
    const cab = ['Empresa', 'CNPJ', 'Website'];
    const linhas = filtradas.map((e) => [e.nome, e.cnpj, e.website].map(escaparCsv).join(','));
    const csv = '﻿' + [cab.join(','), ...linhas].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'empresas.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetFormNova() {
    setNome('');
    setCnpj('');
    setSite('');
    setSegmento('');
    setPorte('');
    setCidade('');
    setEstado('');
    setEmpresaMae('');
    setMaeFoco(false);
  }

  function abrirModalNova() {
    setErroForm(null);
    resetFormNova();
    setModalNova(true);
  }

  async function salvarNova(e: FormEvent) {
    e.preventDefault();
    if (salvando) return;
    if (nome.trim().length < 2) {
      setErroForm('Informe o nome da empresa (mínimo 2 caracteres).');
      return;
    }
    setSalvando(true);
    setErroForm(null);
    try {
      // Cria a empresa como Cliente — a lista de Empresas vem de /clientes, então
      // criar um lead não a faria aparecer. Persiste os campos com coluna real.
      await api.post('/clientes', {
        nomeFantasia: nome.trim(),
        cnpj: cnpj.trim() || undefined,
        website: site.trim() || undefined,
        segmento: segmento.trim() || undefined,
        porte: porte.trim() || undefined,
        cidade: cidade.trim() || undefined,
        estado: estado.trim() || undefined,
        empresaMae: empresaMae.trim() || undefined,
      });
      setModalNova(false);
      resetFormNova();
      carregar();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErroForm(Array.isArray(msg) ? msg.join(' ') : msg ?? 'Não foi possível criar a empresa.');
    } finally {
      setSalvando(false);
    }
  }

  // Abre o modal de edição com os valores atuais da empresa (— vira vazio).
  function abrirEdicao(emp: Empresa) {
    setErroEd(null);
    setFormEd({
      nome: emp.nome === '—' ? '' : emp.nome,
      cnpj: emp.cnpj === '—' ? '' : emp.cnpj,
      website: emp.website === '—' ? '' : emp.website,
      segmento: emp.segmento === '—' ? '' : emp.segmento,
      porte: emp.porte === '—' ? '' : emp.porte,
      cidade: emp.cidade === '—' ? '' : emp.cidade,
      estado: emp.estado === '—' ? '' : emp.estado,
      empresaMae: emp.empresaMae === '—' ? '' : emp.empresaMae,
    });
    setEditando(emp);
  }

  // Salva a empresa: atualiza o cliente subjacente (PATCH) e recarrega.
  async function salvarEdicao() {
    if (!editando) return;
    const nome = formEd.nome.trim();
    if (nome.length < 2) {
      setErroEd('Informe o nome da empresa (mínimo 2 caracteres).');
      return;
    }
    setSalvandoEd(true);
    setErroEd(null);
    try {
      await api.patch(`/clientes/${editando.id}`, {
        nomeFantasia: nome,
        cnpj: formEd.cnpj.trim(),
        website: formEd.website.trim(),
        segmento: formEd.segmento.trim(),
        porte: formEd.porte.trim(),
        cidade: formEd.cidade.trim(),
        estado: formEd.estado.trim(),
        empresaMae: formEd.empresaMae.trim(),
      });
      setEditando(null);
      await carregar();
    } catch {
      setErroEd('Não foi possível salvar a empresa. Tente novamente.');
    } finally {
      setSalvandoEd(false);
    }
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header: título + contagem + busca + Exportar + Nova Empresa */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 className="brk-pagina-titulo" style={{ margin: 0 }}>Empresas</h1>
          <span
            style={{
              background: 'var(--superficie-3)',
              color: 'var(--texto-suave)',
              borderRadius: 99,
              padding: '2px 10px',
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            {empresas.length}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--texto-fraco)', display: 'flex', pointerEvents: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </span>
            <input
              type="text"
              placeholder="Buscar empresa..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{
                background: 'var(--superficie-2)',
                border: '1px solid var(--borda)',
                borderRadius: 9,
                padding: '8px 12px 8px 32px',
                color: 'var(--texto)',
                fontSize: 13,
                outline: 'none',
                minWidth: 220,
              }}
            />
          </div>
          <BotaoSecundario onClick={exportarCsv}>Exportar</BotaoSecundario>
          <BotaoPrimario onClick={abrirModalNova}>+ Nova Empresa</BotaoPrimario>
        </div>
      </div>

      {carregando ? (
        <EstadoCarregando />
      ) : erro ? (
        <EstadoErro mensagem={erro} onTentar={carregar} />
      ) : empresas.length === 0 ? (
        <PainelVazio titulo="Nenhuma empresa ainda" descricao="As empresas aparecem conforme os clientes forem cadastrados." />
      ) : (
        <Card style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="brk-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <Th>Empresa</Th><Th>CNPJ</Th><Th>Website</Th><Th>Ações</Th>
                </tr>
              </thead>
              <tbody>
                {visiveis.length === 0 ? (
                  <tr>
                    <Td>—</Td><Td>—</Td><Td>—</Td><Td>—</Td>
                  </tr>
                ) : (
                  visiveis.map((emp, i) => (
                    <tr key={`${emp.id}-${i}`}>
                      <Td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--superficie-4)', color: 'var(--laranja-brasa)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{emp.nome.charAt(0).toUpperCase()}</span>
                          {emp.nome}
                        </span>
                      </Td>
                      <Td>{emp.cnpj}</Td>
                      <Td>{emp.website}</Td>
                      <Td>
                        <Btn variante="secondary" tamanho="sm" onClick={() => abrirEdicao(emp)}>Editar</Btn>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderTop: '1px solid var(--borda)' }}>
            <span style={{ color: 'var(--texto-fraco)', fontSize: 12 }}>
              {filtradas.length} empresa{filtradas.length === 1 ? '' : 's'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={paginaAtual <= 1}
                className="brk-btn brk-btn-ghost brk-btn-sm"
                style={{ opacity: paginaAtual <= 1 ? 0.4 : 1 }}
              >
                ‹
              </button>
              <span style={{ color: 'var(--texto-fraco)', fontSize: 12 }}>
                Página {paginaAtual} de {totalPaginas}
              </span>
              <button
                type="button"
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaAtual >= totalPaginas}
                className="brk-btn brk-btn-ghost brk-btn-sm"
                style={{ opacity: paginaAtual >= totalPaginas ? 0.4 : 1 }}
              >
                ›
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Modal Nova Empresa (layout do wireframe) */}
      {modalNova && (
        <Overlay onFechar={() => setModalNova(false)}>
          <form
            onSubmit={salvarNova}
            className="brk-card brk-card-p"
            style={{ width: 460, maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--texto)' }}>Nova Empresa</h2>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--texto-fraco)' }}>
                  Preencha os dados da empresa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalNova(false)}
                title="Fechar"
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--texto-fraco)', padding: 4, lineHeight: 0 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {erroForm && <MensagemErro texto={erroForm} />}

            {/* Nome */}
            <div>
              <LabelCampo>Nome *</LabelCampo>
              <input className="brk-input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Razão Social ou Nome Fantasia" autoFocus />
            </div>

            {/* CNPJ + Site */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <LabelCampo>CNPJ</LabelCampo>
                <input className="brk-input" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" />
              </div>
              <div style={{ flex: 1 }}>
                <LabelCampo>Site</LabelCampo>
                <input className="brk-input" value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://..." />
              </div>
            </div>

            {/* Segmento + Porte */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <LabelCampo>Segmento</LabelCampo>
                <input className="brk-input" value={segmento} onChange={(e) => setSegmento(e.target.value)} placeholder="Ex: Tecnologia" />
              </div>
              <div style={{ flex: 1 }}>
                <LabelCampo>Porte</LabelCampo>
                <select className="brk-input" value={porte} onChange={(e) => setPorte(e.target.value)}>
                  <option value="">Selecionar</option>
                  <option value="MEI">MEI</option>
                  <option value="Micro">Micro</option>
                  <option value="Pequena">Pequena</option>
                  <option value="Média">Média</option>
                  <option value="Grande">Grande</option>
                </select>
              </div>
            </div>

            {/* Cidade + Estado */}
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <LabelCampo>Cidade</LabelCampo>
                <input className="brk-input" value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="São Paulo" />
              </div>
              <div style={{ flex: 1 }}>
                <LabelCampo>Estado</LabelCampo>
                <input className="brk-input" value={estado} onChange={(e) => setEstado(e.target.value)} placeholder="SP" />
              </div>
            </div>

            {/* Empresa Mãe (busca entre empresas cadastradas) */}
            <div style={{ position: 'relative' }}>
              <LabelCampo>Empresa Mãe (opcional)</LabelCampo>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--texto-fraco)', display: 'flex', pointerEvents: 'none' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                </span>
                <input
                  className="brk-input"
                  value={empresaMae}
                  onChange={(e) => { setEmpresaMae(e.target.value); setMaeFoco(true); }}
                  onFocus={() => setMaeFoco(true)}
                  onBlur={() => setTimeout(() => setMaeFoco(false), 150)}
                  placeholder="Buscar empresa mãe..."
                  style={{ paddingLeft: 32 }}
                />
              </div>
              {maeFoco && (() => {
                const q = empresaMae.trim().toLowerCase();
                const sug = empresas.filter((e) => e.nome.toLowerCase().includes(q) && (!q || e.nome.toLowerCase() !== q)).slice(0, 8);
                if (sug.length === 0) return null;
                return (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 5, marginTop: 4, background: 'var(--superficie)', border: '1px solid var(--borda)', borderRadius: 9, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', maxHeight: 200, overflowY: 'auto' }}>
                    {sug.map((e) => (
                      <button
                        key={e.nome}
                        type="button"
                        onMouseDown={(ev) => { ev.preventDefault(); setEmpresaMae(e.nome); setMaeFoco(false); }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '8px 12px', color: 'var(--texto)', fontSize: 13, cursor: 'pointer' }}
                        onMouseEnter={(ev) => { ev.currentTarget.style.background = 'var(--superficie-3)'; }}
                        onMouseLeave={(ev) => { ev.currentTarget.style.background = 'transparent'; }}
                      >
                        {e.nome}
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>

            <button type="submit" className="brk-btn brk-btn-primary" disabled={salvando} style={{ width: '100%', marginTop: 4 }}>
              {salvando ? 'Salvando…' : 'Criar Empresa'}
            </button>
          </form>
        </Overlay>
      )}

      {editando && (
        <Modal
          titulo="Editar empresa"
          onFechar={() => { if (!salvandoEd) setEditando(null); }}
          rodape={
            <>
              <Btn variante="ghost" onClick={() => setEditando(null)} disabled={salvandoEd}>Cancelar</Btn>
              <Btn variante="primary" onClick={salvarEdicao} disabled={salvandoEd}>{salvandoEd ? 'Salvando…' : 'Salvar'}</Btn>
            </>
          }
        >
          {erroEd && <div style={{ marginBottom: 12 }}><Alerta tipo="erro">{erroEd}</Alerta></div>}
          <div style={{ display: 'grid', gap: 12 }}>
            <Campo rotulo="Empresa" value={formEd.nome} onChange={(e) => setFormEd({ ...formEd, nome: e.target.value })} />
            <Campo rotulo="CNPJ" value={formEd.cnpj} onChange={(e) => setFormEd({ ...formEd, cnpj: e.target.value })} placeholder="00.000.000/0001-00" />
            <Campo rotulo="Site" value={formEd.website} onChange={(e) => setFormEd({ ...formEd, website: e.target.value })} placeholder="https://..." />
            <Campo rotulo="Segmento" value={formEd.segmento} onChange={(e) => setFormEd({ ...formEd, segmento: e.target.value })} placeholder="Ex: Tecnologia" />
            <Campo rotulo="Porte" value={formEd.porte} onChange={(e) => setFormEd({ ...formEd, porte: e.target.value })} placeholder="MEI, Micro, Pequena, Média, Grande" />
            <Campo rotulo="Cidade" value={formEd.cidade} onChange={(e) => setFormEd({ ...formEd, cidade: e.target.value })} placeholder="São Paulo" />
            <Campo rotulo="Estado" value={formEd.estado} onChange={(e) => setFormEd({ ...formEd, estado: e.target.value })} placeholder="SP" />
            <Campo rotulo="Empresa Mãe" value={formEd.empresaMae} onChange={(e) => setFormEd({ ...formEd, empresaMae: e.target.value })} placeholder="Empresa mãe (opcional)" />
          </div>
        </Modal>
      )}
    </section>
  );
}

// Rótulo de campo do modal (mesmo padrão visual do design system).
function LabelCampo({ children }: { children: ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)', marginBottom: 5 }}>
      {children}
    </label>
  );
}
