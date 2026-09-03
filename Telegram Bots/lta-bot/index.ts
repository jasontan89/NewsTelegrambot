import { renderTaxiMapHtml, renderERPMapHtml } from "./map_template.ts";
import { Bot, webhookCallback, InlineKeyboard } from "npm:grammy@^1";
import { fetchBusArrival, fetchTrafficImages, fetchCarparkAvailability, fetchTrafficIncidents, fetchMRTCrowd, fetchTrainAlerts, fetchTaxiAvailability, fetchBicycleParking, fetchEVChargingPoints } from "./lta_api.ts";
import { 
  addFavorite, getFavorites, removeFavorite, getNearbyStops, getNearbyTaxiStands, supabase,
  findDirectBusRoutes, findOneTransferBusRoutes, getMRTSubscriptions, toggleMRTSubscription,
  setAllMRTSubscriptions, getAllSubscribersForLine, getMRTAlertState, updateMRTAlertState,
  getBusStopByCode, searchBusStops, createAlightingAlarm, getActiveAlightingAlarm,
  updateAlightingTelemetry, cancelAlightingAlarm
} from "./db.ts";
import { ERP_CORRIDORS, ERP_GANTRIES, getCurrentERPRate, calculateVehicleRate, searchERPGantries, getGantriesByCorridor, getSGTHourAndMinute } from "./erp_data.ts";

const token = "8796372928:AAE05wywaags0CpDxbSnWM2FNU9DB9Rgr3I";
if (!token) throw new Error("Bot token is missing");

const bot = new Bot(token);

bot.catch((err) => {
  console.error("Grammy error in bot handler:", err);
});

const TRAFFIC_CAMERAS: Record<string, { name: string; exp: string }> = {
  "2701": { name: "🇸🇬 Woodlands Checkpoint", exp: "bke" },
  "2702": { name: "🌉 Woodlands Causeway", exp: "bke" },
  "2704": { name: "🛣️ BKE - Bef Woodlands Flyover", exp: "bke" },
  "4703": { name: "🚗 AYE - Bef Pandan Loop", exp: "aye" },
  "4712": { name: "🌉 AYE - Near Tuas Checkpoint", exp: "tuas" },
  "4713": { name: "🚗 AYE - Tuas West Road", exp: "tuas" },
  "4798": { name: "🛣️ AYE/MCE - Keppel Viaduct (Eastbound)", exp: "mce" },
  "4799": { name: "🛣️ AYE/MCE - Keppel Viaduct (Westbound)", exp: "mce" },
};

const MRT_STATION_NAMES: Record<string, string> = {
  "NS1": "Jurong East", "NS2": "Bukit Batok", "NS3": "Bukit Gombak", "NS4": "Choa Chu Kang", "NS5": "Yew Tee",
  "NS7": "Kranji", "NS8": "Marsiling", "NS9": "Woodlands", "NS10": "Admiralty", "NS11": "Sembawang", "NS12": "Canberra",
  "NS13": "Yishun", "NS14": "Khatib", "NS15": "Yio Chu Kang", "NS16": "Ang Mo Kio", "NS17": "Bishan", "NS18": "Braddell",
  "NS19": "Toa Payoh", "NS20": "Novena", "NS21": "Newton", "NS22": "Orchard", "NS23": "Somerset", "NS24": "Dhoby Ghaut",
  "NS25": "City Hall", "NS26": "Raffles Place", "NS27": "Marina Bay", "NS28": "Marina South Pier",
  "EW1": "Pasir Ris", "EW2": "Tampines", "EW3": "Simei", "EW4": "Tanah Merah", "EW5": "Bedok", "EW6": "Kembangan",
  "EW7": "Eunos", "EW8": "Paya Lebar", "EW9": "Aljunied", "EW10": "Kallang", "EW11": "Lavender", "EW12": "Bugis",
  "EW13": "City Hall", "EW14": "Raffles Place", "EW15": "Tanjong Pagar", "EW16": "Outram Park", "EW17": "Tiong Bahru",
  "EW18": "Redhill", "EW19": "Queenstown", "EW20": "Commonwealth", "EW21": "Buona Vista", "EW22": "Dover",
  "EW23": "Clementi", "EW24": "Jurong East", "EW25": "Chinese Garden", "EW26": "Lakeside", "EW27": "Boon Lay",
  "EW28": "Pioneer", "EW29": "Joo Koon", "EW30": "Gul Circle", "EW31": "Tuas Crescent", "EW32": "Tuas West Road", "EW33": "Tuas Link",
  "NE1": "HarbourFront", "NE3": "Outram Park", "NE4": "Chinatown", "NE5": "Clarke Quay", "NE6": "Dhoby Ghaut",
  "NE7": "Little India", "NE8": "Farrer Park", "NE9": "Boon Keng", "NE10": "Potong Pasir", "NE11": "Woodleigh",
  "NE12": "Serangoon", "NE13": "Kovan", "NE14": "Hougang", "NE15": "Buangkok", "NE16": "Sengkang", "NE17": "Punggol", "NE18": "Punggol Coast",
  "CC1": "Dhoby Ghaut", "CC2": "Bras Basah", "CC3": "Esplanade", "CC4": "Promenade", "CC5": "Nicoll Highway",
  "CC6": "Stadium", "CC7": "Mountbatten", "CC8": "Dakota", "CC9": "Paya Lebar", "CC10": "MacPherson", "CC11": "Tai Seng",
  "CC12": "Bartley", "CC13": "Serangoon", "CC14": "Lorong Chuan", "CC15": "Bishan", "CC16": "Marymount", "CC17": "Caldecott",
  "CC19": "Botanic Gardens", "CC20": "Farrer Road", "CC21": "Holland Village", "CC22": "Buona Vista", "CC23": "one-north",
  "CC24": "Kent Ridge", "CC25": "Haw Par Villa", "CC26": "Pasir Panjang", "CC27": "Labrador Park", "CC28": "Telok Blangah", "CC29": "HarbourFront",
  "CC30": "Keppel", "CC31": "Cantonment", "CC32": "Prince Edward Road",
  "DT1": "Bukit Panjang", "DT2": "Cashew", "DT3": "Hillview", "DT5": "Beauty World", "DT6": "King Albert Park",
  "DT7": "Sixth Avenue", "DT8": "Tan Kah Kee", "DT9": "Botanic Gardens", "DT10": "Stevens", "DT11": "Newton",
  "DT12": "Little India", "DT13": "Rochor", "DT14": "Bugis", "DT15": "Promenade", "DT16": "Bayfront", "DT17": "Downtown",
  "DT18": "Telok Ayer", "DT19": "Chinatown", "DT20": "Fort Canning", "DT21": "Bencoolen", "DT22": "Jalan Besar",
  "DT23": "Bendemeer", "DT24": "Geylang Bahru", "DT25": "Mattar", "DT26": "MacPherson", "DT27": "Ubi", "DT28": "Kaki Bukit",
  "DT29": "Bedok North", "DT30": "Bedok Reservoir", "DT31": "Tampines West", "DT32": "Tampines", "DT33": "Tampines East",
  "DT34": "Upper Changi", "DT35": "Expo", "DT36": "Xilin", "DT37": "Sungei Bedok",
  "TE1": "Woodlands North", "TE2": "Woodlands", "TE3": "Woodlands South", "TE4": "Springleaf", "TE5": "Lentor",
  "TE6": "Mayflower", "TE7": "Bright Hill", "TE8": "Upper Thomson", "TE9": "Caldecott", "TE11": "Stevens",
  "TE12": "Napier", "TE13": "Orchard Boulevard", "TE14": "Orchard", "TE15": "Great World", "TE16": "Havelock",
  "TE17": "Outram Park", "TE18": "Maxwell", "TE19": "Shenton Way", "TE20": "Marina Bay", "TE22": "Gardens by the Bay",
  "TE22A": "Founders' Memorial", "TE23": "Tanjong Rhu", "TE24": "Katong Park", "TE25": "Tanjong Katong", "TE26": "Marine Parade", "TE27": "Marine Terrace",
  "TE28": "Siglap", "TE29": "Bayshore", "TE30": "Bedok South", "TE31": "Sungei Bedok"
};

const MRT_LINES: Record<string, { name: string; color: string }> = {
  "NSL": { name: "🔴 North-South Line (Red)", color: "🔴" },
  "EWL": { name: "🟢 East-West Line (Green)", color: "🟢" },
  "CCL": { name: "🟠 Circle Line (Orange)", color: "🟠" },
  "DTL": { name: "🔵 Downtown Line (Blue)", color: "🔵" },
  "NEL": { name: "🟣 North East Line (Purple)", color: "🟣" },
  "TEL": { name: "🟤 Thomson-East Coast Line (Brown)", color: "🟤" },
};

const POPULAR_LOCATIONS: Record<string, { name: string; lat: number; lon: number }> = {
  "orchard": { name: "Orchard / Somerset", lat: 1.3048, lon: 103.8318 },
  "somerset": { name: "Somerset", lat: 1.3002, lon: 103.8390 },
  "vivocity": { name: "VivoCity / HarbourFront", lat: 1.2644, lon: 103.8222 },
  "harbourfront": { name: "HarbourFront", lat: 1.2653, lon: 103.8219 },
  "suntec": { name: "Suntec City / Marina Centre", lat: 1.2935, lon: 103.8572 },
  "marina": { name: "Marina Bay Sands / Bayfront", lat: 1.2834, lon: 103.8607 },
  "bugis": { name: "Bugis Junction", lat: 1.3008, lon: 103.8558 },
  "jurong": { name: "Jurong East / JEM / Westgate", lat: 1.3332, lon: 103.7423 },
  "tampines": { name: "Tampines Central", lat: 1.3532, lon: 103.9452 },
  "bishan": { name: "Bishan / Junction 8", lat: 1.3508, lon: 103.8481 },
  "woodlands": { name: "Woodlands / Causeway Point", lat: 1.4368, lon: 103.7865 },
  "changi": { name: "Changi Airport T1/T2/T3/T4", lat: 1.3592, lon: 103.9893 },
  "punggol": { name: "Punggol / Waterway Point", lat: 1.4052, lon: 103.9023 },
  "ang mo kio": { name: "Ang Mo Kio / AMK Hub", lat: 1.3698, lon: 103.8496 },
  "bedok": { name: "Bedok Mall", lat: 1.3240, lon: 103.9298 },
  "clementi": { name: "Clementi Mall", lat: 1.3151, lon: 103.7652 },
  "yishun": { name: "Yishun / Northpoint", lat: 1.4294, lon: 103.8350 }
};

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getCameraMeta(camId: string, latStr?: any, lonStr?: any) {
  const id = String(camId);
  if (TRAFFIC_CAMERAS[id]) return TRAFFIC_CAMERAS[id];
  return { name: `📷 Traffic Camera ${id}`, exp: "aye" };
}

function getIncidentIcon(type: string) {
  const t = (type || "").toLowerCase();
  if (t.includes("accident")) return "💥";
  if (t.includes("breakdown")) return "⚠️";
  if (t.includes("traffic")) return "🚗";
  if (t.includes("roadwork")) return "🚧";
  if (t.includes("obstacle")) return "📦";
  if (t.includes("closure") || t.includes("block")) return "🛑";
  return "🚨";
}

function getLoadIcon(load: string) {
  if (load === 'SEA') return '🟢';
  if (load === 'SDA') return '🟡';
  if (load === 'LSD') return '🔴';
  return '⚪';
}

function getCarparkStatus(lots: number) {
  if (lots >= 50) {
    return { icon: "🟢", label: "Plenty" };
  } else if (lots >= 10) {
    return { icon: "🟡", label: "Moderate" };
  } else if (lots > 0) {
    return { icon: "🔴", label: "Limited" };
  } else {
    return { icon: "🔴", label: "FULL" };
  }
}

function formatMins(estTime?: string) {
  if (!estTime) return null;
  const diff = new Date(estTime).getTime() - Date.now();
  const mins = Math.max(0, Math.floor(diff / 60000));
  return mins === 0 ? 'Arr' : `${mins}m`;
}

function formatBusTime(t?: string) {
  if (!t || t === '-' || t.length !== 4) return t || '-';
  return `${t.substring(0, 2)}:${t.substring(2)}`;
}

