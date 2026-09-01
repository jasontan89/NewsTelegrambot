export interface ERPSlot {
  start: string;
  end: string;
  rate: number;
}

export interface ERPGantry {
  id: string;
  name: string;
  corridor: string;
  corridorName: string;
  direction: string;
  lat: number;
  lon: number;
  slotsWeekday: ERPSlot[];
  slotsSaturday?: ERPSlot[];
}

export const ERP_CORRIDORS: Record<string, { name: string; icon: string; description: string }> = {
  CTE: { name: "Central Expressway (CTE)", icon: "🛄", description: "Braddell, PIE slip, Yio Chu Kang corridors" },
  PIE: { name: "Pan-Island Expressway (PIE)", icon: "🛄", description: "Adam Rd, Kallang Bahru, Eunos, Toa Payoh" },
  AYE: { name: "Ayer Rajah Expressway (AYE)", icon: "🛄", description: "Alexandra, Jurong Town Hall, Buona Vista" },
  KPE: { name: "Kallang-Paya Lebar (KPE)", icon: "🛄", description: "Airport Rd, Defu, Tampines slip" },
  ECP_MCE: { name: "ECP & MCE Corridors", icon: "🛄", description: "Fort Rd, Sheares Bridge, Maxwell Rd, Central Blvd" },
  CBD: { name: "CBD Restricted Zone", icon: "🏴", description: "Shenton Way, Nicoll Hwy, Victoria St, Anson Rd" },
  ORCHARD: { name: "Orchard Cordon", icon: "🝍", description: "Orchard Rd, Scotts Rd, Orchard Turn, Fort Canning Tunnel" },
  OUTER_RING: { name: "Outer Ring Arterials", icon: "😩", description: "Dunearn Rd, Bukit Timah, Bendemeer, Thomson" }
};

