import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useTema } from '../lib/theme';

const AVATAR_KEY_PREFIX = 'brk.avatar.';

function getAvatarKey(userId: string) { return AVATAR_KEY_PREFIX + userId; }

function lerAvatarLocal(userId: string): string | null {
  try { return localStorage.getItem(getAvatarKey(userId)); } catch { return null; }
}
function salvarAvatarLocal(userId: string, dataUrl: string) {
  try { localStorage.setItem(getAvatarKey(userId), dataUrl); } catch { /* noop */ }
}

function corAvatar(nome: string): string {
  const cores = ['#d05028','#9b59b6','#3498db','#2ecc71','#e67e22','#1abc9c','#e74c3c','#16a085','#8e44ad','#2980b9'];
  const hash = nome.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return cores[hash % cores.length];
}

interface AvatarProps {
  nome: string;
  userId: string;
  size?: number;
  onClick?: () => void;
  editable?: boolean;
}

export function Avatar({ nome, userId, size = 32, onClick, editable = false }: AvatarProps) {
  const [foto, setFoto] = useState<string | null>(() => lerAvatarLocal(userId));
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      salvarAvatarLocal(userId, dataUrl);
      setFoto(dataUrl);
      window.dispatchEvent(new CustomEvent('brk-avatar-changed', { detail: { userId, dataUrl } }));
    };
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    function onAvatarChange(e: Event) {
      const ev = e as CustomEvent<{ userId: string; dataUrl: string }>;
      if (ev.detail.userId === userId) setFoto(ev.detail.dataUrl);
    }
    window.addEventListener('brk-avatar-changed', onAvatarChange);
    return () => window.removeEventListener('brk-avatar-changed', onAvatarChange);
  }, [userId]);

  const iniciais = nome.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const bg = corAvatar(nome);

  const estiloBase: React.CSSProperties = {
    width: size, height: size,
    borderRadius: '50%',
    flexShrink: 0,
    overflow: 'hidden',
    position: 'relative',
    cursor: editable ? 'pointer' : onClick ? 'pointer' : 'default',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: foto ? 'transparent' : bg,
    fontSize: size * 0.38, fontWeight: 700, color: '#fff',
    border: '2px solid var(--borda-forte)',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={estiloBase} onClick={editable ? () => inputRef.current?.click() : onClick} title={editable ? 'Trocar foto' : nome}>
      {foto ? (
        <img src={foto} alt={nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span>{iniciais}</span>
      )}
      {editable && (
        <>
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0, transition: 'opacity 0.15s',
            fontSize: 10, color: '#fff', fontWeight: 700,
          }}
            className="brk-avatar-hover-overlay"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        </>
      )}
    </div>
  );
}

// Ícones inline
function IcoUser() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function IcoChat() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}
function IcoSettings() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
}
function IcoSun() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
}
function IcoMoon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
}
function IcoLogOut() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
}
function IcoChevron() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
}

export function UserMenu() {
  const { usuario, logout } = useAuth();
  const { tema, alternarTema } = useTema();
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function onClickFora(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setAberto(false);
    }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') setAberto(false); }
    document.addEventListener('mousedown', onClickFora);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onClickFora); document.removeEventListener('keydown', onEsc); };
  }, [aberto]);

  if (!usuario) return null;

  function ir(path: string) { navigate(path); setAberto(false); }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {/* Chip do usuário */}
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className={`brk-user-chip${aberto ? ' open' : ''}`}
        aria-expanded={aberto}
        aria-haspopup="true"
      >
        <Avatar nome={usuario.nome} userId={usuario.id} size={28} />
        <span className="brk-user-chip-nome">{usuario.nome.split(' ')[0]}</span>
        <span className="brk-user-chip-chevron"><IcoChevron /></span>
      </button>

      {/* Dropdown */}
      {aberto && (
        <div className="brk-user-dropdown" role="menu">
          {/* Header com avatar grande + info */}
          <div className="brk-user-dropdown-header">
            <Avatar nome={usuario.nome} userId={usuario.id} size={48} editable />
            <div className="brk-user-dropdown-info">
              <span className="brk-user-dropdown-nome">{usuario.nome}</span>
              <span className="brk-user-dropdown-email">{usuario.email ?? ''}</span>
              <span className="brk-user-dropdown-cargo">{usuario.cargo}</span>
            </div>
          </div>

          <div className="brk-user-dropdown-sep" />

          {/* Links */}
          <button type="button" className="brk-user-dropdown-item" onClick={() => ir('/perfil')}>
            <IcoUser />
            <span>Meu perfil</span>
          </button>
          <button type="button" className="brk-user-dropdown-item" onClick={() => ir('/chat')}>
            <IcoChat />
            <span>Chat interno</span>
          </button>
          <button type="button" className="brk-user-dropdown-item" onClick={() => ir('/configuracoes')}>
            <IcoSettings />
            <span>Configurações</span>
          </button>

          <div className="brk-user-dropdown-sep" />

          {/* Toggle tema */}
          <button type="button" className="brk-user-dropdown-item" onClick={alternarTema}>
            {tema === 'dark' ? <IcoSun /> : <IcoMoon />}
            <span>{tema === 'dark' ? 'Modo claro' : 'Modo escuro'}</span>
            <span className="brk-user-dropdown-badge">{tema === 'dark' ? '☀️' : '🌙'}</span>
          </button>

          <div className="brk-user-dropdown-sep" />

          {/* Logout */}
          <button type="button" className="brk-user-dropdown-item danger" onClick={() => { logout(); setAberto(false); }}>
            <IcoLogOut />
            <span>Sair do sistema</span>
          </button>
        </div>
      )}
    </div>
  );
}
