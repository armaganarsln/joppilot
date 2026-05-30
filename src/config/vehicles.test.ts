import { describe, it, expect } from 'vitest';
import { vehicleName } from './vehicles';

describe('vehicleName', () => {
  it('resolves Zürich vehicle names', () => {
    expect(vehicleName('v1', 'zurich')).toBe('JÖP-01');
    expect(vehicleName('v2', 'zurich')).toBe('JÖP-02');
  });

  it('resolves Glarus vehicle names', () => {
    expect(vehicleName('v1', 'glarus')).toBe('GL-01');
    expect(vehicleName('v2', 'glarus')).toBe('GL-02');
  });

  it('defaults to the Zürich workspace', () => {
    expect(vehicleName('v1')).toBe('JÖP-01');
  });

  it('falls back to an upper-cased id for unknown vehicles', () => {
    expect(vehicleName('v9', 'zurich')).toBe('V9');
  });
});
