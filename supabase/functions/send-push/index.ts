import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const { user_id, type, actor_ghost_tag, post_preview, post_id } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  await supabase.from('notifications').insert({
    user_id,
    type,
    actor_ghost_tag,
    post_preview,
    post_id,
  });

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('push_token, platform')
    .eq('user_id', user_id);

  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const title = type === 'like'
    ? '🔥 Someone liked your confession'
    : type === 'handshake'
    ? '🤝 Someone handshaked your confession'
    : type === 'sad'
    ? '😢 Someone reacted sad to your confession'
    : '😂 Someone reacted funny to your confession';

  const preview = post_preview ?? '';
  const body = `"${preview.length > 80 ? preview.slice(0, 80) + '...' : preview}" — ${actor_ghost_tag}`;

  const results = await Promise.allSettled(
    tokens.map((t: { push_token: string; platform: string }) =>
      fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: t.push_token,
          sound: 'default',
          title,
          body,
          data: { type, post_id, screen: 'notifications' },
        }),
      })
    ),
  );

  const expoResponses = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      const data = await result.value.json();
      expoResponses.push(data);
    } else {
      expoResponses.push({ error: result.reason?.message ?? 'Unknown' });
    }
  }

  return new Response(JSON.stringify({ ok: true, sent: results.length, expoResponses, tokenPreview: tokens.map((t: { push_token: string; platform: string }) => t.push_token.substring(0, 20)) }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
