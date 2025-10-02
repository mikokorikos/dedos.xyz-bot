// ============================================================================
// RUTA: src/shared/guards/message-guards.ts
// ============================================================================

export interface PrefixCheckOptions {
  readonly prefixes: readonly string[];
  readonly content: string;
}

export interface CooldownOptions {
  readonly bucket: string;
  readonly userId: string;
  readonly durationMs: number;
  readonly now?: number;
}

export interface CooldownResult {
  readonly allowed: boolean;
  readonly remainingMs?: number;
}

export interface SpamOptions {
  readonly userId: string;
  readonly content: string;
  readonly now?: number;
  readonly windowMs?: number;
  readonly maxDuplicates?: number;
  readonly maxMentions?: number;
}

export interface SpamResult {
  readonly isSpam: boolean;
  readonly reason?: 'duplicates' | 'mentions';
  readonly occurrences?: number;
}

const DEFAULT_SPAM_WINDOW = 10_000;
const DEFAULT_SPAM_DUPLICATES = 3;
const DEFAULT_SPAM_MENTIONS = 5;

const cooldownRegistry = new Map<string, number>();
const spamRegistry = new Map<string, { occurrences: number; content: string; expiresAt: number }>();

const prefixCheck = ({ prefixes, content }: PrefixCheckOptions): boolean => {
  const normalizedContent = content.trim();
  if (normalizedContent.length === 0) {
    return false;
  }

  return prefixes.some((prefix) => normalizedContent.startsWith(prefix));
};

const registerCooldown = ({ bucket, userId, durationMs, now = Date.now() }: CooldownOptions): CooldownResult => {
  const key = `${bucket}:${userId}`;
  const expiresAt = cooldownRegistry.get(key);

  if (typeof expiresAt === 'number' && expiresAt > now) {
    return {
      allowed: false,
      remainingMs: expiresAt - now,
    };
  }

  cooldownRegistry.set(key, now + durationMs);

  return { allowed: true };
};

const detectSpam = ({
  userId,
  content,
  now = Date.now(),
  windowMs = DEFAULT_SPAM_WINDOW,
  maxDuplicates = DEFAULT_SPAM_DUPLICATES,
  maxMentions = DEFAULT_SPAM_MENTIONS,
}: SpamOptions): SpamResult => {
  const mentionMatches = content.match(/<@!?\d{17,20}>/gu);
  const mentionCount = mentionMatches?.length ?? 0;

  if (mentionCount > maxMentions) {
    return { isSpam: true, reason: 'mentions', occurrences: mentionCount };
  }

  const existing = spamRegistry.get(userId);

  if (!existing || existing.expiresAt <= now || existing.content !== content) {
    spamRegistry.set(userId, {
      content,
      occurrences: 1,
      expiresAt: now + windowMs,
    });

    return { isSpam: false, occurrences: 1 };
  }

  const updatedOccurrences = existing.occurrences + 1;
  spamRegistry.set(userId, {
    ...existing,
    occurrences: updatedOccurrences,
    expiresAt: now + windowMs,
  });

  if (updatedOccurrences > maxDuplicates) {
    return { isSpam: true, reason: 'duplicates', occurrences: updatedOccurrences };
  }

  return { isSpam: false, occurrences: updatedOccurrences };
};

const resetGuards = (): void => {
  cooldownRegistry.clear();
  spamRegistry.clear();
};

export const messageGuards = {
  hasValidPrefix: prefixCheck,
  registerCooldown,
  detectSpam,
  reset: resetGuards,
};

export type MessageGuards = typeof messageGuards;
