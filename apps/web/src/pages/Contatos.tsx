// Tela "Contatos" (CRM Comercial) — pessoas derivadas dos Leads reais
// (/comercial/leads). Cada contato é agregado por e-mail (ou nome) com a
// contagem de negócios. Estados carregando/erro/vazio no padrão do app.
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { comDemo, mockSeDemo } from '../lib/demo';
import { PaginaShell, EstadoCarregando, EstadoErro, PainelVazio } from '../components/primitivos';
import { Card, Th, Td, Btn, Campo, Modal, Alerta } from '../components/ui';

interface Lead {
  id: string;
  nome: string;
  empresa: string | null;
  email: string | null;
  telefone: string | null;
  responsavel?: { nome: string } | null;
}

interface Contato {
  nome: string;
  email: string;
  telefone: string;
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

// Agrega os leads em contatos únicos (chave: e-mail em minúsculas ou nome).
function agregarContatos(leads: Lead[]): Contato[] {
  const mapa = new Map<string, Contato>();
  for (const l of leads) {
    const chave = (l.email?.trim().toLowerCase() || l.nome.trim().toLowerCase());
    const atual = mapa.get(chave);
    if (atual) {
      atual.negocios += 1;
      atual.ids.push(l.id);
      if (atual.email === '—' && l.email) atual.email = l.email;
      if (atual.telefone === '—' && l.telefone) atual.telefone = l.telefone;
      if (atual.empresa === '—' && l.empresa) atual.empresa = l.empresa;
    } else {
      mapa.set(chave, {
        nome: l.nome,
        email: l.email || '—',
        telefone: l.telefone || '—',
        empresa: l.empresa || '—',
        negocios: 1,
        proprietario: l.responsavel?.nome || '—',
        ids: [l.id],
      });
    }
  }
  return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome));
}

// Formulário de edição de um contato (nome/email/telefone/empresa).
interface FormContato {
  nome: string;
  email: string;
  telefone: string;
  empresa: string;
}

export function Contatos() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Edição: contato em edição (com seus lead ids) + formulário + estados.
  const [editando, setEditando] = useState<Contato | null>(null);
  const [form, setForm] = useState<FormContato>({ nome: '', email: '', telefone: '', empresa: '' });
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);

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

  const contatos = agregarContatos(leads);

  // Abre o modal de edição com os valores atuais do contato (— vira vazio).
  function abrirEdicao(c: Contato) {
    setErroSalvar(null);
    setForm({
      nome: c.nome === '—' ? '' : c.nome,
      email: c.email === '—' ? '' : c.email,
      telefone: c.telefone === '—' ? '' : c.telefone,
      empresa: c.empresa === '—' ? '' : c.empresa,
    });
    setEditando(c);
  }

  // Salva o contato: aplica os campos em cada lead subjacente (PATCH) e recarrega.
  async function salvarEdicao() {
    if (!editando) return;
    const nome = form.nome.trim();
    if (!nome) {
      setErroSalvar('Informe o nome do contato.');
      return;
    }
    // Só envia e-mail quando preenchido (o backend valida como e-mail; vazio
    // significa "não alterar" para não quebrar o cadastro existente).
    const email = form.email.trim();
    const payload: { nome: string; telefone: string; empresa: string; email?: string } = {
      nome,
      telefone: form.telefone.trim(),
      empresa: form.empresa.trim(),
    };
    if (email) payload.email = email;
    setSalvando(true);
    setErroSalvar(null);
    try {
      await Promise.all(editando.ids.map((id) => api.patch(`/comercial/leads/${id}`, payload)));
      setEditando(null);
      await carregar();
    } catch {
      setErroSalvar('Não foi possível salvar o contato. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <PaginaShell titulo="Contatos" subtitulo="Pessoas do comercial (a partir dos leads)">
      {carregando ? (
        <EstadoCarregando />
      ) : erro ? (
        <EstadoErro mensagem={erro} onTentar={carregar} />
      ) : contatos.length === 0 ? (
        <PainelVazio titulo="Nenhum contato ainda" descricao="Os contatos aparecem conforme os leads do comercial forem cadastrados." />
      ) : (
        <Card style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="brk-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <Th>Nome</Th><Th>Email</Th><Th>Telefone</Th><Th>Empresa</Th><Th>Neg.</Th><Th>Proprietário</Th><Th>Ações</Th>
                </tr>
              </thead>
              <tbody>
                {contatos.map((c, i) => (
                  <tr key={i}>
                    <Td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--superficie-4)', color: 'var(--texto-suave)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{c.nome.charAt(0)}</span>
                        {c.nome}
                      </span>
                    </Td>
                    <Td>{c.email}</Td>
                    <Td>{c.telefone}</Td>
                    <Td>{c.empresa}</Td>
                    <Td>{c.negocios}</Td>
                    <Td>{c.proprietario}</Td>
                    <Td>
                      <Btn variante="secondary" tamanho="sm" onClick={() => abrirEdicao(c)}>Editar</Btn>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderTop: '1px solid var(--borda)' }}>
            <span style={{ color: 'var(--texto-fraco)', fontSize: 12 }}>{contatos.length} contato{contatos.length === 1 ? '' : 's'}</span>
          </div>
        </Card>
      )}

      {editando && (
        <Modal
          titulo="Editar contato"
          onFechar={() => { if (!salvando) setEditando(null); }}
          rodape={
            <>
              <Btn variante="ghost" onClick={() => setEditando(null)} disabled={salvando}>Cancelar</Btn>
              <Btn variante="primary" onClick={salvarEdicao} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</Btn>
            </>
          }
        >
          {erroSalvar && <div style={{ marginBottom: 12 }}><Alerta tipo="erro">{erroSalvar}</Alerta></div>}
          <div style={{ display: 'grid', gap: 12 }}>
            <Campo rotulo="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            <Campo rotulo="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Campo rotulo="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            <Campo rotulo="Empresa" value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} />
          </div>
          {editando.negocios > 1 && (
            <p style={{ marginTop: 12, fontSize: 12, color: 'var(--texto-fraco)' }}>
              Este contato reúne {editando.negocios} negócios; a alteração será aplicada a todos.
            </p>
          )}
        </Modal>
      )}
    </PaginaShell>
  );
}
