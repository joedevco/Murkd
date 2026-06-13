import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verify caller is authenticated and is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });

    // Get message from request body
    const { title, body } = await req.json();
    if (!title || !body) return new Response(JSON.stringify({ error: 'title and body required' }), { status: 400 });

    // Get all opted-in user ids (excluding admins)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_admin', false)
      .filter('notification_preferences->announcements', 'eq', 'true');

    if (!profiles?.length) return new Response(JSON.stringify({ ok: true, sent: 0 }), { status: 200 });

    const userIds = profiles.map(p => p.id);

    // Insert a notification row for each user
    const notifications = userIds.map(userId => ({
      user_id: userId,
      type: 'announcement',
      actor_ghost_tag: title,
      post_preview: body,
    }));
    await supabase.from('notifications').insert(notifications);

    // Get their push tokens
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('push_token')
      .in('user_id', userIds);

    if (!tokens?.length) return new Response(JSON.stringify({ ok: true, sent: 0 }), { status: 200 });

    // Send to all tokens
    const results = await Promise.allSettled(
      tokens.map(t =>
        fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: t.push_token,
            sound: 'default',
            title,
            body,
            data: { type: 'announcement', screen: 'notifications' },
          }),
        })
      )
    );

    const expoResponses = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        expoResponses.push(await result.value.json());
      } else {
        expoResponses.push({ error: result.reason?.message ?? 'Unknown' });
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: tokens.length, expoResponses }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
