import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { PaginaShell, EstadoCarregando, EstadoErro } from '../components/primitivos';

interface FaturaItem { id: string; codigoUnico: string; valor: string; vencimento: string; cliente?: { nomeFantasia: string } }
interface BugItem { id: string; titulo: string; severidade: string; status: string }
interface ContratoItem { id: string; codigoUnico: string; status: string; cliente?: { nomeFantasia: string } }
interface CompraItem { id: string; descricao: string; valor: string | null; criadoEm: string }
interface ConteudoItem { id: string; titulo: string; status: string; cliente?: { nomeFantasia: string } }

interface InboxData {
  faturasVencidas: FaturaItem[];
  bugsCriticos: BugItem[];
  contratosRevisao: ContratoItem[];
  comprasSolicitadas: CompraItem[];
  conteudosSla: ConteudoItem[];
  conteudosAprovar: ConteudoItem[];
}

const STATUS_CONTEUDO: Record<string, string> = {
  PRODUCAO: 'Produção',
  REVISAO: 'Revisão',
  APROVACAO_CLIENTE: 'Aprovação cliente',
};

function SecaoPendencias({
  titulo, icone, cor, total, children,
}: { titulo: string; icone: React.ReactNode; cor: string; total: number; children: React.ReactNode }) {
  if (total === 0) return null;
  return (
    <div className="brk-inbox-secao">
      <div className="brk-inbox-secao-header">
        <span className="brk-inbox-secao-ico" style={{ color: cor }}>{icone}</span>
        <span className="brk-inbox-secao-titulo">{titulo}</span>
        <span className="brk-inbox-secao-badge" style={{ background: cor + '22', color: cor }}>{total}</span>
      </div>
      <div className="brk-inbox-lista">{children}</div>
    </div>
  );
}

function ItemInbox({ label, sub, link, cor }: { label: string; sub?: string; link: string; cor?: string }) {
  return (
    <Link to={link} className="brk-inbox-item">
      {cor && <span className="brk-inbox-item-ponto" style={{ background: cor }} />}
      <span className="brk-inbox-item-label">{label}</span>
      {sub && <span className="brk-inbox-item-sub">{sub}</span>}
      <svg className="brk-inbox-item-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
      </svg>
    </Link>
  );
}

function IcoAlerta() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
function IcoBug() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2l1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3.003 3.003 0 116 0v1" /><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6z" /><path d="M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5m3 8H2m1 4h2.5M20.97 5c0 2.1-1.6 3.8-3.5 4m.53 4h4m-1 4h-2.5" />
    </svg>
  );
}
function IcoContrato() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
function IcoCompra() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}
function IcoConteudo() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
    </svg>
  );
}

export function Inbox() {
  const [dados, setDados] = useState<InboxData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  async function carregar() {
    setCarregando(true); setErro(false);
    try {
      const { data } = await api.get<InboxData>('/painel/inbox');
      setDados(data);
    } catch { setErro(true); }
    finally { setCarregando(false); }
  }

  useEffect(() => { carregar(); }, []);

  const total = dados
    ? dados.faturasVencidas.length + dados.bugsCriticos.length + dados.contratosRevisao.length +
      dados.comprasSolicitadas.length + dados.conteudosSla.length + dados.conteudosAprovar.length
    : 0;

  return (
    <PaginaShell
      titulo="Inbox"
      subtitulo="Itens que precisam de atenção agora"
    >
      {carregando ? (
        <EstadoCarregando />
      ) : erro ? (
        <EstadoErro mensagem="Não foi possível carregar o inbox." onTentar={carregar} />
      ) : total === 0 ? (
        <div className="brk-inbox-vazio">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--texto-fraco)', marginBottom: 12 }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--texto-suave)' }}>Tudo em dia!</p>
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)', marginTop: 4 }}>Nenhuma pendência encontrada no momento.</p>
        </div>
      ) : (
        <div className="brk-inbox-grid">
          <SecaoPendencias titulo="Faturas vencidas" icone={<IcoAlerta />} cor="#e2738a" total={dados!.faturasVencidas.length}>
            {dados!.faturasVencidas.map((f) => (
              <ItemInbox
                key={f.id}
                link="/cobrancas"
                label={f.cliente?.nomeFantasia ?? f.codigoUnico}
                sub={`R$ ${Number(f.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · venceu ${new Date(f.vencimento).toLocaleDateString('pt-BR')}`}
                cor="#e2738a"
              />
            ))}
          </SecaoPendencias>

          <SecaoPendencias titulo="Bugs críticos" icone={<IcoBug />} cor="#ca3f17" total={dados!.bugsCriticos.length}>
            {dados!.bugsCriticos.map((b) => (
              <ItemInbox key={b.id} link="/desenvolvimento" label={b.titulo} sub={b.status} cor="#ca3f17" />
            ))}
          </SecaoPendencias>

          <SecaoPendencias titulo="Contratos para revisar" icone={<IcoContrato />} cor="#ff9406" total={dados!.contratosRevisao.length}>
            {dados!.contratosRevisao.map((c) => (
              <ItemInbox key={c.id} link="/contratos" label={c.cliente?.nomeFantasia ?? c.codigoUnico} sub="Aguardando revisão" cor="#ff9406" />
            ))}
          </SecaoPendencias>

          <SecaoPendencias titulo="Conteúdos aguardando cliente" icone={<IcoConteudo />} cor="#4aa3f0" total={dados!.conteudosAprovar.length}>
            {dados!.conteudosAprovar.map((c) => (
              <ItemInbox key={c.id} link="/conteudos" label={c.titulo} sub={c.cliente?.nomeFantasia} cor="#4aa3f0" />
            ))}
          </SecaoPendencias>

          <SecaoPendencias titulo="Conteúdos parados +72h (SLA)" icone={<IcoConteudo />} cor="#ff9406" total={dados!.conteudosSla.length}>
            {dados!.conteudosSla.map((c) => (
              <ItemInbox key={c.id} link="/conteudos" label={c.titulo} sub={`${c.cliente?.nomeFantasia} · ${STATUS_CONTEUDO[c.status] ?? c.status}`} cor="#ff9406" />
            ))}
          </SecaoPendencias>

          <SecaoPendencias titulo="Compras aguardando aprovação" icone={<IcoCompra />} cor="#9aa0ad" total={dados!.comprasSolicitadas.length}>
            {dados!.comprasSolicitadas.map((c) => (
              <ItemInbox key={c.id} link="/compras" label={c.descricao} sub={c.valor ? `R$ ${Number(c.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : undefined} cor="#9aa0ad" />
            ))}
          </SecaoPendencias>
        </div>
      )}
    </PaginaShell>
  );
}
