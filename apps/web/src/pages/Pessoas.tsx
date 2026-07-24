// Tela "Pessoas" (Contatos → Pessoas) — lista de pessoas no layout do wireframe:
// colunas Nome, Email, Telefone, Cargo, Empresa, Negócios, Proprietário, com
// busca, Exportar (CSV), Novo Contato e paginação.
//
// ADITIVO: reutiliza a MESMA fonte de dados da tela Contatos (/comercial/leads,
// agregados por pessoa) — sem alterar a página Contatos nem sua lógica.
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { api } from '../lib/api';
import { comDemo, mockSeDemo } from '../lib/demo';
import { EstadoCarregando, EstadoErro, PainelVazio, Overlay, BotaoPrimario, BotaoSecundario, MensagemErro } from '../components/primitivos';
import { Card, Th, Td, Btn, Campo, Modal, Alerta } from '../components/ui';

interface Lead {
  id: string;
  nome: string;
  empresa: string | null;
  email: string | null;
  telefone: string | null;
  cargo?: string | null;
  responsavel?: { nome: string } | null;
}

interface Pessoa {
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  empresa: string;
  negocios: number;
  proprietario: string;
  ids: string[];
}

const MOCK_LEADS: Lead[] = [
  { id: 'm1', nome: 'Sandro Bonacina', empresa: 'Bonacina Pizzaria', email: null, telefone: null, responsavel: { nome: 'Gustavo Costa' } },
  { id: 'm2', nome: 'Karina Cioriano', empresa: 'Cyborg Lanches', email: null, telefone: null, responsavel: { nome: 'Gustavo Costa' } },
  { id: 'm3', nome: 'Matheus Branco', empresa: 'Gibbous Burger', email: null, telefone: null, responsavel: { nome: 'Gustavo Costa' } },
];

const POR_PAGINA = 50;

// Agrega os leads em pessoas únicas (chave: e-mail em minúsculas ou nome).
function agregarPessoas(leads: Lead[]): Pessoa[] {
  const mapa = new Map<string, Pessoa>();
  for (const l of leads) {
    const chave = (l.email?.trim().toLowerCase() || l.nome.trim().toLowerCase());
    const atual = mapa.get(chave);
    if (atual) {
      atual.negocios += 1;
      atual.ids.push(l.id);
      if (atual.email === '—' && l.email) atual.email = l.email;
      if (atual.telefone === '—' && l.telefone) atual.telefone = l.telefone;
      if (atual.cargo === '—' && l.cargo) atual.cargo = l.cargo;
      if (atual.empresa === '—' && l.empresa) atual.empresa = l.empresa;
    } else {
      mapa.set(chave, {
        nome: l.nome,
        email: l.email || '—',
        telefone: l.telefone || '—',
        cargo: l.cargo || '—',
        empresa: l.empresa || '—',
        negocios: 1,
        proprietario: l.responsavel?.nome || '—',
        ids: [l.id],
      });
    }
  }
  return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome));
}