function compareStationCodes(a: string = "", b: string = ""): number {
  const matchA = a.match(/^([A-Za-z]+)(\d+)(.*)$/);
  const matchB = b.match(/^([A-Za-z]+)(\d+)(.*)$/);

  if (matchA && matchB) {
    const prefixA = matchA[1].toUpperCase();
    const prefixB = matchB[1].toUpperCase();
    if (prefixA !== prefixB) {
      return prefixA.localeCompare(prefixB);
    }
    const numA = parseInt(matchA[2], 10);
    const numB = parseInt(matchB[2], 10);
    if (numA !== numB) {
      return numA - numB;
    }
    return (matchA[3] || "").localeCompare(matchB[3] || "");
  }

  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

// Universal safe edit helper that handles both text messages and photo messages without hanging
async function safeEditOrSend(ctx: any, text: string, keyboard?: InlineKeyboard, parseMode: "Markdown" | "HTML" = "HTML") {
  try {
    const isPhoto = Boolean(ctx.callbackQuery?.message?.photo || ctx.msg?.photo);
    
    if (isPhoto) {
      try {
        await ctx.deleteMessage();
      } catch (_) {}
      return await ctx.reply(text, { reply_markup: keyboard, parse_mode: parseMode }).catch(() => null);
    } else {
      try {
        return await ctx.editMessageText(text, { reply_markup: keyboard, parse_mode: parseMode }).catch(async (e: any) => {
          if (!e.message?.includes("message is not modified")) {
            try {
              await ctx.deleteMessage();
            } catch (_) {}
            return await ctx.reply(text, { reply_markup: keyboard, parse_mode: parseMode }).catch(() => null);
          }
        });
      } catch (err: any) {
        if (!err.message?.includes("message is not modified")) {
          try {
            await ctx.deleteMessage();
          } catch (_) {}
          return await ctx.reply(text, { reply_markup: keyboard, parse_mode: parseMode }).catch(() => null);
        }
      }
    }
  } catch (err) {
    console.error("safeEditOrSend error:", err);
  }
}

function getMainMenuKeyboard() {
  const superMapUrl = "https://jasontan89.github.io/NewsTelegrambot/super-map.html";
  return new InlineKeyboard()
    .webApp("🗺️ All-in-One Transit Super-Map", superMapUrl).row()
    .text("🚌 Public Transport", "cat_transport")
    .text("🚗 Drivers & Roads", "cat_driving").row()
    .text("📍 Explore & Nearby", "cat_explore")
    .text("⭐ My Favorites", "menu_favorites").row()
    .text("ℹ️ Quick User Guide", "menu_help");
}

function getTransportMenuKeyboard() {
  return new InlineKeyboard()
    .text("🗺️ Journey Planner", "menu_goto")
    .text("🚌 Bus Route Explorer", "menu_routes").row()
    .text("🚆 MRT Crowds", "menu_mrt")
    .text("⚠️ Train Disruptions", "menu_disruptions").row()
    .text("🔔 MRT Disruption Alerts", "menu_mrt_alerts").row()
    .text("🔔 Bus Alighting Alarm", "menu_alight").row()
    .text("🔙 Back to Main Menu", "menu_main");
}

function getDrivingMenuKeyboard() {
  return new InlineKeyboard()
    .text("🚗 Carparks Availability", "menu_carparks")
    .text("⚡ EV Charging Stations", "menu_ev").row()
    .text("💳 ERP Gantry Rates", "menu_erp")
    .text("📷 Traffic Cameras", "menu_traffic").row()
    .text("🇸🇬🇲🇾 Causeway Checkpoint Radar", "menu_checkpoint").row()
    .text("🚨 Live Traffic Alerts", "menu_incidents")
    .text("🚕 Taxi Locator & Stands", "menu_taxis").row()
    .text("🔙 Back to Main Menu", "menu_main");
}

function getExploreMenuKeyboard() {
  return new InlineKeyboard()
    .text("⚡ EV Charging Stations", "menu_ev")
    .text("💳 ERP Gantry Rates", "menu_erp").row()
    .text("🚕 Find Taxis & Stands", "menu_taxis")
    .text("🚲 MRT Bicycle Parking", "menu_bikes").row()
    .text("🚗 Search Carparks", "menu_carparks").row()
    .text("🔙 Back to Main Menu", "menu_main");
}

function getERPMenuKeyboard() {
  const erpMapUrl = "https://jasontan89.github.io/NewsTelegrambot/erp-map.html";
  return new InlineKeyboard()
    .webApp("🗺️ Launch Interactive ERP Gantry Map", erpMapUrl).row()
    .text("🛣️ CTE (Central)", "erp_corr_CTE")
    .text("🛣️ PIE (Pan-Island)", "erp_corr_PIE").row()
    .text("🛣️ AYE (Ayer Rajah)", "erp_corr_AYE")
    .text("🛣️ KPE (Kallang-Paya Lebar)", "erp_corr_KPE").row()
    .text("🛣️ ECP & MCE", "erp_corr_ECP_MCE")
    .text("🏙️ CBD Restricted Zone", "erp_corr_CBD").row()
    .text("🛍️ Orchard Cordon", "erp_corr_ORCHARD")
    .text("🚗 Outer Ring Arterials", "erp_corr_OUTER_RING").row()
    .text("📋 Browse All Gantries", "erp_corr_ALL").row()
    .text("🔙 Back to Drivers Menu", "cat_driving");
}

function getEVMenuKeyboard() {
  return new InlineKeyboard()
    .text("🛍️ ION Orchard", "ev_search_238801")
    .text("🛍️ Takashimaya", "ev_search_238872").row()
    .text("🏙️ Suntec City", "ev_search_038983")
    .text("🏙️ Marina Bay Sands", "ev_search_018956").row()
    .text("🚢 VivoCity", "ev_search_098585")
    .text("🏢 Great World", "ev_search_237994").row()
    .text("🏢 JEM Jurong", "ev_search_609606")
    .text("🏢 Westgate Jurong", "ev_search_608532").row()
    .text("🏙️ Tampines Mall", "ev_search_529510")
    .text("🏙️ Our Tampines Hub", "ev_search_528523").row()
    .text("🏢 Junction 8 Bishan", "ev_search_579837")
    .text("✈️ Jewel Changi", "ev_search_819666").row()
    .text("🌉 Causeway Point", "ev_search_738099")
    .text("🏢 PLQ Paya Lebar", "ev_search_409057").row()
    .text("🔙 Back to Drivers Menu", "cat_driving");
}

function getHelpKeyboard() {
  return new InlineKeyboard()
    .text("🚌 Public Transport", "cat_transport")
    .text("🚗 Drivers & Roads", "cat_driving").row()
    .text("⚡ EV Charging", "menu_ev")
    .text("💳 ERP Rates", "menu_erp").row()
    .text("🔙 Back to Main Menu", "menu_main");
}

function getHelpText(): string {
  return (
    `📖 <b>SG Transport Kaki — Quick User Guide 🇸🇬</b>\n\n` +
    `🚌 <b>Bus Services & Stops</b>\n` +
    `• <code>/bus 09048</code> or <code>/bus Lucky Plaza</code> — Live bus arrival timings & crowd levels\n` +
    `• <code>/route 106</code> — Full route stops sequence, distance, and operating hours\n` +
    `• <code>/goto Clementi to Orchard</code> — Direct & 1-transfer journey planner with live ETAs\n` +
    `• <code>/alight 09048</code> or <code>/alight Orchard</code> — Live bus alighting alarm & trip tracker\n\n` +
    `🚆 <b>MRT & LRT Network</b>\n` +
    `• <code>/mrt NSL</code> — Live platform crowd density indicators\n` +
    `• <code>/disruptions</code> — Network health status & free shuttle/bus bridging advice\n` +
    `• <code>/mrtalerts</code> — Instant push notification subscriptions for breakdown alerts\n\n` +
    `🚗 <b>Driving, Carparks, EV & Traffic</b>\n` +
    `• <code>/supermap</code> or <code>/map</code> — All-in-one interactive transit super-map (ERP, Cams, Incidents, Taxis, EV)\n` +
    `• <code>/checkpoint</code> — 🇸🇬🇲🇾 Real-time Woodlands Causeway & Tuas Second Link camera radar\n` +
    `• <code>/erp CTE</code> or <code>/erp Orchard</code> — Real-time active rates, vehicle multipliers & operating hours\n` +
    `• <code>/ev Tampines Mall</code> or <code>/ev 529510</code> — Live EV chargers, plug speeds (DC Fast/AC), rates & availability\n` +
    `• <code>/carpark Suntec</code> — Real-time lot availability & Google Maps driving directions\n` +
    `• <code>/traffic</code> — Live expressway & checkpoint traffic camera snapshots\n` +
    `• <code>/incidents PIE</code> — Real-time accidents, heavy traffic, and interactive radar map\n\n` +
    `🚕 <b>Taxis & Bicycles</b>\n` +
    `• <code>/taxi Orchard</code> — Vacant taxis count & 316 official barrier-free taxi stands\n` +
    `• <code>/bike Tampines</code> — Sheltered bicycle racks & lot counts near MRT stations\n\n` +
    `📍 <b>Instant GPS 5-in-1 Scan</b>\n` +
    `• Send your 📎 <b>Location attachment</b> for instant nearby bus stops, carparks, EV chargers, taxis, and bike racks!\n\n` +
    `⭐ <b>Favorites</b>\n` +
    `• Tap ⭐ on any bus stop or camera to save it for 1-tap checks with <code>/favorites</code>.`
  );
}

function getTaxisMenuKeyboard() {
  return new InlineKeyboard()
    .text("🛍️ Orchard & Somerset", "taxi_search_Orchard")
    .text("🏙️ Marina Bay & Suntec", "taxi_search_Marina").row()
    .text("🛍️ Bugis Junction", "taxi_search_Bugis")
    .text("🚢 VivoCity & HarbourFront", "taxi_search_VivoCity").row()
    .text("🏢 Jurong East (JEM/Westgate)", "taxi_search_Jurong")
    .text("✈️ Changi Airport", "taxi_search_Changi").row()
    .text("🏙️ Tampines Central", "taxi_search_Tampines")
    .text("🌉 Woodlands / Causeway", "taxi_search_Woodlands").row()
    .text("🔙 Back to Main Menu", "menu_main");
}

function getBikesMenuKeyboard() {
  return new InlineKeyboard()
    .text("🚲 Tampines MRT", "bike_search_Tampines")
    .text("🚲 Jurong East MRT", "bike_search_Jurong East").row()
    .text("🚲 Bishan MRT", "bike_search_Bishan")
    .text("🚲 Orchard MRT", "bike_search_Orchard").row()
    .text("🚲 Woodlands MRT", "bike_search_Woodlands")
    .text("🚲 Punggol MRT", "bike_search_Punggol").row()
    .text("🚲 Ang Mo Kio MRT", "bike_search_Ang Mo Kio")
    .text("🚲 Bedok MRT", "bike_search_Bedok").row()
    .text("🔙 Back to Main Menu", "menu_main");
}

function getCarparksMenuKeyboard() {
  return new InlineKeyboard()
    .text("🛍️ Orchard & Somerset", "cp_search_Orchard").row()
    .text("🏙️ Marina Bay & Suntec", "cp_search_Marina").row()
    .text("🚢 HarbourFront & VivoCity", "cp_search_HarbourFront").row()
    .text("🏢 Jurong Lake District", "cp_search_Jurong").row()
    .text("🏢 Suntec City", "cp_search_Suntec")
    .text("🏬 VivoCity", "cp_search_VivoCity").row()
    .text("🏬 ION Orchard", "cp_search_ION")
    .text("🏬 JEM", "cp_search_JEM").row()
    .text("📋 Browse All Carparks", "cp_search_all").row()
    .text("🔙 Back to Main Menu", "menu_main");
}

function getTrafficMenuKeyboard() {
  return new InlineKeyboard()
    .text("🇸🇬 Woodlands Checkpoint & BKE", "traffic_exp_bke").row()
    .text("🌉 Tuas Checkpoint & West", "traffic_exp_tuas").row()
    .text("🛣️ Keppel Viaduct & MCE (HarbourFront)", "traffic_exp_mce").row()
    .text("🚗 AYE (Ayer Rajah / Pandan Loop)", "traffic_exp_aye").row()
    .text("🔙 Back to Main Menu", "menu_main");
}

function getIncidentsMenuKeyboard() {
  return new InlineKeyboard()
    .webApp("🗺️ Open Live Incidents Radar Map", "https://jasontan89.github.io/NewsTelegrambot/incidents-map.html").row()
    .text("💥 Accidents & Breakdowns", "inc_type_critical").row()
    .text("🚗 Heavy Traffic & Jams", "inc_type_traffic").row()
    .text("🚧 Roadworks & Obstacles", "inc_type_roadworks").row()
    .text("📋 View All Alerts", "inc_type_all").row()
    .text("🔙 Back to Main Menu", "menu_main");
}

function getMRTMenuKeyboard() {
  return new InlineKeyboard()
    .text("🔴 North-South Line (NSL)", "mrt_line_NSL").row()
    .text("🟢 East-West Line (EWL)", "mrt_line_EWL").row()
    .text("🟠 Circle Line (CCL)", "mrt_line_CCL").row()
    .text("🔵 Downtown Line (DTL)", "mrt_line_DTL").row()
    .text("🟣 North East Line (NEL)", "mrt_line_NEL").row()
    .text("🟤 Thomson-East Coast (TEL)", "mrt_line_TEL").row()
    .text("🔙 Back to Main Menu", "menu_main");
}

async function renderBusArrivals(ctx: any, messageId: number | null, stopCode: string, isEdit: boolean) {
  try {
    const data = await fetchBusArrival(stopCode);
    const services = data.Services || [];

    const { data: stopInfo } = await supabase
      .from('lta_bus_stops')
      .select('bus_stop_code, description, road_name, latitude, longitude')
      .eq('bus_stop_code', stopCode)
      .single();

    if (services.length === 0) {
      const errText = `❌ No bus services found for stop <code>${stopCode}</code>.\n\nPlease check if the 5-digit bus stop code is valid or operating.`;
      const kb = new InlineKeyboard().text("🔙 Back to Menu", "menu_main");
      if (isEdit) {
        return safeEditOrSend(ctx, errText, kb, "HTML");
      } else {
        return ctx.reply(errText, { parse_mode: "HTML", reply_markup: kb });
      }
    }

    const destCodes = [...new Set(services.map((s: any) => s.NextBus?.DestinationCode || s.NextBus2?.DestinationCode || s.NextBus3?.DestinationCode).filter(Boolean))];
    let destMap: Record<string, string> = {};
    if (destCodes.length > 0) {
      const { data: destStops } = await supabase
        .from('lta_bus_stops')
        .select('bus_stop_code, description')
        .in('bus_stop_code', destCodes);
      (destStops || []).forEach((d: any) => { destMap[d.bus_stop_code] = d.description; });
    }

    const isMrt = (stopInfo?.description || '').toLowerCase().includes('stn');
    const stopIcon = isMrt ? '🚆' : '🚏';
    const stopName = stopInfo?.description || `Bus Stop ${stopCode}`;
    
    let message = `${stopIcon} <b>${stopName}</b> (<code>${stopCode}</code>)\n`;
    if (stopInfo?.road_name) {
      message += `📍 <i>${stopInfo.road_name}</i>\n`;
    }
    message += `\n`;

    for (const s of services) {
      const b1 = s.NextBus;
      const b2 = s.NextBus2;
      const b3 = s.NextBus3;
      const destCode = b1?.DestinationCode || b2?.DestinationCode || b3?.DestinationCode;
      const destName = destMap[destCode] ? ` ➡️ <i>${destMap[destCode]}</i>` : '';

      const t1 = formatMins(b1?.EstimatedArrival);
      const t2 = formatMins(b2?.EstimatedArrival);
      const t3 = formatMins(b3?.EstimatedArrival);

      let timings: string[] = [];
      if (t1) timings.push(`${getLoadIcon(b1.Load)} ${t1}${b1.Type === 'DD' ? ' 🚍' : ''}`);
      if (t2) timings.push(`${getLoadIcon(b2.Load)} ${t2}${b2.Type === 'DD' ? ' 🚍' : ''}`);
      if (t3) timings.push(`${getLoadIcon(b3.Load)} ${t3}${b3.Type === 'DD' ? ' 🚍' : ''}`);

      if (timings.length > 0) {
        message += `• <b><u>Bus ${s.ServiceNo}</u></b>${destName}\n  ${timings.join('  •  ')}\n\n`;
      } else {
        message += `• <b><u>Bus ${s.ServiceNo}</u></b>${destName}: <i>Not Operating</i>\n\n`;
      }
    }

    message += `💡 <i>Legend</i>: 🟢 Seats  🟡 Standing  🔴 Crowded  •  🚍 Double Deck`;

    const keyboard = new InlineKeyboard()
      .text("⭐ Save to Favorites", `fav_bus_${stopCode}`)
      .text("🔄 Refresh", `get_bus_${stopCode}`).row();

    if (stopInfo?.latitude && stopInfo?.longitude) {
      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${stopInfo.latitude},${stopInfo.longitude}`;
      keyboard.url("🗺️ View Stop on Google Maps", mapUrl).row();
    }

    keyboard.text("🔙 Back to Menu", "menu_main");

    if (isEdit) {
      await safeEditOrSend(ctx, message, keyboard, "HTML");
    } else {
      await ctx.reply(message, { parse_mode: "HTML", reply_markup: keyboard });
    }
  } catch (e: any) {
    const errText = `❌ Error fetching bus arrivals for stop <code>${stopCode}</code>.`;
    const kb = new InlineKeyboard().text("🔙 Back to Menu", "menu_main");
    if (isEdit) {
      await safeEditOrSend(ctx, errText, kb, "HTML");
    } else {
      await ctx.reply(errText, { parse_mode: "HTML", reply_markup: kb });
    }
  }
}

async function showBusRoute(ctx: any, messageId: number | null, busNoInput: string, direction: number = 1, page: number = 1, isEdit: boolean = false) {
  const busNo = busNoInput.toUpperCase().trim();
  try {
    const { data: services } = await supabase
      .from('lta_bus_services')
      .select('*')
      .eq('service_no', busNo)
      .order('direction', { ascending: true });

    if (!services || services.length === 0) {
      const notFoundText = `❌ Bus service <b><u>${busNo}</u></b> was not found.\n\nPlease check if the bus number is valid (e.g. <code>/route 106</code>, <code>/route 190</code>, <code>/route 65</code>).`;
      const kb = new InlineKeyboard().text("🔙 Back to Main Menu", "menu_main");
      if (isEdit) return safeEditOrSend(ctx, notFoundText, kb, "HTML");
      return ctx.reply(notFoundText, { parse_mode: "HTML", reply_markup: kb });
    }

    const currentSvc = services.find((s: any) => s.direction === direction) || services[0];
    const actualDir = currentSvc.direction;

    const { data: routes } = await supabase
      .from('lta_bus_routes')
      .select('*')
      .eq('service_no', busNo)
      .eq('direction', actualDir)
      .order('stop_sequence', { ascending: true });

    if (!routes || routes.length === 0) {
      const errText = `❌ No route stops found for Bus <b><u>${busNo}</u></b> (Direction ${actualDir}).`;
      const kb = new InlineKeyboard().text("🔙 Back to Main Menu", "menu_main");
      if (isEdit) return safeEditOrSend(ctx, errText, kb, "HTML");
      return ctx.reply(errText, { parse_mode: "HTML", reply_markup: kb });
    }

    const PAGE_SIZE = 8;
    const totalPages = Math.ceil(routes.length / PAGE_SIZE) || 1;
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const pageRoutes = routes.slice(startIndex, startIndex + PAGE_SIZE);

    const stopCodesToFetch = [...new Set([
      routes[0].bus_stop_code,
      routes[routes.length - 1].bus_stop_code,
      ...pageRoutes.map((r: any) => r.bus_stop_code)
    ])];

    const { data: stopsData } = await supabase
      .from('lta_bus_stops')
      .select('bus_stop_code, description, road_name')
      .in('bus_stop_code', stopCodesToFetch);

    const stopMap: Record<string, any> = {};
    (stopsData || []).forEach((s: any) => { stopMap[s.bus_stop_code] = s; });

    const firstStop = routes[0];
    const lastStop = routes[routes.length - 1];
    const originName = stopMap[firstStop.bus_stop_code]?.description || firstStop.bus_stop_code;
    const destName = stopMap[lastStop.bus_stop_code]?.description || lastStop.bus_stop_code;

    let text = `🚌 <b><u>Bus ${busNo}</u> Route Explorer</b> (Direction ${actualDir})\n`;
    text += `📍 <b>From</b>: ${originName}\n`;
    text += `🏁 <b>To</b>: ${destName}\n`;
    text += `🏢 <b>Operator</b>: ${currentSvc.operator} (${currentSvc.category})\n\n`;

    text += `🕒 <b>First & Last Bus Departure:</b>\n`;
    text += `• <b>Weekdays</b>: <code>${formatBusTime(firstStop.wd_first_bus)} – ${formatBusTime(firstStop.wd_last_bus)}</code>\n`;
    text += `• <b>Saturdays</b>: <code>${formatBusTime(firstStop.sat_first_bus)} – ${formatBusTime(firstStop.sat_last_bus)}</code>\n`;
    text += `• <b>Sundays/PH</b>: <code>${formatBusTime(firstStop.sun_first_bus)} – ${formatBusTime(firstStop.sun_last_bus)}</code>\n\n`;

    if (currentSvc.am_peak_freq) {
      text += `⚡ <b>Frequency</b>: Peak <code>${currentSvc.am_peak_freq}m</code> | Off-Peak <code>${currentSvc.am_offpeak_freq}m</code>\n\n`;
    }

    text += `🚏 <b>Route Stops (Page ${currentPage} of ${totalPages} • Total ${routes.length} stops):</b>\n\n`;

    pageRoutes.forEach((r: any) => {
      const sInfo = stopMap[r.bus_stop_code];
      const isMrt = (sInfo?.description || '').toLowerCase().includes('stn') ? '🚆' : '🚏';
      text += `${isMrt} <b>${r.stop_sequence}. ${sInfo?.description || r.bus_stop_code}</b> (<code>${r.bus_stop_code}</code>)\n`;
      text += `   📍 <i>${sInfo?.road_name || ''}</i> • <code>${r.distance}km</code>\n\n`;
    });

    const keyboard = new InlineKeyboard();

    if (services.length > 1) {
      const otherDir = actualDir === 1 ? 2 : 1;
      keyboard.text(`🔄 Switch to Direction ${otherDir}`, `route_v_${busNo}__${otherDir}__1`).row();
    }

    if (totalPages > 1) {
      if (currentPage > 1) {
        keyboard.text("◀️ Prev", `route_v_${busNo}__${actualDir}__${currentPage - 1}`);
      }
      keyboard.text(`📄 ${currentPage}/${totalPages}`, `route_v_${busNo}__${actualDir}__${currentPage}`);
      if (currentPage < totalPages) {
        keyboard.text("Next ▶️", `route_v_${busNo}__${actualDir}__${currentPage + 1}`);
      }
      keyboard.row();
    }

    keyboard.text("🔙 Back to Main Menu", "menu_main");

    if (isEdit) {
      await safeEditOrSend(ctx, text, keyboard, "HTML");
    } else {
      await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
    }
  } catch (e: any) {
    const errText = `Error fetching route for Bus ${busNo}.`;
    const kb = new InlineKeyboard().text("🔙 Back to Main Menu", "menu_main");
    if (isEdit) return safeEditOrSend(ctx, errText, kb, "HTML");
    return ctx.reply(errText, { reply_markup: kb });
  }
}

async function showTrainAlerts(ctx: any, messageId: number | null, isEdit: boolean) {
  try {
    const data = await fetchTrainAlerts();
    const val = data.value || {};
    const status = val.Status;
    const affected = val.AffectedSegments || [];
    const messages = val.Message || [];

    let text = `🚆 <b>MRT/LRT Service Status & Disruptions</b>\n\n`;

    if (status === 1 && affected.length === 0) {
      text += `✅ <b>Normal Train Operations</b>\n`;
      text += `All MRT and LRT lines are currently running normally with no track faults or system delays.\n\n`;
    } else {
      text += `🚨 <b>ACTIVE SERVICE DISRUPTION DETECTED</b>\n\n`;
      affected.forEach((seg: any) => {
        text += `• <b>Line</b>: ${seg.Line} (${seg.Direction})\n`;
        text += `• <b>Affected Stretch</b>: ${seg.Stations}\n`;
        if (seg.FreePublicBus) text += `• <b>Free Public Bus</b>: ${seg.FreePublicBus}\n`;
        if (seg.FreeMRTShuttle) text += `• <b>Free MRT Shuttle</b>: ${seg.FreeMRTShuttle}\n`;
        text += `\n`;
      });
    }

    if (messages.length > 0) {
      text += `📢 <b>Active Travel Advisories & Service Adjustments:</b>\n\n`;
      messages.forEach((m: any) => {
        text += `• <i>${m.Content}</i>\n`;
        if (m.CreatedDate) text += `  🕒 <code>${m.CreatedDate}</code>\n\n`;
      });
    }

    const keyboard = new InlineKeyboard()
      .text("🔄 Refresh Status", "menu_disruptions").row()
      .text("🚆 Check Platform Crowds", "menu_mrt").row()
      .text("🔙 Back to Main Menu", "menu_main");

    if (isEdit) {
      await safeEditOrSend(ctx, text, keyboard, "HTML");
    } else {
      await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
    }
  } catch (e: any) {
    const errText = "Error fetching train service alerts.";
    const kb = new InlineKeyboard().text("🔙 Back to Main Menu", "menu_main");
    if (isEdit) {
      await safeEditOrSend(ctx, errText, kb, "HTML");
    } else {
      await ctx.reply(errText, { reply_markup: kb });
    }
  }
}

async function showMRTCrowd(ctx: any, messageId: number | null, line: string, isEdit: boolean, page: number = 1) {
  try {
    const lineKey = line.toUpperCase();
    const lineMeta = MRT_LINES[lineKey] || { name: `🚆 ${lineKey} Line`, color: "🚆" };
    const data = await fetchMRTCrowd(lineKey);
    const items = data.value || [];
    items.sort((a: any, b: any) => compareStationCodes(a.Station, b.Station));

    if (items.length === 0) {
      const text = `❌ No crowd data currently available for <b>${lineMeta.name}</b>.`;
      const kb = new InlineKeyboard().text("🔙 Back to MRT Menu", "menu_mrt");
      if (isEdit) {
        return safeEditOrSend(ctx, text, kb, "HTML");
      } else {
        return ctx.reply(text, { parse_mode: "HTML", reply_markup: kb });
      }
    }

    let lowCount = 0;
    let medCount = 0;
    let highCount = 0;

    items.forEach((i: any) => {
      const c = (i.CrowdLevel || "").toLowerCase();
      if (c === "l") lowCount++;
      else if (c === "m") medCount++;
      else if (c === "h") highCount++;
    });

    const PAGE_SIZE = 12;
    const totalPages = Math.ceil(items.length / PAGE_SIZE);
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const displayItems = items.slice(startIndex, startIndex + PAGE_SIZE);

    let text = `<b>${lineMeta.name} - Platform Crowd Levels</b>\n`;
    text += `📊 <b>Summary</b>: 🟢 ${lowCount} Low | 🟡 ${medCount} Moderate | 🔴 ${highCount} High\n`;
    if (totalPages > 1) {
      text += `📄 <i>Page ${currentPage} of ${totalPages} (${items.length} total stations)</i>\n`;
    }
    text += `\n`;

    displayItems.forEach((st: any) => {
      const code = st.Station;
      const name = MRT_STATION_NAMES[code] ? `${code} ${MRT_STATION_NAMES[code]}` : code;
      const c = (st.CrowdLevel || "").toLowerCase();
      const icon = c === "h" ? "🔴 High" : c === "m" ? "🟡 Moderate" : "🟢 Low";
      text += `• <b>${name}</b>: ${icon}\n`;
    });

    const keyboard = new InlineKeyboard();

    if (totalPages > 1) {
      if (currentPage > 1) {
        keyboard.text("◀️ Prev", `mrt_p_${lineKey}__${currentPage - 1}`);
      }
      keyboard.text(`📄 ${currentPage}/${totalPages}`, `mrt_p_${lineKey}__${currentPage}`);
      if (currentPage < totalPages) {
        keyboard.text("Next ▶️", `mrt_p_${lineKey}__${currentPage + 1}`);
      }
      keyboard.row();
    }

    keyboard.text("🔄 Refresh", `mrt_p_${lineKey}__${currentPage}`).row();
    keyboard.text("🔙 Back to MRT Menu", "menu_mrt");

    if (isEdit) {
      await safeEditOrSend(ctx, text, keyboard, "HTML");
    } else {
      await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
    }
  } catch (e: any) {
    const errText = "Error fetching MRT crowd data.";
    const kb = new InlineKeyboard().text("🔙 Back to MRT Menu", "menu_mrt");
    if (isEdit) {
      await safeEditOrSend(ctx, errText, kb, "HTML");
    } else {
      await ctx.reply(errText, { reply_markup: kb });
    }
  }
}

async function showTaxiLocator(ctx: any, messageId: number | null, queryOrCoords: string | { lat: number; lon: number }, isEdit: boolean) {
  try {
    let targetLat = 1.3048;
    let targetLon = 103.8318;
    let locationTitle = "Orchard Area";

    if (typeof queryOrCoords === "object") {
      targetLat = queryOrCoords.lat;
      targetLon = queryOrCoords.lon;
      locationTitle = "Your Current Location";
    } else {
      const q = (queryOrCoords || "orchard").toLowerCase().trim();
      if (POPULAR_LOCATIONS[q]) {
        targetLat = POPULAR_LOCATIONS[q].lat;
        targetLon = POPULAR_LOCATIONS[q].lon;
        locationTitle = POPULAR_LOCATIONS[q].name;
      } else {
        const { data: matchedStands } = await supabase
          .from('lta_taxi_stands')
          .select('*')
          .ilike('name', `%${q}%`)
          .limit(1);

        if (matchedStands && matchedStands.length > 0) {
          targetLat = matchedStands[0].latitude;
          targetLon = matchedStands[0].longitude;
          locationTitle = matchedStands[0].name;
        } else {
          const { data: matchedStops } = await supabase
            .from('lta_bus_stops')
            .select('description, latitude, longitude')
            .or(`description.ilike.%${q}%,road_name.ilike.%${q}%`)
            .limit(1);

          if (matchedStops && matchedStops.length > 0) {
            targetLat = matchedStops[0].latitude;
            targetLon = matchedStops[0].longitude;
            locationTitle = matchedStops[0].description;
          }
        }
      }
    }

    const taxiData = await fetchTaxiAvailability();
    const vacantTaxis = taxiData.value || [];

    let count500 = 0;
    let count1000 = 0;
    let count2000 = 0;
    let closestDist = Infinity;

    vacantTaxis.forEach((t: any) => {
      const d = calculateDistanceMeters(targetLat, targetLon, t.Latitude, t.Longitude);
      if (d <= 500) count500++;
      if (d <= 1000) count1000++;
      if (d <= 2000) count2000++;
      if (d < closestDist) closestDist = d;
    });

    const stands = await getNearbyTaxiStands(targetLat, targetLon, 4);

    let text = `🚕 <b>Vacant Taxi Locator & Official Stands</b>\n`;
    text += `📍 <b>Location</b>: ${locationTitle}\n\n`;

    text += `📡 <b>Vacant Taxis Radar (Live LTA Stream):</b>\n`;
    text += `• <b>Within 500m</b>: <code>${count500}</code> vacant taxis\n`;
    text += `• <b>Within 1.0km</b>: <code>${count1000}</code> vacant taxis\n`;
    text += `• <b>Within 2.0km</b>: <code>${count2000}</code> vacant taxis\n`;
    if (closestDist !== Infinity) {
      text += `• <b>Closest Taxi</b>: ~<code>${Math.round(closestDist)}m</code> away\n`;
    }
    text += `\n`;

    const keyboard = new InlineKeyboard();

    const webAppUrl = `https://jasontan89.github.io/NewsTelegrambot/taxi-map.html?lat=${targetLat}&lon=${targetLon}&name=${encodeURIComponent(locationTitle)}`;
    keyboard.webApp("🗺️ Open Live Taxi Radar Map", webAppUrl).row();

    if (stands && stands.length > 0) {
      text += `🚖 <b>Nearby Official Taxi Stands / Stops:</b>\n\n`;
      stands.forEach((s: any) => {
        const dist = Math.round(s.distance);
        const bfaIcon = s.bfa === 'Yes' ? '♿ Barrier-Free' : 'Standard';
        text += `• <b>${s.taxi_code}</b>: ${s.name}\n`;
        text += `   📍 <code>${dist}m</code> away • ${s.type} • ${bfaIcon}\n\n`;

        if (s.latitude && s.longitude) {
          const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`;
          keyboard.url(`🚶 Walk to ${s.taxi_code} (${dist}m)`, mapUrl).row();
        }
      });
    }

    const refreshPayload = typeof queryOrCoords === "string" ? `taxi_search_${queryOrCoords}` : "menu_taxis";
    keyboard.text("🔄 Refresh Radar", refreshPayload).row();
    keyboard.text("🔙 Back to Taxi Menu", "menu_taxis");

    if (isEdit) {
      await safeEditOrSend(ctx, text, keyboard, "HTML");
    } else {
      await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
    }
  } catch (e: any) {
    const errText = "Error locating vacant taxis or taxi stands.";
    const kb = new InlineKeyboard().text("🔙 Back to Taxi Menu", "menu_taxis");
    if (isEdit) {
      await safeEditOrSend(ctx, errText, kb, "HTML");
    } else {
      await ctx.reply(errText, { reply_markup: kb });
    }
  }
}

async function showBicycleParking(ctx: any, messageId: number | null, queryOrCoords: string | { lat: number; lon: number }, isEdit: boolean) {
  try {
    let targetLat = 1.3532;
    let targetLon = 103.9452;
    let locationTitle = "Tampines MRT";

    if (typeof queryOrCoords === "object") {
      targetLat = queryOrCoords.lat;
      targetLon = queryOrCoords.lon;
      locationTitle = "Your Current Location";
    } else {
      const q = (queryOrCoords || "tampines").toLowerCase().trim();
      if (POPULAR_LOCATIONS[q]) {
        targetLat = POPULAR_LOCATIONS[q].lat;
        targetLon = POPULAR_LOCATIONS[q].lon;
        locationTitle = POPULAR_LOCATIONS[q].name;
      } else {
        const { data: matchedStops } = await supabase
          .from('lta_bus_stops')
          .select('description, latitude, longitude')
          .or(`description.ilike.%${q}%,road_name.ilike.%${q}%`)
          .limit(1);

        if (matchedStops && matchedStops.length > 0) {
          targetLat = matchedStops[0].latitude;
          targetLon = matchedStops[0].longitude;
          locationTitle = matchedStops[0].description;
        }
      }
    }

    const data = await fetchBicycleParking(targetLat, targetLon, 0.6);
    const racks = data.value || [];

    if (racks.length === 0) {
      const notFoundText = `❌ No official bicycle parking racks found within 600m of <b>${locationTitle}</b>.\n\nTry searching for major MRT stations like <code>/bike Tampines</code>, <code>/bike Jurong East</code>, <code>/bike Bishan</code>, or <code>/bike Orchard</code>!`;
      const kb = new InlineKeyboard().text("🔙 Back to Bicycle Menu", "menu_bikes");
      if (isEdit) return safeEditOrSend(ctx, notFoundText, kb, "HTML");
      return ctx.reply(notFoundText, { parse_mode: "HTML", reply_markup: kb });
    }

    racks.sort((a: any, b: any) => (b.RackCount || 0) - (a.RackCount || 0));
    const displayRacks = racks.slice(0, 6);

    let text = `🚲 <b>MRT Bicycle Parking: ${locationTitle}</b> (${racks.length} spots nearby)\n\n`;

    const keyboard = new InlineKeyboard();

    displayRacks.forEach((r: any, idx: number) => {
      const shelterIcon = r.ShelterIndicator === 'Y' ? '☂️ Sheltered' : '☀️ Open Air';
      const isMrt = (r.Description || '').toLowerCase().includes('mrt');
      const icon = isMrt ? '🚆' : '🚏';
      const lots = r.RackCount || 'Available';
      const rackType = r.RackType || 'Standard Racks';
      const dist = Math.round(calculateDistanceMeters(targetLat, targetLon, r.Latitude, r.Longitude));

      text += `${icon} <b>${r.Description}</b> (<code>${lots} lots</code>)\n`;
      text += `   🏷️ ${rackType} • ${shelterIcon} • <code>${dist}m</code> away\n\n`;

      if (r.Latitude && r.Longitude && idx < 3) {
        const mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${r.Latitude},${r.Longitude}`;
        keyboard.url(`🗺️ Walk to Rack #${idx + 1} (${dist}m)`, mapUrl).row();
      }
    });

    text += `💡 <i>Legend</i>: ☂️ Sheltered  ☀️ Open Air`;

    const refreshPayload = typeof queryOrCoords === "string" ? `bike_search_${queryOrCoords}` : "menu_bikes";
    keyboard.text("🔄 Refresh Racks", refreshPayload).row();
    keyboard.text("🔙 Back to Bicycle Menu", "menu_bikes");

    if (isEdit) {
      await safeEditOrSend(ctx, text, keyboard, "HTML");
    } else {
      await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
    }
  } catch (e: any) {
    const errText = "Error fetching bicycle parking data.";
    const kb = new InlineKeyboard().text("🔙 Back to Bicycle Menu", "menu_bikes");
    if (isEdit) {
      await safeEditOrSend(ctx, errText, kb, "HTML");
    } else {
      await ctx.reply(errText, { reply_markup: kb });
    }
  }
}

const EV_HUBS: Record<string, { name: string; postal: string; lat: number; lon: number; area: string }> = {
  "238801": { name: "ION Orchard", postal: "238801", lat: 1.30398, lon: 103.83203, area: "Orchard" },
  "238872": { name: "Takashimaya / Ngee Ann City", postal: "238872", lat: 1.30230, lon: 103.83440, area: "Orchard" },
  "238859": { name: "Paragon Orchard", postal: "238859", lat: 1.30386, lon: 103.83584, area: "Orchard" },
  "238895": { name: "313@Somerset", postal: "238895", lat: 1.30095, lon: 103.83842, area: "Orchard" },
  "237994": { name: "Great World", postal: "237994", lat: 1.29330, lon: 103.83170, area: "River Valley" },
  "018956": { name: "Marina Bay Sands", postal: "018956", lat: 1.28258, lon: 103.85856, area: "Marina Bay" },
  "038983": { name: "Suntec City", postal: "038983", lat: 1.29350, lon: 103.85720, area: "Marina Centre" },
  "048616": { name: "One Raffles Place", postal: "048616", lat: 1.28420, lon: 103.85100, area: "CBD" },
  "098585": { name: "VivoCity", postal: "098585", lat: 1.26440, lon: 103.82220, area: "HarbourFront" },
  "609606": { name: "JEM Jurong", postal: "609606", lat: 1.33320, lon: 103.74310, area: "Jurong East" },
  "608532": { name: "Westgate Jurong", postal: "608532", lat: 1.33400, lon: 103.74280, area: "Jurong East" },
  "529510": { name: "Tampines Mall", postal: "529510", lat: 1.35259, lon: 103.94479, area: "Tampines" },
  "528523": { name: "Our Tampines Hub", postal: "528523", lat: 1.35330, lon: 103.94050, area: "Tampines" },
  "579837": { name: "Junction 8 Bishan", postal: "579837", lat: 1.35080, lon: 103.84810, area: "Bishan" },
  "569933": { name: "AMK Hub", postal: "569933", lat: 1.36980, lon: 103.84960, area: "Ang Mo Kio" },
  "556083": { name: "Nex Serangoon", postal: "556083", lat: 1.35060, lon: 103.87260, area: "Serangoon" },
  "738099": { name: "Causeway Point", postal: "738099", lat: 1.43600, lon: 103.78580, area: "Woodlands" },
  "769098": { name: "Northpoint City", postal: "769098", lat: 1.42940, lon: 103.83500, area: "Yishun" },
  "828761": { name: "Waterway Point", postal: "828761", lat: 1.40670, lon: 103.90210, area: "Punggol" },
  "819666": { name: "Jewel Changi Airport", postal: "819666", lat: 1.36020, lon: 103.98970, area: "Changi" },
  "409057": { name: "PLQ Mall Paya Lebar", postal: "409057", lat: 1.31750, lon: 103.89250, area: "Paya Lebar" },
  "129588": { name: "The Clementi Mall", postal: "129588", lat: 1.31510, lon: 103.76520, area: "Clementi" },
  "449269": { name: "Parkway Parade", postal: "449269", lat: 1.30150, lon: 103.90520, area: "Marine Parade" }
};

function cleanOperator(op: string) {
  if (!op) return "EV Charging Point";
  return op
    .replace(/\s*PTE\.?\s*LTD\.?/i, "")
    .replace(/\s*PRIVATE\s*LIMITED/i, "")
    .replace(/\s*SINGAPORE/i, "")
    .trim();
}

function getNearbyEVHubs(lat: number, lon: number, limit: number = 3) {
  const list = Object.values(EV_HUBS).map(h => ({
    ...h,
    distance: calculateDistanceMeters(lat, lon, h.lat, h.lon)
  }));
  list.sort((a, b) => a.distance - b.distance);
  return list.slice(0, limit);
}

async function showEVChargingStations(ctx: any, messageId: number | null, queryOrPostal: string, isEdit: boolean = false, dcOnly: boolean = false) {
  try {
    let postalCode = "";
    let targetTitle = "";
    const cleanQ = (queryOrPostal || "").trim().toLowerCase();

    if (/^\d{6}$/.test(cleanQ)) {
      postalCode = cleanQ;
      const matchedHub = Object.values(EV_HUBS).find(h => h.postal === postalCode);
      targetTitle = matchedHub?.name || `Postal ${postalCode}`;
    } else {
      const matchedHub = Object.values(EV_HUBS).find(h => 
        h.name.toLowerCase().includes(cleanQ) || 
        h.area.toLowerCase().includes(cleanQ) ||
        cleanQ.includes(h.area.toLowerCase()) ||
        cleanQ.includes(h.name.toLowerCase())
      );
      if (matchedHub) {
        postalCode = matchedHub.postal;
        targetTitle = matchedHub.name;
      } else {
        const pop = POPULAR_LOCATIONS[cleanQ];
        if (pop) {
          const nearest = getNearbyEVHubs(pop.lat, pop.lon, 1);
          if (nearest && nearest.length > 0) {
            postalCode = nearest[0].postal;
            targetTitle = `${pop.name} (${nearest[0].name})`;
          }
        }
      }
    }

    if (!postalCode) {
      postalCode = "238801";
      targetTitle = queryOrPostal ? `"${queryOrPostal}" (Showing ION Orchard)` : "ION Orchard";
    }

    const data = await fetchEVChargingPoints(postalCode);
    const locs = data?.value?.evLocationsData || [];

    if (locs.length === 0) {
      const kb = new InlineKeyboard().text("🔙 Back to EV Menu", "menu_ev");
      return safeEditOrSend(
        ctx,
        `❌ <b>No EV Charging Points Found</b>\n\n` +
        `No registered public EV charging points found for <b>${targetTitle}</b> (Postal: <code>${postalCode}</code>).\n\n` +
        `💡 Try searching with another 6-digit postal code (e.g. <code>/ev 529510</code>) or select a popular hub below:`,
        kb,
        "HTML"
      );
    }

    const loc = locs[0];
    const locName = loc.name || targetTitle;
    let totalPlugs = 0;
    let availPlugs = 0;
    const cpItems: string[] = [];

    (loc.chargingPoints || []).forEach((cp: any, idx: number) => {
      const op = cleanOperator(cp.operator);
      const pos = cp.position ? ` • 📍 <code>${cp.position}</code>` : "";
      const plugRows: string[] = [];

      (cp.plugTypes || []).forEach((pt: any) => {
        const isDc = (pt.powerRating || "").toUpperCase() === "DC" || parseInt(pt.chargingSpeed || "0", 10) >= 50;
        if (dcOnly && !isDc) return;

        const speedText = pt.chargingSpeed ? `${pt.chargingSpeed} kW` : "";
        const speedIcon = isDc ? "🚀" : "⚡";
        const speedLabel = isDc ? "DC Fast" : "AC";
        const typeName = pt.plugType || "Standard";

        let plugTotal = 0;
        let plugAvail = 0;
        (pt.evIds || []).forEach((id: any) => {
          plugTotal++;
          totalPlugs++;
          if (id.status === "1") {
            plugAvail++;
            availPlugs++;
          }
        });

        const statusIcon = plugAvail > 0 ? "🟢" : "🔴";
        const statusLabel = plugTotal > 0 ? `${plugAvail}/${plugTotal} Available` : (cp.status === "1" ? "Active" : "In Use");
        const priceStr = pt.price ? ` • <code>$${parseFloat(pt.price).toFixed(2)}/${pt.priceType || 'kWh'}</code>` : "";

        plugRows.push(`• ${speedIcon} <b>${typeName} (${speedLabel})</b> ${speedText}\n  - Status: ${statusIcon} <b>${statusLabel}</b>${priceStr}`);
      });

      if (plugRows.length > 0) {
        cpItems.push(`<b>${idx + 1}. ${op}</b>${pos}\n${plugRows.join('\n')}`);
      }
    });

    let text = `⚡ <b>Live EV Charging Stations & Availability</b>\n`;
    text += `📍 Location: <b>${locName}</b> (<code>${postalCode}</code>)\n`;
    if (loc.address) text += `🏢 Address: <i>${loc.address}</i>\n\n`;

    if (cpItems.length === 0) {
      if (dcOnly) {
        text += `⚠️ <i>No DC Fast chargers found at this location. Tap "⚡ Show All Plugs" below to view standard AC chargers.</i>\n\n`;
      } else {
        text += `<i>No active charger bays currently registered at this location.</i>\n\n`;
      }
    } else {
      text += `🔌 <b>Available Chargers (${availPlugs}/${totalPlugs} Plugs Active):</b>\n\n`;
      text += cpItems.join("\n\n") + "\n\n";
    }

    text += `🕒 <i>Updated: ${new Date().toLocaleTimeString('en-SG', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</i>`;

    const keyboard = new InlineKeyboard();

    if (loc.latitude && loc.longitude) {
      const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`;
      keyboard.url(`🗺️ Drive to ${locName.substring(0, 18)}`, gmapsUrl).row();
    }

    if (dcOnly) {
      keyboard.text("⚡ Show All Plugs", `ev_filter_${postalCode}__all`);
    } else {
      keyboard.text("🚀 DC Fast Only (≥50kW)", `ev_filter_${postalCode}__dc`);
    }
    keyboard.text("🔄 Refresh", `ev_filter_${postalCode}__${dcOnly ? 'dc' : 'all'}`).row();
    keyboard.text("🔙 Back to EV Hub Menu", "menu_ev");

    return safeEditOrSend(ctx, text, keyboard, "HTML");
  } catch (err) {
    console.error("showEVChargingStations error:", err);
    const kb = new InlineKeyboard().text("🔙 Back to EV Menu", "menu_ev");
    return safeEditOrSend(ctx, `❌ Failed to fetch EV charging data for <code>${queryOrPostal}</code>.`, kb, "HTML");
  }
}

async function showERPRates(
  ctx: any,
  queryOrCorridor: string = "CTE",
  vehicleType: string = "car",
  page: number = 1
) {
  try {
    const cleanQ = queryOrCorridor.trim();
    let gantries = searchERPGantries(cleanQ);

    if (gantries.length === 0) {
      const kb = new InlineKeyboard()
        .text("🛣️ CTE", "erp_corr_CTE")
        .text("🛣️ PIE", "erp_corr_PIE").row()
        .text("🛣️ AYE", "erp_corr_AYE")
        .text("🛍️ Orchard", "erp_corr_ORCHARD").row()
        .text("🔙 Back to ERP Menu", "menu_erp");
      return safeEditOrSend(ctx, `❌ No ERP gantries found matching "<b>${cleanQ}</b>".\n\n💡 Try searching <code>/erp CTE</code>, <code>/erp PIE</code>, <code>/erp AYE</code>, <code>/erp Orchard</code>, or <code>/erp CBD</code>.`, kb, "HTML");
    }

    const sgtNow = getSGTHourAndMinute();
    const { timeStr, dayName } = sgtNow;

    const vehLabels: Record<string, string> = {
      car: "🚗 Passenger Cars / Taxis (1.0x)",
      moto: "🏍️ Motorcycles (0.5x)",
      hgv: "🚛 Heavy Goods / Buses (1.5x)"
    };
    const vehLabel = vehLabels[vehicleType] || vehLabels.car;

    const corridorInfo = ERP_CORRIDORS[cleanQ.toUpperCase()];
    const titleHeader = corridorInfo ? `${corridorInfo.icon} <b>${corridorInfo.name}</b>` : `💳 <b>ERP Gantries: ${cleanQ.toUpperCase()}</b>`;

    let text = `${titleHeader}\n`;
    text += `🚗 Vehicle Class: <b>${vehLabel}</b>\n`;
    text += `🕒 <i>Singapore Time: ${timeStr} SGT (${dayName})</i>\n\n`;

    const PAGE_SIZE = 4;
    const totalPages = Math.ceil(gantries.length / PAGE_SIZE) || 1;
    const curPage = Math.max(1, Math.min(page, totalPages));
    const pageGantries = gantries.slice((curPage - 1) * PAGE_SIZE, curPage * PAGE_SIZE);

    text += `<b>Active & Upcoming Gantry Rates (${gantries.length} total):</b>\n\n`;

    const gantryButtons: { name: string; id: string }[] = [];

    pageGantries.forEach((g: any, idx: number) => {
      const num = (curPage - 1) * PAGE_SIZE + idx + 1;
      const status = getCurrentERPRate(g, vehicleType);
      
      text += `<b>${num}. ${g.name}</b>\n`;
      text += `• Status: ${status.message}\n`;
      if (status.nextSlot) {
        text += `• Next: <code>${status.nextSlot.start} – ${status.nextSlot.end}: $${status.nextSlot.rate.toFixed(2)}</code>\n`;
      }
      text += `• 🧭 <i>${g.direction}</i>\n\n`;

      gantryButtons.push({ name: g.name, id: g.id });
    });

    if (gantries.length > PAGE_SIZE) {
      text += `📄 <i>Page ${curPage} of ${totalPages}</i>\n`;
    }

    const keyboard = new InlineKeyboard();

    // Launch Interactive WebApp Map Button
    const erpMapUrl = `https://jasontan89.github.io/NewsTelegrambot/erp-map.html?corridor=${encodeURIComponent(cleanQ)}&vehicle=${vehicleType}`;
    keyboard.webApp("🗺️ Open Interactive ERP Gantry Map", erpMapUrl).row();

    // Vehicle Switcher Row
    if (vehicleType === "car") {
      keyboard.text("🏍️ Moto (0.5x)", `erp_veh_${cleanQ}__moto`)
              .text("🚛 Heavy (1.5x)", `erp_veh_${cleanQ}__hgv`).row();
    } else if (vehicleType === "moto") {
      keyboard.text("🚗 Cars (1.0x)", `erp_veh_${cleanQ}__car`)
              .text("🚛 Heavy (1.5x)", `erp_veh_${cleanQ}__hgv`).row();
    } else {
      keyboard.text("🚗 Cars (1.0x)", `erp_veh_${cleanQ}__car`)
              .text("🏍️ Moto (0.5x)", `erp_veh_${cleanQ}__moto`).row();
    }

    // Detail buttons for page gantries
    for (const gb of gantryButtons) {
      keyboard.text(`🔍 Full Schedule: ${gb.name.substring(0, 22)}...`, `erp_g_${gb.id}__${vehicleType}`).row();
    }

    // Pagination row if applicable
    if (totalPages > 1) {
      if (curPage > 1) {
        keyboard.text("◀️ Prev", `erp_p_${cleanQ}__${vehicleType}__${curPage - 1}`);
      }
      keyboard.text(`🔄 Refresh (${timeStr})`, `erp_p_${cleanQ}__${vehicleType}__${curPage}`);
      if (curPage < totalPages) {
        keyboard.text("Next ▶️", `erp_p_${cleanQ}__${vehicleType}__${curPage + 1}`);
      }
      keyboard.row();
    } else {
      keyboard.text(`🔄 Refresh (${timeStr})`, `erp_veh_${cleanQ}__${vehicleType}`).row();
    }

    keyboard.text("🔙 Back to ERP Corridors", "menu_erp");

    return safeEditOrSend(ctx, text, keyboard, "HTML");
  } catch (err) {
    console.error("showERPRates error:", err);
    const kb = new InlineKeyboard().text("🔙 Back to ERP Menu", "menu_erp");
    return safeEditOrSend(ctx, `❌ Failed to calculate ERP rates for <code>${queryOrCorridor}</code>.`, kb, "HTML");
  }
}

async function showERPGantryDetails(
  ctx: any,
  gantryId: string,
  vehicleType: string = "car"
) {
  try {
    const gantry = ERP_GANTRIES.find((g: any) => g.id === gantryId);
    if (!gantry) {
      const kb = new InlineKeyboard().text("🔙 Back to ERP Menu", "menu_erp");
      return safeEditOrSend(ctx, `❌ ERP Gantry <code>${gantryId}</code> not found.`, kb, "HTML");
    }

    const sgtNow = getSGTHourAndMinute();
    const { timeStr, dayName } = sgtNow;

    const vehLabels: Record<string, string> = {
      car: "🚗 Passenger Cars / Taxis (1.0x)",
      moto: "🏍️ Motorcycles (0.5x)",
      hgv: "🚛 Heavy Goods / Buses (1.5x)"
    };
    const vehLabel = vehLabels[vehicleType] || vehLabels.car;

    const status = getCurrentERPRate(gantry, vehicleType);

    let text = `💳 <b>ERP Gantry Rate Schedule</b>\n`;
    text += `📍 <b>${gantry.name}</b>\n`;
    text += `🛣️ Corridor: <i>${gantry.corridorName}</i>\n`;
    text += `🧭 Direction: <i>${gantry.direction}</i>\n`;
    text += `🚗 Vehicle Class: <b>${vehLabel}</b>\n`;
    text += `🕒 <i>Singapore Time: ${timeStr} SGT (${dayName})</i>\n\n`;

    text += `<b>Current Status:</b>\n`;
    text += `${status.message}\n`;
    if (status.nextSlot) {
      text += `⏳ Next Change: <code>${status.nextSlot.start} – ${status.nextSlot.end} ➔ $${status.nextSlot.rate.toFixed(2)}</code>\n\n`;
    } else {
      text += `\n`;
    }

    text += `📅 <b>Weekday Rate Timetable:</b>\n`;
    for (const slot of gantry.slotsWeekday) {
      const vRate = calculateVehicleRate(slot.rate, vehicleType);
      const isCur = status.activeSlot && status.activeSlot.start === slot.start && status.activeSlot.end === slot.end;
      const marker = isCur ? " ◀️ <b>ACTIVE</b>" : "";
      text += `• <code>${slot.start} – ${slot.end}</code>: $${vRate.toFixed(2)}${marker}\n`;
    }
    text += `• <i>All other operating times: FREE ($0.00)</i>\n\n`;
    text += `💡 <i>Sundays & Public Holidays are completely FREE of ERP charges across Singapore.</i>`;

    const keyboard = new InlineKeyboard();

    const erpMapUrl = `https://jasontan89.github.io/NewsTelegrambot/erp-map.html?corridor=${encodeURIComponent(gantry.corridor)}&vehicle=${vehicleType}`;
    keyboard.webApp("🗺️ Open Interactive ERP Gantry Map", erpMapUrl).row();

    if (gantry.lat && gantry.lon) {
      const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=${gantry.lat},${gantry.lon}`;
      keyboard.url(`🗺️ View Gantry Location on Map`, gmapsUrl).row();
    }

    // Vehicle Switcher Row
    if (vehicleType === "car") {
      keyboard.text("🏍️ View Moto (0.5x)", `erp_g_${gantryId}__moto`)
              .text("🚛 View Heavy (1.5x)", `erp_g_${gantryId}__hgv`).row();
    } else if (vehicleType === "moto") {
      keyboard.text("🚗 View Cars (1.0x)", `erp_g_${gantryId}__car`)
              .text("🚛 View Heavy (1.5x)", `erp_g_${gantryId}__hgv`).row();
    } else {
      keyboard.text("🚗 View Cars (1.0x)", `erp_g_${gantryId}__car`)
              .text("🏍️ View Moto (0.5x)", `erp_g_${gantryId}__moto`).row();
    }

    keyboard.text(`🔄 Refresh (${timeStr})`, `erp_g_${gantryId}__${vehicleType}`).row();
    keyboard.text(`🔙 Back to ${gantry.corridor} Gantries`, `erp_corr_${gantry.corridor}`);

    return safeEditOrSend(ctx, text, keyboard, "HTML");
  } catch (err) {
    console.error("showERPGantryDetails error:", err);
    const kb = new InlineKeyboard().text("🔙 Back to ERP Menu", "menu_erp");
    return safeEditOrSend(ctx, `❌ Failed to load gantry details.`, kb, "HTML");
  }
}



const ALL_MRT_LINES = ["NSL", "EWL", "CCL", "DTL", "NEL", "TEL"];

async function resolveStopCodes(query: string): Promise<{ codes: string[]; label: string }> {
  const cleanQ = query.trim();
  if (/^\d{5}$/.test(cleanQ)) {
    const { data } = await supabase.from('lta_bus_stops').select('description, road_name').eq('bus_stop_code', cleanQ).single();
    const label = data ? `${data.description} (${cleanQ})` : `Bus Stop ${cleanQ}`;
    return { codes: [cleanQ], label };
  }

  // 1. Prioritize MRT station, Interchange, and description matches
  const { data: stationMatches } = await supabase
    .from('lta_bus_stops')
    .select('bus_stop_code, description, road_name')
    .or(`description.ilike.%${cleanQ}%Stn%,description.ilike.%${cleanQ}%Int%,description.ilike.%${cleanQ}%`)
    .limit(15);

  let matches = stationMatches || [];
  if (matches.length === 0) {
    const { data: roadMatches } = await supabase
      .from('lta_bus_stops')
      .select('bus_stop_code, description, road_name')
      .ilike('road_name', `%${cleanQ}%`)
      .limit(15);
    matches = roadMatches || [];
  }

  if (matches.length === 0) {
    return { codes: [], label: cleanQ };
  }

  const primaryName = matches[0].description || cleanQ;
  const codes = matches.map((m: any) => m.bus_stop_code);
  return { codes, label: `${primaryName}` };
}

async function planBusJourney(ctx: any, messageId: number | null, originInput: string, destInput: string, isEdit: boolean = false) {
  try {
    const originResolved = await resolveStopCodes(originInput);
    const destResolved = await resolveStopCodes(destInput);

    if (originResolved.codes.length === 0) {
      const err = `❌ Could not find any bus stops matching origin "<b>${originInput}</b>".\n\nTry searching for landmarks like <code>Clementi</code>, <code>Orchard</code>, <code>Tampines</code>, <code>VivoCity</code>, or 5-digit bus stop codes!`;
      const kb = new InlineKeyboard().text("🔙 Back to Menu", "menu_main");
      if (isEdit) return safeEditOrSend(ctx, err, kb, "HTML");
      return ctx.reply(err, { parse_mode: "HTML", reply_markup: kb });
    }

    if (destResolved.codes.length === 0) {
      const err = `❌ Could not find any bus stops matching destination "<b>${destInput}</b>".\n\nTry searching for landmarks like <code>Orchard</code>, <code>Bugis</code>, <code>Marina Bay</code>, <code>JEM</code>, or 5-digit bus stop codes!`;
      const kb = new InlineKeyboard().text("🔙 Back to Menu", "menu_main");
      if (isEdit) return safeEditOrSend(ctx, err, kb, "HTML");
      return ctx.reply(err, { parse_mode: "HTML", reply_markup: kb });
    }

    // 1. Direct Routes
    const directRoutes = await findDirectBusRoutes(originResolved.codes, destResolved.codes);
    const keyboard = new InlineKeyboard();

    if (directRoutes && directRoutes.length > 0) {
      const serviceMap = new Map<string, any>();
      for (const r of directRoutes) {
        if (!serviceMap.has(r.service_no)) {
          serviceMap.set(r.service_no, r);
        }
      }
      const uniqueDirect = Array.from(serviceMap.values()).slice(0, 5);

      const stopCodesToFetch = [...new Set([
        ...uniqueDirect.map((r: any) => r.origin_stop_code),
        ...uniqueDirect.map((r: any) => r.dest_stop_code)
      ])];
      const { data: stopMetaList } = await supabase
        .from('lta_bus_stops')
        .select('bus_stop_code, description, road_name')
        .in('bus_stop_code', stopCodesToFetch);
      const stopMap: Record<string, any> = {};
      (stopMetaList || []).forEach((s: any) => { stopMap[s.bus_stop_code] = s; });

      const primaryOriginCode = uniqueDirect[0].origin_stop_code;
      let arrivalMap: Record<string, string> = {};
      try {
        const arrData = await fetchBusArrival(primaryOriginCode);
        (arrData.Services || []).forEach((s: any) => {
          const next = s.NextBus;
          const mins = formatMins(next?.EstimatedArrival);
          if (mins) {
            const load = getLoadIcon(next?.Load);
            const dd = next?.Type === 'DD' ? ' 🚍' : '';
            arrivalMap[s.ServiceNo] = `${load} ${mins}${dd}`;
          }
        });
      } catch (_) {}

      let text = `🗺️ <b>Bus Journey Planner: Direct Routes</b>\n`;
      text += `📍 <b>From</b>: ${originResolved.label}\n`;
      text += `🏁 <b>To</b>: ${destResolved.label}\n\n`;
      text += `✅ Found <b>${uniqueDirect.length} direct bus service(s)</b>:\n\n`;

      uniqueDirect.forEach((r: any) => {
        const origMeta = stopMap[r.origin_stop_code];
        const destMeta = stopMap[r.dest_stop_code];
        const origDesc = origMeta ? `${origMeta.description} (${r.origin_stop_code})` : r.origin_stop_code;
        const destDesc = destMeta ? `${destMeta.description} (${r.dest_stop_code})` : r.dest_stop_code;
        const eta = arrivalMap[r.service_no] ? ` • ETA: <b>${arrivalMap[r.service_no]}</b>` : '';

        text += `• <b><u>Bus ${r.service_no}</u></b> (Dir ${r.direction})${eta}\n`;
        text += `   ⏳ <code>${r.num_stops} stops</code> • <code>${r.est_distance}km</code>\n`;
        text += `   🚏 Board: <i>${origDesc}</i>\n`;
        text += `   🏁 Alight: <i>${destDesc}</i>\n\n`;

        keyboard.text(`🚌 Bus ${r.service_no} Route`, `route_v_${r.service_no}__${r.direction}__1`);
        keyboard.text(`🚏 Boarding Stop`, `get_bus_${r.origin_stop_code}`).row();
      });

      const swapOrigin = encodeURIComponent(destInput);
      const swapDest = encodeURIComponent(originInput);
      keyboard.text("🔄 Swap Direction", `goto_p_${swapOrigin}__${swapDest}`).row();
      keyboard.text("🔙 Back to Main Menu", "menu_main");

      if (isEdit) return safeEditOrSend(ctx, text, keyboard, "HTML");
      return ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
    }

    // 2. 1-Transfer Routes
    const transferRoutes = await findOneTransferBusRoutes(originResolved.codes, destResolved.codes);

    if (transferRoutes && transferRoutes.length > 0) {
      const topTransfers = transferRoutes.slice(0, 3);
      const stopCodesToFetch = [...new Set([
        ...topTransfers.map((r: any) => r.leg1_origin_stop_code),
        ...topTransfers.map((r: any) => r.transfer_stop_code),
        ...topTransfers.map((r: any) => r.dest_stop_code)
      ])];
      const { data: stopMetaList } = await supabase
        .from('lta_bus_stops')
        .select('bus_stop_code, description, road_name')
        .in('bus_stop_code', stopCodesToFetch);
      const stopMap: Record<string, any> = {};
      (stopMetaList || []).forEach((s: any) => { stopMap[s.bus_stop_code] = s; });

      let text = `🗺️ <b>Bus Journey Planner: 1-Transfer Routes</b>\n`;
      text += `📍 <b>From</b>: ${originResolved.label}\n`;
      text += `🏁 <b>To</b>: ${destResolved.label}\n\n`;
      text += `ℹ️ <i>No direct bus found. Here are the fastest 1-transfer routes:</i>\n\n`;

      topTransfers.forEach((r: any, idx: number) => {
        const origDesc = stopMap[r.leg1_origin_stop_code]?.description || r.leg1_origin_stop_code;
        const transDesc = stopMap[r.transfer_stop_code]?.description || r.transfer_stop_code;
        const destDesc = stopMap[r.dest_stop_code]?.description || r.dest_stop_code;

        text += `<b>Option ${idx + 1}: Total ~${r.total_distance}km (${r.total_stops} stops)</b>\n`;
        text += `1️⃣ Take <b><u>Bus ${r.leg1_service_no}</u></b> at <i>${origDesc}</i>\n`;
        text += `   ⬇️ Ride <code>${r.leg1_stops} stops</code> (${r.leg1_distance}km)\n`;
        text += `2️⃣ Transfer at <b>${transDesc}</b> (<code>${r.transfer_stop_code}</code>)\n`;
        text += `3️⃣ Take <b><u>Bus ${r.leg2_service_no}</u></b> ➡️ Alight at <i>${destDesc}</i>\n`;
        text += `   ⬇️ Ride <code>${r.leg2_stops} stops</code> (${r.leg2_distance}km)\n\n`;
      });

      const swapOrigin = encodeURIComponent(destInput);
      const swapDest = encodeURIComponent(originInput);
      keyboard.text("🔄 Swap Direction", `goto_p_${swapOrigin}__${swapDest}`).row();
      keyboard.text("🔙 Back to Main Menu", "menu_main");

      if (isEdit) return safeEditOrSend(ctx, text, keyboard, "HTML");
      return ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
    }

    const notFoundText = `❌ No direct or 1-transfer bus routes found between <b>${originInput}</b> and <b>${destInput}</b>.\n\nPlease check the spelling or try nearby landmarks!`;
    const kb = new InlineKeyboard().text("🔙 Back to Main Menu", "menu_main");
    if (isEdit) return safeEditOrSend(ctx, notFoundText, kb, "HTML");
    return ctx.reply(notFoundText, { parse_mode: "HTML", reply_markup: kb });

  } catch (e: any) {
    console.error("planBusJourney error:", e);
    const errText = "Error calculating bus journey route.";
    const kb = new InlineKeyboard().text("🔙 Back to Main Menu", "menu_main");
    if (isEdit) return safeEditOrSend(ctx, errText, kb, "HTML");
    return ctx.reply(errText, { reply_markup: kb });
  }
}

async function renderMRTAlertsMenu(ctx: any, userId: number, chatId: number, isEdit: boolean) {
  const subs = await getMRTSubscriptions(userId);
  const isAllSubscribed = ALL_MRT_LINES.every(line => subs.includes(line));

  let text = `🔔 <b>MRT Disruption Push Alert Subscriptions</b>\n\n`;
  text += `Get instant push notifications the moment an active train breakdown, track fault, or free shuttle bus is reported by LTA!\n\n`;
  text += `<b>Your Active Subscriptions:</b>\n`;

  if (subs.length === 0) {
    text += `<i>No lines subscribed yet. Tap a line below to subscribe!</i>\n\n`;
  } else {
    subs.forEach(code => {
      const meta = MRT_LINES[code];
      if (meta) text += `• ${meta.name}\n`;
    });
    text += `\n`;
  }

  const keyboard = new InlineKeyboard();

  ALL_MRT_LINES.forEach(code => {
    const isSub = subs.includes(code);
    const box = isSub ? "✅" : "⬜";
    const meta = MRT_LINES[code] || { name: code };
    keyboard.text(`${box} ${meta.name}`, `sub_toggle_${code}`).row();
  });

  if (isAllSubscribed) {
    keyboard.text("❌ Unsubscribe All Lines", "sub_all_off").row();
  } else {
    keyboard.text("⭐ Subscribe to All Lines", "sub_all_on").row();
  }

  keyboard.text("🔙 Back to Main Menu", "menu_main");

  if (isEdit) {
    return await safeEditOrSend(ctx, text, keyboard, "HTML");
  } else {
    return await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
  }
}

async function checkAndBroadcastMRTCrowdAndDisruptions(botInstance: any): Promise<{ alerted: number; resolved: boolean; affected: any[] }> {
  const alertsData = await fetchTrainAlerts();
  const val = alertsData.value || {};
  const status = val.Status;
  const affected = val.AffectedSegments || [];
  const messages = val.Message || [];

  const prevState = await getMRTAlertState();
  const prevStatus = prevState?.last_status ?? 1;

  let alertCount = 0;
  let isResolved = false;

  if (status !== 1 && affected.length > 0) {
    const affectedLines = [...new Set(affected.map((a: any) => a.Line))];

    let alertMsg = `🚨 <b>ACTIVE MRT SERVICE DISRUPTION ALERT</b>\n\n`;
    affected.forEach((seg: any) => {
      alertMsg += `• <b>Line</b>: ${seg.Line} (${seg.Direction})\n`;
      alertMsg += `• <b>Affected Stretch</b>: ${seg.Stations}\n`;
      if (seg.FreePublicBus) alertMsg += `• <b>Free Public Bus</b>: ${seg.FreePublicBus}\n`;
      if (seg.FreeMRTShuttle) alertMsg += `• <b>Free MRT Shuttle</b>: ${seg.FreeMRTShuttle}\n`;
      alertMsg += `\n`;
    });

    if (messages.length > 0) {
      alertMsg += `📢 <b>Official Advisory:</b>\n`;
      messages.forEach((m: any) => {
        alertMsg += `<i>${m.Content}</i>\n`;
      });
      alertMsg += `\n`;
    }

    alertMsg += `💡 <i>Tap /disruptions for live network status.</i>`;

    const allSubscribers: { chat_id: number }[] = [];
    const seen = new Set<number>();

    for (const lineCode of affectedLines) {
      const subs = await getAllSubscribersForLine(lineCode);
      subs.forEach((s: any) => {
        if (!seen.has(s.chat_id)) {
          seen.add(s.chat_id);
          allSubscribers.push(s);
        }
      });
    }

    for (const sub of allSubscribers) {
      try {
        await botInstance.api.sendMessage(sub.chat_id, alertMsg, { parse_mode: "HTML" });
        alertCount++;
      } catch (err) {
        console.error(`Failed to send alert to chat ${sub.chat_id}:`, err);
      }
    }

    await updateMRTAlertState(status, affected, messages);

  } else if (prevStatus !== 1 && status === 1) {
    isResolved = true;
    const resolvedMsg = `✅ <b>TRAIN SERVICES RESTORED</b>\n\nAll MRT and LRT lines are now operating normally with regular train frequencies.\n\n💡 <i>Tap /mrt to check platform crowd levels.</i>`;

    const allSubs = await getAllSubscribersForLine('ALL');
    for (const sub of allSubs) {
      try {
        await botInstance.api.sendMessage(sub.chat_id, resolvedMsg, { parse_mode: "HTML" });
        alertCount++;
      } catch (err) {
        console.error(`Failed to send resolution alert to chat ${sub.chat_id}:`, err);
      }
    }

    await updateMRTAlertState(1, [], []);
  }

  return { alerted: alertCount, resolved: isResolved, affected };
}


bot.command(["goto", "plan", "routefinder"], async (ctx) => {
  const match = (ctx.match || "").trim();
  if (!match) {
    const kb = new InlineKeyboard()
      .text("Clementi ➡️ Orchard", "goto_p_Clementi__Orchard").row()
      .text("Tampines ➡️ Bugis", "goto_p_Tampines__Bugis").row()
      .text("Jurong East ➡️ VivoCity", "goto_p_Jurong%20East__VivoCity").row()
      .text("Bedok ➡️ Suntec", "goto_p_Bedok__Suntec").row()
      .text("🔙 Back to Main Menu", "menu_main");

    return ctx.reply(
      "🗺️ <b>Bus Journey Planner & Route Finder</b>\n\n" +
      "Find direct and 1-transfer bus routes between any two places in Singapore!\n\n" +
      "<b>Usage:</b>\n" +
      "• <code>/goto &lt;Origin&gt; to &lt;Destination&gt;</code>\n" +
      "• <code>/goto Clementi to Orchard</code>\n" +
      "• <code>/goto 17009 to 09048</code>\n" +
      "• <code>/goto Bedok to Tampines</code>\n\n" +
      "Or pick a popular route preset below:",
      { reply_markup: kb, parse_mode: "HTML" }
    );
  }

  let origin = "";
  let dest = "";

  if (match.toLowerCase().includes(" to ")) {
    const parts = match.split(/\s+to\s+/i);
    origin = parts[0]?.trim();
    dest = parts[1]?.trim();
  } else if (match.includes("-")) {
    const parts = match.split("-");
    origin = parts[0]?.trim();
    dest = parts[1]?.trim();
  } else {
    const parts = match.split(/\s+/);
    if (parts.length >= 2) {
      origin = parts[0]?.trim();
      dest = parts.slice(1).join(" ")?.trim();
    }
  }

  if (!origin || !dest) {
    return ctx.reply(
      "❌ Please specify both origin and destination!\n\nExample: <code>/goto Clementi to Orchard</code> or <code>/goto 17009 to 09048</code>",
      { parse_mode: "HTML" }
    );
  }

  let msgId: number | null = null;
  try {
    const msg = await ctx.reply(`🔍 Calculating best bus routes from "<b>${origin}</b>" to "<b>${dest}</b>"...`, { parse_mode: "HTML" });
    msgId = msg?.message_id || null;
  } catch (_) {}
  await planBusJourney(ctx, msgId, origin, dest, false);
});

bot.command(["mrtalerts", "subscribe", "sub"], async (ctx) => {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  if (!userId || !chatId) return;

  await renderMRTAlertsMenu(ctx, userId, chatId, false);
});

bot.command("testmrtalert", async (ctx) => {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  if (!userId || !chatId) return;

  const testMsg = "🚨 <b>TEST MRT DISRUPTION ALERT</b>\n\n• <b>Line</b>: NSL (Both Directions)\n• <b>Affected Stretch</b>: NS1 Jurong East to NS9 Woodlands\n• <b>Free Public Bus</b>: Activated at all designated bus stops\n• <b>Free MRT Shuttle</b>: Operating between Jurong East & Woodlands\n\n💡 <i>This is a simulated test alert for your subscribed lines!</i>";
  await ctx.reply(testMsg, { parse_mode: "HTML" });
});

bot.command(["start", "menu"], async (ctx) => {
  const name = ctx.from?.first_name ?? "there";
  await ctx.reply(
    `Hi ${name}! 👋 Welcome to <b>SG Transport Kaki 🇸🇬</b> — Your All-in-One Singapore Transport Companion!\n\n` +
    `Select a category below to get started, or type commands directly:\n\n` +
    `💡 <b>Tip</b>: Tap the 📎 Attachment icon and send your <b>Location</b> for an instant 4-in-1 scan (Bus, Carparks, Taxis, Bikes)!`,
    { reply_markup: getMainMenuKeyboard(), parse_mode: "HTML" }
  );
});

bot.command(["favorites", "fav"], async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const favs = await getFavorites(userId);
  
  if (!favs || favs.length === 0) {
    return ctx.reply(
      "⭐ <b>Your Favorites</b>\n\nYou have no favorites saved yet. Use the ⭐ button on bus stops or traffic cameras to save them for 1-tap checks!",
      { reply_markup: new InlineKeyboard().text("🔙 Back to Menu", "menu_main"), parse_mode: "HTML" }
    );
  }

  let message = "⭐ <b>Your Favorites</b>\n\nTap any saved bus stop or camera below for live updates:\n";
  const keyboard = new InlineKeyboard();
  for (const fav of favs) {
    if (fav.type === 'bus') {
      keyboard.text(`🚌 ${fav.label || fav.value}`, `get_bus_${fav.value}`).row();
    } else if (fav.type === 'cam') {
      const camMeta = getCameraMeta(fav.value);
      keyboard.text(`📷 ${camMeta.name}`, `traffic_cam_${fav.value}`).row();
    }
  }
  keyboard.text("🔙 Back to Menu", "menu_main");

  await ctx.reply(message, { parse_mode: "HTML", reply_markup: keyboard });
});

bot.command(["route", "busroute"], async (ctx) => {
  const busNo = ctx.match?.trim();
  if (!busNo) {
    return ctx.reply(
      "🗺️ <b>Bus Route Explorer & First/Last Bus Schedule</b>\n\n" +
      "Please enter a bus number to view its full itinerary and operating schedule:\n\n" +
      "• <code>/route 106</code>\n" +
      "• <code>/route 190</code>\n" +
      "• <code>/route 65</code>\n" +
      "• <code>/route 502</code>\n\n" +
      "💡 Shows all stop sequences, first & last bus departure times, and frequencies!",
      { parse_mode: "HTML" }
    );
  }

  const msg = await ctx.reply(`🔍 Loading route itinerary for Bus <b><u>${busNo}</u></b>...`, { parse_mode: "HTML" });
  await showBusRoute(ctx, msg.message_id, busNo, 1, 1, false);
});

bot.command(["disruptions", "disruption", "trainstatus"], async (ctx) => {
  const msg = await ctx.reply("🔍 Checking live MRT/LRT network status & disruptions...", { parse_mode: "HTML" });
  await showTrainAlerts(ctx, msg.message_id, false);
});

bot.command(["taxi", "taxistands"], async (ctx) => {
  const query = ctx.match?.trim();
  if (!query) {
    return ctx.reply(
      "🚕 <b>Vacant Taxi Locator & Official Taxi Stands</b>\n\n" +
      "Select a popular zone below or search by landmark:\n" +
      "<code>/taxi &lt;place&gt;</code> (e.g. <code>/taxi Orchard</code>, <code>/taxi VivoCity</code>, <code>/taxi Changi</code>, <code>/taxi Bugis</code>)\n\n" +
      "💡 <b>Tip</b>: Send your <b>Location</b> via 📎 attachment to scan for vacant taxis around you right now!",
      { reply_markup: getTaxisMenuKeyboard(), parse_mode: "HTML" }
    );
  }

  const msg = await ctx.reply(`🔍 Scanning for vacant taxis and stands near "<b>${query}</b>"...`, { parse_mode: "HTML" });
  await showTaxiLocator(ctx, msg.message_id, query, false);
});

bot.command(["bike", "bicycle"], async (ctx) => {
  const query = ctx.match?.trim();
  if (!query) {
    return ctx.reply(
      "🚲 <b>MRT Bicycle Parking & Sheltered Racks</b>\n\n" +
      "Select a popular MRT hub below or search by station:\n" +
      "<code>/bike &lt;station_name&gt;</code> (e.g. <code>/bike Tampines</code>, <code>/bike Jurong East</code>, <code>/bike Bishan</code>, <code>/bike Orchard</code>)\n\n" +
      "💡 Shows rack capacity, station exit locations, and shelter status (☂️ Sheltered vs ☀️ Open Air)!",
      { reply_markup: getBikesMenuKeyboard(), parse_mode: "HTML" }
    );
  }

  const msg = await ctx.reply(`🔍 Finding bicycle parking racks at "<b>${query}</b>"...`, { parse_mode: "HTML" });
  await showBicycleParking(ctx, msg.message_id, query, false);
});

bot.command("bus", async (ctx) => {
  const query = ctx.match?.trim();
  if (!query) {
    return ctx.reply(
      "🚌 <b>Bus Arrival Timings & Stop Search</b>\n\n" +
      "You can search by <b>5-Digit Code</b>, <b>Landmark</b>, or <b>Road Name</b>:\n\n" +
      "• <b>By Code</b>: <code>/bus 09048</code>, <code>/bus 08057</code>\n" +
      "• <b>By Landmark</b>: <code>/bus Lucky Plaza</code>, <code>/bus VivoCity</code>, <code>/bus ION</code>\n" +
      "• <b>By Road</b>: <code>/bus Orchard Rd</code>, <code>/bus Bedok North</code>\n\n" +
      "💡 <b>Tip</b>: Tap 📎 <b>Location</b> to find the 5 closest bus stops to you automatically!",
      { parse_mode: "HTML" }
    );
  }

  if (/^\d{5}$/.test(query)) {
    return await renderBusArrivals(ctx, null, query, false);
  }

  const msg = await ctx.reply(`🔍 Searching for bus stops matching "<b>${query}</b>"...`, { parse_mode: "HTML" });

  try {
    const { data: matches } = await supabase
      .from('lta_bus_stops')
      .select('bus_stop_code, description, road_name')
      .or(`description.ilike.%${query}%,road_name.ilike.%${query}%`)
      .limit(8);

    if (!matches || matches.length === 0) {
      return ctx.api.editMessageText(
        ctx.chat.id,
        msg.message_id,
        `❌ No bus stops found matching "<b>${query}</b>".\n\nTry searching for landmarks like <code>Lucky Plaza</code>, <code>VivoCity</code>, <code>ION</code>, <code>Tampines</code>, or <code>Orchard Rd</code>!`,
        { parse_mode: "HTML", reply_markup: new InlineKeyboard().text("🔙 Back to Menu", "menu_main") }
      );
    }

    if (matches.length === 1) {
      await ctx.api.deleteMessage(ctx.chat.id, msg.message_id).catch(() => {});
      return await renderBusArrivals(ctx, null, matches[0].bus_stop_code, false);
    }

    let text = `🚏 <b>Bus Stops matching "${query}"</b> (${matches.length} found)\n\nTap a bus stop below to check live arrival timings:\n`;
    const keyboard = new InlineKeyboard();

    matches.forEach((stop: any) => {
      const isMrt = (stop.description || '').toLowerCase().includes('stn');
      const icon = isMrt ? '🚆' : '🚏';
      const label = `${icon} ${stop.description} (${stop.road_name})`;
      keyboard.text(label.substring(0, 36), `get_bus_${stop.bus_stop_code}`).row();
    });

    keyboard.text("🔙 Back to Menu", "menu_main");

    await ctx.api.editMessageText(ctx.chat.id, msg.message_id, text, {
      parse_mode: "HTML",
      reply_markup: keyboard
    });
  } catch (e: any) {
    await ctx.api.editMessageText(
      ctx.chat.id,
      msg.message_id,
      `Error searching bus stops.`,
      { reply_markup: new InlineKeyboard().text("🔙 Back to Menu", "menu_main") }
    );
  }
});

bot.command("mrt", async (ctx) => {
  const line = ctx.match?.trim();
  if (!line) {
    return ctx.reply(
      "🚆 <b>MRT Platform Crowd Density</b>\n\n" +
      "Select an MRT line below to check live station platform crowd levels:",
      { reply_markup: getMRTMenuKeyboard(), parse_mode: "HTML" }
    );
  }

  const msg = await ctx.reply("🔍 Checking real-time MRT platform crowd levels...");
  await showMRTCrowd(ctx, msg.message_id, line, false, 1);
});

bot.command("traffic", async (ctx) => {
  await ctx.reply(
    "📷 <b>Expressway Traffic Cameras</b>\n\n" +
    "Select an expressway corridor below to view live camera snapshots:",
    { reply_markup: getTrafficMenuKeyboard(), parse_mode: "HTML" }
  );
});

async function showIncidents(ctx: any, messageId: number | null, filterType: string, keyword: string | null, isEdit: boolean, page: number = 1) {
  try {
    const data = await fetchTrafficIncidents();
    const items = data.value || [];

    if (items.length === 0) {
      const text = "✅ <b>Roads Clear!</b>\n\nNo major traffic accidents, roadworks, or vehicle breakdowns reported by LTA right now.";
      const kb = new InlineKeyboard().text("🔄 Refresh", `inc_type_${filterType}`).row().text("🔙 Back to Menu", "menu_main");
      if (isEdit) {
        return safeEditOrSend(ctx, text, kb, "HTML");
      } else {
        return ctx.reply(text, { parse_mode: "HTML", reply_markup: kb });
      }
    }

    let filtered = items;

    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter((i: any) => (i.Message || "").toLowerCase().includes(kw) || (i.Type || "").toLowerCase().includes(kw));
    } else if (filterType === "critical") {
      filtered = filtered.filter((i: any) => {
        const t = (i.Type || "").toLowerCase();
        return t.includes("accident") || t.includes("breakdown") || t.includes("closure");
      });
    } else if (filterType === "traffic") {
      filtered = filtered.filter((i: any) => (i.Type || "").toLowerCase().includes("traffic"));
    } else if (filterType === "roadworks") {
      filtered = filtered.filter((i: any) => {
        const t = (i.Type || "").toLowerCase();
        return t.includes("roadwork") || t.includes("obstacle") || t.includes("block");
      });
    }

    const PAGE_SIZE = 5;
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const displayList = filtered.slice(startIndex, startIndex + PAGE_SIZE);

    let header = "🚨 <b>Live Traffic Incidents & Alerts</b>";
    if (keyword) {
      header = `🚨 <b>Traffic Alerts matching "${keyword}"</b> (${filtered.length} found)`;
    } else if (filterType === "critical") {
      header = `💥 <b>Accidents & Breakdowns</b> (${filtered.length} active)`;
    } else if (filterType === "traffic") {
      header = `🚗 <b>Heavy Traffic & Congestion</b> (${filtered.length} active)`;
    } else if (filterType === "roadworks") {
      header = `🚧 <b>Roadworks & Obstacles</b> (${filtered.length} active)`;
    } else {
      header = `📋 <b>All Live Traffic Alerts</b> (${filtered.length} active)`;
    }

    if (filtered.length === 0) {
      let noMsg = `✅ No active alerts in this category right now.`;
      if (keyword) {
        noMsg = `✅ No active traffic alerts found matching "<b>${keyword}</b>".\n\nTry searching for expressways like <code>PIE</code>, <code>AYE</code>, <code>CTE</code>, or <code>SLE</code>!`;
      }
      const kb = new InlineKeyboard().text("🔙 Back to Incidents Menu", "menu_incidents");
      if (isEdit) {
        return safeEditOrSend(ctx, noMsg, kb, "HTML");
      } else {
        return ctx.reply(noMsg, { parse_mode: "HTML", reply_markup: kb });
      }
    }

    let text = `${header}\n`;
    if (totalPages > 1) {
      text += `📄 <i>Page ${currentPage} of ${totalPages}</i>\n`;
    }
    text += `\n`;

    displayList.forEach((inc: any) => {
      const icon = getIncidentIcon(inc.Type);
      const rawMsg = inc.Message || `${inc.Type} reported`;
      text += `${icon} ${rawMsg}\n\n`;
    });

    const keyboard = new InlineKeyboard();
    const kwParam = keyword || "none";

    if (totalPages > 1) {
      if (currentPage > 1) {
        keyboard.text("◀️ Prev", `inc_p_${filterType}__${kwParam}__${currentPage - 1}`);
      }
      keyboard.text(`📄 ${currentPage}/${totalPages}`, `inc_p_${filterType}__${kwParam}__${currentPage}`);
      if (currentPage < totalPages) {
        keyboard.text("Next ▶️", `inc_p_${filterType}__${kwParam}__${currentPage + 1}`);
      }
      keyboard.row();
    }

    keyboard.webApp("🗺️ View on Interactive Map", "https://jasontan89.github.io/NewsTelegrambot/incidents-map.html").row();
    keyboard.text("🔄 Refresh", `inc_p_${filterType}__${kwParam}__${currentPage}`).row();
    keyboard.text("🔙 Back to Incidents Menu", "menu_incidents");

    if (isEdit) {
      await safeEditOrSend(ctx, text, keyboard, "HTML");
    } else {
      await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
    }
  } catch (e: any) {
    const errText = "Error fetching traffic incidents.";
    const kb = new InlineKeyboard().text("🔙 Back to Menu", "menu_main");
    if (isEdit) {
      await safeEditOrSend(ctx, errText, kb, "HTML");
    } else {
      await ctx.reply(errText, { reply_markup: kb });
    }
  }
}

bot.command(["incidents", "alerts"], async (ctx) => {
  const query = ctx.match?.trim();
  if (!query) {
    return ctx.reply(
      "🚨 <b>Live Traffic Incidents & Alerts</b>\n\n" +
      "Select a category below or search by expressway:\n" +
      "<code>/incidents &lt;expressway&gt;</code> (e.g. <code>/incidents PIE</code>, <code>/incidents AYE</code>, <code>/incidents CTE</code>)\n\n" +
      "💡 Live data sourced from LTA DataMall Traffic Incidents feed.",
      { reply_markup: getIncidentsMenuKeyboard(), parse_mode: "HTML" }
    );
  }

  const msg = await ctx.reply("🔍 Fetching live traffic alerts...");
  await showIncidents(ctx, msg.message_id, "all", query, false, 1);
});

async function showCarparkSearchResults(ctx: any, messageId: number | null, query: string, isEdit: boolean, page: number = 1) {
  try {
    const data = await fetchCarparkAvailability();
    if (!data.value || data.value.length === 0) {
      const text = "No carpark data available at the moment.";
      const kb = new InlineKeyboard().text("🔙 Back to Carparks", "menu_carparks");
      if (isEdit) {
        return safeEditOrSend(ctx, text, kb, "HTML");
      } else {
        return ctx.reply(text, { reply_markup: kb });
      }
    }

    const q = query.toLowerCase();
    let results = data.value;

    if (q !== "all") {
      results = data.value.filter((item: any) => {
        const dev = (item.Development || "").toLowerCase();
        const area = (item.Area || "").toLowerCase();
        return dev.includes(q) || area.includes(q);
      });
    }

    if (results.length === 0) {
      const text = `❌ No carparks found matching "<b>${query}</b>".\n\nTry searching for popular malls like <code>Suntec</code>, <code>ION</code>, <code>VivoCity</code>, <code>JEM</code>, or <code>Tampines</code>!`;
      const kb = new InlineKeyboard().text("🔙 Back to Carparks", "menu_carparks");
      if (isEdit) {
        return safeEditOrSend(ctx, text, kb, "HTML");
      } else {
        return ctx.reply(text, { parse_mode: "HTML", reply_markup: kb });
      }
    }

    const PAGE_SIZE = 5;
    const totalPages = Math.ceil(results.length / PAGE_SIZE) || 1;
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const pageResults = results.slice(startIndex, startIndex + PAGE_SIZE);

    const titleStr = q === "all" ? "All Singapore Carparks" : `Carparks matching "${query}"`;
    let text = `🚗 <b>${titleStr}</b> (${results.length} found)\n`;
    if (totalPages > 1) {
      text += `📄 <i>Page ${currentPage} of ${totalPages}</i>\n`;
    }
    text += `\n`;

    const keyboard = new InlineKeyboard();

    pageResults.forEach((cp: any) => {
      const lots = cp.AvailableLots ?? 0;
      const status = getCarparkStatus(lots);
      const devName = cp.Development || `Carpark ${cp.CarParkID}`;
      const lotType = cp.LotType === 'C' ? '🚗' : cp.LotType === 'H' ? '🚛' : '🏍️';
      text += `${status.icon} ${lotType} <b>${devName}</b>: <code>${lots}</code> lots (${status.label})\n`;

      if (cp.Location && cp.Location.trim()) {
        const [latStr, lonStr] = cp.Location.trim().split(/\s+/);
        if (latStr && lonStr && !isNaN(parseFloat(latStr)) && !isNaN(parseFloat(lonStr))) {
          const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latStr},${lonStr}`;
          keyboard.url(`🗺️ Drive to ${devName.substring(0, 18)}`, mapsUrl).row();
        }
      }
    });

    text += `\n💡 <i>Legend</i>: 🟢 &gt;50 lots (Plenty)  🟡 10–50 lots (Moderate)  🔴 &lt;10 lots (Limited/Full)`;

    if (totalPages > 1) {
      if (currentPage > 1) {
        keyboard.text("◀️ Prev", `cp_p_${query}__${currentPage - 1}`);
      }
      keyboard.text(`📄 ${currentPage}/${totalPages}`, `cp_p_${query}__${currentPage}`);
      if (currentPage < totalPages) {
        keyboard.text("Next ▶️", `cp_p_${query}__${currentPage + 1}`);
      }
      keyboard.row();
    }

    keyboard.text("🔄 Refresh", `cp_p_${query}__${currentPage}`).row();
    keyboard.text("🔙 Back to Carparks", "menu_carparks");

    if (isEdit) {
      await safeEditOrSend(ctx, text, keyboard, "HTML");
    } else {
      await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
    }
  } catch (e: any) {
    const errText = "Error fetching carpark availability.";
    const kb = new InlineKeyboard().text("🔙 Back to Carparks", "menu_carparks");
    if (isEdit) {
      await safeEditOrSend(ctx, errText, kb, "HTML");
    } else {
      await ctx.reply(errText, { reply_markup: kb });
    }
  }
}

bot.command("carpark", async (ctx) => {
  const query = ctx.match?.trim();
  if (!query) {
    return ctx.reply(
      "🚗 <b>Carpark Availability</b>\n\n" +
      "Select a region or popular mall below, or search by typing:\n" +
      "<code>/carpark &lt;name&gt;</code> (e.g. <code>/carpark Suntec</code>, <code>/carpark ION</code>, <code>/carpark Tampines</code>)\n\n" +
      "💡 <b>Tip</b>: Send your <b>Location</b> via 📎 attachment to see nearby carparks + Google Maps navigation links!",
      { reply_markup: getCarparksMenuKeyboard(), parse_mode: "HTML" }
    );
  }

  const msg = await ctx.reply("🔍 Checking live carpark lots...");
  await showCarparkSearchResults(ctx, msg.message_id, query, false, 1);
});

bot.command(["ev", "evchargers", "charging", "chargers"], async (ctx) => {
  const query = ctx.match?.trim() || "";
  if (!query) {
    return ctx.reply(
      "⚡ <b>Singapore EV Charging Stations & Availability</b>\n\n" +
      "Select a popular charging hub below or search by postal code / landmark:\n\n" +
      "<b>Usage:</b>\n" +
      "• <code>/ev 529510</code> (Search by 6-digit postal code)\n" +
      "• <code>/ev Orchard</code> (Search by shopping mall or area)\n" +
      "• <code>/ev Suntec</code>\n" +
      "• <code>/ev VivoCity</code>\n\n" +
      "💡 <i>Shows live plug status (Available/In-Use), charging power (DC Fast/AC), operators & rates!</i>",
      { reply_markup: getEVMenuKeyboard(), parse_mode: "HTML" }
    );
  }

  const msg = await ctx.reply(`🔍 Fetching live EV charger availability for <b>${query}</b>...`, { parse_mode: "HTML" });
  await showEVChargingStations(ctx, msg.message_id, query, false, false);
});

bot.command(["erp", "erprates", "gantry", "gantries"], async (ctx) => {
  const query = ctx.match?.trim() || "";
  if (!query) {
    return ctx.reply(
      "💳 <b>Singapore Electronic Road Pricing (ERP) Rates</b>\n\n" +
      "Select an expressway corridor or cordon below, or search by name:\n\n" +
      "<b>Usage:</b>\n" +
      "• <code>/erp CTE</code> (Central Expressway gantries)\n" +
      "• <code>/erp PIE</code> (Pan-Island Expressway)\n" +
      "• <code>/erp AYE</code> (Ayer Rajah Expressway)\n" +
      "• <code>/erp Orchard</code> (Orchard Cordon)\n" +
      "• <code>/erp CBD</code> (CBD Restricted Zone)\n\n" +
      "💡 <i>Real-time active charges, upcoming slot changes & vehicle multipliers (Cars, Motorcycles, Heavy Vehicles)!</i>",
      { reply_markup: getERPMenuKeyboard(), parse_mode: "HTML" }
    ).catch(() => null);
  }

  await showERPRates(ctx, query, "car", 1);
});

bot.command("help", async (ctx) => {
  await ctx.reply(getHelpText(), { parse_mode: "HTML", reply_markup: getHelpKeyboard() });
});

// ==========================================
// 🇸🇬🇲🇾 Causeway & Tuas Checkpoint Radar Helpers & Commands
// ==========================================

async function showCheckpointHub(ctx: any, isEdit: boolean = false) {
  const sgtStr = new Date().toLocaleTimeString("en-SG", {
    timeZone: "Asia/Singapore",
    hour: "2-digit",
    minute: "2-digit"
  });

  let incidentNotes = "";
  try {
    const incData = await fetchTrafficIncidents();
    const incs = incData?.value || [];
    const bkeIncs = incs.filter((i: any) => {
      const msg = (i.Message || "").toLowerCase();
      return msg.includes("bke") || msg.includes("woodlands") || msg.includes("causeway") || msg.includes("sle");
    });
    const ayeIncs = incs.filter((i: any) => {
      const msg = (i.Message || "").toLowerCase();
      return msg.includes("aye") || msg.includes("tuas") || msg.includes("second link");
    });

    if (bkeIncs.length > 0) {
      incidentNotes += `\n⚠️ <b>BKE/Woodlands Incident:</b> ${bkeIncs[0].Message}\n`;
    }
    if (ayeIncs.length > 0) {
      incidentNotes += `\n⚠️ <b>AYE/Tuas Incident:</b> ${ayeIncs[0].Message}\n`;
    }
  } catch (e) {
    console.error("Error fetching checkpoint incidents", e);
  }

  const text =
    `🇸🇬🇲🇾 <b>Singapore – Malaysia Checkpoint Radar</b>\n` +
    `🕒 <b>Current Time:</b> <code>${sgtStr} SGT</code>\n\n` +
    `Real-time traffic camera monitoring & highway approach radar for Causeway and Second Link crossings:\n\n` +
    `🌉 <b>Woodlands Causeway Hub (BKE)</b>\n` +
    `• Woodlands Checkpoint (Inbound & Outbound)\n` +
    `• Causeway Viaduct towards Johor Bahru\n` +
    `• BKE approach before Woodlands Flyover\n\n` +
    `🚗 <b>Tuas Second Link Hub (AYE)</b>\n` +
    `• AYE near Tuas Checkpoint\n` +
    `• Tuas West Road\n` +
    `• AYE approach before Pandan Loop\n` +
    (incidentNotes ? `${incidentNotes}\n` : `\n✅ <i>No major accidents or breakdowns reported on checkpoint expressway approaches.</i>\n\n`) +
    `Select a border crossing below to inspect live camera feeds:`;

  const keyboard = new InlineKeyboard()
    .text("🌉 Woodlands Causeway (3 Cams)", "checkpoint_woodlands").row()
    .text("🚗 Tuas Second Link (3 Cams)", "checkpoint_tuas").row()
    .text("🔄 Refresh Status", "checkpoint_refresh")
    .text("🔙 Back to Menu", "menu_main");

  if (isEdit) {
    return await safeEditOrSend(ctx, text, keyboard, "HTML");
  } else {
    return await ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
  }
}

async function showWoodlandsCheckpoint(ctx: any) {
  try {
    await ctx.answerCallbackQuery?.({ text: "Fetching Woodlands Causeway cameras..." }).catch(() => {});
  } catch (_) {}

  try {
    const data = await fetchTrafficImages();
    const cams = data?.value || [];
    const cam2701 = cams.find((c: any) => String(c.CameraID) === "2701");
    const cam2702 = cams.find((c: any) => String(c.CameraID) === "2702");
    const cam2704 = cams.find((c: any) => String(c.CameraID) === "2704");

    const activeCams = [cam2701, cam2702, cam2704].filter(Boolean);
    if (activeCams.length === 0) {
      return await ctx.reply("❌ Unable to load Woodlands Checkpoint cameras at this time. Please try again shortly.");
    }

    const sgtTime = new Date().toLocaleTimeString("en-SG", { timeZone: "Asia/Singapore", hour: "2-digit", minute: "2-digit" });

    const media: any[] = [
      {
        type: "photo",
        media: cam2701?.ImageLink || activeCams[0].ImageLink,
        caption: `🌉 <b>Woodlands Causeway Live Radar</b> (3 Views)\n\n` +
                 `1️⃣ <b>Woodlands Checkpoint</b> (Cam 2701)\n` +
                 `2️⃣ <b>Causeway Viaduct towards JB</b> (Cam 2702)\n` +
                 `3️⃣ <b>BKE approach Bef Flyover</b> (Cam 2704)\n\n` +
                 `🕒 <b>Captured:</b> <code>${sgtTime} SGT</code>`,
        parse_mode: "HTML"
      }
    ];

    if (cam2702?.ImageLink) {
      media.push({ type: "photo", media: cam2702.ImageLink });
    }
    if (cam2704?.ImageLink) {
      media.push({ type: "photo", media: cam2704.ImageLink });
    }

    const kb = new InlineKeyboard()
      .text("🔄 Refresh Woodlands Cams", "checkpoint_woodlands").row()
      .text("🚗 Switch to Tuas Second Link", "checkpoint_tuas").row()
      .url("🗺️ View Causeway on Google Maps", "https://www.google.com/maps/search/?api=1&query=1.4470,103.7716").row()
      .text("🔙 Back to Checkpoint Hub", "checkpoint_hub");

    await ctx.replyWithMediaGroup(media).catch(async () => {
      await ctx.replyWithPhoto(cam2701?.ImageLink || activeCams[0].ImageLink, {
        caption: `🌉 <b>Woodlands Causeway Live Snapshot</b>\n🕒 <code>${sgtTime} SGT</code>`,
        parse_mode: "HTML"
      });
    });

    await ctx.reply("👆 <b>Live Woodlands Causeway snapshots displayed above.</b>", {
      parse_mode: "HTML",
      reply_markup: kb
    });
  } catch (e: any) {
    console.error("Error loading Woodlands cameras:", e);
    await ctx.reply("⚠️ Failed to load camera snapshots. Please try again.");
  }
}

async function showTuasCheckpoint(ctx: any) {
  try {
    await ctx.answerCallbackQuery?.({ text: "Fetching Tuas Second Link cameras..." }).catch(() => {});
  } catch (_) {}

  try {
    const data = await fetchTrafficImages();
    const cams = data?.value || [];
    const cam4712 = cams.find((c: any) => String(c.CameraID) === "4712");
    const cam4713 = cams.find((c: any) => String(c.CameraID) === "4713");
    const cam4703 = cams.find((c: any) => String(c.CameraID) === "4703");

    const activeCams = [cam4712, cam4713, cam4703].filter(Boolean);
    if (activeCams.length === 0) {
      return await ctx.reply("❌ Unable to load Tuas Checkpoint cameras at this time. Please try again shortly.");
    }

    const sgtTime = new Date().toLocaleTimeString("en-SG", { timeZone: "Asia/Singapore", hour: "2-digit", minute: "2-digit" });

    const media: any[] = [
      {
        type: "photo",
        media: cam4712?.ImageLink || activeCams[0].ImageLink,
        caption: `🚗 <b>Tuas Second Link Live Radar</b> (3 Views)\n\n` +
                 `1️⃣ <b>AYE Near Tuas Checkpoint</b> (Cam 4712)\n` +
                 `2️⃣ <b>Tuas West Road</b> (Cam 4713)\n` +
                 `3️⃣ <b>AYE Approach Bef Pandan Loop</b> (Cam 4703)\n\n` +
                 `🕒 <b>Captured:</b> <code>${sgtTime} SGT</code>`,
        parse_mode: "HTML"
      }
    ];

    if (cam4713?.ImageLink) {
      media.push({ type: "photo", media: cam4713.ImageLink });
    }
    if (cam4703?.ImageLink) {
      media.push({ type: "photo", media: cam4703.ImageLink });
    }

    const kb = new InlineKeyboard()
      .text("🔄 Refresh Tuas Cams", "checkpoint_tuas").row()
      .text("🌉 Switch to Woodlands Causeway", "checkpoint_woodlands").row()
      .url("🗺️ View Tuas on Google Maps", "https://www.google.com/maps/search/?api=1&query=1.3412,103.6439").row()
      .text("🔙 Back to Checkpoint Hub", "checkpoint_hub");

    await ctx.replyWithMediaGroup(media).catch(async () => {
      await ctx.replyWithPhoto(cam4712?.ImageLink || activeCams[0].ImageLink, {
        caption: `🚗 <b>Tuas Second Link Live Snapshot</b>\n🕒 <code>${sgtTime} SGT</code>`,
        parse_mode: "HTML"
      });
    });

    await ctx.reply("👆 <b>Live Tuas Second Link snapshots displayed above.</b>", {
      parse_mode: "HTML",
      reply_markup: kb
    });
  } catch (e: any) {
    console.error("Error loading Tuas cameras:", e);
    await ctx.reply("⚠️ Failed to load camera snapshots. Please try again.");
  }
}

bot.command(["checkpoint", "causeway", "customs", "woodlands", "tuas"], async (ctx) => {
  await showCheckpointHub(ctx, false);
});

// ==========================================
// 🔔 Bus Alighting Alarm Helpers & Commands
// ==========================================

async function showAlightPrompt(ctx: any, query: string = "") {
  const cleanQ = (query || "").trim();
  const userId = ctx.from?.id;

  if (userId) {
    const existing = await getActiveAlightingAlarm(userId);
    if (existing && !cleanQ) {
      const kb = new InlineKeyboard()
        .text("⏹️ Cancel Active Alarm", "alight_cancel").row()
        .text("📊 Check Alarm Status", "alight_status").row()
        .text("🔙 Back to Transport Menu", "cat_transport");

      return await ctx.reply(
        `🔔 <b>Active Alighting Alarm Running!</b>\n\n` +
        `🎯 <b>Destination:</b> <b>${existing.dest_name}</b> (Stop <code>${existing.dest_bus_stop_code}</code>)\n` +
        `🔔 <b>Trigger Distance:</b> <b>${existing.threshold_meters}m</b>\n` +
        (existing.last_distance ? `📏 <b>Last Measured Distance:</b> ~<b>${Math.round(existing.last_distance)}m</b>\n` : "") +
        `\n📡 <i>Ensure you have shared your Live Location in Telegram so the bot can track your bus trip!</i>`,
        { parse_mode: "HTML", reply_markup: kb }
      );
    }
  }

  if (/^\d{5}$/.test(cleanQ)) {
    const stop = await getBusStopByCode(cleanQ);
    if (stop) {
      return await promptAlightThreshold(ctx, stop);
    } else {
      return await ctx.reply(`❌ Bus stop <code>${cleanQ}</code> not found. Please verify the 5-digit code.`);
    }
  }

  if (cleanQ.length >= 2) {
    const matches = await searchBusStops(cleanQ, 5);
    if (matches.length === 0) {
      return await ctx.reply(`❌ No bus stops found matching "<b>${cleanQ}</b>".\n\nTry entering a 5-digit stop code (e.g. <code>/alight 09048</code>) or another road/landmark!`, { parse_mode: "HTML" });
    }

    const kb = new InlineKeyboard();
    matches.forEach((s: any) => {
      kb.text(`[${s.bus_stop_code}] ${s.description.substring(0, 24)}`, `alight_pick_${s.bus_stop_code}`).row();
    });
    kb.text("🔙 Back to Transport Menu", "cat_transport");

    return await ctx.reply(
      `🎯 <b>Select Destination Bus Stop for Alighting Alarm:</b>\n\n` +
      `Matching bus stops for "<b>${cleanQ}</b>":`,
      { parse_mode: "HTML", reply_markup: kb }
    );
  }

  const kb = new InlineKeyboard()
    .text("⭐ Pick from Favorites", "alight_from_favs").row()
    .text("📍 Use Nearby Stops", "alight_from_nearby").row()
    .text("🔙 Back to Transport Menu", "cat_transport");

  return await ctx.reply(
    `🔔 <b>Bus Alighting Alarm & Live Trip Tracker</b>\n\n` +
    `Never miss your bus stop again when resting, reading, or on your phone!\n\n` +
    `<b>How to set an alarm:</b>\n` +
    `• Type <code>/alight &lt;bus stop code&gt;</code> (e.g. <code>/alight 09048</code>)\n` +
    `• Or type <code>/alight &lt;road or landmark&gt;</code> (e.g. <code>/alight orchard</code>)\n` +
    `• Or pick from your saved favorites / nearby stops below:\n\n` +
    `💡 <i>Once set, share your Telegram Live Location. The bot silently monitors your trip and triggers a loud wake-up buzzer alarm when you approach!</i>`,
    { parse_mode: "HTML", reply_markup: kb }
  );
}

async function promptAlightThreshold(ctx: any, stop: any) {
  const code = stop.bus_stop_code;
  const desc = stop.description;
  const road = stop.road_name;

  const kb = new InlineKeyboard()
    .text("🔔 500m (~2 stops - Recommended)", `alight_set_${code}_500`).row()
    .text("🔔 300m (~1 stop away)", `alight_set_${code}_300`).row()
    .text("🔔 800m (~3-4 stops early warning)", `alight_set_${code}_800`).row()
    .text("❌ Cancel", "menu_main");

  const text =
    `🎯 <b>Confirm Destination Bus Stop:</b>\n\n` +
    `🚏 <b>Stop:</b> [<code>${code}</code>] <b>${desc}</b>\n` +
    `🛣️ <b>Road:</b> ${road}\n\n` +
    `<b>Select Alarm Trigger Distance:</b>\n` +
    `How early before reaching your stop would you like the alarm to ring?`;

  return await safeEditOrSend(ctx, text, kb, "HTML");
}

bot.command(["alight", "wake", "stopalarm"], async (ctx) => {
  const query = ctx.match?.trim() || "";
  await showAlightPrompt(ctx, query);
});

bot.command(["cancelalight", "stopalight"], async (ctx) => {
  const userId = ctx.from?.id;
  if (userId) {
    await cancelAlightingAlarm(userId);
  }
  await ctx.reply("⏹️ <b>Alighting Alarm Cancelled.</b>\nSafe travels! You can set another alarm anytime with <code>/alight</code>.", { parse_mode: "HTML" });
});

bot.command(["alightstatus", "alarmstatus"], async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  const active = await getActiveAlightingAlarm(userId);
  if (!active) {
    return ctx.reply("ℹ️ You have no active alighting alarm running right now.\n\nUse <code>/alight &lt;bus stop code&gt;</code> to set one!", { parse_mode: "HTML" });
  }

  const kb = new InlineKeyboard()
    .text("⏹️ Cancel Alarm", "alight_cancel").row()
    .text("🔙 Back to Menu", "menu_main");

  await ctx.reply(
    `🔔 <b>Active Bus Alighting Alarm Status</b>\n\n` +
    `🎯 <b>Destination:</b> <b>${active.dest_name}</b> (Stop <code>${active.dest_bus_stop_code}</code>)\n` +
    `🔔 <b>Alarm Trigger Distance:</b> <b>${active.threshold_meters}m</b>\n` +
    (active.last_distance ? `📏 <b>Last Measured Distance:</b> ~<b>${Math.round(active.last_distance)}m</b> away\n` : "") +
    `🕒 <b>Started:</b> <code>${new Date(active.created_at).toLocaleTimeString('en-SG', { timeZone: 'Asia/Singapore' })} SGT</code>\n\n` +
    `📡 <i>Tracking your bus via Telegram Live Location. Ensure your live location is active!</i>`,
    { parse_mode: "HTML", reply_markup: kb }
  );
});

