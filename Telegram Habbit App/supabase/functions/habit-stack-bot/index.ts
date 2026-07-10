import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Bot, webhookCallback } from "npm:grammy@^1";

const botToken = Deno.env.get('HABIT_STACK_TELEGRAM_BOT_TOKEN');
if (!botToken) throw new Error('HABIT_STACK_TELEGRAM_BOT_TOKEN is not set');

const bot = new Bot(botToken);

const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'http://host.docker.internal:54321';
const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseServiceRole);

// Helper to get local YYYY-MM-DD date based on timezone
function getLocalDateStr(timezone: string) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'Asia/Singapore',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  } catch (e) {
    return new Date().toISOString().split('T')[0];
  }
}

// ── Start Command ─────────────────────────────────────────────────────────────
bot.command('start', async (ctx) => {
  console.log('--- START Command Handler triggered ---');
  const telegramUser = ctx.from;
  if (!telegramUser) {
    console.log('No telegramUser in ctx.from');
    return;
  }

  try {
    console.log('Upserting user:', telegramUser.id);
    // Upsert user
    const { data: user, error } = await supabase
      .from('hs_users')
      .upsert({
        telegram_user_id: telegramUser.id,
        username: telegramUser.username,
        first_name: telegramUser.first_name,
      }, { onConflict: 'telegram_user_id' })
      .select()
      .single();

    if (error) {
      console.error('Upsert error:', error);
      throw error;
    }
    console.log('User upserted successfully:', user);

    await ctx.reply(
      `Welcome to Habit Stack, ${telegramUser.first_name}! 🚀\n\n` +
      `I will help you build and track your atomic habit stacks.\n\n` +
      `Available Commands:\n` +
      `• /today - View your daily stacks and progress\n` +
      `• /log <habit> [value] - Quick log a habit\n` +
      `• /stats - View your streaks\n\n` +
      `Or open the Web App directly via the button below to view visual insights!`
    );

    // Set Menu Button dynamically for the user to point to Web App
    try {
      await ctx.setChatMenuButton({
        menu_button: {
          type: "web_app",
          text: "Open App",
          web_app: {
            url: "https://jasontan89.github.io/NewsTelegrambot/?v=2"
          }
        }
      });
      console.log('Chat menu button set successfully');
    } catch (e) {
      console.error('Failed to set chat menu button:', e);
    }
  } catch (err: any) {
    console.error('Error in /start:', err);
    await ctx.reply('Sorry, there was an error registering your account.');
  }
});