function escaparCsv(v: string): string {
  const s = String(v ?? '');
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function Pessoas() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);

  // Modal "Novo Contato".
  const [modalNovo, setModalNovo] = useState(false);
  const [nome, setNome] = useState('');
  const [emails, setEmails] = useState<{ valor: string; tipo: string }[]>([{ valor: '', tipo: 'Comercial' }]);
  const [telefones, setTelefones] = useState<{ valor: string; tipo: string }[]>([{ valor: '', tipo: 'Celular' }]);
  const [cargo, setCargo] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [empresasCadastradas, setEmpresasCadastradas] = useState<string[]>([]);
  const [empresaFoco, setEmpresaFoco] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  // Edição de um contato existente (aplica nos leads subjacentes).
  const [editando, setEditando] = useState<Pessoa | null>(null);
  const [formEd, setFormEd] = useState<{ nome: string; email: string; telefone: string; cargo: string; empresa: string }>({ nome: '', email: '', telefone: '', cargo: '', empresa: '' });
  const [salvandoEd, setSalvandoEd] = useState(false);
  const [erroEd, setErroEd] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    setErro(null);
    try {
      const { data } = await api.get<Lead[]>('/comercial/leads');
      setLeads(comDemo(data, MOCK_LEADS));
    } catch {
      setLeads(mockSeDemo(MOCK_LEADS));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const pessoas = useMemo(() => agregarPessoas(leads), [leads]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return pessoas;
    return pessoas.filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.telefone.toLowerCase().includes(q) ||
        p.empresa.toLowerCase().includes(q),
    );
  }, [pessoas, busca]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtradas.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA);

  // Reseta a página ao mudar a busca.
  useEffect(() => {
    setPagina(1);
  }, [busca]);

  function exportarCsv() {
    const cab = ['Nome', 'Email', 'Telefone', 'Cargo', 'Empresa', 'Negócios', 'Proprietário'];
    const linhas = filtradas.map((p) =>
      [p.nome, p.email, p.telefone, p.cargo, p.empresa, String(p.negocios), p.proprietario].map(escaparCsv).join(','),
    );
    const csv = '﻿' + [cab.join(','), ...linhas].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pessoas.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetFormNovo() {
    setNome('');
    setEmails([{ valor: '', tipo: 'Comercial' }]);
    setTelefones([{ valor: '', tipo: 'Celular' }]);
    setCargo('');
    setEmpresa('');
    setEmpresaFoco(false);
  }

  // Abre o modal e carrega as empresas cadastradas (clientes) para a busca real.
  async function abrirModalNovo() {
    setErroForm(null);
    resetFormNovo();
    setModalNovo(true);
    try {
      const { data } = await api.get<{ nomeFantasia?: string | null }[]>('/clientes');
      const nomes = Array.from(
        new Set((data ?? []).map((c) => (c.nomeFantasia ?? '').trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b));
      setEmpresasCadastradas(nomes);
    } catch {
      setEmpresasCadastradas([]);
    }
  }

  async function salvarNovo(e: FormEvent) {
    e.preventDefault();
    if (salvando) return;
    if (nome.trim().length < 2) {
      setErroForm('Informe o nome (mínimo 2 caracteres).');
      return;
    }
    setSalvando(true);
    setErroForm(null);
    try {
      // O backend (/comercial/leads) guarda 1 e-mail e 1 telefone: envia o primeiro de cada.
      await api.post('/comercial/leads', {
        nome: nome.trim(),
        email: emails[0]?.valor.trim() || undefined,
        telefone: telefones[0]?.valor.trim() || undefined,
        cargo: cargo.trim() || undefined,
        empresa: empresa.trim() || undefined,
      });
      setModalNovo(false);
      resetFormNovo();
      carregar();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErroForm(Array.isArray(msg) ? msg.join(' ') : msg ?? 'Não foi possível criar o contato.');
    } finally {
      setSalvando(false);
    }
  }

  // Abre o modal de edição com os valores atuais (— vira vazio).
  function abrirEdicao(p: Pessoa) {
    setErroEd(null);
    setFormEd({
      nome: p.nome === '—' ? '' : p.nome,
      email: p.email === '—' ? '' : p.email,
      telefone: p.telefone === '—' ? '' : p.telefone,
      cargo: p.cargo === '—' ? '' : p.cargo,
      empresa: p.empresa === '—' ? '' : p.empresa,
    });
    setEditando(p);
  }

  // Salva o contato: aplica os campos em cada lead subjacente (PATCH) e recarrega.
  async function salvarEdicao() {
    if (!editando) return;
    const nome = formEd.nome.trim();
    if (!nome) {
      setErroEd('Informe o nome do contato.');
      return;
    }
    // Só envia e-mail quando preenchido (o backend valida como e-mail; vazio
    // significa "não alterar" para não invalidar o cadastro existente).
    const email = formEd.email.trim();
    const payload: { nome: string; telefone: string; cargo: string; empresa: string; email?: string } = {
      nome,
      telefone: formEd.telefone.trim(),
      cargo: formEd.cargo.trim(),
      empresa: formEd.empresa.trim(),
    };
    if (email) payload.email = email;
    setSalvandoEd(true);
    setErroEd(null);
    try {
      await Promise.all(editando.ids.map((id) => api.patch(`/comercial/leads/${id}`, payload)));
      setEditando(null);
      await carregar();
    } catch {
      setErroEd('Não foi possível salvar o contato. Tente novamente.');
    } finally {
      setSalvandoEd(false);
    }
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header no padrão do wireframe: título + contagem + busca + Exportar + Novo Contato */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 className="brk-pagina-titulo" style={{ margin: 0 }}>Pessoas</h1>
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
            {pessoas.length}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--texto-fraco)', display: 'flex', pointerEvents: 'none' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </span>
            <input
              type="text"
              placeholder="Buscar contato..."
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
          <BotaoPrimario onClick={abrirModalNovo}>+ Novo Contato</BotaoPrimario>
        </div>
      </div>

      {carregando ? (
        <EstadoCarregando />
      ) : erro ? (
        <EstadoErro mensagem={erro} onTentar={carregar} />
      ) : pessoas.length === 0 ? (
        <PainelVazio titulo="Nenhum contato ainda" descricao="As pessoas aparecem conforme os leads do comercial forem cadastrados." />
      ) : (
        <Card style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="brk-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <Th>Nome</Th><Th>Email</Th><Th>Telefone</Th><Th>Cargo</Th><Th>Empresa</Th><Th>Negócios</Th><Th>Proprietário</Th><Th>Ações</Th>
                </tr>
              </thead>
              <tbody>
                {visiveis.length === 0 ? (
                  <tr>
                    <Td>—</Td><Td>—</Td><Td>—</Td><Td>—</Td><Td>—</Td><Td>—</Td><Td>—</Td><Td>—</Td>
                  </tr>
                ) : (
                  visiveis.map((p, i) => (
                    <tr key={`${p.nome}-${i}`}>
                      <Td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--superficie-4)', color: 'var(--texto-suave)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{p.nome.charAt(0).toUpperCase()}</span>
                          {p.nome}
                        </span>
                      </Td>
                      <Td>{p.email}</Td>
                      <Td>{p.telefone}</Td>
                      <Td>{p.cargo}</Td>
                      <Td>{p.empresa}</Td>
                      <Td>{p.negocios}</Td>
                      <Td>{p.proprietario}</Td>
                      <Td>
                        <Btn variante="secondary" tamanho="sm" onClick={() => abrirEdicao(p)}>Editar</Btn>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderTop: '1px solid var(--borda)' }}>
            <span style={{ color: 'var(--texto-fraco)', fontSize: 12 }}>
              {filtradas.length} contato{filtradas.length === 1 ? '' : 's'}
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

      {/* Modal Novo Contato (layout do wireframe) */}
      {modalNovo && (
        <Overlay onFechar={() => setModalNovo(false)}>
          <form
            onSubmit={salvarNovo}
            className="brk-card brk-card-p"
            style={{ width: 460, maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            {/* Cabeçalho + fechar */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--texto)' }}>Novo Contato</h2>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--texto-fraco)' }}>
                  Preencha os dados da pessoa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalNovo(false)}
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
              <input className="brk-input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" autoFocus />
            </div>

            {/* E-mail(s) — tipo + adicionar (guarda o 1º no backend) */}
            <div>
              <LabelCampo>E-mail</LabelCampo>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {emails.map((em, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="brk-input"
                      type="email"
                      value={em.valor}
                      onChange={(e) => setEmails((arr) => arr.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x)))}
                      placeholder="email@empresa.com"
                      style={{ flex: 1 }}
                    />
                    <select
                      className="brk-input"
                      value={em.tipo}
                      onChange={(e) => setEmails((arr) => arr.map((x, j) => (j === i ? { ...x, tipo: e.target.value } : x)))}
                      style={{ width: 120, flexShrink: 0 }}
                    >
                      <option>Comercial</option>
                      <option>Pessoal</option>
                      <option>Outro</option>
                    </select>
                  </div>
                ))}
              </div>
              <LinkAdicionar onClick={() => setEmails((arr) => [...arr, { valor: '', tipo: 'Comercial' }])}>+ Adicionar e-mail</LinkAdicionar>
            </div>

            {/* Telefone(s) — tipo + adicionar (guarda o 1º no backend) */}
            <div>
              <LabelCampo>Telefone</LabelCampo>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {telefones.map((tel, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="brk-input"
                      value={tel.valor}
                      onChange={(e) => setTelefones((arr) => arr.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x)))}
                      placeholder="(11) 99999-9999"
                      style={{ flex: 1 }}
                    />
                    <select
                      className="brk-input"
                      value={tel.tipo}
                      onChange={(e) => setTelefones((arr) => arr.map((x, j) => (j === i ? { ...x, tipo: e.target.value } : x)))}
                      style={{ width: 120, flexShrink: 0 }}
                    >
                      <option>Celular</option>
                      <option>Comercial</option>
                      <option>Residencial</option>
                      <option>Outro</option>
                    </select>
                  </div>
                ))}
              </div>
              <LinkAdicionar onClick={() => setTelefones((arr) => [...arr, { valor: '', tipo: 'Celular' }])}>+ Adicionar telefone</LinkAdicionar>
            </div>

            {/* Cargo (visual — o backend de leads não persiste cargo) */}
            <div>
              <LabelCampo>Cargo</LabelCampo>
              <input className="brk-input" value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex: CEO, Diretor Comercial..." />
            </div>

            {/* Empresa — busca real entre empresas cadastradas (clientes) */}
            <div style={{ position: 'relative' }}>
              <LabelCampo>Empresa</LabelCampo>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--texto-fraco)', display: 'flex', pointerEvents: 'none' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                </span>
                <input
                  className="brk-input"
                  value={empresa}
                  onChange={(e) => { setEmpresa(e.target.value); setEmpresaFoco(true); }}
                  onFocus={() => setEmpresaFoco(true)}
                  onBlur={() => setTimeout(() => setEmpresaFoco(false), 150)}
                  placeholder="Buscar empresa por nome..."
                  style={{ paddingLeft: 32 }}
                />
              </div>
              {empresaFoco && (() => {
                const q = empresa.trim().toLowerCase();
                const sug = empresasCadastradas.filter((n) => !q || n.toLowerCase().includes(q)).slice(0, 8);
                if (sug.length === 0) return null;
                return (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 5, marginTop: 4, background: 'var(--superficie)', border: '1px solid var(--borda)', borderRadius: 9, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', maxHeight: 200, overflowY: 'auto' }}>
                    {sug.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); setEmpresa(n); setEmpresaFoco(false); }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '8px 12px', color: 'var(--texto)', fontSize: 13, cursor: 'pointer' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--superficie-3)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Ação (botão único, largura total) */}
            <button type="submit" className="brk-btn brk-btn-primary" disabled={salvando} style={{ width: '100%', marginTop: 4 }}>
              {salvando ? 'Salvando…' : 'Criar Contato'}
            </button>
          </form>
        </Overlay>
      )}

      {editando && (
        <Modal
          titulo="Editar contato"
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
            <Campo rotulo="Nome" value={formEd.nome} onChange={(e) => setFormEd({ ...formEd, nome: e.target.value })} />
            <Campo rotulo="Email" type="email" value={formEd.email} onChange={(e) => setFormEd({ ...formEd, email: e.target.value })} />
            <Campo rotulo="Telefone" value={formEd.telefone} onChange={(e) => setFormEd({ ...formEd, telefone: e.target.value })} />
            <Campo rotulo="Cargo" value={formEd.cargo} onChange={(e) => setFormEd({ ...formEd, cargo: e.target.value })} placeholder="Ex: CEO, Diretor Comercial..." />
            <Campo rotulo="Empresa" value={formEd.empresa} onChange={(e) => setFormEd({ ...formEd, empresa: e.target.value })} />
          </div>
          {editando.negocios > 1 && (
            <p style={{ marginTop: 12, fontSize: 12, color: 'var(--texto-fraco)' }}>
              Este contato reúne {editando.negocios} negócios; a alteração será aplicada a todos.
            </p>
          )}
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

// Link "+ Adicionar e-mail/telefone" (laranja, como no wireframe).
function LinkAdicionar({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ marginTop: 6, background: 'transparent', border: 'none', color: 'var(--laranja-brasa)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}
    >
      {children}
    </button>
  );
}