bot.command(["supermap", "map", "transitmap"], async (ctx) => {
  const superMapUrl = "https://jasontan89.github.io/NewsTelegrambot/super-map.html";
  const keyboard = new InlineKeyboard()
    .webApp("🗺️ Launch All-in-One Super-Map", superMapUrl).row()
    .text("🔙 Back to Main Menu", "menu_main");

  await ctx.reply(
    "🗺️ <b>All-in-One Singapore Transit Super-Map</b>\n\n" +
    "Explore Singapore's unified live transit radar in an interactive dark map:\n\n" +
    "• 💳 <b>ERP Gantries</b>: Live pricing, active status & vehicle rates\n" +
    "• 📷 <b>Traffic Cameras</b>: Live expressway & checkpoint snapshots in popups\n" +
    "• ⚠️ <b>Live Incidents</b>: Real-time accidents, breakdowns & road closures\n" +
    "• 🚕 <b>Taxis & Stands</b>: Vacant taxi radar & barrier-free taxi stands\n" +
    "• ⚡ <b>EV Charging</b>: 23 major high-speed EV charging hubs\n\n" +
    "📍 <i>Tap below to launch the interactive map with your live GPS location!</i>",
    { parse_mode: "HTML", reply_markup: keyboard }
  );
});

bot.on("message:location", async (ctx) => {
  const { latitude, longitude } = ctx.message.location;

  // Check active alighting alarm
  let alarmBanner = "";
  if (ctx.from?.id) {
    const activeAlarm = await getActiveAlightingAlarm(ctx.from.id);
    if (activeAlarm && activeAlarm.status === "active") {
      const dist = calculateDistanceMeters(latitude, longitude, activeAlarm.dest_lat, activeAlarm.dest_lon);
      if (dist <= activeAlarm.threshold_meters && !activeAlarm.notified) {
        await updateAlightingTelemetry(ctx.from.id, latitude, longitude, dist, true);
        await ctx.reply(
          `🚨🔔 <b>WAKE UP! ALIGHTING ALARM TRIGGERED!</b> 🔔🚨\n\n` +
          `📍 <b>Arriving at:</b> <b>${activeAlarm.dest_name}</b> (Stop <code>${activeAlarm.dest_bus_stop_code}</code>)\n` +
          `📏 <b>Current Distance:</b> ~<b>${Math.round(dist)}m</b> away!\n\n` +
          `👉 <b>Press the bus bell now and prepare to alight safely!</b> 🚪🚌`,
          { parse_mode: "HTML" }
        ).catch(() => null);
      } else {
        await updateAlightingTelemetry(ctx.from.id, latitude, longitude, dist, false);
        alarmBanner = `🔔 <b>Active Bus Alarm:</b> ~<b>${Math.round(dist)}m</b> to <b>${activeAlarm.dest_name}</b>\n\n`;
      }
    }
  }

  let msgId: number | null = null;
  try {
    const msg = await ctx.reply("🔍 Performing 5-in-1 scan (Bus, Carparks, EV, Taxis, Bikes)...");
    msgId = msg.message_id;
  } catch (_) {}
  
  // 1. Bus Stops
  const stops = await getNearbyStops(latitude, longitude, 3);
  
  // 2. Carparks
  let nearbyCarparks: any[] = [];
  try {
    const cpData = await fetchCarparkAvailability();
    if (cpData.value) {
      const validCps = cpData.value.filter((item: any) => item.Location && item.Location.trim()).map((item: any) => {
        const [latStr, lonStr] = item.Location.trim().split(/\s+/);
        const lat = parseFloat(latStr);
        const lon = parseFloat(lonStr);
        const dist = calculateDistanceMeters(latitude, longitude, lat, lon);
        return { ...item, dist, lat, lon };
      });
      validCps.sort((a: any, b: any) => a.dist - b.dist);
      nearbyCarparks = validCps.slice(0, 2);
    }
  } catch (e) {
    console.error("Error calculating nearby carparks", e);
  }

  // 3. EV Charging Stations
  let nearestEV: any = null;
  try {
    const nearbyEvs = getNearbyEVHubs(latitude, longitude, 1);
    if (nearbyEvs.length > 0 && nearbyEvs[0].distance <= 3000) {
      const evData = await fetchEVChargingPoints(nearbyEvs[0].postal);
      const locs = evData?.value?.evLocationsData || [];
      if (locs.length > 0) {
        let total = 0;
        let avail = 0;
        (locs[0].chargingPoints || []).forEach((cp: any) => {
          (cp.plugTypes || []).forEach((pt: any) => {
            (pt.evIds || []).forEach((id: any) => {
              total++;
              if (id.status === "1") avail++;
            });
          });
        });
        nearestEV = {
          name: locs[0].name || nearbyEvs[0].name,
          postal: nearbyEvs[0].postal,
          distance: Math.round(nearbyEvs[0].distance),
          avail,
          total,
          lat: locs[0].latitude || nearbyEvs[0].lat,
          lon: locs[0].longitude || nearbyEvs[0].lon
        };
      }
    }
  } catch (e) {
    console.error("Error calculating nearby EV chargers", e);
  }

  // 4. Taxis & Stands
  let taxiCount1km = 0;
  let nearestStand: any = null;
  try {
    const taxiData = await fetchTaxiAvailability();
    (taxiData.value || []).forEach((t: any) => {
      if (calculateDistanceMeters(latitude, longitude, t.Latitude, t.Longitude) <= 1000) {
        taxiCount1km++;
      }
    });
    const stands = await getNearbyTaxiStands(latitude, longitude, 1);
    if (stands && stands.length > 0) nearestStand = stands[0];
  } catch (e) {
    console.error("Error calculating nearby taxis", e);
  }

  // 5. Bicycle Parking
  let nearestBikeRack: any = null;
  try {
    const bikeData = await fetchBicycleParking(latitude, longitude, 0.5);
    const racks = bikeData.value || [];
    if (racks.length > 0) {
      racks.sort((a: any, b: any) => (b.RackCount || 0) - (a.RackCount || 0));
      nearestBikeRack = racks[0];
    }
  } catch (e) {
    console.error("Error calculating nearby bike racks", e);
  }

  let text = `${alarmBanner}📍 <b>Consolidated Transport Results</b>\n\n`;
  const keyboard = new InlineKeyboard();

  const webAppUrl = `https://jasontan89.github.io/NewsTelegrambot/taxi-map.html?lat=${latitude}&lon=${longitude}&name=${encodeURIComponent("Your Current Location")}`;
  keyboard.webApp("🗺️ Open Live Taxi Radar Map", webAppUrl).row();

  if (stops && stops.length > 0) {
    text += `🚏 <b>Nearest Bus Stops:</b>\n`;
    stops.forEach((stop: any) => {
      const dist = Math.round(stop.distance ?? stop.dist_meters ?? 0);
      const isMrt = (stop.description || '').toLowerCase().includes('stn');
      const icon = isMrt ? '🚆' : '🚏';
      text += `• ${icon} <b>${stop.description}</b> - <code>${dist}m</code>\n`;
      keyboard.text(`${icon} ${stop.description} (${dist}m)`, `get_bus_${stop.bus_stop_code}`).row();
    });
    text += `\n`;
  } else {
    text += `🚏 <b>Nearest Bus Stops:</b>\n• <i>No bus stops found within 500m.</i>\n\n`;
  }

  if (nearestEV) {
    const evStatus = nearestEV.avail > 0 ? `🟢 <b>${nearestEV.avail}/${nearestEV.total} Plugs Available</b>` : `🔴 <b>All ${nearestEV.total} Plugs In Use</b>`;
    text += `⚡ <b>Nearest EV Charging:</b>\n`;
    text += `• <b>${nearestEV.name}</b> (~<code>${nearestEV.distance}m</code>)\n`;
    text += `   ${evStatus} • <code>/ev ${nearestEV.postal}</code>\n\n`;
    keyboard.text(`⚡ View ${nearestEV.name.substring(0, 16)} EV Plugs`, `ev_search_${nearestEV.postal}`).row();
  }

  text += `🚕 <b>Taxi Availability:</b>\n`;
  text += `• <b>Vacant Taxis</b>: <code>${taxiCount1km}</code> available within 1km\n`;
  if (nearestStand) {
    const standDist = Math.round(nearestStand.distance ?? nearestStand.dist_meters ?? 0);
    text += `• <b>Nearest Stand</b>: ${nearestStand.taxi_code} (${nearestStand.name}) - <code>${standDist}m</code>\n`;
    keyboard.url(`🚶 Walk to Taxi Stand (${standDist}m)`, `https://www.google.com/maps/dir/?api=1&destination=${nearestStand.latitude},${nearestStand.longitude}`).row();
  }
  text += `\n`;

  if (nearbyCarparks.length > 0) {
    text += `🚗 <b>Nearest Carparks:</b>\n`;
    nearbyCarparks.forEach((cp: any) => {
      const dist = Math.round(cp.dist);
      const lots = cp.AvailableLots ?? 0;
      const status = getCarparkStatus(lots);
      const devName = cp.Development || `Carpark ${cp.CarParkID}`;
      text += `• ${status.icon} <b>${devName}</b>: <code>${lots}</code> lots (${status.label}, <code>${dist}m</code>)\n`;
      keyboard.url(`🗺️ Drive to ${devName.substring(0, 18)}`, `https://www.google.com/maps/dir/?api=1&destination=${cp.lat},${cp.lon}`).row();
    });
    text += `\n`;
  }

  if (nearestBikeRack) {
    const shelter = nearestBikeRack.ShelterIndicator === 'Y' ? '☂️ Sheltered' : '☀️ Open Air';
    text += `🚲 <b>Nearest Bicycle Parking:</b>\n`;
    text += `• <b>${nearestBikeRack.Description}</b> (<code>${nearestBikeRack.RackCount || 10} lots</code>, ${shelter})\n`;
    keyboard.url(`🚲 Walk to Bike Rack`, `https://www.google.com/maps/dir/?api=1&destination=${nearestBikeRack.Latitude},${nearestBikeRack.Longitude}`).row();
  }

  try {
    if (msgId && ctx.chat?.id) {
      await ctx.api.editMessageText(ctx.chat.id, msgId, text, {
        parse_mode: "HTML",
        reply_markup: keyboard
      });
    } else {
      await ctx.reply(text, {
        parse_mode: "HTML",
        reply_markup: keyboard
      });
    }
  } catch (_) {}
});