export const ERP_GANTRIES: ERPGantry[] = [
  {
    id: "CTE_S_BRADDELL",
    name: "CTE Southbound before Braddell Rd",
    corridor: "CTE",
    corridorName: "Central Expressway (CTE)",
    direction: "Southbound (City Bound)",
    lat: 1.3482,
    lon: 103.8567,
    slotsWeekday: [
      { start: "07:00", end: "07:30", rate: 1.00 },
      { start: "07:30", end: "08:00", rate: 2.00 },
      { start: "08:00", end: "08:30", rate: 3.00 },
      { start: "08:30", end: "09:00", rate: 4.00 },
      { start: "09:00", end: "09:30", rate: 2.00 },
      { start: "09:30", end: "10:00", rate: 1.00 }
    ]
  },
  {
    id: "CTE_S_AFTER_BRADDELL",
    name: "CTE Southbound after Braddell Rd (PIE Slip)",
    corridor: "CTE",
    corridorName: "Central Expressway (CTE!)",
    direction: "Southbound",
    lat: 1.3412,
    lon: 103.8574,
    slotsWeekday: [
      { start: "07:00", end: "07:30", rate: 1.00 },
      { start: "07:30", end: "08:00", rate: 2.00 },
      { start: "08:00", end: "08:30", rate: 3.00 },
      { start: "08:30", end: "09:00", rate: 3.50 },
      { start: "09:00", end: "09:30", rate: 2.00 },
      { start: "09:30", end: "10:00", rate: 1.00 }
    ]
  },
  {
    id: "CTE_N_PIE_BRADDELL",
    name: "CTE Northbound between PIE and Braddell Rd",
    corridor: "CTE",
    corridorName: "Central Expressway (CTE)",
    direction: "Northbound (Evening Peak)",
    lat: 1.3395,
    lon: 103.8580,
    slotsWeekday: [
      { start: "17:30", end: "18:00", rate: 1.00 },
      { start: "18:00", end: "18:30", rate: 2.50 },
      { start: "18:30", end: "19:00", rate: 3.50 },
      { start: "19:00", end: "19:30", rate: 2.50 },
      { start: "19:30", end: "20:00", rate: 1.00 }
    ]
  },
  {
    id: "CTE_N_AFTER_BRADDELL",
    name: "CTE Northbound after Braddell Rd",
    corridor: "CTE",
    corridorName: "Central Expressway (CTE)",
    direction: "Northbound",
    lat: 1.3520,
    lon: 103.8570,
    slotsWeekday: [
      { start: "17:30", end: "18:00", rate: 1.00 },
      { start: "18:00", end: "18:30", rate: 2.00 },
      { start: "18:30", end: "19:00", rate: 3.00 },
      { start: "19:00", end: "19:30", rate: 2.00 },
      { start: "19:30", end: "20:00", rate: 1.00 }
    ]
  },
  {
    id: "CTE_N_YIO_CMU_KANG",
    name: "CTE Northbound before Yio Chu Kang Rd",
    corridor: "CTE",
    corridorName: "Central Expressway (CTE)",
    direction: "Northbound",
    lat: 1.3780,
    lon: 103.8585,
    slotsWeekday: [
      { start: "17:30", end: "18:00", rate: 1.00 },
      { start: "18:00", end: "18:30", rate: 2.00 },
      { start: "18:30", end: "19:00", rate: 2.00 },
      { start: "19:00", end: "19:30", rate: 1.00 }
    ]
  },
  {
    id: "PIE_E_KALLANG",
    name: "PIE Eastbound after Kallang Bahru (CTE Slip)",
    corridor: "PIE",
    corridorName: "Pan-Island Expressway (PIE)",
    direction: "Eastbound",
    lat: 1.3256,
    lon: 103.8680,
    slotsWeekday: [
      { start: "07:30", end: "08:00", rate: 1.00 },
      { start: "08:00", end: "08:30", rate: 2.00 },
      { start: "08:30", end: "09:00", rate: 2.50 },
      { start: "09:00", end: "09:30", rate: 1.50 }
    ]
  },
  {
    id: "PIE_E_EUNOS",
    name: "PIE Eastbound before Eunos Link",
    corridor: "PIE",
    corridorName: "Pan-Island Expressway (PIE)",
    direction: "Eastbound",
    lat: 1.3320,
    lon: 103.9020,
    slotsWeekday: [
      { start: "07:30", end: "08:00", rate: 1.00 },
      { start: "08:00", end: "08:30", rate: 2.00 },
      { start: "08:30", end: "09:00", rate: 2.00 },
      { start: "09:00", end: "09:30", rate: 1.00 }
    ]
  },
  {
    id: "PIE_W_ADAM",
    name: "PIE Westbound before Adam Rd & Mt Pleasant",
    corridor: "PIE",
    corridorName: "Pan-Island Expressway (PIE)",
    direction: "Westbound (Jurong Bound)",
    lat: 1.3290,
    lon: 103.8240,
    slotsWeekday: [
      { start: "07:30", end: "08:00", rate: 1.00 },
      { start: "08:00", end: "08:30", rate: 2.00 },
      { start: "08:30", end: "09:00", rate: 2.50 },
      { start: "09:00", end: "09:30", rate: 1.50 }
    ]
  },
  {
    id: "PIE_W_TOA_PAYOH",
    name: "PIE Westbound after Toa Payoh exit",
    corridor: "PIE",
    corridorName: "Pan-Island Expressway (PIE)",
    direction: "Westbound",
    lat: 1.3350,
    lon: 103.8460,
    slotsWeekday: [
      { start: "17:30", end: "18:00", rate: 1.00 },
      { start: "18:00", end: "18:30", rate: 2.00 },
      { start: "18:30", end: "19:00", rate: 2.50 },
      { start: "19:00", end: "19:30", rate: 1.00 }
    ]
  },
  {
    id: "AYE_E_ALEXANDRA",
    name: "AYE Eastbound before Alexandra Rd",
    corridor: "AYE",
    corridorName: "Ayer Rajah Expressway (AYE)",
    direction: "Eastbound (City Bound)",
    lat: 1.2850,
    lon: 103.8010,
    slotsWeekday: [
      { start: "07:30", end: "08:00", rate: 1.00 },
      { start: "08:00", end: "08:30", rate: 2.00 },
      { start: "08:30", end: "09:00", rate: 3.00 },
      { start: "09:00", end: "09:30", rate: 1.50 }
    ]
  },
  {
    id: "AYE_E_JURONG_TOWN",
    name: "AYE Eastbound after Jurong Town Hall Rd",
    corridor: "AYE",
    corridorName: "Ayer Rajah Expressway (AYE)",
    direction: "Eastbound",
    lat: 1.3190,
    lon: 103.7460,
    slotsWeekday: [
      { start: "07:30", end: "08:00", rate: 1.00 },
      { start: "08:00", end: "08:30", rate: 2.00 },
      { start: "08:30", end: "09:00", rate: 2.00 }
    ]
  },
  {
    id: "AYE_W_BUONA_VISTA",
    name: "AYE Westbound after North Buona Vista Rd",
    corridor: "AYE",
    corridorName: "Ayer Rajah Expressway (AYE)",
    direction: "Westbound (Tuas Bound)",
    lat: 1.2990,
    lon: 103.7870,
    slotsWeekday: [
      { start: "17:30", end: "18:00", rate: 1.00 },
      { start: "18:00", end: "18:30", rate: 2.00 },
      { start: "18:30", end: "19:00", rate: 2.50 },
      { start: "19:00", end: "19:30", rate: 1.50 },
      { start: "19:30", end: "20:00", rate: 1.00 }
    ]
  },
  {
    id: "AYE_W_CLEMENTI",
    name: "AYE Westbound near Clementi Ave 6",
    corridor: "AYE",
    corridorName: "Ayer Rajah Expressway (AYE)",
    direction: "Westbound",
    lat: 1.3120,
    lon: 103.7620,
    slotsWeekday: [
      { start: "17:30", end: "18:00", rate: 1.00 },
      { start: "18:00", end: "18:30", rate: 1.50 },
      { start: "18:30", end: "19:00", rate: 2.00 },
      { start: "19:00", end: "19:30", rate: 1.00 }
    ]
  },
  {
    id: "KPE_S_AIRPORT_RD",
    name: "KPE Southbound after Defu Flyover / Airport Rd",
    corridor: "KPE",
    corridorName: "Kallang-Paya Lebar (KPE)",
    direction: "Southbound (City Bound)",
    lat: 1.3480,
    lon: 103.8890,
    slotsWeekday: [
      { start: "07:00", end: "07:30", rate: 1.00 },
      { start: "07:30", end: "08:00", rate: 2.00 },
      { start: "08:00", end: "08:30", rate: 3.00 },
      { start: "08:30", end: "09:00", rate: 4.00 },
      { start: "09:00", end: "09:30", rate: 2.00 }
    ]
  },
  {
    id: "KPE_S_TAMPINES",
    name: "KPE Southbound slip road from Tampines Rd",
    corridor: "KPE",
    corridorName: "Kallang-Paya Lebar (KPE)",
    direction: "Southbound",
    lat: 1.3550,
    lon: 103.8930,
    slotsWeekday: [
      { start: "07:00", end: "07:30", rate: 1.00 },
      { start: "07:30", end: "08:00", rate: 2.00 },
      { start: "08:00", end: "08:30", rate: 2.50 },
      { start: "08:30", end: "09:00", rate: 3.00 }
    ]
  },
  {
    id: "ECP_W_FORT_RD",
    name: "ECP Westbound before Fort Rd & Sheares Bridge",
    corridor: "ECP_MCE",
    corridorName: "ECP & MCE Corridors",
    direction: "Westbound (City Bound)",
    lat: 1.2980,
    lon: 103.8810,
    slotsWeekday: [
      { start: "07:30", end: "08:00", rate: 1.00 },
      { start: "08:00", end: "08:30", rate: 2.00 },
      { start: "08:30", end: "09:00", rate: 2.50 }
    ]
  },
  {
    id: "MCE_W_MAXWELL",
    name: "MCE Westbound before Maxwell Rd exit",
    corridor: "ECP_MCE",
    corridorName: "ECP & MCE Corridors",
    direction: "Westbound",
    lat: 1.2720,
    lon: 103.8510,
    slotsWeekday: [
      { start: "07:30", end: "08:00", rate: 1.00 },
      { start: "08:00", end: "08:30", rate: 2.00 },
      { start: "08:30", end: "09:00", rate: 2.50 },
      { start: "09:00", end: "09:30", rate: 1.00 }
    ]
  },
  {
    id: "MCE_E_CENTRAL_BLVD",
    name: "MCE Eastbound before Central Blvd",
    corridor: "ECP_MCE",
    corridorName: "ECP & MCE Corridors",
    direction: "Eastbound",
    lat: 1.2740,
    lon: 103.8560,
    slotsWeekday: [
      { start: "17:30", end: "18:00", rate: 1.00 },
      { start: "18:00", end: "18:30", rate: 2.00 },
      { start: "18:30", end: "19:00", rate: 2.00 },
      { start: "19:00", end: "19:30", rate: 1.00 }
    ]
  },
  {
    id: "CBD_NICOLL",
    name: "CBD - Nicoll Highway into City",
    corridor: "CBD",
    corridorName: "CBD Restricted Zone",
    direction: "City Inbound",
    lat: 1.2960,
    lon: 103.8580,
    slotsWeekday: [
      { start: "07:30", end: "08:00", rate: 1.00 },
      { start: "08:00", end: "08:30", rate: 2.00 },
      { start: "08:30", end: "09:00", rate: 2.50 },
      { start: "09:00", end: "09:30", rate: 1.50 },
      { start: "17:30", end: "18:00", rate: 1.00 },
      { start: "18:00", end: "18:30", rate: 2.00 },
      { start: "18:30", end: "19:00", rate: 2.00 }
    ]
  },
  {
    id: "CTD_VICTORIA",
    name: "CBD - Victoria Street near Bugis",
    corridor: "CBD",
    corridorName: "CBD Restricted Zone",
    direction: "City Inbound",
    lat: 1.2990,
    lon: 103.8560,
    slotsWeekday: [
      { start: "07:30", end: "08:00", rate: 1.00 },
      { start: "08:00", end: "08:30", rate: 2.00 },
      { start: "08:30", end: "09:00", rate: 2.00 },
      { start: "09:00", end: "09:30", rate: 1.00 },
      { start: "17:30", end: "18:00", rate: 1.00 },
      { start: "18:00", end: "18:30", rate: 1.50 },
      { start: "18:30", end: "19:00", rate: 1.50 }
    ]
  },
  {
    id: "CTD_ANSON",
    name: "CBD - Anson Road / Shenton Way",
    corridor: "CBD",
    corridorName: "CBD Restricted Zone",
    direction: "Financial District",
    lat: 1.2740,
    lon: 103.8440,
    slotsWeekday: [
      { start: "07:30", end: "08:00", rate: 1.00 },
      { start: "08:00", end: "08:30", rate: 2.00 },
      { start: "08:30", end: "09:00", rate: 2.50 },
      { start: "09:00", end: "09:30", rate: 1.50 }
    ]
  },
  {
    id: "CBD_EU_TONG_SEN",
    name: "CBD - Eu Tong Sen Street / Chinatown",
    corridor: "CBD",
    corridorName: "CBD Restricted Zone",
    direction: "City Inbound",
    lat: 1.2840,
    lon: 103.8450,
    slotsWeekday: [
      { start: "07:30", end: "08:00", rate: 1.00 },
      { start: "08:00", end: "08:30", rate: 2.00 },
      { start: "08:30", end: "09:00", rate: 2.00 },
      { start: "09:00", end: "09:30", rate: 1.00 }
    ]
  },
  {
    id: "ORCHARD_RD",
    name: "Orchard Rd near Plaza Singapura",
    corridor: "ORCHARD",
    corridorName: "Orchard Cordon",
    direction: "Orchard Inbound",
    lat: 1.3006,
    lon: 103.8449,
    slotsWeekday: [
      { start: "11:00", end: "12:00", rate: 1.00 },
      { start: "12:00", end: "13:00", rate: 1.00 },
      { start: "13:00", end: "14:00", rate: 1.00 },
      { start: "14:00", end: "15:00", rate: 1.00 },
      { start: "15:00", end: "16:00", rate: 1.00 },
      { start: "16:00", end: "17:00", rate: 1.00 },
      { start: "17:00", end: "18:00", rate: 1.00 },
      { start: "18:00", end: "19:00", rate: 1.00 }
    ]
  },
  {
    id: "ORCHARD_TURN",
    name: "Orchard Turn / Paterson Rd into Orchard",
    corridor: "ORCHARD",
    corridorName: "Orchard Cordon",
    direction: "Orchard Central",
    lat: 1.3040,
    lon: 103.8320,
    slotsWeekday: [
      { start: "11:00", end: "12:00", rate: 1.00 },
      { start: "12:00", end: "13:00", rate: 1.00 },
      { start: "13:00", end: "14:00", rate: 1.00 },
      { start: "14:00", end: "15:00", rate: 1.00 },
      { start: "15:00", end: "16:00", rate: 1.00 },
      { start: "16:00", end: "17:00", rate: 1.00 },
      { start: "17:00", end: "18:00", rate: 1.00 },
      { start: "18:00", end: "19:00", rate: 1.00 }
    ]
  },
  {
    id: "ORCHARD_SCOTTS",
    name: "Scotts Road towards Orchard Rd",
    corridor: "ORCHARD",
    corridorName: "Orchard Cordon",
    direction: "Orchard Inbound",
    lat: 1.3060,
    lon: 103.8330,
    slotsWeekday: [
      { start: "11:00", end: "12:00", rate: 1.00 },
      { start: "12:00", end: "13:00", rate: 1.00 },
      { start: "13:00", end: "14:00", rate: 1.00 },
      { start: "14:00", end: "15:00", rate: 1.00 },
      { start: "15:00", end: "16:00", rate: 1.00 },
      { start: "16:00", end: "17:00", rate: 1.00 },
      { start: "17:00", end: "18:00", rate: 1.00 },
      { start: "18:00", end: "19:00", rate: 1.00 }
    ]
  },
  {
    id: "ORCHARD_CRAWFORD",
    name: "Fort Canning Tunnel into Penang Rd",
    corridor: "ORCHARD",
    corridorName: "Orchard Cordon",
    direction: "Orchard Inbound",
    lat: 1.2950,
    lon: 103.8440,
    slotsWeekday: [
      { start: "11:00", end: "12:00", rate: 1.00 },
      { start: "12:00", end: "13:00", rate: 1.00 },
      { start: "13:00", end: "14:00", rate: 1.00 },
      { start: "14:00", end: "15:00", rate: 1.00 },
      { start: "15:00", end: "16:00", rate: 1.00 },
      { start: "16:00", end: "17:00", rate: 1.00 },
      { start: "17:00", end: "18:00", rate: 1.00 },
      { start: "18:00", end: "19:00", rate: 1.00 }
    ]
  },
  {
    id: "ORR_DUNEARN",
    name: "Dunearn Road before Whitley Rd",
    corridor: "OUTER_RING",
    corridorName: "Outer Ring Arterials",
    direction: "City Inbound",
    lat: 1.3200,
    lon: 103.8270,
    slotsWeekday: [
      { start: "07:30", end: "08:00", rate: 1.00 },
      { start: "08:00", end: "08:30", rate: 2.00 },
      { start: "08:30", end: "09:00", rate: 2.00 },
      { start: "09:00", end: "09:30", rate: 1.00 }
    ]
  },
  {
    id: "ORR_BUKIT_TIMAH",
    name: "Bukit Timah Road near KK Hospital",
    corridor: "OUTER_RING",
    corridorName: "Outer Ring Arterials",
    direction: "City Inbound",
    lat: 1.3110,
    lon: 103.8470,
    slotsWeekday: [
      { start: "07:30", end: "08:00", rate: 1.00 },
      { start: "08:00", end: "08:30", rate: 1.50 },
      { start: "08:30", end: "09:00", rate: 2.00 },
      { start: "09:00", end: "09:30", rate: 1.00 }
    ]
  },
  {
    id: "ORR_BENDEMEER",
    name: "Bendemeer Road towards Boon Kewg",
    corridor: "OUTER_RING",
    corridorName: "Outer Ring Arterials",
    direction: "City Inbound",
    lat: 1.3180,
    lon: 103.8640,
    slotsWeekday: [
      { start: "07:30", end: "08:00", rate: 1.00 },
      { start: "08:00", end: "08:30", rate: 1.50 },
      { start: "08:30", end: "09:00", rate: 2.00 },
      { start: "09:00", end: "09:30", rate: 1.00 }
    ]
  },
  {
    id: "ORR_THOMSON",
    name: "Thomson Road near Novena / Toa Payoh",
    corridor: "OUTER_RING",
    corridorName: "Outer Ring Arterials",
    direction: "City Inbound",
    lat: 1.3250,
    lon: 103.8420,
    slotsWeekday: [
      { start: "07:30", end: "08:00", rate: 1.00 },
      { start: "08:00", end: "08:30", rate: 1.50 },
      { start: "08:30", end: "09:00", rate: 2.00 },
      { start: "09:00", end: "09:30", rate: 1.00 }
    ]
  }
];

