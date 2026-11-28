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

  const text = `<b>Guruhni tanlang</b> (Sana: <code>${tashkentToday()}</code>):`;
  const markup = { inline_keyboard: rows };

  if (messageId) await editText(chatId, messageId, text, markup);
  else await sendText(chatId, text, markup);
}

async function showGroupStudents(chatId: number, groupId: string, messageId?: number) {
  const date = tashkentToday();
  const [{ data: group }, { data: students }, { data: existing }] = await Promise.all([
    adminDb.from('groups').select('id, name').eq('id', groupId).maybeSingle(),
    adminDb.from('students').select('id, full_name').eq('group_id', groupId).order('full_name'),
    adminDb
      .from('attendance')
      .select('student_id, status')
      .eq('group_id', groupId)
      .eq('lesson_date', date)
      .eq('para', 1)
  ]);

  if (!group) {
    await sendText(chatId, 'Guruh topilmadi.');
    return;
  }

  const statusMap = new Map<string, string>();
  for (const r of existing ?? []) {
    statusMap.set(r.student_id, r.status);
  }

  const labelFor = (st?: string) => {
    if (st === 'excused_absent') return 'Sababli';
    if (st === 'unexcused_absent') return 'Sababsiz';
    if (st === 'escaped') return 'Qochdi';
    if (st === 'present') return 'Keldi';
    return 'Belgilanmagan';
  };

  const lines = (students ?? []).map(
    (s, idx) => `${idx + 1}. <b>${s.full_name}</b> — <i>${labelFor(statusMap.get(s.id))}</i>`
  );

  const keyboard: Array<Array<{ text: string; callback_data: string }>> = [
    [
      { text: '✅ Hammasi keldi', callback_data: `all_present:${groupId}` },
      { text: '🔄 Yangilash', callback_data: `grp:${groupId}` }
    ]
  ];

  for (const s of (students ?? []).slice(0, 35)) {
    const shortName = s.full_name.split(' ').slice(0, 2).join(' ');
    keyboard.push([
      { text: `✓ ${shortName}`, callback_data: `mark:${groupId}:${s.id}:present` },
      { text: 'Sababli', callback_data: `mark:${groupId}:${s.id}:excused_absent` },
      { text: 'Sababsiz', callback_data: `mark:${groupId}:${s.id}:unexcused_absent` },
      { text: 'Qochdi', callback_data: `mark:${groupId}:${s.id}:escaped` }
    ]);
  }

  keyboard.push([{ text: '⬅️ Guruhlarga qaytish', callback_data: 'back_groups' }]);

  const text =
    `<b>${group.name}</b> (${date})\n` +
    `Jami o'quvchilar: <b>${students?.length ?? 0}</b> ta\n\n` +
    (lines.length ? lines.join('\n') : "O'quvchilar ro'yxati bo'sh.");

  const markup = { inline_keyboard: keyboard };
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
          "Assalomu alaykum! <b>4-son Texnikum Davomat</b> botiga xush kelibsiz.\n\n" +
            "Tizimga kirish uchun:\n" +
            "<code>/login email@example.com parolingiz</code>\n\n" +
            "Kirgandan so'ng:\n" +
            "/groups — guruhlarni ko'rish va davomat olish\n" +
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
          `✅ Xush kelibsiz, <b>${profile.full_name}</b> (${profile.role})!`
        );
        await showGroupsMenu(chatId);
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

      await sendText(chatId, "Guruhlarni ochish uchun <code>/groups</code> buyrug'ini yuboring.");
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

      const allowedRoles = ['admin', 'navbatchi', 'group_leader'];
      if (!profile?.is_active || !allowedRoles.includes(profile.role)) {
        await tg('answerCallbackQuery', {
          callback_query_id: cq.id,
          text: "Davomat belgilash huquqi yo'q.",
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
        await showGroupStudents(chatId, groupId, messageId);
        return new Response('OK', { status: 200 });
      }

      if (data.startsWith('all_present:')) {
        const groupId = data.slice('all_present:'.length);
        const date = tashkentToday();
        const { data: students } = await adminDb
          .from('students')
          .select('id')
          .eq('group_id', groupId);

        const records = (students ?? []).map((s) => ({
          student_id: s.id,
          status: 'present',
          note: null
        }));

        if (records.length) {
          await adminDb.rpc('mark_attendance_bulk', {
            p_group_id: groupId,
            p_lesson_date: date,
            p_para: 1,
            p_records: records
          });
        }

        await tg('answerCallbackQuery', {
          callback_query_id: cq.id,
          text: 'Hammasi keldi deb saqlandi!'
        });
        await showGroupStudents(chatId, groupId, messageId);
        return new Response('OK', { status: 200 });
      }

      if (data.startsWith('mark:')) {
        const [, groupId, studentId, status] = data.split(':');
        const date = tashkentToday();

        await adminDb.rpc('mark_attendance_bulk', {
          p_group_id: groupId,
          p_lesson_date: date,
          p_para: 1,
          p_records: [{ student_id: studentId, status, note: null }]
        });

        await tg('answerCallbackQuery', {
          callback_query_id: cq.id,
          text: 'Saqlandi!'
        });
        await showGroupStudents(chatId, groupId, messageId);
        return new Response('OK', { status: 200 });
      }
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('Telegram bot error:', err);
    return new Response('OK', { status: 200 });
  }
});
