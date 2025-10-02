// =============================================================================
// RUTA: src/infrastructure/repositories/PrismaTicketTypePolicyRepository.ts
// =============================================================================

import type {
  Prisma,
  PrismaClient,
  TicketTypePolicy as PrismaTicketTypePolicyModel,
  TicketTypeCooldown as PrismaTicketTypeCooldownModel,
} from '@prisma/client';

import type { TicketType } from '@/domain/entities/types';
import type {
  ITicketTypePolicyRepository,
  TicketTypeCooldown,
  TicketTypePolicy,
} from '@/domain/repositories/ITicketTypePolicyRepository';
import type { TransactionContext } from '@/domain/repositories/transaction';

const mapPolicy = (policy: PrismaTicketTypePolicyModel): TicketTypePolicy => ({
  type: policy.type as TicketType,
  maxOpenPerUser: policy.maxOpenPerUser,
  cooldownSeconds: policy.cooldownSeconds,
  staffRoleId: policy.staffRoleId ?? undefined,
  requiresStaffApproval: policy.requiresStaffApproval,
});

const mapCooldown = (cooldown: PrismaTicketTypeCooldownModel): TicketTypeCooldown => ({
  type: cooldown.type as TicketType,
  userId: cooldown.userId,
  lastOpenedAt: cooldown.lastOpenedAt,
});

type PrismaClientLike = PrismaClient | Prisma.TransactionClient;

export class PrismaTicketTypePolicyRepository implements ITicketTypePolicyRepository {
  public constructor(private readonly prisma: PrismaClientLike) {}

  public withTransaction(context: TransactionContext): ITicketTypePolicyRepository {
    if (!PrismaTicketTypePolicyRepository.isTransactionClient(context)) {
      throw new Error('Invalid Prisma transaction context provided to ticket type policy repository.');
    }

    return new PrismaTicketTypePolicyRepository(context);
  }

  public async getPolicy(type: TicketType): Promise<TicketTypePolicy | null> {
    const policy = await this.prisma.ticketTypePolicy.findUnique({
      where: { type },
    });

    return policy ? mapPolicy(policy) : null;
  }

  public async getAllPolicies(): Promise<readonly TicketTypePolicy[]> {
    const policies = await this.prisma.ticketTypePolicy.findMany();
    return policies.map(mapPolicy);
  }

  public async getCooldown(type: TicketType, userId: bigint): Promise<TicketTypeCooldown | null> {
    const cooldown = await this.prisma.ticketTypeCooldown.findUnique({
      where: {
        type_userId: {
          type,
          userId,
        },
      },
    });

    return cooldown ? mapCooldown(cooldown) : null;
  }

  public async upsertCooldown(type: TicketType, userId: bigint, openedAt: Date): Promise<void> {
    await this.prisma.ticketTypeCooldown.upsert({
      where: {
        type_userId: {
          type,
          userId,
        },
      },
      create: {
        type,
        userId,
        lastOpenedAt: openedAt,
      },
      update: {
        lastOpenedAt: openedAt,
      },
    });
  }

  private static isTransactionClient(value: TransactionContext): value is Prisma.TransactionClient {
    return typeof value === 'object' && value !== null && 'ticketTypePolicy' in value;
  }
}
