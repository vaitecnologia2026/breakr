import { useEffect, useState, type FormEvent } from 'react';
import { TipoProjeto } from '@breakr/shared';
import { api } from '../lib/api';
import {
  PaginaHeader, Btn, Campo, CampoSelect, Modal, Badge,
  Carregando, Vazio, ErroEstado, Th, Td,
} from '../components/ui';

/**
 * Cadastro de Planos e Produtos (admin).
 *  Planos:   GET/POST/PATCH /planos    (um plano pode ser composto por N produtos)
 *  Produtos: GET/POST/PATCH /produtos  (produto avulso — vendido solto ou dentro de um plano)
 */
interface ProdutoResumo {
  id: string;
  nome: string;
  valor: string;
}
interface PlanoProduto {
  produtoId: string;
  produto?: ProdutoResumo;
}
interface Plano {
  id: string;
  nome: string;
  valor: string;
  ciclo: string;
  tiposProjeto: TipoProjeto[];
  ativo: boolean;
  produtos?: PlanoProduto[];
}
interface Produto {
  id: string;
  nome: string;
  descricao?: string | null;
  valor: string;
  ativo: boolean;
}

const CICLOS = ['MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'];
const TIPOS: TipoProjeto[] = [TipoProjeto.MARKETING, TipoProjeto.GESTAO, TipoProjeto.FINANCEIRO];

