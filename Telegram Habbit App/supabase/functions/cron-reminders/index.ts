import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const botToken = Deno.env.get('HABIT_STACK_TELEGRAM_BOT_TOKEN');
if (!botToken) throw new Error('HABIT_STACK_TELEGRAM_BOT_TOKEN is not set');

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

async function sendTelegramMessage(chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    })
  });
  return res.json();
}

serve(async (req) => {
  try {
    // 1. Fetch active reminders with user and relation data
    const { data: reminders, error: remindersError } = await supabase
      .from('hs_reminders')
      .select(`
        id, send_at, days, stack_id, habit_id,
        hs_users ( id, telegram_user_id, timezone )
      `)
      .eq('active', true);

    if (remindersError) throw remindersError;
    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ message: 'No active reminders.' }));
    }

    const now = new Date();
    let sentCount = 0;

    for (const r of reminders) {
      const user = r.hs_users as any;
      if (!user) continue;

      const timezone = user.timezone || 'Asia/Singapore';

      // 2. Get local time parts (hour and minute) for the user
      const timeParts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).formatToParts(now);

      const hour = timeParts.find(p => p.type === 'hour')?.value;
      const minute = timeParts.find(p => p.type === 'minute')?.value;
      const userTimeStr = `${hour}:${minute}`;

      // 3. Compare with reminder's send_at time (send_at is "HH:MM:SS", we match "HH:MM")
      const targetTimeStr = r.send_at.slice(0, 5);

      if (userTimeStr !== targetTimeStr) {
        continue; // Time does not match
      }

      // 4. Check day of week
      const dayParts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'short'
      }).format(now);
      const dayOfWeek = dayParts.toLowerCase(); // 'mon', 'tue', etc.

      const scheduledDays = Array.isArray(r.days) ? r.days : JSON.parse(r.days || '[]');
      if (!scheduledDays.map((d: string) => d.toLowerCase()).includes(dayOfWeek)) {
        continue; // Day does not match
      }

      // 5. Smart Reminder check: If they completed everything, skip reminder
      const localDate = getLocalDateStr(timezone);
      let shouldSend = true;
      let reminderText = '';

      if (r.stack_id) {
        // Fetch stack details
        const { data: stack } = await supabase
          .from('hs_stacks')
          .select(`
            name,
            hs_stack_habits (
              hs_habits ( id, name, habit_type, target_value )
            )
          `)
          .eq('id', r.stack_id)
          .single();

        const habits = stack?.hs_stack_habits?.map((sh: any) => sh.hs_habits) || [];
        if (habits.length > 0) {
          // Fetch logs for these habits today
          const { data: logs } = await supabase
            .from('hs_habit_logs')
            .select('*')
            .in('habit_id', habits.map((h: any) => h.id))
            .eq('log_date', localDate);

          const incomplete = habits.filter((h: any) => {
            const log = logs?.find(l => l.habit_id === h.id);
            if (h.habit_type === 'boolean') return !log?.completed;
            if (h.habit_type === 'quantitative') return (log?.value || 0) < h.target_value;
            return true;
          });

          if (incomplete.length === 0) {
            shouldSend = false; // Already completed everything in this stack!
          } else {
            reminderText = `🔔 *Time for your ${stack.name}!*\n\nYou have ${incomplete.length} habit(s) left to complete today:\n` +
              incomplete.map((h: any) => `• ${h.name}`).join('\n');
          }
        } else {
          reminderText = `🔔 *Time for your ${stack?.name || 'Habit Stack'}!*`;
        }
      } else if (r.habit_id) {
        const { data: habit } = await supabase
          .from('hs_habits')
          .select('*')
          .eq('id', r.habit_id)
          .single();

        if (habit) {
          const { data: log } = await supabase
            .from('hs_habit_logs')
            .select('*')
            .eq('habit_id', habit.id)
            .eq('log_date', localDate)
            .maybeSingle();

          const completed = habit.habit_type === 'boolean' 
            ? !!log?.completed 
            : (log?.value || 0) >= habit.target_value;

          if (completed) {
            shouldSend = false; // Already completed!
          } else {
            reminderText = `🔔 *Reminder to complete: ${habit.name}!*`;
          }
        }
      } else {
        // Global reminder
        const { data: habits } = await supabase
          .from('hs_habits')
          .select('id, name, habit_type, target_value')
          .eq('user_id', user.id)
          .eq('archived', false);

        if (habits && habits.length > 0) {
          const { data: logs } = await supabase
            .from('hs_habit_logs')
            .select('*')
            .in('habit_id', habits.map((h: any) => h.id))
            .eq('log_date', localDate);

          const incomplete = habits.filter((h: any) => {
            const log = logs?.find(l => l.habit_id === h.id);
            if (h.habit_type === 'boolean') return !log?.completed;
            if (h.habit_type === 'quantitative') return (log?.value || 0) < h.target_value;
            return true;
          });

          if (incomplete.length === 0) {
            shouldSend = false;
          } else {
            reminderText = `🔔 *Reminder to track your habits!* You have ${incomplete.length} habit(s) left to complete today.`;
          }
        } else {
          reminderText = `🔔 *Time to track your habits today!*`;
        }
      }

      if (shouldSend && reminderText) {
        await sendTelegramMessage(Number(user.telegram_user_id), reminderText);
        sentCount++;
      }
    }

    return new Response(JSON.stringify({ message: `Processed reminders. Sent ${sentCount} messages.` }));

  } catch (err: any) {
    console.error('Error in cron-reminders:', err);
    return new Response(String(err), { status: 500 });
  }
});
