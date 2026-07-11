import { SupabaseClient } from '@supabase/supabase-js';

export async function fetchTodayData(supabase: SupabaseClient, userId: string, date: string) {
  // Fetch stacks and their habits
  const { data: stacksData, error: stacksError } = await supabase
    .from('hs_stacks')
    .select(`
      id, name, sort_order,
      hs_stack_habits (
        sort_order,
        hs_habits (
          id, name, emoji, category, habit_type, unit, target_value, color
        )
      )
    `)
    .eq('user_id', userId)
    .order('sort_order');

  if (stacksError) throw stacksError;

  // Fetch habits not in any stack (optional, or just rely on stacks)
  
  // Fetch logs for today
  const { data: logsData, error: logsError } = await supabase
    .from('hs_habit_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('log_date', date);

  if (logsError) throw logsError;

  return { stacks: stacksData, logs: logsData || [] };
}

export async function toggleHabitLog(supabase: SupabaseClient, userId: string, habitId: string, date: string, completed: boolean) {
  const { error } = await supabase
    .from('hs_habit_logs')
    .upsert({
      user_id: userId,
      habit_id: habitId,
      log_date: date,
      completed,
      logged_via: 'app'
    }, { onConflict: 'habit_id, log_date' });
  
  if (error) throw error;
}

export async function updateQuantitativeLog(supabase: SupabaseClient, userId: string, habitId: string, date: string, value: number) {
  const { error } = await supabase
    .from('hs_habit_logs')
    .upsert({
      user_id: userId,
      habit_id: habitId,
      log_date: date,
      value,
      logged_via: 'app'
    }, { onConflict: 'habit_id, log_date' });
  
  if (error) throw error;
}

export async function updateTimeWindowLog(supabase: SupabaseClient, userId: string, habitId: string, date: string, startTime: string, endTime: string) {
  const { error } = await supabase
    .from('hs_habit_logs')
    .upsert({
      user_id: userId,
      habit_id: habitId,
      log_date: date,
      start_time: startTime,
      end_time: endTime,
      logged_via: 'app'
    }, { onConflict: 'habit_id, log_date' });
  
  if (error) throw error;
}

let isSeeding = false;

export async function seedMockData(supabase: SupabaseClient, userId: string) {
  if (isSeeding) return;

  // check if habits exist
  const { count } = await supabase.from('hs_stacks').select('*', { count: 'exact', head: true }).eq('user_id', userId);
  if (count && count > 0) return; // already seeded

  isSeeding = true;

  try {
    // Create Stacks
    const { data: stackData } = await supabase.from('hs_stacks').insert([
      { user_id: userId, name: 'Morning Stack', sort_order: 1 },
      { user_id: userId, name: 'Afternoon Stack', sort_order: 2 },
      { user_id: userId, name: 'Evening Routine', sort_order: 3 }
    ]).select();

    if (!stackData || stackData.length < 3) return;
    
    const morningId = stackData[0].id;
    const afternoonId = stackData[1].id;
    const eveningId = stackData[2].id;

    // Create Habits
    const { data: habitData } = await supabase.from('hs_habits').insert([
      { user_id: userId, name: 'Sunlight Exposure', category: 'fitness', habit_type: 'boolean', color: 'fitness' },
      { user_id: userId, name: 'Vitamins', category: 'supplement', habit_type: 'boolean', color: 'supplement' },
      { user_id: userId, name: 'Water Intake', category: 'nutrition', habit_type: 'quantitative', unit: 'L', target_value: 3, color: 'primary' },
      { user_id: userId, name: 'Read Fiction', category: 'sleep', habit_type: 'boolean', color: 'sleep' },
      { user_id: userId, name: 'Magnesium', category: 'supplement', habit_type: 'quantitative', unit: 'mg', target_value: 400, color: 'supplement' },
      { user_id: userId, name: 'Digital Sunset', category: 'sleep', habit_type: 'time_window', color: 'sleep' }
    ]).select();

    if (!habitData) return;

    // Link to Stacks
    await supabase.from('hs_stack_habits').insert([
      { stack_id: morningId, habit_id: habitData[0].id, sort_order: 1 },
      { stack_id: morningId, habit_id: habitData[1].id, sort_order: 2 },
      { stack_id: afternoonId, habit_id: habitData[2].id, sort_order: 1 },
      { stack_id: eveningId, habit_id: habitData[3].id, sort_order: 1 },
      { stack_id: eveningId, habit_id: habitData[4].id, sort_order: 2 },
      { stack_id: eveningId, habit_id: habitData[5].id, sort_order: 3 }
    ]);

    // Create default stack reminders
    await supabase.from('hs_reminders').insert([
      { user_id: userId, stack_id: morningId, send_at: '12:00:00', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], active: true },
      { user_id: userId, stack_id: afternoonId, send_at: '18:00:00', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], active: true },
      { user_id: userId, stack_id: eveningId, send_at: '22:00:00', days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], active: true }
    ]);
  } catch (e) {
    console.error('Error seeding data:', e);
  } finally {
    isSeeding = false;
  }
}
