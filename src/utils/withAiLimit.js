export async function withAiLimit(checkAndIncrement, aiCallFn, options = {}) {
  const { isSupporter = false, supporterTier, onLimitReached } = options;

  const { allowed, remaining, count } = await checkAndIncrement({ supporterTier, isSupporter });

  if (!allowed) {
    if (typeof onLimitReached === 'function') {
      onLimitReached({ remaining, count });
    }
    return null;
  }

  return await aiCallFn({ remaining, count });
}
