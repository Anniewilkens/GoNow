import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const { originLat, originLon, destLat, destLon } = req.query;

  if (!originLat || !originLon || !destLat || !destLon) {
    res.status(400).json({ error: 'originLat, originLon, destLat, destLon krävs' });
    return;
  }

  const apiKey = process.env.RESROBOT_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'API-nyckel saknas i servern' });
    return;
  }

  const url = new URL('https://api.resrobot.se/v2.1/trip');
  url.searchParams.set('originCoordLat', String(originLat));
  url.searchParams.set('originCoordLong', String(originLon));
  url.searchParams.set('destCoordLat', String(destLat));
  url.searchParams.set('destCoordLong', String(destLon));
  url.searchParams.set('numTrips', '3');
  url.searchParams.set('format', 'json');
  url.searchParams.set('accessId', apiKey);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      const text = await response.text();
      res.status(response.status).json({ error: 'ResRobot-fel', details: text });
      return;
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Kunde inte nå ResRobot' });
  }
});

export default router;