export function getSGTHourAndMinute(date: Date = new Date()): {
  hours: number;
  minutes: number;
  day: number;
  timeStr: string;
  dayName: string;
  currentHM: string;
} {
  const formatter = new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "long"
  });

  const parts = formatter.formatToParts(date);
  let hourStr = "00";
  let minStr = "00";
  let dayName = "Monday";

  for (const part of parts) {
    if (part.type === "hour") hourStr = part.value;
    if (part.type === "minute") minStr = part.value;
    if (part.type === "weekday") dayName = part.value;
  }

  let hours = parseInt(hourStr, 10);
  if (hours === 24) hours = 0;
  const minutes = parseInt(minStr, 10);

  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const day = daysOfWeek.indexOf(dayName);

  const displayFormatter = new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
  const timeStr = displayFormatter.format(date);
  const currentHM = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

  return { hours, minutes, day, timeStr, dayName, currentHM };
}

export function getSGTDate(): Date {
  return new Date();
}

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function calculateVehicleRate(baseRate: number, vehicleType: string = "car"): number {
  if (baseRate <= 0) return 0;
  if (vehicleType === "moto") {
    return Math.max(0.50, Math.round((baseRate * 0.5) * 100) / 100);
  }
  if (vehicleType === "hgv") {
    return Math.round((baseRate * 1.5) * 100) / 100;
  }
  return baseRate;
}

