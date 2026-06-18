import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  PaginaShell,
  BotaoPrimario,
  EstadoCarregando,
  EstadoErro,
  PainelVazio,
} from '../components/primitivos';
import { Card } from '../components/ui';
import { comDemo, mockSeDemo } from '../lib/demo';

/**
 * Educacional — catálogo de cursos/treinamentos (links externos: Hotmart etc.).
 *  GET    /educacional
 *  POST   /educacional { titulo, descricao?, url, plataforma? }   (admin)
 *  DELETE /educacional/:id                                        (admin)
 */

interface Curso {
  id: string;
  titulo: string;
  descricao: string | null;
  url: string;
  plataforma: string | null;
}

const rotulo: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)', marginBottom: 4, display: 'block' };
function inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="brk-input" style={{ width: '100%', ...props.style }} />;
}

const MOCK_CURSOS: Curso[] = [
  { id: 'c1', titulo: 'Tráfego Pago Avançado — Meta Ads', descricao: 'Estratégias de escala, testes criativos e otimização de campanhas no Meta Business Suite.', url: 'https://hotmart.com', plataforma: 'Hotmart' },
  { id: 'c2', titulo: 'Copywriting para Redes Sociais', descricao: 'Técnicas de escrita persuasiva para posts, legendas e anúncios de alta conversão.', url: 'https://hotmart.com', plataforma: 'Hotmart' },
  { id: 'c3', titulo: 'Edição de Vídeo no CapCut Pro', descricao: 'Edição ágil para Reels e Stories com templates e motion graphics.', url: 'https://youtube.com', plataforma: 'YouTube' },
  { id: 'c4', titulo: 'Gestão de Clientes (CS) na Agência', descricao: 'Como fazer onboarding, gestão de expectativas e retenção em agências de marketing.', url: 'https://hotmart.com', plataforma: 'Hotmart' },
];

export function Educacional() {
  const { usuario } = useAuth();
  const ehAdmin = usuario?.cargo === 'SUPERADMIN' || usuario?.cargo === 'ADMIN';

  const [cursos, setCursos] = useState<Curso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [url, setUrl] = useState('');
  const [plataforma, setPlataforma] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    setErro(false);
    try {
      const { data } = await api.get<Curso[]>('/educacional');
      setCursos(comDemo(data, MOCK_CURSOS));
    } catch {
      setCursos(mockSeDemo(MOCK_CURSOS));
      setErro(false);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function adicionar() {
    if (!titulo.trim() || !url.trim() || salvando) return;
    setSalvando(true);
    try {
      await api.post('/educacional', {
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        url: url.trim(),
        plataforma: plataforma.trim() || undefined,
      });
      setTitulo(''); setDescricao(''); setUrl(''); setPlataforma('');
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id: string) {
    await api.delete(`/educacional/${id}`);
    carregar();
  }

  if (carregando) return <EstadoCarregando />;
  if (erro) return <EstadoErro mensagem="Falha ao carregar os cursos." onTentar={carregar} />;

  return (
    <PaginaShell titulo="Educacional" subtitulo="Cursos e treinamentos disponíveis para o time.">
      {ehAdmin && (
        <Card>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Novo curso</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div><label style={rotulo}>Título</label>{inp({ value: titulo, onChange: (e) => setTitulo(e.target.value), placeholder: 'Tráfego avançado' })}</div>
            <div><label style={rotulo}>URL</label>{inp({ value: url, onChange: (e) => setUrl(e.target.value), placeholder: 'https://hotmart.com/...' })}</div>
            <div><label style={rotulo}>Plataforma</label>{inp({ value: plataforma, onChange: (e) => setPlataforma(e.target.value), placeholder: 'Hotmart' })}</div>
            <div><label style={rotulo}>Descrição</label>{inp({ value: descricao, onChange: (e) => setDescricao(e.target.value) })}</div>
            <div>
              <BotaoPrimario onClick={adicionar} disabled={salvando || !titulo.trim() || !url.trim()}>
                {salvando ? 'Adicionando…' : 'Adicionar curso'}
              </BotaoPrimario>
            </div>
          </div>
        </Card>
      )}

      {cursos.length === 0 ? (
        <PainelVazio titulo="Nenhum curso ainda" descricao="Os cursos disponibilizados aparecerão aqui." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {cursos.map((c) => (
            <Card key={c.id}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {c.plataforma && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--cinza-vapor)', textTransform: 'uppercase' }}>{c.plataforma}</span>}
                <span style={{ fontSize: 15, fontWeight: 700 }}>{c.titulo}</span>
                {c.descricao && <span style={{ fontSize: 13, color: 'var(--texto-fraco)' }}>{c.descricao}</span>}
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="brk-gradient-bg" style={{ marginTop: 4, alignSelf: 'flex-start', padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', textDecoration: 'none' }}>
                  Acessar curso →
                </a>
                {ehAdmin && (
                  <button type="button" onClick={() => remover(c.id)} style={{ alignSelf: 'flex-start', marginTop: 4, background: 'none', border: 'none', color: 'var(--texto-fraco)', fontSize: 12, cursor: 'pointer', padding: 0 }}>
                    Remover
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </PaginaShell>
  );
}
