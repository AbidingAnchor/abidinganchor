import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const FREE_TIER_DAILY_LIMIT = 5;

export function useAiUsage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  const getUsage = useCallback(async () => {
    setError(null);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setError('User not authenticated');
      return { count: 0, remaining: FREE_TIER_DAILY_LIMIT };
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
      return { count: 0, remaining: FREE_TIER_DAILY_LIMIT };
    }

    const count = data?.count ?? 0;
    return {
      count,
      remaining: Math.max(0, FREE_TIER_DAILY_LIMIT - count),
    };
  }, []);

  const checkAndIncrement = useCallback(async ({ isSupporter = false } = {}) => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError('User not authenticated');
        return { allowed: false, remaining: 0, count: 0 };
      }

      if (isSupporter) {
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

      if (currentCount >= FREE_TIER_DAILY_LIMIT) {
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
        remaining: Math.max(0, FREE_TIER_DAILY_LIMIT - newCount),
        count: newCount,
      };
    } catch (err) {
      setError(err.message);
      return { allowed: false, remaining: 0, count: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  return { checkAndIncrement, getUsage, loading, error };
}
