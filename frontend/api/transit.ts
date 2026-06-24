import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { originLat, originLon, destLat, destLon } = req.query;

  if (!originLat || !originLon || !destLat || !destLon) {
    return res.status(400).json({ error: 'originLat, originLon, destLat, destLon krävs' });
  }

  const apiKey = process.env.RESROBOT_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API-nyckel saknas på servern' });
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
      return res.status(response.status).json({ error: 'ResRobot-fel', details: text });
    }
    const data = await response.json();
    return res.json(data);
  } catch {
    return res.status(500).json({ error: 'Kunde inte nå ResRobot' });
  }
}
