import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  PaginaShell,
  BotaoPrimario,
  EstadoCarregando,
  EstadoErro,
} from '../components/primitivos';
import { Card } from '../components/ui';

/**
 * Perfil do colaborador (RH) — informações + documentos para assinar
 * (folha de pagamento, holerite, manual, contrato, advertências) + alerta de pagamento.
 *  GET   /documentos/meus
 *  PATCH /documentos/:id/assinar
 */

interface Documento {
  id: string;
  tipo: string;
  titulo: string;
  url: string;
  competencia: string | null;
  assinadoEm: string | null;
}

const TIPO_ROTULO: Record<string, string> = {
  HOLERITE: 'Holerite', FOLHA: 'Folha de pagamento', FOLHA_SALARIAL: 'Folha salarial',
  CARTAO_PONTO: 'Cartão de ponto', FOLHA_PONTO: 'Folha de ponto',
  CONTRATO: 'Contrato de trabalho', MANUAL: 'Manual do colaborador',
  ADVERTENCIA: 'Advertência', OUTRO: 'Documento',
};
const PAGAMENTO = ['HOLERITE', 'FOLHA', 'FOLHA_SALARIAL'];

function avatarLocal(userId?: string): string | null {
  if (!userId) return null;
  try { return localStorage.getItem('brk.avatar.' + userId); } catch { return null; }
}

export function Perfil() {
  const { usuario } = useAuth();
  const [docs, setDocs] = useState<Documento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  async function carregar() {
    setCarregando(true); setErro(false);
    try {
      const { data } = await api.get<Documento[]>('/documentos/meus');
      setDocs(data);
    } catch { setErro(true); }
    finally { setCarregando(false); }
  }
  useEffect(() => { carregar(); }, []);

  async function assinar(id: string) {
    await api.patch(`/documentos/${id}/assinar`);
    carregar();
  }

  if (carregando) return <EstadoCarregando />;
  if (erro) return <EstadoErro mensagem="Falha ao carregar o perfil." onTentar={carregar} />;

  const foto = avatarLocal(usuario?.id);
  const iniciais = (usuario?.nome ?? '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
  const pagamentoPendente = docs.filter((d) => PAGAMENTO.includes(d.tipo) && !d.assinadoEm);
  const docsPagamento = docs.filter((d) => PAGAMENTO.includes(d.tipo));
  const outros = docs.filter((d) => !PAGAMENTO.includes(d.tipo));

  function linhaDoc(d: Documento) {
    return (
      <li key={d.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 12px', borderRadius: 8, background: 'var(--superficie-2)', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {TIPO_ROTULO[d.tipo] ?? d.tipo}{d.competencia ? ` · ${d.competencia}` : ''}
          </div>
          <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: 'var(--cinza-vapor)', textDecoration: 'none' }}>
            {d.titulo} →
          </a>
        </div>
        {d.assinadoEm ? (
          <span style={{ fontSize: 12, fontWeight: 700, color: '#67e0a3' }}>Assinado ✓</span>
        ) : (
          <BotaoPrimario onClick={() => assinar(d.id)}>Assinar</BotaoPrimario>
        )}
      </li>
    );
  }

  return (
    <PaginaShell titulo="Meu perfil" subtitulo="Suas informações e documentos do RH.">
      {/* Cabeçalho do colaborador */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {foto ? (
            <img src={foto} alt={usuario?.nome} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <span style={{ width: 64, height: 64, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--superficie-3)', fontWeight: 800, fontSize: 22, color: 'var(--cinza-vapor)' }}>{iniciais || '?'}</span>
          )}
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{usuario?.nome}</div>
            <div style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>{usuario?.cargo} · {usuario?.email}</div>
          </div>
        </div>
      </Card>

      {/* Alerta de pagamento */}
      {pagamentoPendente.length > 0 && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 13.5, fontWeight: 600, color: 'var(--amarelo)' }}>
          💰 Você tem {pagamentoPendente.length} documento(s) de pagamento aguardando sua assinatura.
        </div>
      )}

      {/* Pagamento (folha / holerite) */}
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Pagamento</h3>
        {docsPagamento.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Nenhuma folha/holerite recebido ainda.</p>
        ) : (
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{docsPagamento.map(linhaDoc)}</ul>
        )}
      </Card>

      {/* Documentos (contrato, manual, advertência, ponto) */}
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Documentos e informações</h3>
        {outros.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>Nenhum documento. Manual, contrato e advertências aparecem aqui.</p>
        ) : (
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{outros.map(linhaDoc)}</ul>
        )}
      </Card>

      {/* Atividades */}
      <Card>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Minhas atividades e prioridades</h3>
        <p style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>
          Acompanhe o que está com você e o que está atrasado no <Link to="/" style={{ color: 'var(--cinza-vapor)' }}>seu painel (Meu dia)</Link>.
        </p>
      </Card>
    </PaginaShell>
  );
}
