import { PrismaClient } from '@prisma/client';

import { env } from '@/shared/config/env';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const prismaClient = globalForPrisma.prisma
  ?? new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prismaClient;
}

export const prisma = prismaClient;