bot.on("edit:location", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  const loc = ctx.editedMessage?.location;
  if (!loc) return;

  const activeAlarm = await getActiveAlightingAlarm(userId);
  if (!activeAlarm || activeAlarm.status !== "active") return;

  const dist = calculateDistanceMeters(loc.latitude, loc.longitude, activeAlarm.dest_lat, activeAlarm.dest_lon);

  if (dist <= activeAlarm.threshold_meters && !activeAlarm.notified) {
    await updateAlightingTelemetry(userId, loc.latitude, loc.longitude, dist, true);

    const text =
      `🚨🔔 <b>WAKE UP! ALIGHTING ALARM TRIGGERED!</b> 🔔🚨\n\n` +
      `📍 <b>Arriving at:</b> <b>${activeAlarm.dest_name}</b>\n` +
      `🚏 <b>Bus Stop Code:</b> <code>${activeAlarm.dest_bus_stop_code}</code>\n` +
      `📏 <b>Current Distance:</b> ~<b>${Math.round(dist)}m</b> away!\n\n` +
      `👉 <b>Press the bus bell now and prepare to alight safely!</b> 🚪🚌`;

    const kb = new InlineKeyboard()
      .text("✅ I Have Alighted (Dismiss)", "alight_dismiss").row()
      .url("🗺️ View Stop on Google Maps", `https://www.google.com/maps/search/?api=1&query=${activeAlarm.dest_lat},${activeAlarm.dest_lon}`);

    await ctx.reply(text, {
      parse_mode: "HTML",
      reply_markup: kb
    }).catch(() => null);
  } else {
    await updateAlightingTelemetry(userId, loc.latitude, loc.longitude, dist, false);
  }
});

