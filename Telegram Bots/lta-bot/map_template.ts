export function renderTaxiMapHtml(targetLat: number, targetLon: number, locationTitle: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Taxi Radar - ${locationTitle}</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body, html { width: 100%; height: 100%; overflow: hidden; background: #181c24; color: #fff; }
    #map { width: 100%; height: 100%; z-index: 1; }

    .top-header {
      position: absolute;
      top: 12px;
      left: 12px;
      right: 12px;
      z-index: 1000;
      background: rgba(24, 28, 36, 0.94);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 14px;
      padding: 10px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    }
    .header-title h1 {
      font-size: 15px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .header-title p {
      font-size: 12px;
      color: #9aa0a6;
      margin-top: 1px;
    }
    .badge {
      background: #238636;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 20px;
      letter-spacing: 0.3px;
      white-space: nowrap;
      transition: all 0.3s ease;
    }
    .badge.loading {
      background: #8957e5;
    }

    .action-controls {
      position: absolute;
      bottom: 24px;
      right: 14px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .action-btn {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: #21262d;
      border: 1px solid rgba(255,255,255,0.18);
      color: #fff;
      font-size: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 6px 18px rgba(0,0,0,0.4);
      transition: transform 0.15s ease, background 0.2s;
    }
    .action-btn:active {
      transform: scale(0.92);
      background: #30363d;
    }

    .legend-bar {
      position: absolute;
      bottom: 24px;
      left: 14px;
      z-index: 1000;
      background: rgba(24, 28, 36, 0.9);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 6px 10px;
      font-size: 11px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      color: #c9d1d9;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .user-marker {
      width: 22px;
      height: 22px;
      background: #1f6feb;
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 0 0 6px rgba(31, 111, 235, 0.35);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(31, 111, 235, 0.6); }
      70% { box-shadow: 0 0 0 14px rgba(31, 111, 235, 0); }
      100% { box-shadow: 0 0 0 0 rgba(31, 111, 235, 0); }
    }

    .taxi-marker {
      width: 32px;
      height: 32px;
      background: #f1c40f;
      border: 2px solid #2c3e50;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 17px;
      box-shadow: 0 3px 8px rgba(0,0,0,0.4);
      cursor: pointer;
      transition: transform 0.2s;
    }
    .taxi-marker:hover {
      transform: scale(1.18);
    }

    .stand-marker {
      width: 30px;
      height: 30px;
      background: #0969da;
      border: 2px solid #fff;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      box-shadow: 0 3px 8px rgba(0,0,0,0.4);
      cursor: pointer;
    }

    .leaflet-popup-content-wrapper {
      background: #1f242d;
      color: #fff;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.12);
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    }
    .leaflet-popup-tip {
      background: #1f242d;
    }
    .popup-content {
      padding: 4px;
      font-size: 13px;
    }
    .popup-title {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 4px;
      color: #58a6ff;
    }
    .popup-sub {
      color: #8b949e;
      font-size: 12px;
      margin-bottom: 8px;
    }
    .btn-nav {
      display: block;
      width: 100%;
      text-align: center;
      background: #238636;
      color: #fff;
      text-decoration: none;
      font-weight: 600;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 12px;
      margin-top: 6px;
    }
  </style>
</head>
<body>

  <div class="top-header">
    <div class="header-title">
      <h1>🚕 SG Taxi Radar</h1>
      <p id="loc-name">${locationTitle}</p>
    </div>
    <div id="taxi-badge" class="badge">Scanning...</div>
  </div>

  <div id="map"></div>

  <div class="legend-bar">
    <div class="legend-item"><span>🔵</span> Searched Location</div>
    <div class="legend-item"><span>🚕</span> Vacant Taxi (Live)</div>
    <div class="legend-item"><span>🚖</span> Official Taxi Stand</div>
  </div>

  <div class="action-controls">
    <button class="action-btn" id="btn-refresh" title="Refresh Taxis">&#128260;</button>
    <button class="action-btn" id="btn-locate" title="Center My Location">&#127919;</button>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }

    let centerLat = ${targetLat};
    let centerLon = ${targetLon};
    let locTitle = "${locationTitle}";

    const map = L.map('map', {
      center: [centerLat, centerLon],
      zoom: 16,
      zoomControl: false
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    const userLayer = L.layerGroup().addTo(map);
    const taxiLayer = L.layerGroup().addTo(map);
    const standLayer = L.layerGroup().addTo(map);
    const rangeLayer = L.layerGroup().addTo(map);

    function updateCenterPin(lat, lon, title) {
      userLayer.clearLayers();
      rangeLayer.clearLayers();

      L.circle([lat, lon], {
        radius: 500,
        color: '#388bfd',
        fillColor: '#388bfd',
        fillOpacity: 0.08,
        weight: 1.5,
        dashArray: '4, 4'
      }).addTo(rangeLayer);

      L.circle([lat, lon], {
        radius: 1000,
        color: '#8b949e',
        fillOpacity: 0.02,
        weight: 1,
        dashArray: '2, 6'
      }).addTo(rangeLayer);

      const userIcon = L.divIcon({
        className: 'custom-div-icon',
        html: '<div class="user-marker"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker([lat, lon], { icon: userIcon }).addTo(userLayer);
      marker.bindPopup(\`
        <div class="popup-content">
          <div class="popup-title">&#128205; \${title}</div>
          <div class="popup-sub">Radar Center Coordinates</div>
          <div style="font-size: 11px; color: #8b949e;">Lat: \${lat.toFixed(4)}, Lon: \${lon.toFixed(4)}</div>
        </div>
      \`);
    }

    updateCenterPin(centerLat, centerLon, locTitle);

    function calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371000;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    async function loadTaxiData(lat, lon) {
      const badge = document.getElementById('taxi-badge');
      badge.textContent = 'Updating...';
      badge.classList.add('loading');

      try {
        const res = await fetch(\`/functions/v1/lta_bot/api/taxis?lat=\${lat}&lon=\${lon}\`);
        if (!res.ok) throw new Error('API fetch failed');
        const data = await res.json();

        taxiLayer.clearLayers();
        standLayer.clearLayers();

        let count500m = 0;
        let count1km = 0;

        const taxis = data.taxis || [];
        taxis.forEach(t => {
          const dist = calculateDistance(lat, lon, t.Latitude, t.Longitude);
          if (dist <= 500) count500m++;
          if (dist <= 1000) count1km++;

          if (dist <= 2500) {
            const taxiIcon = L.divIcon({
              className: 'custom-div-icon',
              html: '<div class="taxi-marker">🚕</div>',
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            });

            const m = L.marker([t.Latitude, t.Longitude], { icon: taxiIcon }).addTo(taxiLayer);
            m.bindPopup(\`
              <div class="popup-content">
                <div class="popup-title">🚕 Vacant Taxi</div>
                <div class="popup-sub">&#128205; ~\${Math.round(dist)}m from center</div>
                <div style="font-size: 11px; color: #3fb950; font-weight: 600;">Available Now (LTA Live Stream)</div>
              </div>
            \`);
          }
        });

        const stands = data.stands || [];
        stands.forEach(s => {
          const dist = Math.round(calculateDistance(lat, lon, s.latitude, s.longitude));
          const standIcon = L.divIcon({
            className: 'custom-div-icon',
            html: '<div class="stand-marker">🚖</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          });

          const m = L.marker([s.latitude, s.longitude], { icon: standIcon }).addTo(standLayer);
          const bfaBadge = s.bfa === 'Yes' ? '♿ Barrier-Free' : 'Standard';
          const mapsUrl = \`https://www.google.com/maps/dir/?api=1&destination=\${s.latitude},\${s.longitude}\`;
          
          m.bindPopup(\`
            <div class="popup-content">
              <div class="popup-title">🚖 Taxi Stand [\${s.taxi_code}]</div>
              <div style="font-weight: 600; color: #fff; margin-bottom: 2px;">\${s.name}</div>
              <div class="popup-sub">&#128205; ~\${dist}m away • \${s.type} • \${bfaBadge}</div>
              <a href="\${mapsUrl}" target="_blank" class="btn-nav">🚶 Walk to Stand (\${dist}m)</a>
            </div>
          \`);
        });

        badge.textContent = \`&#128994; \${count1km} Taxis (1km)\`;
        badge.classList.remove('loading');

      } catch (err) {
        console.error('Error fetching live taxis:', err);
        badge.textContent = '⚠️ Offline';
        badge.classList.remove('loading');
      }
    }

    loadTaxiData(centerLat, centerLon);

    document.getElementById('btn-refresh').addEventListener('click', () => {
      loadTaxiData(centerLat, centerLon);
    });

    document.getElementById('btn-locate').addEventListener('click', () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            centerLat = pos.coords.latitude;
            centerLon = pos.coords.longitude;
            locTitle = "Your Current Location";
            document.getElementById('loc-name').textContent = locTitle;
            map.flyTo([centerLat, centerLon], 16, { animate: true, duration: 1.2 });
            updateCenterPin(centerLat, centerLon, locTitle);
            loadTaxiData(centerLat, centerLon);
          },
          (err) => {
            alert("Could not access your GPS location. Please check device location permissions.");
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      }
    });
  </script>
</body>
</html>`;
}

export function renderERPMapHtml(initialVehicle: string = "car", initialCorridor: string = "ALL"): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Singapore ERP Gantry Radar</title>
  <!-- Leaflet CSS & JS -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <!-- Telegram WebApp SDK -->
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    body, html {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #0f131a;
      color: #ffffff;
    }
    #map {
      width: 100%;
      height: 100%;
      z-index: 1;
    }

    /* Top Glass Header Panel */
    .top-panel {
      position: absolute;
      top: 10px;
      left: 10px;
      right: 10px;
      z-index: 1000;
      background: rgba(18, 22, 32, 0.92);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border-radius: 14px;
      padding: 10px 14px;
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.45);
      border: 1px solid rgba(255, 255, 255, 0.12);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .header-title {
      font-size: 14px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .status-badge {
      font-size: 11px;
      padding: 4px 9px;
      border-radius: 20px;
      background: rgba(34, 197, 94, 0.18);
      color: #4ade80;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 5px;
      border: 1px solid rgba(74, 222, 128, 0.3);
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #22c55e;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { opacity: 0.3; }
      50% { opacity: 1; }
      100% { opacity: 0.3; }
    }

    /* Vehicle Selector Pills */
    .vehicle-pills {
      display: flex;
      gap: 6px;
      background: rgba(30, 36, 50, 0.6);
      padding: 3px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .veh-btn {
      flex: 1;
      background: transparent;
      border: none;
      color: #94a3b8;
      padding: 6px 4px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      transition: all 0.2s;
    }
    .veh-btn.active {
      background: #2563eb;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);
    }

    /* Horizontal Corridor Filter Bar */
    .corridor-bar {
      position: absolute;
      top: 100px;
      left: 10px;
      right: 10px;
      z-index: 1000;
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding-bottom: 4px;
      scrollbar-width: none;
    }
    .corridor-bar::-webkit-scrollbar { display: none; }
    .corr-pill {
      flex-shrink: 0;
      background: rgba(22, 27, 39, 0.9);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #cbd5e1;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .corr-pill.active {
      background: #0284c7;
      color: #ffffff;
      border-color: #38bdf8;
    }

    /* Floating Action Buttons (Locate Me & Zoom) */
    .floating-controls {
      position: absolute;
      bottom: 24px;
      right: 12px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .fab-btn {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: rgba(26, 32, 46, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.18);
      color: #fff;
      font-size: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);
      transition: transform 0.15s, background 0.2s;
    }
    .fab-btn:active {
      transform: scale(0.92);
      background: #334155;
    }

    /* Bottom Info Bar */
    .bottom-info-bar {
      position: absolute;
      bottom: 24px;
      left: 12px;
      right: 70px;
      z-index: 1000;
      background: rgba(18, 22, 32, 0.92);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      padding: 8px 12px;
      font-size: 11px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 16px rgba(0,0,0,0.35);
    }

    /* Custom Map Markers */
    .gantry-pin {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .gantry-badge {
      padding: 3px 6px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.3px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.5);
      border: 1.5px solid #ffffff;
      white-space: nowrap;
      text-align: center;
    }
    .gantry-badge.active-rate {
      background: #ef4444;
      color: #ffffff;
      animation: pulse-ring 2s infinite;
    }
    .gantry-badge.free-rate {
      background: #10b981;
      color: #ffffff;
    }
    @keyframes pulse-ring {
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
      70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }
    .gantry-stem {
      width: 2px;
      height: 6px;
      background: #ffffff;
    }

    /* User GPS Pin */
    .user-gps-marker {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #3b82f6;
      border: 3px solid #ffffff;
      box-shadow: 0 0 14px #3b82f6;
      animation: pulse-user 2s infinite;
    }
    @keyframes pulse-user {
      0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.8); }
      70% { box-shadow: 0 0 0 14px rgba(59, 130, 246, 0); }
      100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
    }

    /* Leaflet Popups */
    .leaflet-popup-content-wrapper {
      background: #161c28;
      color: #fff;
      border-radius: 14px;
      padding: 4px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.7);
      border: 1px solid rgba(255,255,255,0.14);
      max-width: 280px;
    }
    .leaflet-popup-tip {
      background: #161c28;
    }
    .popup-container {
      padding: 4px;
    }
    .popup-title {
      font-size: 13px;
      font-weight: 700;
      color: #60a5fa;
      margin-bottom: 2px;
      line-height: 1.3;
    }
    .popup-sub {
      font-size: 11px;
      color: #94a3b8;
      margin-bottom: 8px;
    }
    .popup-status-box {
      background: rgba(30, 41, 59, 0.8);
      border-radius: 8px;
      padding: 6px 8px;
      margin-bottom: 8px;
      border: 1px solid rgba(255,255,255,0.06);
    }
    .popup-status-text {
      font-size: 12px;
      font-weight: 700;
    }
    .popup-next-text {
      font-size: 10px;
      color: #cbd5e1;
      margin-top: 2px;
    }
    .popup-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-bottom: 8px;
    }
    .popup-table th {
      text-align: left;
      padding: 3px 4px;
      background: rgba(255,255,255,0.06);
      color: #94a3b8;
    }
    .popup-table td {
      padding: 3px 4px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .popup-table tr.cur-slot {
      background: rgba(59, 130, 246, 0.25);
      font-weight: 700;
      color: #60a5fa;
    }
    .btn-maps {
      display: block;
      width: 100%;
      background: #2563eb;
      color: #fff;
      text-decoration: none;
      text-align: center;
      padding: 6px 0;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      transition: background 0.2s;
    }
    .btn-maps:active { background: #1d4ed8; }
  </style>
</head>
<body>

  <!-- Top Glass Header Panel -->
  <div class="top-panel">
    <div class="header-row">
      <div class="header-title">
        <span>&#128179;</span> Singapore ERP Radar
      </div>
      <div class="status-badge">
        <div class="status-dot"></div>
        <span id="sgt-clock">--:-- -- SGT</span>
      </div>
    </div>

    <!-- Vehicle Multiplier Switcher Bar -->
    <div class="vehicle-pills">
      <button class="veh-btn active" id="veh-car" onclick="setVehicle('car')">
        &#128663; Cars (1.0x)
      </button>
      <button class="veh-btn" id="veh-moto" onclick="setVehicle('moto')">
        &#127949;&#65039; Moto (0.5x)
      </button>
      <button class="veh-btn" id="veh-hgv" onclick="setVehicle('hgv')">
        &#128667; Heavy (1.5x)
      </button>
    </div>
  </div>

  <!-- Horizontal Corridor Quick-Filter Bar -->
  <div class="corridor-bar">
    <button class="corr-pill active" id="corr-ALL" onclick="setCorridor('ALL')">&#127760; All Corridors</button>
    <button class="corr-pill" id="corr-CTE" onclick="setCorridor('CTE')">&#128739;&#65039; CTE</button>
    <button class="corr-pill" id="corr-PIE" onclick="setCorridor('PIE')">&#128739;&#65039; PIE</button>
    <button class="corr-pill" id="corr-AYE" onclick="setCorridor('AYE')">&#128739;&#65039; AYE</button>
    <button class="corr-pill" id="corr-KPE" onclick="setCorridor('KPE')">&#128739;&#65039; KPE</button>
    <button class="corr-pill" id="corr-ECP_MCE" onclick="setCorridor('ECP_MCE')">&#128739;&#65039; ECP / MCE</button>
    <button class="corr-pill" id="corr-CBD" onclick="setCorridor('CBD')">&#127961;&#65039; CBD Zone</button>
    <button class="corr-pill" id="corr-ORCHARD" onclick="setCorridor('ORCHARD')">&#128717;&#65039; Orchard</button>
    <button class="corr-pill" id="corr-OUTER_RING" onclick="setCorridor('OUTER_RING')">&#128663; Outer Ring</button>
  </div>

  <!-- Map Container -->
  <div id="map"></div>

  <!-- Bottom Quick Stats Bar -->
  <div class="bottom-info-bar">
    <span id="gantry-count-label">&#128202; Showing 27 Gantries</span>
    <span id="active-gantry-summary" style="color: #ef4444; font-weight: 700;">&#128308; 0 Active</span>
  </div>

  <!-- Floating Action Buttons -->
  <div class="floating-controls">
    <button class="fab-btn" id="btn-locate" title="Show My GPS Location" onclick="locateUser()">
      &#127919;
    </button>
    <button class="fab-btn" id="btn-refresh" title="Refresh Live ERP Rates" onclick="refreshERPData()">
      &#128260;
    </button>
  </div>

  <script>
    // Initialize Telegram WebApp SDK
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.setHeaderColor) tg.setHeaderColor('#121620');
    }

    // Default state
    let selectedVehicle = "${initialVehicle}";
    let selectedCorridor = "${initialCorridor}";
    let userLat = null;
    let userLon = null;
    let userMarker = null;
    let userCircle = null;

    // Initialize Leaflet Map
    const map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([1.3521, 103.8198], 12);

    // High contrast dark basemap tiles
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    const gantryLayer = L.layerGroup().addTo(map);
    const userLayer = L.layerGroup().addTo(map);

    let allGantriesData = [];

    function calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return (R * c).toFixed(1);
    }

    function setVehicle(v) {
      selectedVehicle = v;
      document.getElementById('veh-car').classList.toggle('active', v === 'car');
      document.getElementById('veh-moto').classList.toggle('active', v === 'moto');
      document.getElementById('veh-hgv').classList.toggle('active', v === 'hgv');
      renderMarkers();
    }

    function setCorridor(c) {
      selectedCorridor = c;
      document.querySelectorAll('.corr-pill').forEach(el => {
        el.classList.toggle('active', el.id === 'corr-' + c);
      });
      renderMarkers();

      // Pan to corridor bounds if specific
      const visibleGantries = getFilteredGantries();
      if (visibleGantries.length > 0 && c !== 'ALL') {
        const bounds = L.latLngBounds(visibleGantries.map(g => [g.lat, g.lon]));
        map.fitBounds(bounds, { padding: [120, 40], maxZoom: 14 });
      }
    }

    function getFilteredGantries() {
      if (selectedCorridor === 'ALL') return allGantriesData;
      return allGantriesData.filter(g => g.corridor === selectedCorridor);
    }

    function renderMarkers() {
      gantryLayer.clearLayers();
      const filtered = getFilteredGantries();

      let activeCount = 0;

      filtered.forEach(g => {
        const vRates = g.rates?.[selectedVehicle] || {};
        const rateVal = vRates.activeRate || 0;
        const isActive = rateVal > 0;
        if (isActive) activeCount++;

        const badgeText = isActive ? ('$' + rateVal.toFixed(2)) : 'FREE';
        const badgeClass = isActive ? 'gantry-badge active-rate' : 'gantry-badge free-rate';

        const customIcon = L.divIcon({
          className: 'gantry-pin',
          html: '<div class=\"' + badgeClass + '\">' + badgeText + '</div><div class=\"gantry-stem\"></div>',
          iconSize: [60, 30],
          iconAnchor: [30, 30]
        });

        const marker = L.marker([g.lat, g.lon], { icon: customIcon }).addTo(gantryLayer);

        // Build popup timetable
        let distText = '';
        if (userLat && userLon) {
          const dKm = calculateDistance(userLat, userLon, g.lat, g.lon);
          distText = ' • &#128205; ' + dKm + 'km away';
        }

        const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + g.lat + ',' + g.lon;
        const statusMsg = vRates.message || (isActive ? ('&#128308; ACTIVE: $' + rateVal.toFixed(2)) : '&#128994; FREE ($0.00)');

        let tableRows = '';
        (g.slotsWeekday || []).forEach(s => {
          let r = s.rate;
          if (selectedVehicle === 'moto') r = Math.max(0.50, Math.round((s.rate * 0.5)*100)/100);
          if (selectedVehicle === 'hgv') r = Math.round((s.rate * 1.5)*100)/100;
          
          const isCurSlot = vRates.activeSlot && vRates.activeSlot.start === s.start && vRates.activeSlot.end === s.end;
          const rowClass = isCurSlot ? 'class=\"cur-slot\"' : '';
          const activeMarker = isCurSlot ? ' &#9664;&#65039; ACTIVE' : '';
          tableRows += '<tr ' + rowClass + '><td>' + s.start + ' – ' + s.end + '</td><td style=\"text-align:right;\">$' + r.toFixed(2) + activeMarker + '</td></tr>';
        });

        const popupHtml = 
          '<div class=\"popup-container\">' +
            '<div class=\"popup-title\">' + g.name + '</div>' +
            '<div class=\"popup-sub\">&#128739;&#65039; ' + g.corridorName + distText + '<br>&#129517; ' + g.direction + '</div>' +
            '<div class=\"popup-status-box\">' +
              '<div class=\"popup-status-text\">' + statusMsg + '</div>' +
              (vRates.nextSlot ? ('<div class=\"popup-next-text\">&#9203; Next: ' + vRates.nextSlot.start + ' – ' + vRates.nextSlot.end + ' ➔ $' + vRates.nextSlot.rate.toFixed(2) + '</div>') : '') +
            '</div>' +
            '<table class=\"popup-table\">' +
              '<thead><tr><th>Time Window</th><th style=\"text-align:right;\">Rate</th></tr></thead>' +
              '<tbody>' + tableRows + '</tbody>' +
            '</table>' +
            '<a href=\"' + mapsUrl + '\" target=\"_blank\" class=\"btn-maps\">&#128506;&#65039; Open Directions in Maps</a>' +
          '</div>';

        marker.bindPopup(popupHtml);
      });

      document.getElementById('gantry-count-label').innerText = '&#128202; ' + filtered.length + ' Gantries';
      document.getElementById('active-gantry-summary').innerText = '&#128308; ' + activeCount + ' Active';
      document.getElementById('active-gantry-summary').style.color = activeCount > 0 ? '#ef4444' : '#10b981';
    }

    async function loadERPData() {
      try {
        const res = await fetch('/functions/v1/lta_bot/api/erp-map-data');
        if (!res.ok) throw new Error('Failed to fetch ERP data');
        const data = await res.json();
        allGantriesData = data.gantries || [];

        if (data.sgt) {
          document.getElementById('sgt-clock').innerText = data.sgt.timeStr + ' SGT';
        }

        renderMarkers();
      } catch (err) {
        console.error('loadERPData error:', err);
      }
    }

    function locateUser() {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your device/browser.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        pos => {
          userLat = pos.coords.latitude;
          userLon = pos.coords.longitude;
          const accuracy = pos.coords.accuracy;

          userLayer.clearLayers();

          const userIcon = L.divIcon({
            className: 'user-gps-marker',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });

          userMarker = L.marker([userLat, userLon], { icon: userIcon }).addTo(userLayer);
          userMarker.bindPopup('<div style=\"font-weight:700; font-size:12px; color:#3b82f6;\">&#128205; You are here</div>');

          userCircle = L.circle([userLat, userLon], {
            radius: Math.max(accuracy, 100),
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.12,
            weight: 1.5
          }).addTo(userLayer);

          map.flyTo([userLat, userLon], 14, { animate: true, duration: 1.2 });
          renderMarkers();
        },
        err => {
          alert('GPS Location access was denied or unavailable. Please enable device location.');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }

    function refreshERPData() {
      loadERPData();
    }

    // Initial load
    loadERPData();

    // Auto-refresh rates every 30 seconds
    setInterval(loadERPData, 30000);
  </script>
</body>
</html>`;
}

