/**
 * Human-readable copy for Supabase Auth errors. When "Confirm email" is enabled
 * in the project, sign-in before verification returns an error whose message
 * or code varies by GoTrue version — normalize it here.
 */
export function formatAuthErrorMessage(error) {
  if (error == null) return 'Something went wrong. Please try again.'
  const raw = error.message != null ? String(error.message) : ''
  const code = error.code != null ? String(error.code) : ''
  const combined = `${code} ${raw}`.toLowerCase()

  if (
    code === 'email_not_confirmed' ||
    combined.includes('email_not_confirmed') ||
    combined.includes('email not confirmed')
  ) {
    return 'Please check your email to confirm your account before signing in.'
  }

  return raw || 'Something went wrong. Please try again.'
}
