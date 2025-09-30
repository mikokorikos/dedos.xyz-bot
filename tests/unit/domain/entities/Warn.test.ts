import { describe, expect, it } from 'vitest';

import { WarnSeverity } from '@/domain/entities/types';
import { Warn } from '@/domain/entities/Warn';

describe('Warn entity', () => {
  it('computes weight based on severity', () => {
    const warnMinor = new Warn(1, 1n, null, WarnSeverity.MINOR, null, new Date());
    const warnMajor = new Warn(2, 1n, null, WarnSeverity.MAJOR, null, new Date());
    const warnCritical = new Warn(3, 1n, null, WarnSeverity.CRITICAL, null, new Date());

    expect(warnMinor.weight()).toBe(1);
    expect(warnMajor.weight()).toBe(2);
    expect(warnCritical.weight()).toBe(3);
  });

  it('flags critical warns', () => {
    const warn = new Warn(1, 1n, null, WarnSeverity.CRITICAL, null, new Date());

    expect(warn.isCritical()).toBe(true);
  });
});
