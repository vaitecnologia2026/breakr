import { useEffect, useState, type FormEvent } from 'react';
import { TipoProjeto } from '@breakr/shared';
import { api } from '../lib/api';
import {
  PaginaHeader, Btn, Campo, CampoSelect, Modal, Badge,
  Carregando, Vazio, ErroEstado, Th, Td,
} from '../components/ui';

/**
 * Cadastro de Planos (admin) — nome, valor, ciclo, tipos de projeto.
 *  GET   /planos
 *  POST  /planos
 *  PATCH /planos/:id
 */
interface Plano {
  id: string;
  nome: string;
  valor: string;
  ciclo: string;
  tiposProjeto: TipoProjeto[];
  ativo: boolean;
}

const CICLOS = ['MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'];
const TIPOS: TipoProjeto[] = [TipoProjeto.MARKETING, TipoProjeto.GESTAO, TipoProjeto.FINANCEIRO];

function formatarBRL(v: string): string {
  const n = Number(v ?? 0);
  return Number.isNaN(n) ? '—' : n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Planos() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Plano | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  // Form
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [ciclo, setCiclo] = useState('MENSAL');
  const [tipos, setTipos] = useState<TipoProjeto[]>([]);

  async function carregar() {
    setCarregando(true); setErro(null);
    try {
      const { data } = await api.get<Plano[]>('/planos');
      setPlanos(data);
    } catch { setErro('Não foi possível carregar os planos.'); }
    finally { setCarregando(false); }
  }
  useEffect(() => { carregar(); }, []);

  function abrirNovo() {
    setEditando(null); setNome(''); setValor(''); setCiclo('MENSAL'); setTipos([]); setErroForm(null); setModal(true);
  }
  function abrirEdicao(p: Plano) {
    setEditando(p); setNome(p.nome); setValor(String(p.valor)); setCiclo(p.ciclo); setTipos(p.tiposProjeto ?? []); setErroForm(null); setModal(true);
  }
  function alternarTipo(t: TipoProjeto) {
    setTipos((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !valor) { setErroForm('Informe nome e valor.'); return; }
    setSalvando(true); setErroForm(null);
    const corpo = { nome: nome.trim(), valor: Number(valor), ciclo, tiposProjeto: tipos };
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

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PaginaHeader
        titulo="Planos"
        subtitulo="Planos comerciais oferecidos aos clientes"
        acoes={<Btn onClick={abrirNovo}>+ Novo plano</Btn>}
      />

      {carregando ? (
        <Carregando />
      ) : erro ? (
        <ErroEstado mensagem={erro} onTentar={carregar} />
      ) : planos.length === 0 ? (
        <Vazio
          titulo="Nenhum plano ainda"
          subtitulo="Cadastre os planos comerciais que os clientes poderão contratar."
          acao={<Btn onClick={abrirNovo}>+ Novo plano</Btn>}
        />
      ) : (
        <div className="brk-table-wrap">
          <table className="brk-table">
            <thead>
              <tr><Th>Plano</Th><Th>Valor</Th><Th>Ciclo</Th><Th>Tipos</Th><Th>Status</Th><Th>Ações</Th></tr>
            </thead>
            <tbody>
              {planos.map((p) => (
                <tr key={p.id}>
                  <Td><strong style={{ color: 'var(--texto)' }}>{p.nome}</strong></Td>
                  <Td>{formatarBRL(p.valor)}</Td>
                  <Td>{p.ciclo}</Td>
                  <Td>{(p.tiposProjeto ?? []).join(', ') || '—'}</Td>
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
      )}

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
            {erroForm && <span style={{ fontSize: 12.5, color: 'var(--vermelho)' }}>{erroForm}</span>}
            <button type="submit" style={{ display: 'none' }} aria-hidden />
          </form>
        </Modal>
      )}
    </section>
  );
}
