// Tela "Contatos" (CRM Comercial) — pessoas derivadas dos Leads reais
// (/comercial/leads). Cada contato é agregado por e-mail (ou nome) com a
// contagem de negócios. Estados carregando/erro/vazio no padrão do app.
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { comDemo, mockSeDemo } from '../lib/demo';
import { PaginaShell, EstadoCarregando, EstadoErro, PainelVazio } from '../components/primitivos';
import { Card, Th, Td } from '../components/ui';

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
      });
    }
  }
  return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome));
}

export function Contatos() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

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
                  <Th>Nome</Th><Th>Email</Th><Th>Telefone</Th><Th>Empresa</Th><Th>Neg.</Th><Th>Proprietário</Th>
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
    </PaginaShell>
  );
}
