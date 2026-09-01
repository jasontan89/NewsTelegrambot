import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = "https://blcsjvifiytbznwesmyx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsY3NqdmlmaXl0Ynpud2VzbXl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MTkzNDcsImV4cCI6MjA5ODM5NTM0N30.PhO08MviDmKyRn941IngM9-WaG_j7lwiCL5IqzG5qt0";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getNearbyStops(lat: number, lon: number, limit: number = 5) {
  const { data, error } = await supabase.rpc('get_nearby_stops', {
    lat: lat,
    lon: lon,
    limit: limit
  });

  if (error) {
    console.error("Error fetching nearby stops via RPC:", error);
    return [];
  }
  return data;
}

export async function getNearbyTaxiStands(lat: number, lon: number, limit: number = 5) {
  const { data, error } = await supabase.rpc('get_nearby_taxi_stands', {
    lat: lat,
    lon: lon,
    limit: limit
  });

  if (error) {
    console.error("Error fetching nearby taxi stands via RPC:", error);
    return [];
  }
  return data;
}

export async function addFavorite(user_id: number, type: string, value: string, label: string) {
  const { data, error } = await supabase
    .from('favorites')
    .upsert({ user_id, type, value, label }, { onConflict: 'user_id,type,value' });

  if (error) {
    console.error("Error adding favorite:", error);
    throw error;
  }
  return data;
}

export async function getFavorites(user_id: number) {
  const { data, error } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', user_id);

  if (error) {
    console.error("Error getting favorites:", error);
    return [];
  }
  return data;
}

export async function removeFavorite(user_id: number, type: string, value: string) {
  const { data, error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', user_id)
    .eq('type', type)
    .eq('value', value);

  if (error) {
    console.error("Error removing favorite:", error);
    throw error;
  }
  return data;
}

// Journey Planner RPC helpers
export async function findDirectBusRoutes(originCodes: string[], destCodes: string[]) {
  const { data, error } = await supabase.rpc('find_direct_bus_routes', {
    origin_codes: originCodes,
    dest_codes: destCodes
  });

  if (error) {
    console.error("Error in find_direct_bus_routes:", error);
    return [];
  }
  return data || [];
}

export async function findOneTransferBusRoutes(originCodes: string[], destCodes: string[]) {
  const { data, error } = await supabase.rpc('find_one_transfer_bus_routes', {
    origin_codes: originCodes,
    dest_codes: destCodes
  });

  if (error) {
    console.error("Error in find_one_transfer_bus_routes:", error);
    return [];
  }
  return data || [];
}

// MRT Subscriptions & Alert Helpers
export async function getMRTSubscriptions(userId: number): Promise<string[]> {
  const { data, error } = await supabase
    .from('mrt_subscriptions')
    .select('line_code')
    .eq('user_id', userId);

  if (error) {
    console.error("Error getting MRT subscriptions:", error);
    return [];
  }
  return (data || []).map((row: any) => row.line_code);
}

export async function toggleMRTSubscription(userId: number, chatId: number, lineCode: string): Promise<boolean> {
  const { data: existing } = await supabase
    .from('mrt_subscriptions')
    .select('line_code')
    .eq('user_id', userId)
    .eq('line_code', lineCode)
    .single();

  if (existing) {
    await supabase
      .from('mrt_subscriptions')
      .delete()
      .eq('user_id', userId)
      .eq('line_code', lineCode);
    return false; // Now unsubscribed
  } else {
    await supabase
      .from('mrt_subscriptions')
      .insert({ user_id: userId, chat_id: chatId, line_code: lineCode });
    return true; // Now subscribed
  }
}

export async function setAllMRTSubscriptions(userId: number, chatId: number, enable: boolean, allLineCodes: string[]): Promise<void> {
  if (enable) {
    const rows = allLineCodes.map(code => ({ user_id: userId, chat_id: chatId, line_code: code }));
    await supabase.from('mrt_subscriptions').upsert(rows, { onConflict: 'user_id,line_code' });
  } else {
    await supabase.from('mrt_subscriptions').delete().eq('user_id', userId);
  }
}

export async function getAllSubscribersForLine(lineCode: string): Promise<{ user_id: number; chat_id: number }[]> {
  // Subscribers who subscribed to this specific line or to 'ALL'
  const { data, error } = await supabase
    .from('mrt_subscriptions')
    .select('user_id, chat_id')
    .in('line_code', [lineCode, 'ALL']);

  if (error) {
    console.error("Error getting subscribers for line:", error);
    return [];
  }

  // Deduplicate by chat_id
  const seen = new Set<number>();
  const results: { user_id: number; chat_id: number }[] = [];
  (data || []).forEach((row: any) => {
    if (!seen.has(row.chat_id)) {
      seen.add(row.chat_id);
      results.push({ user_id: row.user_id, chat_id: row.chat_id });
    }
  });

  return results;
}

export async function getMRTAlertState(): Promise<any> {
  const { data, error } = await supabase
    .from('mrt_alert_state')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    console.error("Error getting MRT alert state:", error);
    return null;
  }
  return data;
}

export async function updateMRTAlertState(status: number, affected: any, message: any): Promise<void> {
  await supabase
    .from('mrt_alert_state')
    .upsert({
      id: 1,
      last_status: status,
      last_affected: affected,
      last_message: message,
      updated_at: new Date().toISOString()
    });
}
