const { createClient } = require('@supabase/supabase-js')

function buildFollowUpMessage(row) {
  const tone = String(row?.emotional_tone || '').toLowerCase()
  switch (tone) {
    case 'struggling':
      return "Hey, I've been thinking about you. How are you holding up today? 🙏"
    case 'seeking':
      return 'Still thinking about your questions from yesterday. Want to keep exploring together? ✝️'
    case 'encouraged':
      return 'You were in such a good place yesterday. Keep that faith burning! 🔥'
    default:
      return "Just checking in on you today. God's got you. 🙏⚓"
  }
}

async function sendPush(pushToken, message, topic) {
  // If your profiles table does not yet include push_token, add it before enabling follow-ups.
  // This uses Expo push as a simple default transport.
  const body = {
    to: pushToken,
    sound: 'default',
    title: topic ? `Following up on: ${topic}` : 'Abiding Anchor',
    body: message,
    data: { type: 'ai_follow_up', topic: topic || null },
  }

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Push send failed: ${res.status} ${text}`)
  }
}

exports.handler = async () => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_KEY

    if (!supabaseUrl || !serviceKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY' }),
      }
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    const nowIso = new Date().toISOString()

    const { data: dueRows, error: dueErr } = await supabase
      .from('ai_conversations')
      .select('id, user_id, last_topic, emotional_tone, follow_up_sent, follow_up_scheduled_at')
      .eq('follow_up_sent', false)
      .lte('follow_up_scheduled_at', nowIso)

    if (dueErr) throw dueErr
    if (!dueRows?.length) {
      return { statusCode: 200, body: JSON.stringify({ processed: 0, sent: 0 }) }
    }

    let sent = 0
    for (const row of dueRows) {
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', row.user_id)
        .maybeSingle()

      if (profileErr) {
        console.error('profile lookup error', row.user_id, profileErr)
        continue
      }

      if (!profile?.push_token) {
        // push_token column/value needed to deliver follow-ups for this user.
        continue
      }

      try {
        const message = buildFollowUpMessage(row)
        await sendPush(profile.push_token, message, row.last_topic)

        const { error: updateErr } = await supabase
          .from('ai_conversations')
          .update({ follow_up_sent: true, updated_at: new Date().toISOString() })
          .eq('id', row.id)
        if (updateErr) throw updateErr

        sent += 1
      } catch (err) {
        console.error('follow-up send error', row.id, err)
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ processed: dueRows.length, sent }),
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