bot.callbackQuery("menu_main", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  const name = ctx.from?.first_name ?? "there";
  await safeEditOrSend(
    ctx,
    `Hi ${name}! 👋 Welcome to <b>SG Transport Kaki 🇸🇬</b>\n\n` +
    `Your all-in-one companion for Singapore buses, trains, driving, carparks, taxis & traffic.\n\n` +
    `Select a category below or type commands directly:\n\n` +
    `💡 <b>Pro-Tip</b>: Tap 📎 <b>Attachment</b> and send your <b>Location</b> for an instant 4-in-1 scan (Bus, Carparks, Taxis, Bikes)!`,
    getMainMenuKeyboard(),
    "HTML"
  );
});

bot.callbackQuery("menu_favorites", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  const userId = ctx.from.id;
  const favs = await getFavorites(userId);
  
  if (!favs || favs.length === 0) {
    return safeEditOrSend(
      ctx,
      "⭐ <b>Your Favorites</b>\n\nYou have no favorites saved yet. Use the ⭐ buttons on bus stops or traffic cameras to save them!",
      new InlineKeyboard().text("🔙 Back", "menu_main"),
      "HTML"
    );
  }

  let message = "⭐ <b>Your Favorites</b>\n\nTap any item below to check real-time data:\n";
  const keyboard = new InlineKeyboard();
  for (const fav of favs) {
    if (fav.type === 'bus') {
      keyboard.text(`🚌 ${fav.label || fav.value}`, `get_bus_${fav.value}`).row();
    } else if (fav.type === 'cam') {
      const camMeta = getCameraMeta(fav.value);
      keyboard.text(`📷 ${camMeta.name}`, `traffic_cam_${fav.value}`).row();
    }
  }
  keyboard.text("🔙 Back", "menu_main");

  await safeEditOrSend(ctx, message, keyboard, "HTML");
});

