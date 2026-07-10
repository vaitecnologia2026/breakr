import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { comDemo, mockSeDemo } from '../lib/demo';
import {
  PaginaHeader, Btn, Campo, CampoSelect, Modal,
  Carregando, ErroEstado, Vazio, Badge, Alerta, Th, Td,
} from '../components/ui';
import { CATALOGO_MENUS } from '../components/Sidebar';
import { CATALOGO_BLOCOS } from '../lib/permissoes';

type Cargo =
  | 'SUPERADMIN' | 'ADMIN' | 'COMERCIAL' | 'CS' | 'ESTRATEGISTA'
  | 'COPYWRITER' | 'DESIGNER' | 'EDITOR_VIDEO' | 'GESTOR_TRAFEGO'
  | 'FINANCEIRO' | 'JURIDICO';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  cargo: Cargo;
  ativo: boolean;
  criadoEm: string;
  // Número de WhatsApp usado pelo n8n nos disparos (req. l.140).
  whatsapp?: string | null;
  // Perfil de acesso (opcional).
  perfilId?: string | null;
  perfilNome?: string | null;
}

interface Perfil {
  id: string;
  nome: string;
  permissoes: string[];
  ativo: boolean;
}

const CARGOS: { value: Cargo; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'COMERCIAL', label: 'Comercial' },
  { value: 'CS', label: 'CS (Customer Success)' },
  { value: 'ESTRATEGISTA', label: 'Estrategista' },
  { value: 'COPYWRITER', label: 'Copywriter' },
  { value: 'DESIGNER', label: 'Designer' },
  { value: 'EDITOR_VIDEO', label: 'Editor de Vídeo' },
  { value: 'GESTOR_TRAFEGO', label: 'Gestor de Tráfego' },
  { value: 'FINANCEIRO', label: 'Financeiro' },
  { value: 'JURIDICO', label: 'Jurídico' },
  { value: 'SUPERADMIN', label: 'Super Admin' },
];

const CARGO_LABEL: Record<Cargo, string> = Object.fromEntries(
  CARGOS.map((c) => [c.value, c.label]),
) as Record<Cargo, string>;

const MOCK_EQUIPE: Usuario[] = [
  { id: 'u1', nome: 'Admin', email: 'admin@breakr.com', cargo: 'SUPERADMIN', ativo: true, criadoEm: '2025-01-01T00:00:00Z' },
  { id: 'u2', nome: 'Rafael Lima', email: 'comercial@breakr.com', cargo: 'COMERCIAL', ativo: true, criadoEm: '2025-03-01T00:00:00Z' },
  { id: 'u3', nome: 'Francielia Souza', email: 'financeiro@breakr.com', cargo: 'FINANCEIRO', ativo: true, criadoEm: '2025-03-01T00:00:00Z' },
  { id: 'u4', nome: 'Marina Alves', email: 'cs@breakr.com', cargo: 'CS', ativo: true, criadoEm: '2025-04-01T00:00:00Z' },
  { id: 'u5', nome: 'Bruno Castro', email: 'estrategia@breakr.com', cargo: 'ESTRATEGISTA', ativo: true, criadoEm: '2025-04-01T00:00:00Z' },
  { id: 'u6', nome: 'Leticia Dias', email: 'copy@breakr.com', cargo: 'COPYWRITER', ativo: true, criadoEm: '2025-04-01T00:00:00Z' },
  { id: 'u7', nome: 'Pedro Rocha', email: 'design@breakr.com', cargo: 'DESIGNER', ativo: true, criadoEm: '2025-05-01T00:00:00Z' },
  { id: 'u8', nome: 'Joao Vitor Lima', email: 'trafego@breakr.com', cargo: 'GESTOR_TRAFEGO', ativo: false, criadoEm: '2025-06-01T00:00:00Z' },
];

