/** Numeric roles stored on User.role and embedded in JWT. */
export const ROLE = {
  SUPER_ADMIN: 0,
  ADMIN: 1,
  EDITOR: 2,
  AUTHOR: 3,
} as const;

export type RoleValue = (typeof ROLE)[keyof typeof ROLE];

export const ROLE_LABELS: Record<number, string> = {
  [ROLE.SUPER_ADMIN]: 'SuperAdmin',
  [ROLE.ADMIN]: 'Admin',
  [ROLE.EDITOR]: 'Editor',
  [ROLE.AUTHOR]: 'Author',
};

/** Normalize JWT / DB role to a known numeric tier. Unknown values are treated as Author (most restrictive). */
export function normalizeRole(role: number | string | undefined | null): RoleValue {
  if (typeof role === 'number' && Number.isFinite(role)) {
    if (role <= ROLE.SUPER_ADMIN) return ROLE.SUPER_ADMIN;
    if (role === ROLE.ADMIN) return ROLE.ADMIN;
    if (role === ROLE.EDITOR) return ROLE.EDITOR;
    return ROLE.AUTHOR;
  }
  if (typeof role === 'string') {
    const r = role.toLowerCase();
    if (r.includes('super') || r.includes('owner')) return ROLE.SUPER_ADMIN;
    if (r.includes('admin')) return ROLE.ADMIN;
    if (r.includes('editor')) return ROLE.EDITOR;
    return ROLE.AUTHOR;
  }
  return ROLE.AUTHOR;
}

export function isAdminTier(role: number | string | undefined | null): boolean {
  const r = normalizeRole(role);
  return r === ROLE.SUPER_ADMIN || r === ROLE.ADMIN;
}

export function isEditorTier(role: number | string | undefined | null): boolean {
  return normalizeRole(role) === ROLE.EDITOR;
}

export function isAuthorTier(role: number | string | undefined | null): boolean {
  return normalizeRole(role) === ROLE.AUTHOR;
}
