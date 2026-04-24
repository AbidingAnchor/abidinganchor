import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const DAILY_LIMITS = {
  free: 5,
  monthly: 50,
  lifetime: Infinity,
};

export function useAiUsage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const resolveTier = ({ supporterTier, isSupporter } = {}) => {
    if (supporterTier && DAILY_LIMITS[supporterTier] !== undefined) return supporterTier;
    if (isSupporter) return 'monthly';
    return 'free';
  };

  const getUsage = useCallback(async ({ supporterTier, isSupporter } = {}) => {
    setError(null);
    const tier = resolveTier({ supporterTier, isSupporter });
    const limit = DAILY_LIMITS[tier];

    if (limit === Infinity) {
      return { count: 0, remaining: Infinity };
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setError('User not authenticated');
      return { count: 0, remaining: limit };
    }

    const today = getTodayDate();
    const { data, error: fetchError } = await supabase
      .from('ai_usage')
      .select('count')
      .eq('user_id', user.id)
      .eq('usage_date', today)
      .maybeSingle();

    if (fetchError) {
      setError(fetchError.message);
      return { count: 0, remaining: limit };
    }

    const count = data?.count ?? 0;
    return { count, remaining: Math.max(0, limit - count) };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAndIncrement = useCallback(async ({ supporterTier, isSupporter = false } = {}) => {
    setLoading(true);
    setError(null);

    try {
      const tier = resolveTier({ supporterTier, isSupporter });
      const limit = DAILY_LIMITS[tier];

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError('User not authenticated');
        return { allowed: false, remaining: 0, count: 0 };
      }

      if (limit === Infinity) {
        return { allowed: true, remaining: Infinity, count: 0 };
      }

      const today = getTodayDate();

      const { data: existing, error: fetchError } = await supabase
        .from('ai_usage')
        .select('count')
        .eq('user_id', user.id)
        .eq('usage_date', today)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const currentCount = existing?.count ?? 0;

      if (currentCount >= limit) {
        return { allowed: false, remaining: 0, count: currentCount };
      }

      const newCount = currentCount + 1;
      const { error: upsertError } = await supabase
        .from('ai_usage')
        .upsert(
          { user_id: user.id, usage_date: today, count: newCount },
          { onConflict: 'user_id,usage_date' }
        );

      if (upsertError) throw upsertError;

      return {
        allowed: true,
        remaining: Math.max(0, limit - newCount),
        count: newCount,
      };
    } catch (err) {
      setError(err.message);
      return { allowed: false, remaining: 0, count: 0 };
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { checkAndIncrement, getUsage, loading, error };
}
