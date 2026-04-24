export async function withAiLimit(checkAndIncrement, aiCallFn, options = {}) {
  const { isSupporter = false, onLimitReached } = options;

  const { allowed, remaining, count } = await checkAndIncrement({ isSupporter });

  if (!allowed) {
    if (typeof onLimitReached === 'function') {
      onLimitReached({ remaining, count });
    }
    return null;
  }

  return await aiCallFn({ remaining, count });
}