bot.callbackQuery("menu_routes", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  const keyboard = new InlineKeyboard()
    .text("🚌 Bus 106", "route_v_106__1__1")
    .text("🚌 Bus 190", "route_v_190__1__1").row()
    .text("🚌 Bus 65", "route_v_65__1__1")
    .text("🚌 Bus 14", "route_v_14__1__1").row()
    .text("🚌 Bus 502", "route_v_502__1__1")
    .text("🚌 Bus 960", "route_v_960__1__1").row()
    .text("🔙 Back to Main Menu", "menu_main");

  await safeEditOrSend(
    ctx,
    "🗺️ <b>Bus Route Explorer & Operating Schedules</b>\n\n" +
    "Select a popular bus service below, or type:\n" +
    "<code>/route &lt;bus_no&gt;</code> (e.g. <code>/route 106</code>, <code>/route 190</code>, <code>/route 65</code>)\n\n" +
    "💡 Shows full stop itinerary, first/last bus departure timings, and frequencies!",
    keyboard,
    "HTML"
  );
});

bot.callbackQuery("menu_disruptions", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await showTrainAlerts(ctx, ctx.callbackQuery.message?.message_id || null, true);
});

bot.callbackQuery("menu_taxis", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await safeEditOrSend(
    ctx,
    "🚕 <b>Vacant Taxi Locator & Official Taxi Stands</b>\n\n" +
    "Select a popular hub below or type:\n" +
    "<code>/taxi &lt;place&gt;</code> (e.g. <code>/taxi Orchard</code>, <code>/taxi VivoCity</code>, <code>/taxi Bugis</code>)\n\n" +
    "💡 Real-time radar calculates vacant roaming taxis within 500m, 1km, and 2km!",
    getTaxisMenuKeyboard(),
    "HTML"
  );
});

