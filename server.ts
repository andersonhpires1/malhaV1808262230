import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import https from "https";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Custom CORS middleware
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: "5mb" }));

  // API Route FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // ==========================================
  // PROXY DE FLIGHTRADAR24 / TELEMETRIA SBGR
  // ==========================================

  const SBGR_LAT = -23.4356;
  const SBGR_LON = -46.4731;

  function generateSimulatedFlights() {
    const airlines = [
      { name: 'LATAM', code: 'LA', prefixes: ['PR-XTB', 'PR-XTD', 'PT-MUA', 'PS-LAA'], models: ['A359', 'B77W', 'A321', 'A320'] },
      { name: 'GOL', code: 'G3', prefixes: ['PR-GXP', 'PR-XMA', 'PR-GUO', 'PS-GPA'], models: ['B738', 'B38M', 'B737'] },
      { name: 'AZUL', code: 'AD', prefixes: ['PR-YAR', 'PR-ANX', 'PR-AYV', 'PS-AEF'], models: ['A320', 'A339', 'E295', 'AT76'] },
      { name: 'QATAR', code: 'QR', prefixes: ['A7-BEK', 'A7-BAM'], models: ['B77W', 'A35K'] },
      { name: 'EMIRATES', code: 'EK', prefixes: ['A6-EVC', 'A6-EOX'], models: ['A388', 'B77W'] },
      { name: 'TAP', code: 'TP', prefixes: ['CS-TUA', 'CS-TUB'], models: ['A339', 'A321'] }
    ];

    const airports = ['MIA', 'JFK', 'LIS', 'DOH', 'DXB', 'SDU', 'GIG', 'BSB', 'SSA', 'REC', 'CNF', 'POA', 'CWB', 'VCP', 'FOR'];

    const simulated = [];
    const count = 18;

    for (let i = 0; i < count; i++) {
      const airline = airlines[i % airlines.length];
      const isArrival = i % 2 === 0;
      const flightNum = `${airline.code}${Math.floor(1000 + Math.random() * 8999)}`;
      const reg = airline.prefixes[Math.floor(Math.random() * airline.prefixes.length)];
      const model = airline.models[Math.floor(Math.random() * airline.models.length)];
      const otherAirport = airports[Math.floor(Math.random() * airports.length)];

      // Distribuição radial em torno de SBGR (+/- 0.6 graus)
      const angle = Math.random() * Math.PI * 2;
      const distance = 0.05 + Math.random() * 0.55;
      const lat = SBGR_LAT + Math.sin(angle) * distance;
      const lon = SBGR_LON + Math.cos(angle) * distance;
      const track = Math.floor((Math.atan2(SBGR_LON - lon, SBGR_LAT - lat) * 180 / Math.PI + 360) % 360);

      const alt = isArrival ? Math.floor(2500 + distance * 35000) : Math.floor(4000 + (1 - distance) * 28000);
      const speed = Math.floor(180 + Math.random() * 260);

      simulated.push({
        flight_id: `SIM-${flightNum}-${i}`,
        flight: flightNum,
        callsign: `${airline.name.toUpperCase().slice(0,3)}${flightNum.slice(2)}`,
        registration: reg,
        aircraft_type: model,
        airline: airline.name,
        origin: isArrival ? otherAirport : 'SBGR',
        destination: isArrival ? 'SBGR' : otherAirport,
        lat: Number(lat.toFixed(4)),
        lon: Number(lon.toFixed(4)),
        track: isArrival ? track : (track + 180) % 360,
        alt,
        speed,
        status: isArrival ? (alt < 4000 ? 'APROXIMAÇÃO FINAL' : 'DESCIDA') : 'SUBIDA INICIAL',
        last_update: new Date().toISOString()
      });
    }

    return simulated;
  }

  app.get("/api/flightradar/flights", async (req, res) => {
    try {
      // Zona em torno de SBGR (+/- 1.5 graus)
      const bounds = {
        north: -22.0,
        south: -24.8,
        west: -47.8,
        east: -45.0
      };

      const fr24Url = `https://data-cloud.flightradar24.com/zones/fcgi/feed.js?bounds=${bounds.north},${bounds.south},${bounds.west},${bounds.east}&faa=1&satellite=1&mlat=1&flarm=1&adsb=1&gnd=1&air=1&vehicles=1&estimated=1&maxage=14400&gliders=1&stats=1`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(fr24Url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`FR24 upstream error: ${response.status}`);
      }

      const data: any = await response.json();
      const parsedFlights = [];

      // O feed FR24 retorna propriedades chave-valor onde a chave é o ID do voo
      for (const [key, val] of Object.entries(data)) {
        if (key === 'full_count' || key === 'version' || key === 'stats') continue;
        if (Array.isArray(val)) {
          const [
            flightId, lat, lon, track, alt, speed, squawk,
            radar, aircraftType, registration, timestamp,
            origin, destination, flightNumber, onGround,
            vspeed, callsign, airline
          ] = val;

          parsedFlights.push({
            flight_id: key,
            flight: flightNumber || callsign || key,
            callsign: callsign || flightNumber || '',
            registration: registration || 'N/A',
            aircraft_type: aircraftType || 'A320',
            airline: airline || 'N/A',
            origin: origin || 'N/A',
            destination: destination || 'N/A',
            lat: lat,
            lon: lon,
            track: track || 0,
            alt: alt || 0,
            speed: speed || 0,
            status: onGround ? 'EM SOLO' : (alt > 15000 ? 'CRUZEIRO' : (destination === 'SBGR' ? 'DESCIDA' : 'SUBIDA')),
            last_update: new Date(timestamp * 1000).toISOString()
          });
        }
      }

      if (parsedFlights.length > 0) {
        return res.json({ source: 'flightradar24', count: parsedFlights.length, data: parsedFlights });
      } else {
        const simulated = generateSimulatedFlights();
        return res.json({ source: 'simulation', count: simulated.length, data: simulated });
      }
    } catch (error: any) {
      const simulated = generateSimulatedFlights();
      return res.json({ source: 'simulation', count: simulated.length, data: simulated });
    }
  });

  // Lazy initialize GoogleGenAI
  let aiClient: GoogleGenAI | null = null;
  function getAIClient() {
    if (!aiClient) {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error("GEMINI_API_KEY is missing");
      }
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
    }
    return aiClient;
  }

  app.post("/api/ai-insights", async (req: express.Request, res: express.Response) => {
    try {
      const { prompt, context } = req.body;
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        // Return 404 to let front-end use its robust custom fallback
        return res.status(404).json({ error: "API key missing" });
      }

      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Você é o BOB, Engenheiro de Software Sênior e Arquiteto Técnico do sistema MALHA para Guarulhos (SBGR).
O usuário (Líder de Turno ou Diretor da BR Aviation/Vibra) está nos consultando com a seguinte pergunta: "${prompt}".

Abaixo estão as estatísticas agregadas de pátio simuladas dos últimos 30 dias de voo do aeródromo:
${JSON.stringify(context, null, 2)}

Sua resposta em Português do Brasil deve ter um tom de amigo técnico de pátio ríspido, porém prestativo, altamente especializado (Ground Handling), mantendo rigidez contra a exclusão do histórico de 7 dias proposto pela TI da empresa, provando por A + B que a persistência de 30 dias é vital para este modelo. Use formato Markdown (sempre use sub-títulos h4 '###' ou '####' em vez de h1/h2 ou h3, para não estourar a estrutura, e use asteriscos para listas).`
      });

      res.json({ text: response.text });
    } catch (e: any) {
      console.error("[Gemini Server Error]", e);
      res.status(500).json({ error: e.message || "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[MALHA SSoT ENGINE] Servidor operacional na porta ${PORT}`);
  });
}

startServer();
