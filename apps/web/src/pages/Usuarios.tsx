import { useEffect, useMemo, useState } from 'react';
import { api, EVENTO_SESSAO_EXPIRADA } from '../lib/api';
import {
  PaginaHeader, Btn, Campo, CampoSelect, Alerta, Carregando, ErroEstado,
} from '../components/ui';

/**
 * Usuários — acesso do cliente ao portal.
 *
 * Cria o "acesso à plataforma" de cada empresa (cliente): seleciona a empresa,
 * define usuário (e-mail OU nome) e senha (boas práticas), e mostra o link da
 * área de membro (o portal do cliente: /portal/<código>).
 *
 * Regra do portal (definida no backend): empresa COM usuário+senha passa a exigir
 * login no portal; empresa SEM credenciais continua abrindo pelo link (como antes).
 *
 * Contrato da API:
 *  GET    /clientes                       → lista de empresas (id, nomeFantasia, codigoUnico)
 *  GET    /clientes/:id/acesso-portal     → { nomeFantasia, codigoUnico, usuario, temAcesso }
 *  PATCH  /clientes/:id/acesso-portal     → { usuario, senha }  (define/atualiza)
 *  DELETE /clientes/:id/acesso-portal     → remove o acesso (portal volta a ser público)
 */

interface ClienteItem {
  id: string;
  nomeFantasia: string;
  codigoUnico: string;
}

interface AcessoPortal {
  nomeFantasia: string;
  codigoUnico: string;
  usuario: string | null;
  temAcesso: boolean;
}

// Força da senha (apenas orientação visual; a regra mínima é validada no backend:
// 8+ caracteres, com ao menos uma letra e um número; especiais são opcionais).
function forcaSenha(s: string): { nivel: number; rotulo: string; cor: string } {
  if (!s) return { nivel: 0, rotulo: '—', cor: 'var(--borda-forte)' };
  let score = 0;
  if (s.length >= 8) score++;
  if (s.length >= 12) score++;
  if (/[A-Za-z]/.test(s) && /\d/.test(s)) score++;
  if (/[^A-Za-z0-9]/.test(s)) score++;
  if (score <= 1) return { nivel: 1, rotulo: 'Fraca', cor: '#e2738a' };
  if (score === 2) return { nivel: 2, rotulo: 'Média', cor: '#ffb44d' };
  if (score === 3) return { nivel: 3, rotulo: 'Boa', cor: '#67e0a3' };
  return { nivel: 4, rotulo: 'Forte', cor: '#2ecc71' };
}

// Regra mínima (espelha o backend): 8+ caracteres, com ao menos uma letra e um número.
function senhaValida(s: string): boolean {
  return s.length >= 8 && /[A-Za-z]/.test(s) && /\d/.test(s);
}

