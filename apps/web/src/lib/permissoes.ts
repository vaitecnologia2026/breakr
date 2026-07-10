// Helpers de permissão de menu/rota por perfil de acesso.
//
// Regras (compatibilidade total com o que já existe):
//  - ADMIN/SUPERADMIN sempre veem tudo.
//  - Usuário SEM perfil (perfilId ausente/null) vê tudo.
//  - Só quando há perfilId as permissões (lista de rotas) passam a restringir.
import type { UsuarioPublico } from '@breakr/shared';

// Rotas que qualquer usuário autenticado sempre acessa (evita lockout).
export const ROTAS_SEMPRE_LIBERADAS = ['/', '/perfil'];

// true = enxerga tudo (sem restrição de perfil).
export function veTudo(u: UsuarioPublico | null | undefined): boolean {
  if (!u) return true;
  if (u.cargo === 'ADMIN' || u.cargo === 'SUPERADMIN') return true;
  // Sem perfil atribuído → acesso total (usuários já existentes não mudam).
  if (!u.perfilId) return true;
  return false;
}

// Um menu (identificado pela rota "para") é visível para o usuário?
export function podeVerMenu(u: UsuarioPublico | null | undefined, para: string): boolean {
  if (veTudo(u)) return true;
  if (ROTAS_SEMPRE_LIBERADAS.includes(para)) return true;
  return (u?.permissoes ?? []).includes(para);
}

// Uma rota (pathname atual) é permitida? Considera sub-rotas:
//  - "/contatos/pessoas" é liberada se a permissão for "/contatos" ou "/contatos/pessoas".
//  - o pai "/contatos" é liberado se houver qualquer permissão que comece com "/contatos/".
export function rotaPermitida(u: UsuarioPublico | null | undefined, pathname: string): boolean {
  if (veTudo(u)) return true;
  if (ROTAS_SEMPRE_LIBERADAS.includes(pathname)) return true;
  const perms = u?.permissoes ?? [];
  return perms.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`) || p.startsWith(`${pathname}/`),
  );
}
