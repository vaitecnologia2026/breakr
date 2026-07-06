import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { comDemo, mockSeDemo } from '../lib/demo';
import {
  PaginaHeader, Btn, Campo, CampoSelect, Modal,
  Carregando, ErroEstado, Vazio, Badge, Alerta, Th, Td,
} from '../components/ui';

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

  const [form, setForm] = useState({ nome: '', email: '', senha: '', cargo: 'CS' as Cargo, whatsapp: '' });

  async function carregar() {
    setCarregando(true); setErro(false);
    try {
      const { data } = await api.get<Usuario[]>('/usuarios');
      setLista(comDemo(data, MOCK_EQUIPE));
    } catch { setLista(mockSeDemo(MOCK_EQUIPE)); }
    finally { setCarregando(false); }
  }

  useEffect(() => { carregar(); }, []);

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
      await api.post('/usuarios', { ...form, whatsapp: form.whatsapp.trim() || undefined });
      await carregar();
      setModalNovo(false);
      setForm({ nome: '', email: '', senha: '', cargo: 'CS', whatsapp: '' });
      setSucesso('Usuário criado com sucesso.');
      setTimeout(() => setSucesso(null), 4000);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErroCriar(msg ?? 'Erro ao criar usuário. Verifique os dados e tente novamente.');
    } finally { setSalvando(false); }
  }

  function abrirEdicao(u: Usuario) {
    setEditando(u);
    setForm({ nome: u.nome, email: u.email, senha: '', cargo: u.cargo, whatsapp: u.whatsapp ?? '' });
    setErroCriar(null);
    setModalNovo(true);
  }

  function fecharModal() {
    setModalNovo(false);
    setEditando(null);
    setForm({ nome: '', email: '', senha: '', cargo: 'CS', whatsapp: '' });
  }

  // Salva criação OU edição (PATCH só nome/cargo — e-mail e senha não mudam aqui).
  async function salvar() {
    if (editando) {
      if (!form.nome.trim()) { setErroCriar('Informe o nome.'); return; }
      setSalvando(true); setErroCriar(null);
      try {
        await api.patch(`/usuarios/${editando.id}`, { nome: form.nome.trim(), cargo: form.cargo, whatsapp: form.whatsapp.trim() || undefined });
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

  return (
    <>
      <PaginaHeader
        titulo="Equipe"
        subtitulo="Gerencie usuários, cargos e acessos ao sistema"
        acoes={<Btn onClick={() => { setModalNovo(true); setErroCriar(null); }}>+ Novo usuário</Btn>}
      />

      {sucesso && <Alerta tipo="sucesso">{sucesso}</Alerta>}

      <div style={{ marginTop: sucesso ? 12 : 0, marginBottom: 16 }}>
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
          {!editando && (
            <Campo
              rotulo="Senha inicial"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={form.senha}
              onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
            />
          )}
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
        </Modal>
      )}
    </>
  );
}
