import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const adminDb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function tashkentToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
}

async function tg(method: string, payload: Record<string, unknown>) {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

async function sendText(chatId: number, text: string, replyMarkup?: unknown) {
  await tg('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  });
}

async function editText(chatId: number, messageId: number, text: string, replyMarkup?: unknown) {
  await tg('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    ...(replyMarkup ? { reply_markup: replyMarkup } : {})
  });
}

async function getSession(chatId: number) {
  const { data } = await adminDb
    .from('telegram_bot_sessions')
    .select('*')
    .eq('chat_id', chatId)
    .maybeSingle();
  return data;
}

async function upsertSession(chatId: number, patch: Record<string, unknown>) {
  const current = await getSession(chatId);
  if (!current) {
    await adminDb.from('telegram_bot_sessions').insert({
      chat_id: chatId,
      selected_date: tashkentToday(),
      selected_para: 1,
      ...patch,
      updated_at: new Date().toISOString()
    });
  } else {
    await adminDb
      .from('telegram_bot_sessions')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('chat_id', chatId);
  }
}

async function showGroupsMenu(chatId: number, messageId?: number) {
  const { data: groups, error } = await adminDb
    .from('groups')
    .select('id, name')
    .order('name');

  if (error || !groups?.length) {
    const msg = "Guruhlar topilmadi yoki bazada ma'lumot yo'q.";
    if (messageId) await editText(chatId, messageId, msg);
    else await sendText(chatId, msg);
    return;
  }

  const rows: Array<Array<{ text: string; callback_data: string }>> = [];
  for (let i = 0; i < groups.length; i += 2) {
    const chunk = groups.slice(i, i + 2).map((g) => ({
      text: g.name,
      callback_data: `grp:${g.id}`
    }));
    rows.push(chunk);
  }

  const text = `📊 <b>Guruhni tanlang</b> (Sana: <code>${tashkentToday()}</code>):`;
  const markup = { inline_keyboard: rows };

  if (messageId) await editText(chatId, messageId, text, markup);
  else await sendText(chatId, text, markup);
}

async function showGroupReport(chatId: number, groupId: string, messageId?: number) {
  const date = tashkentToday();
  const [{ data: group }, { data: students }, { data: existing }] = await Promise.all([
    adminDb.from('groups').select('id, name').eq('id', groupId).maybeSingle(),
    adminDb.from('students').select('id, full_name').eq('group_id', groupId).order('full_name'),
    adminDb
      .from('attendance')
      .select('student_id, status, note')
      .eq('group_id', groupId)
      .eq('lesson_date', date)
      .eq('para', 1)
  ]);

  if (!group) {
    await sendText(chatId, 'Guruh topilmadi.');
    return;
  }

  const statusMap = new Map<string, { status: string; note?: string | null }>();
  for (const r of existing ?? []) {
    statusMap.set(r.student_id, { status: r.status, note: r.note });
  }

  const present: string[] = [];
  const excused: string[] = [];
  const unexcused: string[] = [];
  const escaped: string[] = [];
  const unmarked: string[] = [];

  for (const s of students ?? []) {
    const rec = statusMap.get(s.id);
    const noteText = rec?.note ? ` (${rec.note})` : '';
    if (!rec) unmarked.push(s.full_name);
    else if (rec.status === 'present') present.push(s.full_name);
    else if (rec.status === 'excused_absent') excused.push(`${s.full_name}${noteText}`);
    else if (rec.status === 'unexcused_absent') unexcused.push(`${s.full_name}${noteText}`);
    else if (rec.status === 'escaped') escaped.push(`${s.full_name}${noteText}`);
    else unmarked.push(s.full_name);
  }

  const formatSection = (title: string, items: string[]) => {
    if (!items.length) return `${title} (0 ta):\n— Yo'q`;
    return `${title} (${items.length} ta):\n` + items.map((name, i) => `${i + 1}. ${name}`).join('\n');
  };

  const total = students?.length ?? 0;
  let text =
    `📋 <b>${group.name} — Davomat hisoboti</b>\n` +
    `📅 Sana: <code>${date}</code>\n` +
    `👥 Jami: <b>${total}</b> | ✅ <b>${present.length}</b> | 🟡 <b>${excused.length}</b> | 🔴 <b>${unexcused.length}</b>` +
    (escaped.length ? ` | 🟠 <b>${escaped.length}</b>` : '') +
    `\n\n` +
    `${formatSection('🟡 <b>Sabablilar</b>', excused)}\n\n` +
    `${formatSection('🔴 <b>Sababsizlar</b>', unexcused)}\n\n` +
    (escaped.length ? `${formatSection('🟠 <b>Qochganlar</b>', escaped)}\n\n` : '') +
    `${formatSection('✅ <b>Keldilar</b>', present)}`;

  if (unmarked.length) {
    text += `\n\n⚪️ <b>Belgilanmaganlar</b> (${unmarked.length} ta):\n` + unmarked.map((n, i) => `${i + 1}. ${n}`).join('\n');
  }

  const markup = {
    inline_keyboard: [
      [
        { text: '🔄 Yangilash', callback_data: `grp:${groupId}` },
        { text: '⬅️ Guruhlarga qaytish', callback_data: 'back_groups' }
      ]
    ]
  };

  if (messageId) await editText(chatId, messageId, text, markup);
  else await sendText(chatId, text, markup);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('OK', { status: 200 });
  }

  try {
    const update = await req.json();

    if (update.message?.text) {
      const chatId = update.message.chat.id as number;
      const text = String(update.message.text).trim();

      if (text === '/start' || text === '/help') {
        await sendText(
          chatId,
          "Assalomu alaykum! <b>4-son Texnikum Davomat</b> hisobot botiga xush kelibsiz.\n\n" +
            "Tizimga kirish uchun:\n" +
            "<code>/login email@example.com parolingiz</code>\n\n" +
            "Kirgandan so'ng:\n" +
            "/groups — guruhlar davomatini ko'rish\n" +
            "/logout — hisobdan chiqish"
        );
        return new Response('OK', { status: 200 });
      }

      if (text.startsWith('/login ')) {
        const parts = text.split(/\s+/);
        const email = parts[1];
        const password = parts.slice(2).join(' ');

        if (!email || !password) {
          await sendText(chatId, "Format noto'g'ri. Yuboring:\n<code>/login email parol</code>");
          return new Response('OK', { status: 200 });
        }

        const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data: signInData, error: authErr } = await authClient.auth.signInWithPassword({
          email,
          password
        });

        if (authErr || !signInData.user) {
          await sendText(chatId, "❌ Email yoki parol noto'g'ri.");
          return new Response('OK', { status: 200 });
        }

        const { data: profile } = await adminDb
          .from('profiles')
          .select('id, full_name, role, is_active')
          .eq('id', signInData.user.id)
          .maybeSingle();

        if (!profile || !profile.is_active) {
          await sendText(chatId, "❌ Profil topilmadi yoki hisob faol emas.");
          return new Response('OK', { status: 200 });
        }

        await upsertSession(chatId, { user_id: profile.id });
        await sendText(
          chatId,
          `✅ Xush kelibsiz, <b>${profile.full_name}</b>!\nGuruhlarni ko'rish uchun: /groups`
        );
        return new Response('OK', { status: 200 });
      }

      if (text === '/logout') {
        await adminDb.from('telegram_bot_sessions').delete().eq('chat_id', chatId);
        await sendText(chatId, "Hisobdan chiqildi.");
        return new Response('OK', { status: 200 });
      }

      const session = await getSession(chatId);
      if (!session?.user_id) {
        await sendText(chatId, "Avval tizimga kiring:\n<code>/login email parol</code>");
        return new Response('OK', { status: 200 });
      }

      if (text === '/groups') {
        await showGroupsMenu(chatId);
        return new Response('OK', { status: 200 });
      }

      await sendText(chatId, "Guruhlarni ko'rish uchun <code>/groups</code> buyrug'ini yuboring.");
      return new Response('OK', { status: 200 });
    }

    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message.chat.id as number;
      const messageId = cq.message.message_id as number;
      const data = String(cq.data ?? '');

      const session = await getSession(chatId);
      if (!session?.user_id) {
        await tg('answerCallbackQuery', {
          callback_query_id: cq.id,
          text: "Avval /login orqali kiring!",
          show_alert: true
        });
        return new Response('OK', { status: 200 });
      }

      const { data: profile } = await adminDb
        .from('profiles')
        .select('id, role, is_active')
        .eq('id', session.user_id)
        .maybeSingle();

      if (!profile?.is_active) {
        await tg('answerCallbackQuery', {
          callback_query_id: cq.id,
          text: "Hisob faol emas.",
          show_alert: true
        });
        return new Response('OK', { status: 200 });
      }

      if (data === 'back_groups') {
        await tg('answerCallbackQuery', { callback_query_id: cq.id });
        await showGroupsMenu(chatId, messageId);
        return new Response('OK', { status: 200 });
      }

      if (data.startsWith('grp:')) {
        const groupId = data.slice(4);
        await upsertSession(chatId, { selected_group_id: groupId });
        await tg('answerCallbackQuery', { callback_query_id: cq.id });
        await showGroupReport(chatId, groupId, messageId);
        return new Response('OK', { status: 200 });
      }
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('Telegram bot error:', err);
    return new Response('OK', { status: 200 });
  }
});