bot.callbackQuery(/^taxi_search_(.+)$/, async (ctx) => {
  const query = ctx.match[1];
  await ctx.answerCallbackQuery().catch(() => {});
  await showTaxiLocator(ctx, ctx.callbackQuery.message?.message_id || null, query, true);
});

bot.callbackQuery("menu_bikes", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await safeEditOrSend(
    ctx,
    "🚲 <b>MRT Bicycle Parking & Sheltered Racks</b>\n\n" +
    "Select a popular station below or type:\n" +
    "<code>/bike &lt;station_name&gt;</code> (e.g. <code>/bike Tampines</code>, <code>/bike Jurong East</code>, <code>/bike Bishan</code>)\n\n" +
    "💡 Displays sheltered vs open air racks, rack types, and lot capacity!",
    getBikesMenuKeyboard(),
    "HTML"
  );
});

bot.callbackQuery(/^bike_search_(.+)$/, async (ctx) => {
  const query = ctx.match[1];
  await ctx.answerCallbackQuery().catch(() => {});
  await showBicycleParking(ctx, ctx.callbackQuery.message?.message_id || null, query, true);
});

bot.callbackQuery(/^route_v_([^_]+)__(\d+)__(\d+)$/, async (ctx) => {
  const busNo = ctx.match[1];
  const direction = parseInt(ctx.match[2], 10);
  const page = parseInt(ctx.match[3], 10);
  await ctx.answerCallbackQuery().catch(() => {});
  await showBusRoute(ctx, ctx.callbackQuery.message?.message_id || null, busNo, direction, page, true);
});

bot.callbackQuery("menu_carparks", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await safeEditOrSend(
    ctx,
    "🚗 <b>Carpark Availability</b>\n\n" +
    "Select a region or popular mall below, or search by typing:\n" +
    "<code>/carpark &lt;name&gt;</code> (e.g. <code>/carpark Suntec</code>, <code>/carpark ION</code>, <code>/carpark Tampines</code>)\n\n" +
    "💡 <b>Tip</b>: Send your <b>Location</b> via 📎 attachment to see nearby carparks + Google Maps navigation links!",
    getCarparksMenuKeyboard(),
    "HTML"
  );
});

bot.callbackQuery(/^cp_search_(.+)$/, async (ctx) => {
  const query = ctx.match[1];
  await ctx.answerCallbackQuery().catch(() => {});
  await showCarparkSearchResults(ctx, ctx.callbackQuery.message?.message_id || null, query, true, 1);
});

bot.callbackQuery(/^cp_p_(.+)__(\d+)$/, async (ctx) => {
  const query = ctx.match[1];
  const page = parseInt(ctx.match[2], 10);
  await ctx.answerCallbackQuery().catch(() => {});
  await showCarparkSearchResults(ctx, ctx.callbackQuery.message?.message_id || null, query, true, page);
});

bot.callbackQuery("menu_mrt", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await safeEditOrSend(
    ctx,
    "🚆 <b>MRT Platform Crowd Density</b>\n\n" +
    "Select an MRT line below to view live platform crowd levels (🟢 Low, 🟡 Moderate, 🔴 High):",
    getMRTMenuKeyboard(),
    "HTML"
  );
});

bot.callbackQuery(/^mrt_line_(.+)$/, async (ctx) => {
  const line = ctx.match[1];
  await ctx.answerCallbackQuery().catch(() => {});
  await showMRTCrowd(ctx, ctx.callbackQuery.message?.message_id || null, line, true, 1);
});

bot.callbackQuery(/^mrt_p_(.+)__(\d+)$/, async (ctx) => {
  const line = ctx.match[1];
  const page = parseInt(ctx.match[2], 10);
  await ctx.answerCallbackQuery().catch(() => {});
  await showMRTCrowd(ctx, ctx.callbackQuery.message?.message_id || null, line, true, page);
});

bot.callbackQuery("menu_traffic", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await safeEditOrSend(
    ctx,
    "📷 <b>Expressway Traffic Cameras</b>\n\n" +
    "Select an expressway corridor below to view live camera snapshots:",
    getTrafficMenuKeyboard(),
    "HTML"
  );
});

bot.callbackQuery("menu_checkpoint", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await showCheckpointHub(ctx, true);
});

bot.callbackQuery("checkpoint_hub", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await showCheckpointHub(ctx, true);
});

bot.callbackQuery("checkpoint_refresh", async (ctx) => {
  await ctx.answerCallbackQuery({ text: "Refreshed checkpoint status!" }).catch(() => {});
  await showCheckpointHub(ctx, true);
});

bot.callbackQuery("checkpoint_woodlands", async (ctx) => {
  await showWoodlandsCheckpoint(ctx);
});

bot.callbackQuery("checkpoint_tuas", async (ctx) => {
  await showTuasCheckpoint(ctx);
});

bot.callbackQuery("menu_alight", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await showAlightPrompt(ctx, "");
});

bot.callbackQuery(/^alight_pick_(\d{5})$/, async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  const code = ctx.match[1];
  const stop = await getBusStopByCode(code);
  if (stop) {
    await promptAlightThreshold(ctx, stop);
  } else {
    await ctx.reply(`❌ Bus stop ${code} not found.`);
  }
});

bot.callbackQuery(/^alight_set_(\d{5})_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  const code = ctx.match[1];
  const threshold = parseInt(ctx.match[2], 10) || 500;
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id || userId;

  const stop = await getBusStopByCode(code);
  if (!stop || !userId) {
    return ctx.reply("❌ Failed to activate alarm. Please try again.");
  }

  await createAlightingAlarm(userId, chatId, code, `${stop.description} (${stop.road_name})`, stop.latitude, stop.longitude, threshold);

  const text =
    `✅ <b>Bus Alighting Alarm Activated!</b>\n\n` +
    `🎯 <b>Destination:</b> [<code>${code}</code>] <b>${stop.description}</b>\n` +
    `🛣️ <b>Road:</b> ${stop.road_name}\n` +
    `🔔 <b>Trigger Distance:</b> <b>${threshold}m</b> (~${threshold >= 800 ? '3-4' : threshold >= 500 ? '2' : '1'} stops away)\n\n` +
    `📡 <b>Next Step:</b>\n` +
    `Please tap the paperclip / plus icon 📎 in Telegram, select <b>Location</b> ➔ <b>Share Live Location</b> (choose 15 mins or 1 hour).\n\n` +
    `<i>As your bus travels, the bot will monitor your distance and sound a loud wake-up alarm when you approach!</i>`;

  const kb = new InlineKeyboard()
    .text("⏹️ Cancel Alarm", "alight_cancel").row()
    .text("📊 Check Alarm Status", "alight_status");

  await safeEditOrSend(ctx, text, kb, "HTML");
});

bot.callbackQuery("alight_cancel", async (ctx) => {
  await ctx.answerCallbackQuery({ text: "Alarm cancelled" }).catch(() => {});
  const userId = ctx.from?.id;
  if (userId) {
    await cancelAlightingAlarm(userId);
  }
  await safeEditOrSend(ctx, "⏹️ <b>Alighting Alarm Cancelled.</b>\nSafe travels! You can set another alarm anytime with <code>/alight</code>.", new InlineKeyboard().text("🔙 Main Menu", "menu_main"), "HTML");
});

bot.callbackQuery("alight_status", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  const userId = ctx.from?.id;
  if (!userId) return;
  const active = await getActiveAlightingAlarm(userId);
  if (!active) {
    return safeEditOrSend(ctx, "ℹ️ You have no active alighting alarm running right now.\n\nUse <code>/alight &lt;bus stop code&gt;</code> to set one!", new InlineKeyboard().text("🔙 Main Menu", "menu_main"), "HTML");
  }

  const kb = new InlineKeyboard()
    .text("⏹️ Cancel Alarm", "alight_cancel").row()
    .text("🔙 Back to Menu", "menu_main");

  await safeEditOrSend(
    ctx,
    `🔔 <b>Active Bus Alighting Alarm Status</b>\n\n` +
    `🎯 <b>Destination:</b> <b>${active.dest_name}</b> (Stop <code>${active.dest_bus_stop_code}</code>)\n` +
    `🔔 <b>Alarm Trigger Distance:</b> <b>${active.threshold_meters}m</b>\n` +
    (active.last_distance ? `📏 <b>Last Measured Distance:</b> ~<b>${Math.round(active.last_distance)}m</b> away\n` : "") +
    `🕒 <b>Started:</b> <code>${new Date(active.created_at).toLocaleTimeString('en-SG', { timeZone: 'Asia/Singapore' })} SGT</code>\n\n` +
    `📡 <i>Tracking your bus via Telegram Live Location. Ensure your live location is active!</i>`,
    kb,
    "HTML"
  );
});

bot.callbackQuery("alight_dismiss", async (ctx) => {
  await ctx.answerCallbackQuery({ text: "Alarm dismissed. Welcome!" }).catch(() => {});
  await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard().text("🔙 Back to Main Menu", "menu_main") }).catch(() => {});
});

bot.callbackQuery("alight_from_favs", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  const userId = ctx.from?.id;
  if (!userId) return;
  const favs = await getFavorites(userId);
  const busFavs = (favs || []).filter((f: any) => f.type === "bus_stop");
  if (busFavs.length === 0) {
    return safeEditOrSend(ctx, "⭐ You have no favorite bus stops saved yet.\n\nUse <code>/alight &lt;bus stop code&gt;</code> or save favorite stops with the ⭐ button!", new InlineKeyboard().text("🔙 Back", "menu_alight"), "HTML");
  }

  const kb = new InlineKeyboard();
  busFavs.forEach((f: any) => {
    kb.text(`🚏 [${f.value}] ${f.label.substring(0, 20)}`, `alight_pick_${f.value}`).row();
  });
  kb.text("🔙 Back", "menu_alight");

  await safeEditOrSend(ctx, "⭐ <b>Select Destination from Favorites:</b>", kb, "HTML");
});

bot.callbackQuery("alight_from_nearby", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await safeEditOrSend(
    ctx,
    "📍 <b>Set Alarm using Nearby Bus Stops:</b>\n\n" +
    "Please send your 📎 <b>Location</b> to view nearby bus stops and set your alighting destination!",
    new InlineKeyboard().text("🔙 Back", "menu_alight"),
    "HTML"
  );
});

bot.callbackQuery("menu_incidents", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await safeEditOrSend(
    ctx,
    "🚨 <b>Live Traffic Incidents & Alerts</b>\n\n" +
    "Select a category below to check real-time road conditions, or type:\n" +
    "<code>/incidents &lt;expressway&gt;</code> (e.g. <code>/incidents PIE</code>, <code>/incidents AYE</code>, <code>/incidents CTE</code>)",
    getIncidentsMenuKeyboard(),
    "HTML"
  );
});

bot.callbackQuery(/^traffic_exp_(.+)$/, async (ctx) => {
  const exp = ctx.match[1];
  await ctx.answerCallbackQuery().catch(() => {});

  const keyboard = new InlineKeyboard();
  let title = "📷 Traffic Cameras";

  if (exp === "bke") {
    title = "🇸🇬 <b>Woodlands Checkpoint & BKE Cameras</b>";
    keyboard.text("📹 Woodlands Checkpoint (2701)", "traffic_cam_2701").row()
            .text("📹 Woodlands Causeway (2702)", "traffic_cam_2702").row()
            .text("📹 BKE - Bef Woodlands Flyover (2704)", "traffic_cam_2704").row();
  } else if (exp === "aye") {
    title = "🚗 <b>AYE & Pandan Loop Cameras</b>";
    keyboard.text("📹 AYE - Bef Pandan Loop (4703)", "traffic_cam_4703").row();
  } else if (exp === "tuas") {
    title = "🌉 <b>Tuas Checkpoint & West Cameras</b>";
    keyboard.text("📹 AYE - Near Tuas Checkpoint (4712)", "traffic_cam_4712").row()
            .text("📹 AYE - Tuas West Road (4713)", "traffic_cam_4713").row();
  } else if (exp === "mce") {
    title = "🛣️ <b>Keppel Viaduct & HarbourFront (MCE/AYE)</b>";
    keyboard.text("📹 Keppel Viaduct Eastbound (4798)", "traffic_cam_4798").row()
            .text("📹 Keppel Viaduct Westbound (4799)", "traffic_cam_4799").row();
  }

  keyboard.text("🔙 Back to Traffic Menu", "menu_traffic");

  await safeEditOrSend(ctx, `${title}\n\nSelect a camera to view live road conditions:`, keyboard, "HTML");
});

