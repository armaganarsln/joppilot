import { describe, it, expect } from 'vitest';
import { isAdminEmail, getAdminProject, projectLabel } from './access';

describe('isAdminEmail', () => {
  it('recognises allowlisted admin emails', () => {
    expect(isAdminEmail('armagan@joeppli.ch')).toBe(true);
    expect(isAdminEmail('armaganarsln@gmail.com')).toBe(true);
    expect(isAdminEmail('afra@joeppli.ch')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isAdminEmail('Armagan@Joeppli.CH')).toBe(true);
    expect(isAdminEmail('AFRA@JOEPPLI.CH')).toBe(true);
  });

  it('rejects non-admin and malformed input', () => {
    expect(isAdminEmail('random@operator.com')).toBe(false);
    expect(isAdminEmail('')).toBe(false);
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });

  it('does not treat a lookalike/substring as admin', () => {
    expect(isAdminEmail('armagan@joeppli.ch.evil.com')).toBe(false);
    expect(isAdminEmail('notarmagan@joeppli.ch')).toBe(false);
  });
});

describe('getAdminProject', () => {
  it('maps each admin to their workspace', () => {
    expect(getAdminProject('armagan@joeppli.ch')).toBe('zurich');
    expect(getAdminProject('armaganarsln@gmail.com')).toBe('zurich');
    expect(getAdminProject('afra@joeppli.ch')).toBe('glarus');
  });

  it('returns null for non-admins', () => {
    expect(getAdminProject('someone@else.com')).toBeNull();
    expect(getAdminProject(null)).toBeNull();
  });
});

describe('projectLabel', () => {
  it('renders human-readable workspace labels', () => {
    expect(projectLabel('zurich')).toBe('Zürich (ERZ)');
    expect(projectLabel('glarus')).toBe('Glarus');
  });
});
