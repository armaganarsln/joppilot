import type { WorkspaceProject } from '../types';

/**
 * Single source of truth for the admin allowlist on the client.
 *
 * Each admin email maps to the workspace they administer. Keep this in sync
 * with the `isAdminEmail()` function in `firestore.rules` — that is the only
 * place admin privileges are *enforced* (this file is for client UX only).
 *
 * NOTE: All keys MUST be lowercase; lookups normalise the incoming email.
 */
export const ADMIN_PROJECTS: Record<string, WorkspaceProject> = {
  'armagan@joeppli.ch': 'zurich',
  'armaganarsln@gmail.com': 'zurich',
  'afra@joeppli.ch': 'glarus',
};

/** Admin emails that should be notified of pending operators, keyed by project. */
export const PROJECT_ADMIN_EMAILS: Record<WorkspaceProject, string[]> = {
  zurich: ['armagan@joeppli.ch', 'armaganarsln@gmail.com'],
  glarus: ['afra@joeppli.ch'],
};

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase() in ADMIN_PROJECTS;
}

/** Returns the workspace an admin email administers, or null if not an admin. */
export function getAdminProject(email?: string | null): WorkspaceProject | null {
  if (!email) return null;
  return ADMIN_PROJECTS[email.toLowerCase()] ?? null;
}

export function projectLabel(project: WorkspaceProject): string {
  return project === 'zurich' ? 'Zürich (ERZ)' : 'Glarus';
}