bot.callbackQuery(/^traffic_cam_(.+)$/, async (ctx) => {
  const camId = String(ctx.match[1]);
  await ctx.answerCallbackQuery({ text: "Fetching live camera snapshot..." }).catch(() => {});

  try {
    const data = await fetchTrafficImages();
    if (!data.value || data.value.length === 0) {
      return ctx.reply("❌ No traffic images currently available from LTA.");
    }

    const camObj = data.value.find((c: any) => String(c.CameraID) === camId);
    if (!camObj) {
      const camMeta = getCameraMeta(camId);
      const keyboard = new InlineKeyboard().text("🔙 Back to Cameras", `traffic_exp_${camMeta.exp}`);
      return safeEditOrSend(
        ctx,
        `❌ <b>Camera Offline</b>\n\nCamera <b>${camMeta.name}</b> (ID ${camId}) is currently offline or undergoing maintenance by LTA.\n\nPlease select another active camera!`,
        keyboard,
        "HTML"
      );
    }

    const camMeta = getCameraMeta(camId, camObj.Latitude, camObj.Longitude);

    const keyboard = new InlineKeyboard()
      .text("🔄 Refresh Image", `traffic_cam_${camId}`)
      .text("⭐ Save", `fav_cam_${camId}`).row()
      .text("🔙 Back to Cameras", `traffic_exp_${camMeta.exp}`).row()
      .text("🔙 Traffic Menu", "menu_traffic");

    const caption = `📷 <b>${camMeta.name}</b> (Camera ${camId})\n\n📍 Coordinates: <code>${camObj.Latitude}, ${camObj.Longitude}</code>\n🕒 Updated: ${new Date().toLocaleTimeString('en-SG', { timeZone: 'Asia/Singapore' })}`;

    const isPhoto = Boolean(ctx.callbackQuery?.message?.photo || ctx.msg?.photo);

    if (isPhoto) {
      try {
        await ctx.editMessageMedia(
          {
            type: "photo",
            media: camObj.ImageLink,
            caption: caption,
            parse_mode: "HTML"
          },
          { reply_markup: keyboard }
        );
      } catch (err: any) {
        try {
          await ctx.deleteMessage();
        } catch (_) {}
        await ctx.replyWithPhoto(camObj.ImageLink, {
          caption: caption,
          parse_mode: "HTML",
          reply_markup: keyboard
        });
      }
    } else {
      try {
        await ctx.deleteMessage();
      } catch (_) {}
      await ctx.replyWithPhoto(camObj.ImageLink, {
        caption: caption,
        parse_mode: "HTML",
        reply_markup: keyboard
      });
    }
  } catch (e: any) {
    await ctx.reply("Error fetching camera image.");
  }
});


bot.callbackQuery("menu_goto", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  const kb = new InlineKeyboard()
    .text("Clementi ➡️ Orchard", "goto_p_Clementi__Orchard").row()
    .text("Tampines ➡️ Bugis", "goto_p_Tampines__Bugis").row()
    .text("Jurong East ➡️ VivoCity", "goto_p_Jurong%20East__VivoCity").row()
    .text("Bedok ➡️ Suntec", "goto_p_Bedok__Suntec").row()
    .text("🔙 Back to Main Menu", "menu_main");

  const text = "🗺️ <b>Bus Journey Planner & Route Finder</b>\n\n" +
    "Find direct and 1-transfer bus routes between any two places in Singapore!\n\n" +
    "<b>Usage:</b>\n" +
    "• Type <code>/goto &lt;Origin&gt; to &lt;Destination&gt;</code>\n" +
    "• Example: <code>/goto Clementi to Orchard</code>\n" +
    "• Example: <code>/goto 17009 to 09048</code>\n\n" +
    "Or select a popular route preset below:";

  await safeEditOrSend(ctx, text, kb, "HTML");
});

bot.callbackQuery(/^goto_p_(.+)__(.+)$/, async (ctx) => {
  const orig = decodeURIComponent(ctx.match[1]);
  const dest = decodeURIComponent(ctx.match[2]);
  await ctx.answerCallbackQuery().catch(() => {});
  await planBusJourney(ctx, ctx.callbackQuery.message?.message_id || null, orig, dest, true);
});

bot.callbackQuery("menu_mrt_alerts", async (ctx) => {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  if (!userId || !chatId) return;
  await ctx.answerCallbackQuery().catch(() => {});
  await renderMRTAlertsMenu(ctx, userId, chatId, true);
});

bot.callbackQuery(/^sub_toggle_(.+)$/, async (ctx) => {
  const lineCode = ctx.match[1];
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  if (!userId || !chatId) return;

  const isSubscribed = await toggleMRTSubscription(userId, chatId, lineCode);
  await ctx.answerCallbackQuery({
    text: isSubscribed ? `🔔 Subscribed to ${lineCode} disruption alerts!` : `🔕 Unsubscribed from ${lineCode} alerts.`
  }).catch(() => {});

  await renderMRTAlertsMenu(ctx, userId, chatId, true);
});

bot.callbackQuery("sub_all_on", async (ctx) => {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  if (!userId || !chatId) return;

  await setAllMRTSubscriptions(userId, chatId, true, ALL_MRT_LINES);
  await ctx.answerCallbackQuery({ text: "⭐ Subscribed to ALL MRT lines!" }).catch(() => {});
  await renderMRTAlertsMenu(ctx, userId, chatId, true);
});

bot.callbackQuery("sub_all_off", async (ctx) => {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  if (!userId || !chatId) return;

  await setAllMRTSubscriptions(userId, chatId, false, ALL_MRT_LINES);
  await ctx.answerCallbackQuery({ text: "🔕 Unsubscribed from all lines." }).catch(() => {});
  await renderMRTAlertsMenu(ctx, userId, chatId, true);
});

bot.callbackQuery(/^inc_type_(.+)$/, async (ctx) => {
  const filterType = ctx.match[1];
  await ctx.answerCallbackQuery().catch(() => {});
  await showIncidents(ctx, ctx.callbackQuery.message?.message_id || null, filterType, null, true, 1);
});

bot.callbackQuery(/^inc_search_(.+)$/, async (ctx) => {
  const query = ctx.match[1];
  await ctx.answerCallbackQuery().catch(() => {});
  await showIncidents(ctx, ctx.callbackQuery.message?.message_id || null, "all", query, true, 1);
});

bot.callbackQuery(/^inc_p_([^_]+)__(.+)__(\d+)$/, async (ctx) => {
  const filterType = ctx.match[1];
  const kw = ctx.match[2] === "none" ? null : ctx.match[2];
  const page = parseInt(ctx.match[3], 10);
  await ctx.answerCallbackQuery().catch(() => {});
  await showIncidents(ctx, ctx.callbackQuery.message?.message_id || null, filterType, kw, true, page);
});

bot.callbackQuery("cat_transport", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await safeEditOrSend(
    ctx,
    `🚌 <b>Public Transport Hub</b>\n\n` +
    `• <b>Journey Planner</b>: Direct & 1-transfer bus routes with live ETAs\n` +
    `• <b>Bus Route Explorer</b>: Route stop sequence & first/last bus schedules\n` +
    `• <b>MRT Crowds & Status</b>: Platform crowd density & line health\n` +
    `• <b>Disruption Alerts</b>: Real-time push alerts for breakdown events\n\n` +
    `Select an option below:`,
    getTransportMenuKeyboard(),
    "HTML"
  );
});

bot.callbackQuery("cat_driving", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await safeEditOrSend(
    ctx,
    `🚗 <b>Drivers & Roads Hub</b>\n\n` +
    `• <b>ERP Gantry Rates</b>: Live rates, vehicle multipliers & interactive map\n` +
    `• <b>EV Charging Stations</b>: Real-time plug availability & DC fast filter\n` +
    `• <b>Carparks Availability</b>: Real-time lot counts with Google Maps directions\n` +
    `• <b>Traffic Cameras</b>: Live Checkpoint & Expressway camera snapshots\n` +
    `• <b>Traffic Alerts</b>: Accidents, roadworks, and live radar map\n` +
    `• <b>Taxi Locator</b>: Vacant taxis count & 316 official taxi stands\n\n` +
    `Select an option below:`,
    getDrivingMenuKeyboard(),
    "HTML"
  );
});

bot.callbackQuery("cat_explore", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await safeEditOrSend(
    ctx,
    `📍 <b>Explore & Nearby Services</b>\n\n` +
    `Find transport options around your current area or popular hubs across Singapore.\n\n` +
    `💡 <b>Pro-Tip:</b> Tap the 📎 <b>Attachment</b> icon in Telegram and send your <b>Location</b> for an instant 5-in-1 scan (Bus stops, Carparks, EV Chargers, Taxis, Bike racks)!`,
    getExploreMenuKeyboard(),
    "HTML"
  );
});

bot.callbackQuery("menu_help", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await safeEditOrSend(
    ctx,
    getHelpText(),
    getHelpKeyboard(),
    "HTML"
  );
});

bot.callbackQuery(/^get_bus_(.+)$/, async (ctx) => {
  const stopCode = ctx.match[1];
  await ctx.answerCallbackQuery().catch(() => {});
  await renderBusArrivals(ctx, ctx.callbackQuery.message?.message_id || null, stopCode, true);
});

bot.callbackQuery("menu_ev", async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  await safeEditOrSend(
    ctx,
    "⚡ <b>Singapore EV Charging Stations & Availability</b>\n\n" +
    "Select a popular charging hub below or search by typing:\n" +
    "<code>/ev &lt;postal_or_landmark&gt;</code> (e.g. <code>/ev 529510</code>, <code>/ev Orchard</code>, <code>/ev Suntec</code>)\n\n" +
    "💡 <i>Real-time LTA feed provides active/occupied plug counts, DC Fast/AC power ratings, operators & rates!</i>",
    getEVMenuKeyboard(),
    "HTML"
  );
});

bot.callbackQuery(/^ev_search_(.+)$/, async (ctx) => {
  const query = ctx.match[1];
  await ctx.answerCallbackQuery().catch(() => {});
  await showEVChargingStations(ctx, ctx.callbackQuery.message?.message_id || null, query, true, false);
});

bot.callbackQuery(/^ev_filter_([^_]+)__(all|dc)$/, async (ctx) => {
  const postal = ctx.match[1];
  const dcOnly = ctx.match[2] === "dc";
  await ctx.answerCallbackQuery().catch(() => {});
  await showEVChargingStations(ctx, ctx.callbackQuery.message?.message_id || null, postal, true, dcOnly);
});

bot.callbackQuery(/^menu_erp$/, async (ctx) => {
  await ctx.answerCallbackQuery().catch(() => {});
  const text = 
    "💳 <b>Singapore Electronic Road Pricing (ERP) Rates</b>\n\n" +
    "Select an expressway corridor or cordon below to view real-time gantry charges, operating schedules, and vehicle multipliers:";
  await safeEditOrSend(ctx, text, getERPMenuKeyboard(), "HTML");
});

bot.callbackQuery(/^erp_corr_(.+)$/, async (ctx) => {
  const corridor = ctx.match[1];
  await ctx.answerCallbackQuery().catch(() => {});
  await showERPRates(ctx, corridor, "car", 1);
});

bot.callbackQuery(/^erp_g_([^_]+)__(car|moto|hgv)$/, async (ctx) => {
  const gantryId = ctx.match[1];
  const veh = ctx.match[2];
  await ctx.answerCallbackQuery().catch(() => {});
  await showERPGantryDetails(ctx, gantryId, veh);
});

bot.callbackQuery(/^erp_veh_([^_]+)__(car|moto|hgv)$/, async (ctx) => {
  const query = ctx.match[1];
  const veh = ctx.match[2];
  await ctx.answerCallbackQuery().catch(() => {});
  await showERPRates(ctx, query, veh, 1);
});

bot.callbackQuery(/^erp_p_([^_]+)__(car|moto|hgv)__(\d+)$/, async (ctx) => {
  const query = ctx.match[1];
  const veh = ctx.match[2];
  const page = parseInt(ctx.match[3], 10) || 1;
  await ctx.answerCallbackQuery().catch(() => {});
  await showERPRates(ctx, query, veh, page);
});

bot.callbackQuery(/^fav_(bus|cam)_(.+)$/, async (ctx) => {
  const type = ctx.match[1];
  const value = String(ctx.match[2]);
  const userId = ctx.from.id;

  let label = `${type.toUpperCase()} ${value}`;
  if (type === 'cam') {
    const camMeta = getCameraMeta(value);
    label = camMeta.name;
  } else if (type === 'bus') {
    const { data: stopInfo } = await supabase
      .from('lta_bus_stops')
      .select('description, road_name')
      .eq('bus_stop_code', value)
      .single();
    if (stopInfo?.description) {
      const isMrt = (stopInfo.description || '').toLowerCase().includes('stn');
      const icon = isMrt ? '🚆' : '🚏';
      label = `${icon} ${stopInfo.description} (${value})`;
    }
  }

  const success = await addFavorite(userId, type, value, label);
  if (success) {
    await ctx.answerCallbackQuery({ text: `⭐ Saved ${label} to favorites!`, show_alert: true }).catch(() => {});
  } else {
    await ctx.answerCallbackQuery({ text: "Failed to save favorite." }).catch(() => {});
  }
});

const handleUpdate = webhookCallback(bot, "std/http");

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);

    // Handle Telegram WebApp Interactive Map
    if (req.method === "GET") {
      // Handle Telegram WebApp Interactive ERP Map
      if (url.pathname.endsWith("/erp-map") || url.pathname.endsWith("/map-erp")) {
        const vehicle = url.searchParams.get("vehicle") || "car";
        const corridor = url.searchParams.get("corridor") || "ALL";
        const html = renderERPMapHtml(vehicle, corridor);
        return new Response(html, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "access-control-allow-origin": "*"
          },
        });
      }

      // Handle JSON Data API for Interactive ERP Map
      if (url.pathname.endsWith("/api/erp-map-data")) {
        try {
          const sgt = getSGTHourAndMinute();
          const gantriesWithRates = ERP_GANTRIES.map((g: any) => ({
            id: g.id,
            name: g.name,
            corridor: g.corridor,
            corridorName: g.corridorName,
            direction: g.direction,
            lat: g.lat,
            lon: g.lon,
            slotsWeekday: g.slotsWeekday,
            rates: {
              car: getCurrentERPRate(g, "car"),
              moto: getCurrentERPRate(g, "moto"),
              hgv: getCurrentERPRate(g, "hgv")
            }
          }));

          return new Response(JSON.stringify({
            sgt,
            gantries: gantriesWithRates
          }), {
            headers: {
              "content-type": "application/json",
              "access-control-allow-origin": "*"
            }
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: {
              "content-type": "application/json",
              "access-control-allow-origin": "*"
            }
          });
        }
      }

      if (url.pathname.endsWith("/map") || url.pathname.endsWith("/taxi-map")) {
        const lat = parseFloat(url.searchParams.get("lat") || "1.3048");
        const lon = parseFloat(url.searchParams.get("lon") || "103.8318");
        const name = url.searchParams.get("name") || "Orchard Area";
        const html = renderTaxiMapHtml(lat, lon, name);
        return new Response(html, {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "access-control-allow-origin": "*"
          },
        });
      }

      // Handle Live Vacant Taxis & Stands JSON API for live map refresh
      if (url.pathname.endsWith("/api/taxis")) {
        const lat = parseFloat(url.searchParams.get("lat") || "1.3048");
        const lon = parseFloat(url.searchParams.get("lon") || "103.8318");
        try {
          const taxiData = await fetchTaxiAvailability();
          const stands = await getNearbyTaxiStands(lat, lon, 8);
          return new Response(JSON.stringify({
            taxis: taxiData.value || [],
            stands: stands || []
          }), {
            headers: {
              "content-type": "application/json",
              "access-control-allow-origin": "*"
            }
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: {
              "content-type": "application/json",
              "access-control-allow-origin": "*"
            }
          });
        }
      }

      // Handle Automated Train Disruption Broadcast Check
      if (url.pathname.endsWith("/api/check-train-alerts")) {
        try {
          const result = await checkAndBroadcastMRTCrowdAndDisruptions(bot);
          return new Response(JSON.stringify(result), {
            headers: {
              "content-type": "application/json",
              "access-control-allow-origin": "*"
            }
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: {
              "content-type": "application/json",
              "access-control-allow-origin": "*"
            }
          });
        }
      }

      // Handle Live Traffic Incidents JSON API for live map
      if (url.pathname.endsWith("/api/incidents")) {
        try {
          const incidentsData = await fetchTrafficIncidents();
          return new Response(JSON.stringify({
            incidents: incidentsData.value || []
          }), {
            headers: {
              "content-type": "application/json",
              "access-control-allow-origin": "*"
            }
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: {
              "content-type": "application/json",
              "access-control-allow-origin": "*"
            }
          });
        }
      }

      // Handle All-in-One Super-Map Consolidated Data API
      if (url.pathname.endsWith("/api/super-map-data")) {
        try {
          const lat = parseFloat(url.searchParams.get("lat") || "1.3521");
          const lon = parseFloat(url.searchParams.get("lon") || "103.8198");

          // 1. SGT Time & ERP Gantries
          const sgtMeta = getSGTHourAndMinute();
          const gantriesWithRates = ERP_GANTRIES.map(g => {
            const carRate = getCurrentERPRate(g, "car");
            const motoRate = getCurrentERPRate(g, "moto");
            const hgvRate = getCurrentERPRate(g, "hgv");
            return {
              ...g,
              rates: {
                car: carRate,
                moto: motoRate,
                hgv: hgvRate
              }
            };
          });

          // 2. Traffic Cameras
          let cameras: any[] = [];
          try {
            const camData = await fetchTrafficImages();
            const rawCams = camData?.value || [];
            cameras = rawCams.map((c: any) => {
              const meta = getCameraMeta(c.CameraID, c.Latitude, c.Longitude);
              return {
                id: String(c.CameraID),
                name: meta.name,
                corridor: meta.exp,
                lat: parseFloat(c.Latitude),
                lon: parseFloat(c.Longitude),
                image: c.ImageLink
              };
            });
          } catch (camErr) {
            console.error("Super-Map fetch cameras error:", camErr);
          }

          // 3. Traffic Incidents
          let incidents: any[] = [];
          try {
            const incData = await fetchTrafficIncidents();
            incidents = (incData?.value || []).map((i: any) => ({
              type: i.Type,
              icon: getIncidentIcon(i.Type),
              message: i.Message,
              lat: parseFloat(i.Latitude),
              lon: parseFloat(i.Longitude)
            }));
          } catch (incErr) {
            console.error("Super-Map fetch incidents error:", incErr);
          }

          // 4. EV Charging Hubs
          const evHubs = Object.values(EV_HUBS).map(h => ({
            name: h.name,
            postal: h.postal,
            area: h.area,
            lat: h.lat,
            lon: h.lon
          }));

          // 5. Vacant Taxis Count & Stands
          let taxiCount = 0;
          let nearbyStands: any[] = [];
          try {
            const taxiData = await fetchTaxiAvailability();
            const rawTaxis = taxiData?.value?.[0]?.TaxiPositions || [];
            taxiCount = rawTaxis.length;
            nearbyStands = await getNearbyTaxiStands(lat, lon, 20);
          } catch (taxiErr) {
            console.error("Super-Map fetch taxis error:", taxiErr);
          }

          return new Response(JSON.stringify({
            sgt: sgtMeta,
            erp: gantriesWithRates,
            cameras: cameras,
            incidents: incidents,
            ev_hubs: evHubs,
            taxi_count: taxiCount,
            taxi_stands: nearbyStands
          }), {
            headers: {
              "content-type": "application/json",
              "access-control-allow-origin": "*"
            }
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: {
              "content-type": "application/json",
              "access-control-allow-origin": "*"
            }
          });
        }
      }

      // Handle Registering Native Telegram Slash Commands
      if (url.pathname.endsWith("/api/setup-commands")) {
        try {
          const commands = [
            { command: "supermap", description: "🗺️ All-in-one live transit radar map (ERP, Cams, Incidents, Taxis, EV)" },
            { command: "map", description: "🗺️ Interactive Singapore transit super-map" },
            { command: "goto", description: "🗺️ Plan direct & transfer bus journeys" },
            { command: "bus", description: "🚌 Live bus arrival timings & search" },
            { command: "alight", description: "🔔 Set bus alighting alarm with live location" },
            { command: "cancelalight", description: "⏹️ Stop and cancel active alighting alarm" },
            { command: "route", description: "🚍 Bus route stops & operating hours" },
            { command: "mrt", description: "🚆 Station platform crowd levels" },
            { command: "disruptions", description: "⚠️ Train breakdown status & bridging" },
            { command: "mrtalerts", description: "🔔 Manage MRT disruption push alerts" },
            { command: "checkpoint", description: "🇸🇬🇲🇾 Causeway & Tuas live cameras & road advisory" },
            { command: "erp", description: "💳 Live ERP gantry rates, schedules & vehicle rates" },
            { command: "ev", description: "⚡ Live EV chargers, plug speeds & availability" },
            { command: "taxi", description: "🚕 Vacant taxi counts & taxi stands" },
            { command: "carpark", description: "🚗 Live carpark lot availability" },
            { command: "traffic", description: "📷 Checkpoint & expressway traffic cameras" },
            { command: "incidents", description: "🚨 Real-time traffic alerts & radar map" },
            { command: "bike", description: "🚲 MRT bicycle parking & rack shelters" },
            { command: "favorites", description: "⭐ View your saved stops & cameras" },
            { command: "menu", description: "📋 Main interactive navigation menu" },
            { command: "help", description: "ℹ️ Complete user guide & tips" }
          ];
          await bot.api.setMyCommands(commands);
          return new Response(JSON.stringify({ ok: true, message: "Commands registered successfully" }), {
            headers: {
              "content-type": "application/json",
              "access-control-allow-origin": "*"
            }
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: {
              "content-type": "application/json",
              "access-control-allow-origin": "*"
            }
          });
        }
      }
    }

    return await handleUpdate(req);
  } catch (err) {
    console.error("Deno.serve error:", err);
    return new Response(String(err), { status: 500 });
  }
});
