import { useEffect, useState } from 'react';
import { api } from '../lib/api';
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

export function Equipe() {
  const [lista, setLista] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);
  const [busca, setBusca] = useState('');
  const [modalNovo, setModalNovo] = useState(false);
  const [erroCriar, setErroCriar] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const [form, setForm] = useState({ nome: '', email: '', senha: '', cargo: 'CS' as Cargo });

  async function carregar() {
    setCarregando(true); setErro(false);
    try {
      const { data } = await api.get<Usuario[]>('/usuarios');
      setLista(data);
    } catch { setErro(true); }
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
      await api.post('/usuarios', form);
      await carregar();
      setModalNovo(false);
      setForm({ nome: '', email: '', senha: '', cargo: 'CS' });
      setSucesso('Usuário criado com sucesso.');
      setTimeout(() => setSucesso(null), 4000);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setErroCriar(msg ?? 'Erro ao criar usuário. Verifique os dados e tente novamente.');
    } finally { setSalvando(false); }
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
                    <Btn
                      variante={u.ativo ? 'secondary' : 'ghost'}
                      tamanho="sm"
                      onClick={() => toggleAtivo(u)}
                    >
                      {u.ativo ? 'Desativar' : 'Ativar'}
                    </Btn>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalNovo && (
        <Modal
          titulo="Novo usuário"
          onFechar={() => setModalNovo(false)}
          rodape={
            <>
              <Btn variante="secondary" onClick={() => setModalNovo(false)}>Cancelar</Btn>
              <Btn onClick={criar} disabled={salvando}>{salvando ? 'Criando…' : 'Criar usuário'}</Btn>
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
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Campo
            rotulo="Senha inicial"
            type="password"
            placeholder="Mínimo 8 caracteres"
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
        </Modal>
      )}
    </>
  );
}