export function Usuarios() {
  const [empresas, setEmpresas] = useState<ClienteItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroLista, setErroLista] = useState(false);

  const [empresaId, setEmpresaId] = useState('');
  const [acesso, setAcesso] = useState<AcessoPortal | null>(null);
  const [carregandoAcesso, setCarregandoAcesso] = useState(false);

  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function carregarEmpresas() {
    setCarregando(true); setErroLista(false);
    try {
      const { data } = await api.get<ClienteItem[]>('/clientes');
      setEmpresas(data.map((c) => ({ id: c.id, nomeFantasia: c.nomeFantasia, codigoUnico: c.codigoUnico })));
    } catch {
      setErroLista(true);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregarEmpresas(); }, []);

  async function carregarAcesso(id: string) {
    setCarregandoAcesso(true); setAcesso(null); setMsg(null);
    setUsuario(''); setSenha(''); setConfirmar('');
    try {
      const { data } = await api.get<AcessoPortal>(`/clientes/${id}/acesso-portal`);
      setAcesso(data);
      if (data.usuario) setUsuario(data.usuario);
    } catch (e: unknown) {
      if ((e as { response?: { status?: number } }).response?.status === 401) {
        setMsg({ tipo: 'erro', texto: 'Sua sessão expirou. Entre novamente para continuar.' });
        window.dispatchEvent(new CustomEvent(EVENTO_SESSAO_EXPIRADA));
      } else {
        setMsg({ tipo: 'erro', texto: 'Não foi possível carregar o acesso desta empresa.' });
      }
    } finally {
      setCarregandoAcesso(false);
    }
  }

  function aoTrocarEmpresa(id: string) {
    setEmpresaId(id);
    setCopiado(false);
    if (id) carregarAcesso(id);
    else { setAcesso(null); setUsuario(''); setSenha(''); setConfirmar(''); setMsg(null); }
  }

  const empresaSel = useMemo(
    () => empresas.find((e) => e.id === empresaId) ?? null,
    [empresas, empresaId],
  );

  const linkPortal = useMemo(() => {
    const codigo = acesso?.codigoUnico ?? empresaSel?.codigoUnico;
    if (!codigo) return '';
    return `${window.location.origin}/portal/${codigo}`;
  }, [acesso, empresaSel]);

  const forca = forcaSenha(senha);
  const podeSalvar =
    !!empresaId &&
    usuario.trim().length >= 3 &&
    senhaValida(senha) &&
    senha === confirmar &&
    !salvando;

  async function salvar() {
    if (!podeSalvar) return;
    setSalvando(true); setMsg(null);
    try {
      const { data } = await api.patch<AcessoPortal>(`/clientes/${empresaId}/acesso-portal`, {
        usuario: usuario.trim(),
        senha,
      });
      setAcesso(data);
      setSenha(''); setConfirmar('');
      setMsg({ tipo: 'sucesso', texto: 'Acesso salvo. A empresa agora entra no portal com usuário e senha.' });
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { message?: string | string[] } } };
      if (err.response?.status === 401) {
        setMsg({ tipo: 'erro', texto: 'Sua sessão expirou. Entre novamente para criar o acesso.' });
        window.dispatchEvent(new CustomEvent(EVENTO_SESSAO_EXPIRADA));
      } else {
        const raw = err.response?.data?.message;
        const texto = Array.isArray(raw) ? raw.join(' ') : raw ?? 'Não foi possível salvar o acesso.';
        setMsg({ tipo: 'erro', texto });
      }
    } finally {
      setSalvando(false);
    }
  }

  async function remover() {
    if (!empresaId || removendo) return;
    setRemovendo(true); setMsg(null);
    try {
      const { data } = await api.delete<AcessoPortal>(`/clientes/${empresaId}/acesso-portal`);
      setAcesso(data);
      setUsuario(''); setSenha(''); setConfirmar('');
      setMsg({ tipo: 'sucesso', texto: 'Acesso removido. O portal desta empresa volta a abrir apenas pelo link.' });
    } catch (e: unknown) {
      if ((e as { response?: { status?: number } }).response?.status === 401) {
        setMsg({ tipo: 'erro', texto: 'Sua sessão expirou. Entre novamente para continuar.' });
        window.dispatchEvent(new CustomEvent(EVENTO_SESSAO_EXPIRADA));
      } else {
        setMsg({ tipo: 'erro', texto: 'Não foi possível remover o acesso.' });
      }
    } finally {
      setRemovendo(false);
    }
  }

  async function copiarLink() {
    if (!linkPortal) return;
    try {
      await navigator.clipboard.writeText(linkPortal);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch { /* clipboard indisponível */ }
  }

  return (
    <div className="brk-pagina">
      <PaginaHeader
        titulo="Usuários"
        subtitulo="Acesso do cliente ao portal: gere o login (empresa, usuário e senha) e o link da área de membro."
      />

      {carregando ? (
        <Carregando mensagem="Carregando empresas…" />
      ) : erroLista ? (
        <ErroEstado mensagem="Não foi possível carregar as empresas." onTentar={carregarEmpresas} />
      ) : (
        <div className="brk-card" style={{ padding: 20, maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <CampoSelect
            rotulo="Empresa"
            value={empresaId}
            onChange={(e) => aoTrocarEmpresa(e.target.value)}
          >
            <option value="">Selecione a empresa…</option>
            {empresas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nomeFantasia} ({e.codigoUnico})
              </option>
            ))}
          </CampoSelect>

          {empresaId && carregandoAcesso && <Carregando mensagem="Carregando acesso…" />}

          {empresaId && !carregandoAcesso && (
            <>
              {acesso?.temAcesso && (
                <Alerta tipo="info">
                  Esta empresa já tem acesso configurado (usuário <strong>{acesso.usuario}</strong>).
                  O portal dela exige login. Preencha abaixo para <strong>trocar</strong> usuário/senha.
                </Alerta>
              )}
              {acesso && !acesso.temAcesso && (
                <Alerta tipo="aviso">
                  Esta empresa ainda <strong>não tem acesso</strong>: o portal abre apenas pelo link.
                  Defina usuário e senha para exigir login.
                </Alerta>
              )}

              <Campo
                rotulo="Usuário (e-mail ou nome)"
                type="text"
                autoComplete="off"
                placeholder="contato@empresa.com ou nome-de-acesso"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
              />

              <Campo
                rotulo="Senha"
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres, com letra e número"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />

              {/* Medidor de força da senha */}
              <div style={{ marginTop: -8 }}>
                <div style={{ display: 'flex', gap: 4 }} aria-hidden="true">
                  {[1, 2, 3, 4].map((n) => (
                    <span
                      key={n}
                      style={{
                        height: 5, flex: 1, borderRadius: 999,
                        background: n <= forca.nivel ? forca.cor : 'var(--borda)',
                        transition: 'background .2s',
                      }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: 12, marginTop: 4, color: 'var(--texto-suave)' }}>
                  Força: <strong style={{ color: forca.cor }}>{forca.rotulo}</strong>
                  {' '}· caracteres especiais são opcionais.
                </div>
              </div>

              <Campo
                rotulo="Confirmar senha"
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repita a senha"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                erro={confirmar.length > 0 && confirmar !== senha ? 'As senhas não conferem.' : undefined}
              />

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--texto-suave)', marginTop: -6 }}>
                <input type="checkbox" checked={mostrarSenha} onChange={(e) => setMostrarSenha(e.target.checked)} />
                Mostrar senha
              </label>

              {msg && <Alerta tipo={msg.tipo}>{msg.texto}</Alerta>}

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Btn variante="primary" onClick={salvar} disabled={!podeSalvar}>
                  {salvando ? 'Salvando…' : acesso?.temAcesso ? 'Atualizar acesso' : 'Criar acesso'}
                </Btn>
                {acesso?.temAcesso && (
                  <Btn variante="danger" onClick={remover} disabled={removendo}>
                    {removendo ? 'Removendo…' : 'Remover acesso'}
                  </Btn>
                )}
              </div>

              {/* Link da área de membro (portal do cliente) */}
              {linkPortal && (
                <div style={{ borderTop: '1px solid var(--borda)', paddingTop: 14, marginTop: 2 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--texto-suave)', marginBottom: 6 }}>
                    Link da área de membro (portal do cliente)
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <code style={{
                      flex: '1 1 260px', fontSize: 13, padding: '8px 10px', borderRadius: 8,
                      background: 'var(--fundo-2)', border: '1px solid var(--borda)',
                      overflowWrap: 'anywhere',
                    }}>
                      {linkPortal}
                    </code>
                    <Btn variante="secondary" onClick={copiarLink}>{copiado ? 'Copiado!' : 'Copiar'}</Btn>
                    <a href={linkPortal} target="_blank" rel="noreferrer">
                      <Btn variante="ghost">Abrir</Btn>
                    </a>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