// ── Today Command ─────────────────────────────────────────────────────────────
bot.command('today', async (ctx) => {
  const tgId = ctx.from?.id;
  if (!tgId) return;

  try {
    const { data: user } = await supabase
      .from('hs_users')
      .select('*')
      .eq('telegram_user_id', tgId)
      .single();

    if (!user) {
      return await ctx.reply('Please initialize your account by sending /start first!');
    }

    const localDate = getLocalDateStr(user.timezone);

    // Fetch stacks and habits
    const { data: stacks } = await supabase
      .from('hs_stacks')
      .select(`
        id, name,
        hs_stack_habits (
          hs_habits (
            id, name, habit_type, target_value, unit
          )
        )
      `)
      .eq('user_id', user.id);

    // Fetch logs for today
    const { data: logs } = await supabase
      .from('hs_habit_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', localDate);

    if (!stacks || stacks.length === 0) {
      return await ctx.reply('You have no habit stacks configured. Open the Web App to build your first routine!');
    }

    let message = `📅 *Your Stacks for Today* (${localDate})\n\n`;

    stacks.forEach((stack: any) => {
      message += `*${stack.name}*\n`;
      const habits = stack.hs_stack_habits.map((sh: any) => sh.hs_habits).filter(Boolean);

      if (habits.length === 0) {
        message += `  _No habits in this stack_\n\n`;
        return;
      }

      habits.forEach((habit: any) => {
        const log = logs?.find(l => l.habit_id === habit.id);
        let status = '❌';
        let detail = '';

        if (habit.habit_type === 'boolean') {
          if (log?.completed) status = '✅';
        } else if (habit.habit_type === 'quantitative') {
          const val = log?.value || 0;
          if (val >= habit.target_value) status = '✅';
          detail = ` (${val}/${habit.target_value}${habit.unit || ''})`;
        } else if (habit.habit_type === 'time_window') {
          if (log?.start_time) status = '✅';
        }

        message += `  ${status} ${habit.name}${detail}\n`;
      });
      message += `\n`;
    });

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (err: any) {
    console.error('Error in /today:', err);
    await ctx.reply('Could not load today\'s routine.');
  }
});

// ── Log Command ──────────────────────────────────────────────────────────────
bot.command('log', async (ctx) => {
  const tgId = ctx.from?.id;
  if (!tgId) return;

  const match = ctx.message?.text?.split(' ').slice(1);
  if (!match || match.length === 0) {
    return await ctx.reply('Usage: /log <habit name> [value]\nExample: /log water 1 or /log vitamins');
  }

  const queryName = match[0];
  const valueInput = match[1];

  try {
    const { data: user } = await supabase
      .from('hs_users')
      .select('*')
      .eq('telegram_user_id', tgId)
      .single();

    if (!user) return await ctx.reply('Send /start first to initialize!');

    const { data: habits } = await supabase
      .from('hs_habits')
      .select('*')
      .eq('user_id', user.id)
      .ilike('name', `%${queryName}%`);

    if (!habits || habits.length === 0) {
      return await ctx.reply(`Could not find any habit matching "${queryName}".`);
    }

    if (habits.length > 1) {
      return await ctx.reply(`Multiple habits matched: ${habits.map(h => h.name).join(', ')}. Please be more specific.`);
    }

    const habit = habits[0];
    const localDate = getLocalDateStr(user.timezone);

    // Fetch existing log
    const { data: existingLog } = await supabase
      .from('hs_habit_logs')
      .select('*')
      .eq('habit_id', habit.id)
      .eq('log_date', localDate)
      .maybeSingle();

    let completed = true;
    let numericVal: number | null = null;

    if (habit.habit_type === 'quantitative') {
      const inc = valueInput ? Number(valueInput) : 1;
      if (isNaN(inc)) return await ctx.reply('Please provide a valid number for quantitative habits.');
      numericVal = (existingLog?.value || 0) + inc;
      completed = numericVal >= (habit.target_value || 0);
    }

    const { error } = await supabase
      .from('hs_habit_logs')
      .upsert({
        user_id: user.id,
        habit_id: habit.id,
        log_date: localDate,
        completed,
        value: numericVal,
        logged_via: 'bot'
      }, { onConflict: 'habit_id, log_date' });

    if (error) throw error;

    let response = `Saved log for *${habit.name}*! `;
    if (habit.habit_type === 'quantitative') {
      response += `New value: ${numericVal}/${habit.target_value}${habit.unit || ''}`;
    } else {
      response += 'Status: completed ✅';
    }

    await ctx.reply(response, { parse_mode: 'Markdown' });
  } catch (err: any) {
    console.error('Error in /log:', err);
    await ctx.reply('Error logging habit.');
  }
});

// ── Stats Command ─────────────────────────────────────────────────────────────
bot.command('stats', async (ctx) => {
  const tgId = ctx.from?.id;
  if (!tgId) return;

  try {
    const { data: user } = await supabase
      .from('hs_users')
      .select('*')
      .eq('telegram_user_id', tgId)
      .single();

    if (!user) return await ctx.reply('Send /start first to initialize!');

    const { data: habits } = await supabase
      .from('hs_habits')
      .select('*')
      .eq('user_id', user.id);

    if (!habits || habits.length === 0) {
      return await ctx.reply('No habits set up yet!');
    }

    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const { data: logs } = await supabase
      .from('hs_habit_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('log_date', thirtyDaysAgoStr);

    let message = `📊 *Your Streaks (Last 30 Days)*\n\n`;

    habits.forEach((habit: any) => {
      const habitLogs = logs?.filter(l => l.habit_id === habit.id) || [];
      
      const isCompleted = (log: any) => {
        if (!log) return false;
        if (habit.habit_type === 'boolean') return !!log.completed;
        if (habit.habit_type === 'quantitative') return log.value >= habit.target_value;
        if (habit.habit_type === 'time_window') return !!log.start_time;
        return false;
      };

      const completedDates = new Set(habitLogs.filter(isCompleted).map(l => l.log_date));

      let current = 0;
      let checkDate = new Date();
      let checkDateStr = checkDate.toISOString().split('T')[0];
      let hasToday = completedDates.has(checkDateStr);
      
      if (!hasToday) {
        checkDate.setDate(checkDate.getDate() - 1);
        checkDateStr = checkDate.toISOString().split('T')[0];
      }

      while (completedDates.has(checkDateStr)) {
        current++;
        checkDate.setDate(checkDate.getDate() - 1);
        checkDateStr = checkDate.toISOString().split('T')[0];
      }

      message += `• *${habit.name}*: ${current} day streak 🔥\n`;
    });

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (err: any) {
    console.error('Error in /stats:', err);
    await ctx.reply('Error loading streaks.');
  }
});

// ── Webhook Handler Serve ─────────────────────────────────────────────────────
const handleUpdate = webhookCallback(bot, 'std/http');

serve(async (req) => {
  try {
    const bodyText = await req.clone().text();
    console.log('Incoming Webhook request body:', bodyText);
    return await handleUpdate(req);
  } catch (err) {
    console.error('Error handling webhook update:', err);
    return new Response(String(err), { status: 500 });
  }
});
