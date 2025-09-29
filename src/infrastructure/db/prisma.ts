// ============================================================================
// RUTA: src/infrastructure/db/prisma.ts
// ============================================================================

import { PrismaClient } from '@prisma/client';

import { env } from '@/shared/config/env';
import { logger } from '@/shared/logger/pino';

const createPrismaClient = () =>
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
    errorFormat: env.NODE_ENV === 'development' ? 'pretty' : 'minimal',
  });

type GlobalWithPrisma = typeof globalThis & { prisma?: PrismaClient };

const globalForPrisma = globalThis as GlobalWithPrisma;

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export const ensureDatabaseConnection = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.debug('Conexión con Prisma establecida.');
  } catch (error) {
    logger.error({ err: error }, 'No fue posible conectar con la base de datos.');
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
};
