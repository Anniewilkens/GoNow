import type { VercelRequest, VercelResponse } from '@vercel/node';

async function fetchWeather(lat: string, lon: string) {
  const fields = 'temperature_2m,apparent_temperature,precipitation,snowfall,windspeed_10m,weathercode';
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat);
  url.searchParams.set('longitude', lon);
  url.searchParams.set('current', fields);
  url.searchParams.set('hourly', fields);
  url.searchParams.set('forecast_hours', '12');
  url.searchParams.set('wind_speed_unit', 'ms');
  url.searchParams.set('timezone', 'Europe/Stockholm');
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('Open-Meteo-fel');
  return response.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { homeLat, homeLon, workLat, workLon } = req.query;

  if (!homeLat || !homeLon || !workLat || !workLon) {
    return res.status(400).json({ error: 'homeLat, homeLon, workLat, workLon krävs' });
  }

  try {
    const [home, work] = await Promise.all([
      fetchWeather(String(homeLat), String(homeLon)),
      fetchWeather(String(workLat), String(workLon)),
    ]);
    return res.json({ home, work });
  } catch {
    return res.status(500).json({ error: 'Kunde inte hämta väder' });
  }
}