export function Equipe() {
  const [lista, setLista] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [busca, setBusca] = useState('');
  const [modalNovo, setModalNovo] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [erroCriar, setErroCriar] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const [form, setForm] = useState({ nome: '', email: '', senha: '', cargo: 'CS' as Cargo, whatsapp: '', perfilId: '' });

  // Abas Usuários / Perfis de acesso.
  const [aba, setAba] = useState<'usuarios' | 'perfis'>('usuarios');

  // Perfis de acesso.
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [modalPerfil, setModalPerfil] = useState(false);
  const [editandoPerfil, setEditandoPerfil] = useState<Perfil | null>(null);
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [erroPerfil, setErroPerfil] = useState<string | null>(null);
  const [perfilNome, setPerfilNome] = useState('');
  const [perfilPermissoes, setPerfilPermissoes] = useState<string[]>([]);

  async function carregar() {
    setCarregando(true); setErro(false);
    try {
      const { data } = await api.get<Usuario[]>('/usuarios');
      setLista(comDemo(data, MOCK_EQUIPE));
    } catch { setLista(mockSeDemo(MOCK_EQUIPE)); }
    finally { setCarregando(false); }
  }

  async function carregarPerfis() {
    try {
      const { data } = await api.get<Perfil[]>('/perfis');
      setPerfis(data);
    } catch { setPerfis([]); }
  }

  useEffect(() => { carregar(); carregarPerfis(); }, []);

  const filtrados = lista.filter(
    (u) =>
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.email.toLowerCase().includes(busca.toLowerCase()) ||
      CARGO_LABEL[u.cargo].toLowerCase().includes(busca.toLowerCase()),
  );

  async function criar() {
    if (!form.nome.trim() || !form.email.trim() || !form.senha.trim()) {
      setErroCriar('Preencha todos os campos.'); return;
    }
    setSalvando(true); setErroCriar(null);
    try {
      const { data: novo } = await api.post<Usuario>('/usuarios', {
        nome: form.nome, email: form.email, senha: form.senha, cargo: form.cargo,
        whatsapp: form.whatsapp.trim() || undefined,
        ...(form.perfilId ? { perfilId: form.perfilId } : {}),
      });
      await carregar();
      // Realtime: garante que o usuário recém-criado apareça na hora, mesmo que o
      // refetch acima retorne uma resposta em cache/defasada. A guarda por id evita
      // duplicar quando o carregar() já trouxe o novo usuário.
      setLista((l) => (l.some((u) => u.id === novo.id) ? l : [novo, ...l]));
      setModalNovo(false);
      setForm({ nome: '', email: '', senha: '', cargo: 'CS', whatsapp: '', perfilId: '' });
      setSucesso('Usuário criado com sucesso.');
      setTimeout(() => setSucesso(null), 4000);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErroCriar(msg ?? 'Erro ao criar usuário. Verifique os dados e tente novamente.');
    } finally { setSalvando(false); }
  }

  function abrirEdicao(u: Usuario) {
    setEditando(u);
    setForm({ nome: u.nome, email: u.email, senha: '', cargo: u.cargo, whatsapp: u.whatsapp ?? '', perfilId: u.perfilId ?? '' });
    setErroCriar(null);
    setModalNovo(true);
  }

  function fecharModal() {
    setModalNovo(false);
    setEditando(null);
    setForm({ nome: '', email: '', senha: '', cargo: 'CS', whatsapp: '', perfilId: '' });
  }

  // Salva criação OU edição (PATCH só nome/cargo — e-mail e senha não mudam aqui).
  async function salvar() {
    if (editando) {
      if (!form.nome.trim()) { setErroCriar('Informe o nome.'); return; }
      // Nova senha é opcional na edição; se preenchida, exige mínimo de 8 caracteres.
      if (form.senha.trim() && form.senha.trim().length < 8) {
        setErroCriar('A nova senha deve ter no mínimo 8 caracteres.'); return;
      }
      setSalvando(true); setErroCriar(null);
      try {
        await api.patch(`/usuarios/${editando.id}`, { nome: form.nome.trim(), cargo: form.cargo, whatsapp: form.whatsapp.trim() || undefined, perfilId: form.perfilId || null, ...(form.senha.trim() ? { senha: form.senha.trim() } : {}) });
        await carregar();
        fecharModal();
        setSucesso('Usuário atualizado.');
        setTimeout(() => setSucesso(null), 4000);
      } catch (e: unknown) {
        const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setErroCriar(msg ?? 'Erro ao salvar. Tente novamente.');
      } finally { setSalvando(false); }
      return;
    }
    await criar();
  }

  async function toggleAtivo(u: Usuario) {
    try {
      await api.patch(`/usuarios/${u.id}`, { ativo: !u.ativo });
      await carregar();
      setSucesso(`${u.nome} ${!u.ativo ? 'ativado' : 'desativado'}.`);
      setTimeout(() => setSucesso(null), 3000);
    } catch { /* silent */ }
  }

  // ── Perfis de acesso ───────────────────────────────────────────────────────
  function abrirNovoPerfil() {
    setEditandoPerfil(null); setPerfilNome(''); setPerfilPermissoes([]); setErroPerfil(null); setModalPerfil(true);
  }
  function abrirEdicaoPerfil(p: Perfil) {
    setEditandoPerfil(p); setPerfilNome(p.nome); setPerfilPermissoes(p.permissoes ?? []); setErroPerfil(null); setModalPerfil(true);
  }
  function togglePermissao(para: string) {
    setPerfilPermissoes((prev) => prev.includes(para) ? prev.filter((x) => x !== para) : [...prev, para]);
  }

  async function salvarPerfil() {
    if (!perfilNome.trim()) { setErroPerfil('Informe o nome do perfil.'); return; }
    setSalvandoPerfil(true); setErroPerfil(null);
    const corpo = { nome: perfilNome.trim(), permissoes: perfilPermissoes };
    try {
      if (editandoPerfil) await api.patch(`/perfis/${editandoPerfil.id}`, corpo);
      else await api.post('/perfis', corpo);
      await carregarPerfis();
      setModalPerfil(false);
      setSucesso('Perfil salvo com sucesso.');
      setTimeout(() => setSucesso(null), 3000);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErroPerfil(Array.isArray(msg) ? msg.join(' ') : msg ?? 'Erro ao salvar o perfil.');
    } finally { setSalvandoPerfil(false); }
  }

  async function toggleAtivoPerfil(p: Perfil) {
    try {
      await api.patch(`/perfis/${p.id}`, { ativo: !p.ativo });
      await carregarPerfis();
    } catch { /* silent */ }
  }

  return (
    <>
      <PaginaHeader
        titulo="Equipe"
        subtitulo="Gerencie usuários, cargos, perfis de acesso e permissões do sistema"
        acoes={aba === 'usuarios'
          ? <Btn onClick={() => { setModalNovo(true); setErroCriar(null); }}>+ Novo usuário</Btn>
          : <Btn onClick={abrirNovoPerfil}>+ Novo perfil</Btn>}
      />

      {sucesso && <Alerta tipo="sucesso">{sucesso}</Alerta>}

      {/* Abas Usuários / Perfis de acesso */}
      <div style={{ display: 'flex', gap: 8, marginTop: sucesso ? 12 : 0, marginBottom: 16 }}>
        <Btn variante={aba === 'usuarios' ? 'primary' : 'ghost'} tamanho="sm" onClick={() => setAba('usuarios')}>Usuários</Btn>
        <Btn variante={aba === 'perfis' ? 'primary' : 'ghost'} tamanho="sm" onClick={() => setAba('perfis')}>Perfis de acesso</Btn>
      </div>

      {aba === 'usuarios' && (<>
      <div style={{ marginBottom: 16 }}>
        <div className="brk-filtros">
          <div className="brk-search" style={{ maxWidth: 340 }}>
            <span className="brk-search-icon">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <input
              className="brk-input"
              placeholder="Buscar por nome, e-mail ou cargo…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
          </div>
          <span style={{ fontSize: 13, color: 'var(--texto-fraco)', marginLeft: 'auto' }}>
            {filtrados.length} usuário(s)
          </span>
        </div>
      </div>

      {carregando ? (
        <Carregando />
      ) : erro ? (
        <ErroEstado mensagem="Não foi possível carregar a equipe." onTentar={carregar} />
      ) : filtrados.length === 0 ? (
        <Vazio
          titulo="Nenhum usuário encontrado"
          subtitulo={busca ? 'Tente outro termo de busca.' : 'Crie o primeiro usuário da equipe.'}
          acao={!busca ? <Btn tamanho="sm" onClick={() => setModalNovo(true)}>+ Criar usuário</Btn> : undefined}
        />
      ) : (
        <div className="brk-table-wrap">
          <table className="brk-table">
            <thead>
              <tr>
                <Th>Usuário</Th>
                <Th>Cargo</Th>
                <Th>Status</Th>
                <Th>Cadastro</Th>
                <Th>Ações</Th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((u) => (
                <tr key={u.id} className="brk-tr">
                  <Td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          width: 34, height: 34, borderRadius: 999, flexShrink: 0,
                          background: u.ativo ? 'var(--gradiente-brasa)' : 'var(--superficie-3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 700, color: '#fff',
                        }}
                      >
                        {u.nome.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--texto)' }}>{u.nome}</div>
                        <div style={{ fontSize: 12, color: 'var(--texto-fraco)' }}>{u.email}</div>
                        {u.whatsapp && <div style={{ fontSize: 11.5, color: 'var(--texto-fraco)' }}>WhatsApp: {u.whatsapp}</div>}
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span style={{ fontSize: 13, color: 'var(--texto-suave)' }}>{CARGO_LABEL[u.cargo]}</span>
                    {u.perfilNome && <div style={{ fontSize: 11.5, color: 'var(--texto-fraco)' }}>Perfil: {u.perfilNome}</div>}
                  </Td>
                  <Td>
                    <Badge cor={u.ativo ? 'verde' : 'neutro'}>{u.ativo ? 'Ativo' : 'Inativo'}</Badge>
                  </Td>
                  <Td>
                    <span style={{ fontSize: 12.5, color: 'var(--texto-fraco)' }}>
                      {new Date(u.criadoEm).toLocaleDateString('pt-BR')}
                    </span>
                  </Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Btn variante="secondary" tamanho="sm" onClick={() => abrirEdicao(u)}>Editar</Btn>
                      <Btn
                        variante={u.ativo ? 'secondary' : 'ghost'}
                        tamanho="sm"
                        onClick={() => toggleAtivo(u)}
                      >
                        {u.ativo ? 'Desativar' : 'Ativar'}
                      </Btn>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </>)}

      {aba === 'perfis' && (
        perfis.length === 0 ? (
          <Vazio
            titulo="Nenhum perfil de acesso ainda"
            subtitulo="Crie um perfil e marque quais menus/telas ele poderá ver. Usuários com um perfil só enxergam o que estiver liberado."
            acao={<Btn onClick={abrirNovoPerfil}>+ Novo perfil</Btn>}
          />
        ) : (
          <div className="brk-table-wrap">
            <table className="brk-table">
              <thead>
                <tr><Th>Perfil</Th><Th>Menus liberados</Th><Th>Status</Th><Th>Ações</Th></tr>
              </thead>
              <tbody>
                {perfis.map((p) => (
                  <tr key={p.id} className="brk-tr">
                    <Td><strong style={{ color: 'var(--texto)' }}>{p.nome}</strong></Td>
                    <Td><span style={{ fontSize: 13, color: 'var(--texto-suave)' }}>{(p.permissoes ?? []).length} menu(s)</span></Td>
                    <Td><Badge cor={p.ativo ? 'verde' : 'neutro'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge></Td>
                    <Td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Btn variante="secondary" tamanho="sm" onClick={() => abrirEdicaoPerfil(p)}>Editar</Btn>
                        <Btn variante={p.ativo ? 'secondary' : 'ghost'} tamanho="sm" onClick={() => toggleAtivoPerfil(p)}>{p.ativo ? 'Inativar' : 'Ativar'}</Btn>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {modalNovo && (
        <Modal
          titulo={editando ? 'Editar usuário' : 'Novo usuário'}
          onFechar={fecharModal}
          rodape={
            <>
              <Btn variante="secondary" onClick={fecharModal}>Cancelar</Btn>
              <Btn onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando…' : editando ? 'Salvar' : 'Criar usuário'}
              </Btn>
            </>
          }
        >
          {erroCriar && <Alerta tipo="erro">{erroCriar}</Alerta>}
          <Campo
            rotulo="Nome completo"
            placeholder="Ex: Maria Silva"
            value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
          />
          <Campo
            rotulo="E-mail"
            type="email"
            placeholder="usuario@breakr.com"
            value={form.email}
            disabled={!!editando}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Campo
            rotulo={editando ? 'Nova senha' : 'Senha inicial'}
            type="password"
            placeholder={editando ? 'Deixe em branco para manter a atual' : 'Mínimo 8 caracteres'}
            value={form.senha}
            onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
          />
          <CampoSelect
            rotulo="Cargo"
            value={form.cargo}
            onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value as Cargo }))}
          >
            {CARGOS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </CampoSelect>
          <Campo
            rotulo="WhatsApp (para disparos)"
            placeholder="(11) 99999-9999 — opcional"
            value={form.whatsapp}
            onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
          />
          <CampoSelect
            rotulo="Perfil de acesso"
            value={form.perfilId}
            onChange={(e) => setForm((f) => ({ ...f, perfilId: e.target.value }))}
          >
            <option value="">Nenhum (acesso total)</option>
            {perfis.filter((p) => p.ativo || p.id === form.perfilId).map((p) => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </CampoSelect>
          <div style={{ fontSize: 11.5, color: 'var(--texto-fraco)', marginTop: 4 }}>
            Sem perfil, o usuário vê tudo. Cargos Admin/Super Admin sempre veem tudo.
          </div>
        </Modal>
      )}

      {modalPerfil && (
        <Modal
          titulo={editandoPerfil ? 'Editar perfil de acesso' : 'Novo perfil de acesso'}
          onFechar={() => setModalPerfil(false)}
          rodape={
            <>
              <Btn variante="secondary" onClick={() => setModalPerfil(false)}>Cancelar</Btn>
              <Btn onClick={salvarPerfil} disabled={salvandoPerfil}>{salvandoPerfil ? 'Salvando…' : 'Salvar'}</Btn>
            </>
          }
        >
          {erroPerfil && <Alerta tipo="erro">{erroPerfil}</Alerta>}
          <Campo
            rotulo="Nome do perfil"
            placeholder="Ex: Vendedor, Financeiro, Suporte…"
            value={perfilNome}
            onChange={(e) => setPerfilNome(e.target.value)}
          />
          <div style={{ marginTop: 8 }}>
            <span className="brk-campo-label" style={{ display: 'block', marginBottom: 8 }}>
              Menus e telas que este perfil pode ver
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
              {CATALOGO_MENUS.map((g) => (
                <div key={g.grupo}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--texto-fraco)', marginBottom: 6 }}>{g.grupo}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {g.itens.map((it) => (
                      <label key={`${g.grupo}:${it.para}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                        <input type="checkbox" checked={perfilPermissoes.includes(it.para)} onChange={() => togglePermissao(it.para)} />
                        <span style={{ color: 'var(--texto)' }}>{it.rotulo}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <span className="brk-campo-label" style={{ display: 'block', marginBottom: 4 }}>
              Informações internas (dashboard, métricas e gestão à vista)
            </span>
            <div style={{ fontSize: 11.5, color: 'var(--texto-fraco)', marginBottom: 8 }}>
              Deixe uma categoria toda desmarcada para liberar tudo dela. Marque itens para restringir só aos escolhidos.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
              {CATALOGO_BLOCOS.map((g) => (
                <div key={g.id}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--texto-fraco)', marginBottom: 6 }}>{g.grupo}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {g.itens.map((it) => (
                      <label key={it.chave} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                        <input type="checkbox" checked={perfilPermissoes.includes(it.chave)} onChange={() => togglePermissao(it.chave)} />
                        <span style={{ color: 'var(--texto)' }}>{it.rotulo}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
