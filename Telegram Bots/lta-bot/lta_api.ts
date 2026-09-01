const LTA_API_URL = "https://datamall2.mytransport.sg/ltaodataservice";
const ACCOUNT_KEY = "vBe1lm0lQc2G5wIoeSJwpQ=="; 

export async function fetchBusArrival(busStopCode: string) {
  const url = `${LTA_API_URL}/v3/BusArrival?BusStopCode=${busStopCode}`;
  const response = await fetch(url, {
    headers: { AccountKey: ACCOUNT_KEY }
  });
  if (!response.ok) throw new Error("Failed to fetch bus arrival data");
  return response.json();
}

export async function fetchTrafficImages() {
  const url = `${LTA_API_URL}/Traffic-Imagesv2`;
  const response = await fetch(url, {
    headers: { AccountKey: ACCOUNT_KEY }
  });
  if (!response.ok) throw new Error("Failed to fetch traffic images");
  return response.json();
}

export async function fetchCarparkAvailability() {
  const url = `${LTA_API_URL}/CarParkAvailabilityv2`;
  const response = await fetch(url, {
    headers: { AccountKey: ACCOUNT_KEY }
  });
  if (!response.ok) throw new Error("Failed to fetch carpark data");
  return response.json();
}

export async function fetchERPRates() {
  const url = `${LTA_API_URL}/ERPRates`;
  const response = await fetch(url, {
    headers: { AccountKey: ACCOUNT_KEY }
  });
  if (!response.ok) throw new Error("Failed to fetch ERP rates");
  return response.json();
}

export async function fetchTrafficIncidents() {
  const url = `${LTA_API_URL}/TrafficIncidents`;
  const response = await fetch(url, {
    headers: { AccountKey: ACCOUNT_KEY }
  });
  if (!response.ok) throw new Error("Failed to fetch traffic incidents");
  return response.json();
}

export async function fetchMRTCrowd(line: string = "NSL") {
  const url = `${LTA_API_URL}/PCDRealTime?TrainLine=${line}`;
  const response = await fetch(url, {
    headers: { AccountKey: ACCOUNT_KEY }
  });
  if (!response.ok) throw new Error("Failed to fetch MRT crowd data");
  return response.json();
}

export async function fetchTrainAlerts() {
  const url = `${LTA_API_URL}/TrainServiceAlerts`;
  const response = await fetch(url, {
    headers: { AccountKey: ACCOUNT_KEY }
  });
  if (!response.ok) throw new Error("Failed to fetch train service alerts");
  return response.json();
}

export async function fetchTaxiAvailability() {
  const url = `${LTA_API_URL}/Taxi-Availability`;
  const response = await fetch(url, {
    headers: { AccountKey: ACCOUNT_KEY }
  });
  if (!response.ok) throw new Error("Failed to fetch taxi availability");
  return response.json();
}

export async function fetchTaxiStands() {
  const url = `${LTA_API_URL}/TaxiStands`;
  const response = await fetch(url, {
    headers: { AccountKey: ACCOUNT_KEY }
  });
  if (!response.ok) throw new Error("Failed to fetch taxi stands");
  return response.json();
}

export async function fetchBicycleParking(lat: number, lon: number, dist: number = 0.5) {
  const url = `${LTA_API_URL}/BicycleParkingv2?Lat=${lat}&Long=${lon}&Dist=${dist}`;
  const response = await fetch(url, {
    headers: { AccountKey: ACCOUNT_KEY }
  });
  if (!response.ok) throw new Error("Failed to fetch bicycle parking data");
  return response.json();
}

export async function fetchEVChargingPoints(postalCode: string) {
  const cleanCode = (postalCode || "").trim().replace(/\D/g, "");
  const url = `${LTA_API_URL}/EVChargingPoints?PostalCode=${cleanCode}`;
  const response = await fetch(url, {
    headers: { AccountKey: ACCOUNT_KEY }
  });
  if (!response.ok) throw new Error("Failed to fetch EV charging data");
  return response.json();
}