function formatarBRL(v: string): string {
  const n = Number(v ?? 0);
  return Number.isNaN(n) ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Planos() {
  const [aba, setAba] = useState<'planos' | 'produtos'>('planos');

  const [planos, setPlanos] = useState<Plano[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Modal de plano
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Plano | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [ciclo, setCiclo] = useState('MENSAL');
  const [tipos, setTipos] = useState<TipoProjeto[]>([]);
  const [produtoIds, setProdutoIds] = useState<string[]>([]);

  // Modal de produto
  const [modalProd, setModalProd] = useState(false);
  const [editandoProd, setEditandoProd] = useState<Produto | null>(null);
  const [salvandoProd, setSalvandoProd] = useState(false);
  const [erroFormProd, setErroFormProd] = useState<string | null>(null);
  const [prodNome, setProdNome] = useState('');
  const [prodValor, setProdValor] = useState('');
  const [prodDescricao, setProdDescricao] = useState('');

  async function carregar() {
    setCarregando(true); setErro(null);
    try {
      const [rp, rprod] = await Promise.all([
        api.get<Plano[]>('/planos'),
        api.get<Produto[]>('/produtos'),
      ]);
      setPlanos(rp.data);
      setProdutos(rprod.data);
    } catch { setErro('Não foi possível carregar os planos e produtos.'); }
    finally { setCarregando(false); }
  }
  useEffect(() => { carregar(); }, []);

  // ── Plano ────────────────────────────────────────────────────────────────
  function abrirNovo() {
    setEditando(null); setNome(''); setValor(''); setCiclo('MENSAL'); setTipos([]); setProdutoIds([]); setErroForm(null); setModal(true);
  }
  function abrirEdicao(p: Plano) {
    setEditando(p); setNome(p.nome); setValor(String(p.valor)); setCiclo(p.ciclo); setTipos(p.tiposProjeto ?? []);
    setProdutoIds((p.produtos ?? []).map((x) => x.produtoId));
    setErroForm(null); setModal(true);
  }
  function alternarTipo(t: TipoProjeto) {
    setTipos((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }
  function alternarProduto(id: string) {
    setProdutoIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !valor) { setErroForm('Informe nome e valor.'); return; }
    setSalvando(true); setErroForm(null);
    const corpo = { nome: nome.trim(), valor: Number(valor), ciclo, tiposProjeto: tipos, produtoIds };
    try {
      if (editando) await api.patch(`/planos/${editando.id}`, corpo);
      else await api.post('/planos', corpo);
      setModal(false);
      carregar();
    } catch (err: any) {
      setErroForm(err?.response?.data?.message ?? 'Erro ao salvar o plano.');
    } finally { setSalvando(false); }
  }

  async function alternarAtivo(p: Plano) {
    await api.patch(`/planos/${p.id}`, { ativo: !p.ativo });
    carregar();
  }

  // ── Produto ──────────────────────────────────────────────────────────────
  function abrirNovoProd() {
    setEditandoProd(null); setProdNome(''); setProdValor(''); setProdDescricao(''); setErroFormProd(null); setModalProd(true);
  }
  function abrirEdicaoProd(p: Produto) {
    setEditandoProd(p); setProdNome(p.nome); setProdValor(String(p.valor)); setProdDescricao(p.descricao ?? ''); setErroFormProd(null); setModalProd(true);
  }

  async function salvarProd(e: FormEvent) {
    e.preventDefault();
    if (!prodNome.trim() || !prodValor) { setErroFormProd('Informe nome e valor.'); return; }
    setSalvandoProd(true); setErroFormProd(null);
    const corpo = { nome: prodNome.trim(), valor: Number(prodValor), descricao: prodDescricao.trim() };
    try {
      if (editandoProd) await api.patch(`/produtos/${editandoProd.id}`, corpo);
      else await api.post('/produtos', corpo);
      setModalProd(false);
      carregar();
    } catch (err: any) {
      setErroFormProd(err?.response?.data?.message ?? 'Erro ao salvar o produto.');
    } finally { setSalvandoProd(false); }
  }

  async function alternarAtivoProd(p: Produto) {
    await api.patch(`/produtos/${p.id}`, { ativo: !p.ativo });
    carregar();
  }

  const produtosAtivos = produtos.filter((p) => p.ativo || produtoIds.includes(p.id));

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PaginaHeader
        titulo="Planos"
        subtitulo="Planos comerciais e produtos oferecidos aos clientes"
        acoes={aba === 'planos'
          ? <Btn onClick={abrirNovo}>+ Novo plano</Btn>
          : <Btn onClick={abrirNovoProd}>+ Novo produto</Btn>}
      />

      {/* Abas Planos / Produtos */}
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn variante={aba === 'planos' ? 'primary' : 'ghost'} tamanho="sm" onClick={() => setAba('planos')}>Planos</Btn>
        <Btn variante={aba === 'produtos' ? 'primary' : 'ghost'} tamanho="sm" onClick={() => setAba('produtos')}>Produtos</Btn>
      </div>

      {carregando ? (
        <Carregando />
      ) : erro ? (
        <ErroEstado mensagem={erro} onTentar={carregar} />
      ) : aba === 'planos' ? (
        planos.length === 0 ? (
          <Vazio
            titulo="Nenhum plano ainda"
            subtitulo="Cadastre os planos comerciais que os clientes poderão contratar."
            acao={<Btn onClick={abrirNovo}>+ Novo plano</Btn>}
          />
        ) : (
          <div className="brk-table-wrap">
            <table className="brk-table">
              <thead>
                <tr><Th>Plano</Th><Th>Valor</Th><Th>Ciclo</Th><Th>Tipos</Th><Th>Produtos</Th><Th>Status</Th><Th>Ações</Th></tr>
              </thead>
              <tbody>
                {planos.map((p) => (
                  <tr key={p.id}>
                    <Td><strong style={{ color: 'var(--texto)' }}>{p.nome}</strong></Td>
                    <Td>{formatarBRL(p.valor)}</Td>
                    <Td>{p.ciclo}</Td>
                    <Td>{(p.tiposProjeto ?? []).join(', ') || '—'}</Td>
                    <Td>{(p.produtos ?? []).map((x) => x.produto?.nome).filter(Boolean).join(', ') || '—'}</Td>
                    <Td><Badge cor={p.ativo ? 'verde' : 'neutro'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge></Td>
                    <Td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Btn variante="secondary" tamanho="sm" onClick={() => abrirEdicao(p)}>Editar</Btn>
                        <Btn variante="ghost" tamanho="sm" onClick={() => alternarAtivo(p)}>{p.ativo ? 'Inativar' : 'Ativar'}</Btn>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        produtos.length === 0 ? (
          <Vazio
            titulo="Nenhum produto ainda"
            subtitulo="Cadastre os produtos que podem ser vendidos avulsos ou compor um plano."
            acao={<Btn onClick={abrirNovoProd}>+ Novo produto</Btn>}
          />
        ) : (
          <div className="brk-table-wrap">
            <table className="brk-table">
              <thead>
                <tr><Th>Produto</Th><Th>Descrição</Th><Th>Valor</Th><Th>Status</Th><Th>Ações</Th></tr>
              </thead>
              <tbody>
                {produtos.map((p) => (
                  <tr key={p.id}>
                    <Td><strong style={{ color: 'var(--texto)' }}>{p.nome}</strong></Td>
                    <Td>{p.descricao || '—'}</Td>
                    <Td>{formatarBRL(p.valor)}</Td>
                    <Td><Badge cor={p.ativo ? 'verde' : 'neutro'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge></Td>
                    <Td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Btn variante="secondary" tamanho="sm" onClick={() => abrirEdicaoProd(p)}>Editar</Btn>
                        <Btn variante="ghost" tamanho="sm" onClick={() => alternarAtivoProd(p)}>{p.ativo ? 'Inativar' : 'Ativar'}</Btn>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Modal de plano */}
      {modal && (
        <Modal
          titulo={editando ? 'Editar plano' : 'Novo plano'}
          onFechar={() => setModal(false)}
          rodape={
            <>
              <Btn variante="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
              <Btn onClick={salvar as any} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</Btn>
            </>
          }
        >
          <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Campo rotulo="Nome do plano" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Brava" />
            <Campo rotulo="Valor (R$)" type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="2790.00" />
            <CampoSelect rotulo="Ciclo" value={ciclo} onChange={(e) => setCiclo(e.target.value)}>
              {CICLOS.map((c) => <option key={c} value={c}>{c}</option>)}
            </CampoSelect>
            <div>
              <span className="brk-campo-label" style={{ display: 'block', marginBottom: 6 }}>Tipos de projeto</span>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {TIPOS.map((t) => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, cursor: 'pointer' }}>
                    <input type="checkbox" checked={tipos.includes(t)} onChange={() => alternarTipo(t)} />
                    {t}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <span className="brk-campo-label" style={{ display: 'block', marginBottom: 6 }}>Produtos que compõem o plano</span>
              {produtosAtivos.length === 0 ? (
                <span style={{ fontSize: 12.5, color: 'var(--texto-suave)' }}>
                  Nenhum produto cadastrado. Cadastre produtos na aba “Produtos”.
                </span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {produtosAtivos.map((pr) => (
                    <label key={pr.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, cursor: 'pointer' }}>
                      <input type="checkbox" checked={produtoIds.includes(pr.id)} onChange={() => alternarProduto(pr.id)} />
                      <span style={{ color: 'var(--texto)' }}>{pr.nome}</span>
                      <span style={{ color: 'var(--texto-suave)' }}>· {formatarBRL(pr.valor)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {erroForm && <span style={{ fontSize: 12.5, color: 'var(--vermelho)' }}>{erroForm}</span>}
            <button type="submit" style={{ display: 'none' }} aria-hidden />
          </form>
        </Modal>
      )}

      {/* Modal de produto */}
      {modalProd && (
        <Modal
          titulo={editandoProd ? 'Editar produto' : 'Novo produto'}
          onFechar={() => setModalProd(false)}
          rodape={
            <>
              <Btn variante="secondary" onClick={() => setModalProd(false)}>Cancelar</Btn>
              <Btn onClick={salvarProd as any} disabled={salvandoProd}>{salvandoProd ? 'Salvando…' : 'Salvar'}</Btn>
            </>
          }
        >
          <form onSubmit={salvarProd} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Campo rotulo="Nome do produto" value={prodNome} onChange={(e) => setProdNome(e.target.value)} placeholder="Ex.: Gestão de tráfego" />
            <Campo rotulo="Valor (R$)" type="number" step="0.01" min="0" value={prodValor} onChange={(e) => setProdValor(e.target.value)} placeholder="490.00" />
            <Campo rotulo="Descrição (opcional)" value={prodDescricao} onChange={(e) => setProdDescricao(e.target.value)} placeholder="Breve descrição do produto" />
            {erroFormProd && <span style={{ fontSize: 12.5, color: 'var(--vermelho)' }}>{erroFormProd}</span>}
            <button type="submit" style={{ display: 'none' }} aria-hidden />
          </form>
        </Modal>
      )}
    </section>
  );
}
