import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const { homeLat, homeLon, workLat, workLon } = req.query;

  if (!homeLat || !homeLon || !workLat || !workLon) {
    res.status(400).json({ error: 'homeLat, homeLon, workLat, workLon krävs' });
    return;
  }

  const fields = 'temperature_2m,apparent_temperature,precipitation,snowfall,windspeed_10m,weathercode';

  const fetchWeather = async (lat: string, lon: string) => {
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
  };

  try {
    const [home, work] = await Promise.all([
      fetchWeather(String(homeLat), String(homeLon)),
      fetchWeather(String(workLat), String(workLon)),
    ]);
    res.json({ home, work });
  } catch (err) {
    res.status(500).json({ error: 'Kunde inte hämta väder' });
  }
});

export default router;
