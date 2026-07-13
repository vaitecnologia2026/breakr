// Aprovações interdepartamentais de campanhas de marketing (Briefing Marketing —
// Seção 8). Caixa do departamento (Gestão/Financeiro): dar aval, sugerir ajuste ou
// reprovar campanhas de clientes multi-pilar. Somente leitura + as 3 decisões.
import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { PaginaHeader, Btn, Badge, Carregando, Vazio, ErroEstado } from '../components/ui';
import { GuiaJornadaMarketing } from '../components/GuiaJornadaMarketing';

interface HistoricoItem {
  de: string | null; para: string | null; autorNome: string | null;
  comentario: string | null; criadoEm: string;
}
interface Aprovacao {
  id: string; nome: string; situacao: string;
  statusAprovacaoInterna: string | null; aprovacaoInternaComentario: string | null;
  cliente: string | null; pilares: string[]; squad: string | null;
  historico: HistoricoItem[];
}

const STATUS_ROTULO: Record<string, string> = {
  AGUARDANDO_GESTAO: 'Aguard. Gestão',
  AGUARDANDO_FINANCEIRO: 'Aguard. Financeiro',
  APROVADO_INT: 'Aprovado Int.',
  EM_ALINHAMENTO: 'Em Alinhamento',
};
function corStatus(s: string | null): 'verde' | 'amarelo' | 'vermelho' | 'neutro' {
  if (s === 'APROVADO_INT') return 'verde';
  if (s === 'EM_ALINHAMENTO') return 'vermelho';
  if (s === 'AGUARDANDO_GESTAO' || s === 'AGUARDANDO_FINANCEIRO') return 'amarelo';
  return 'neutro';
}

export function AprovacoesMarketing() {
  const [itens, setItens] = useState<Aprovacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(() => {
    setCarregando(true);
    setErro(false);
    api.get<Aprovacao[]>('/campanhas-marketing/aprovacoes-internas')
      .then(({ data }) => setItens(data))
      .catch(() => setErro(true))
      .finally(() => setCarregando(false));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div>
      <PaginaHeader
        titulo="Aprovações internas"
        subtitulo="Validação interdepartamental de campanhas de clientes multi-pilar (Seção 8 do briefing)."
        acoes={<Btn variante="secondary" onClick={carregar}>Atualizar</Btn>}
      />

      <GuiaJornadaMarketing etapaAtual="aprovacao-interna" />

      {carregando && <Carregando />}
      {!carregando && erro && <ErroEstado mensagem="Não foi possível carregar as aprovações." onTentar={carregar} />}
      {!carregando && !erro && itens.length === 0 && (
        <Vazio titulo="Nenhuma aprovação" subtitulo="Nenhuma campanha em aprovação interdepartamental." />
      )}

      {!carregando && !erro && itens.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {itens.map((a) => <CardAprovacao key={a.id} item={a} aoMudar={carregar} />)}
        </div>
      )}
    </div>
  );
}

function CardAprovacao({ item, aoMudar }: { item: Aprovacao; aoMudar: () => void }) {
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const pendente =
    item.statusAprovacaoInterna === 'AGUARDANDO_GESTAO' ||
    item.statusAprovacaoInterna === 'AGUARDANDO_FINANCEIRO';

  async function decidir(decisao: 'APROVAR' | 'AJUSTE' | 'REPROVAR') {
    setEnviando(true);
    try {
      await api.post(`/campanhas-marketing/${item.id}/aprovacao-interna/decidir`, {
        decisao,
        comentario: comentario.trim() || undefined,
      });
      aoMudar();
    } catch {
      setEnviando(false);
    }
  }

  return (
    <div className="brk-card brk-card-p" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--texto)' }}>{item.nome}</span>
          <span style={{ fontSize: 12, color: 'var(--texto-suave)' }}>
            {' '}· {item.cliente ?? '—'}{item.squad ? ` · ${item.squad}` : ''}
          </span>
        </div>
        <Badge cor={corStatus(item.statusAprovacaoInterna)}>
          {STATUS_ROTULO[item.statusAprovacaoInterna ?? ''] ?? item.statusAprovacaoInterna}
        </Badge>
      </div>
      {item.pilares.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {item.pilares.map((p) => <Badge key={p} cor="azul">{p}</Badge>)}
        </div>
      )}

      {pendente && (
        <>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Comentário (recomendado para ajuste/reprovar)"
            rows={2}
            disabled={enviando}
            className="brk-input"
            style={{ resize: 'vertical', fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn variante="primary" onClick={() => decidir('APROVAR')} disabled={enviando}>Aprovar</Btn>
            <Btn variante="secondary" onClick={() => decidir('AJUSTE')} disabled={enviando}>Sugerir ajuste</Btn>
            <Btn variante="secondary" onClick={() => decidir('REPROVAR')} disabled={enviando}>Reprovar</Btn>
          </div>
        </>
      )}

      {item.historico.length > 0 && (
        <div style={{ borderTop: '1px solid var(--borda)', paddingTop: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--texto-suave)' }}>Histórico</span>
          <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {item.historico.map((h, i) => (
              <li key={i} style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>
                {new Date(h.criadoEm).toLocaleDateString('pt-BR')} · {STATUS_ROTULO[h.para ?? ''] ?? h.para}
                {h.comentario ? ` — ${h.comentario}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
