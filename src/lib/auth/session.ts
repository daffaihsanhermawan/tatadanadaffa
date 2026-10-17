import { Profile } from '@/types';

const SESSION_KEY = 'tatadana_session_user';

export function getCurrentUser(): Profile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: Profile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event('tatadana_auth_change'));
  } catch (e) {
    console.error('Failed to save session:', e);
  }
}

export function clearCurrentUser(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new Event('tatadana_auth_change'));
  } catch (e) {
    console.error('Failed to clear session:', e);
  }
}
