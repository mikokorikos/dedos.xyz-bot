import type { Logger } from 'pino';
import { describe, expect, it, vi } from 'vitest';

import { AddWarnUseCase } from '@/application/usecases/warns/AddWarnUseCase';
import { WarnSeverity } from '@/domain/entities/types';
import type { Warn } from '@/domain/entities/Warn';
import type { IWarnRepository, WarnSummary } from '@/domain/repositories/IWarnRepository';

const createRepositoryMock = () => {
  const repo: IWarnRepository = {
    withTransaction: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
    listByUser: vi.fn(),
    getSummary: vi.fn(),
  };

  return repo;
};

describe('AddWarnUseCase', () => {
  it('returns recommended action based on summary', async () => {
    const repo = createRepositoryMock();
    const logger = { info: vi.fn() } as unknown as Logger;
    const useCase = new AddWarnUseCase(repo, logger);

    const warn = { id: 1 } as Warn;
    (repo.create as vi.Mock).mockResolvedValue(warn);
    (repo.getSummary as vi.Mock).mockResolvedValue({
      total: 3,
      weightedScore: 6,
      lastWarnAt: new Date(),
    } satisfies WarnSummary);

    const result = await useCase.execute({
      userId: '123456789012345678',
      moderatorId: '987654321098765432',
      severity: WarnSeverity.CRITICAL,
      reason: 'Prueba',
    });

    expect(result.recommendedAction).toBe('TEMP_BAN');
    expect(repo.create).toHaveBeenCalled();
    expect(repo.getSummary).toHaveBeenCalled();
  });
});
