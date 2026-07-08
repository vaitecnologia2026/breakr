// Tela "Contatos" (CRM Comercial) — base de pessoas em tabela paginada.
// Baseada no wireframe DMhub CRM (tela 3), reproduzida com o design system atual
// do Breakr. Página de apresentação: dados estáticos do wireframe — não consome
// API nem altera estruturas existentes.
import { PaginaShell } from '../components/primitivos';
import { Card, Btn, Th, Td } from '../components/ui';

interface Contato {
  nome: string;
  email: string;
  telefone: string;
  cargo: string;
  empresa: string;
  negocios: number;
  proprietario: string;
}

const CONTATOS: Contato[] = [
  { nome: 'Sandro Bonacina', email: '—', telefone: '—', cargo: '—', empresa: '—', negocios: 1, proprietario: 'Gustavo Costa' },
  { nome: 'Jeferson Luis Gerhardt', email: '—', telefone: '—', cargo: '—', empresa: '—', negocios: 1, proprietario: 'Gustavo Costa' },
  { nome: 'Virginia Fernandes Pillon', email: '—', telefone: '(55) 99907-8182', cargo: '—', empresa: '—', negocios: 1, proprietario: 'Gustavo Costa' },
  { nome: 'Karina Cioriano', email: '—', telefone: '—', cargo: '—', empresa: 'Cyborg Lanches', negocios: 2, proprietario: 'Gustavo Costa' },
  { nome: 'Matheus Branco', email: '—', telefone: '—', cargo: 'CEO', empresa: 'Gibbous Burger', negocios: 1, proprietario: 'Gustavo Costa' },
  { nome: 'Jose H. R. S. Marques', email: 'josehenrique…@gmail.com', telefone: '+55 51 9573-5418', cargo: '—', empresa: '—', negocios: 2, proprietario: 'Gustavo Costa' },
  { nome: 'Felippe Baumbach Nascimento', email: '—', telefone: '+55 51 8219-0453', cargo: 'CFO', empresa: '—', negocios: 2, proprietario: 'Gustavo Costa' },
];

export function Contatos() {
  return (
    <PaginaShell
      titulo="Contatos"
      subtitulo="Base de 277 pessoas — busca, exportação e criação"
      acao={<Btn variante="primary">+ Novo Contato</Btn>}
    >
      <Card style={{ padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="brk-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <Th>Nome</Th><Th>Email</Th><Th>Telefone</Th><Th>Cargo</Th><Th>Empresa</Th><Th>Neg.</Th><Th>Proprietário</Th>
              </tr>
            </thead>
            <tbody>
              {CONTATOS.map((c, i) => (
                <tr key={i}>
                  <Td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--superficie-4)', color: 'var(--texto-suave)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{c.nome.charAt(0)}</span>
                      {c.nome}
                    </span>
                  </Td>
                  <Td>{c.email}</Td>
                  <Td>{c.telefone}</Td>
                  <Td>{c.cargo}</Td>
                  <Td>{c.empresa}</Td>
                  <Td>{c.negocios}</Td>
                  <Td>{c.proprietario}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderTop: '1px solid var(--borda)' }}>
          <span style={{ color: 'var(--texto-fraco)', fontSize: 12 }}>277 contatos</span>
          <span style={{ color: 'var(--texto-fraco)', fontSize: 12 }}>‹ Página 1 de 6 ›</span>
        </div>
      </Card>
    </PaginaShell>
  );
}