export function getCurrentERPRate(gantry: any, vehicleType: string = "car", date?: Date) {
  const sgt = getSGTHourAndMinute(date || new Date());
  const { day, currentHM, timeStr, dayName } = sgt;

  if (day === 0) {
    return {
      status: "FREE",
      activeRate: 0,
      baseRate: 0,
      activeSlot: null,
      nextSlot: null,
      currentHM,
      timeStr,
      dayName,
      message: "🟢 <b>FREE (No ERP on Sundays & Public Holidays)</b>"
    };
  }

  const slots = (gantry.slotsWeekday) || [];
  const curMins = timeToMins(currentHM);

  let activeSlot: any = null;
  let nextSlot: any = null;

  for (const s of slots) {
    const sMins = timeToMins(s.start);
    const eMins = timeToMins(s.end);

    if (curMins >= sMins && curMins < eMins) {
      activeSlot = s;
    } else if (curMins < sMins && !nextSlot) {
      nextSlot = s;
    }
  }

  const baseRate = activeSlot ? activeSlot.rate : 0;
  const activeRate = calculateVehicleRate(baseRate, vehicleType);
  const nextRate = nextSlot ? calculateVehicleRate(nextSlot.rate, vehicleType) : 0;

  return {
    status: activeRate > 0 ? "ACTIVE" : "FREE",
    activeRate,
    baseRate,
    activeSlot,
    nextSlot: nextSlot ? { ...nextSlot, rate: nextRate } : null,
    currentHM,
    timeStr,
    dayName,
    message: activeRate > 0
      ? `🔴 <b>ACTIVE: $${activeRate.toFixed(2)}</b> (until ${activeSlot?.end})`
      : "🟢 <b>FREE ($0.00)</b>"
  };
}

export function searchERPGantries(query: string): any[] {
  const cleanQ = query.trim().toUpperCase();
  if (!cleanQ || cleanQ === "ALL") return ERP_GANTRIES;

  return ERP_GANTRIES.filter(g =>
    g.id.toUpperCase().includes(cleanQ) ||
    g.corridor.toUpperCase().includes(cleanQ) ||
    g.corridorName.toUpperCase().includes(cleanQ) ||
    g.name.toUpperCase().includes(cleanQ) ||
    g.direction.toUpperCase().includes(cleanQ)
  );
}

export function getGantriesByCorridor(corridor: string): any[] {
  const c = corridor.toUpperCase();
  if (c === "ALL") return ERP_GANTRIES;
  return ERP_GANTRIES.filter(g => g.corridor === c);
}