import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const { address } = req.query;

  if (!address) {
    res.status(400).json({ error: 'address krävs' });
    return;
  }

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', String(address));
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'se');

  try {
    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': 'GoNow-App/1.0' },
    });
    if (!response.ok) throw new Error('Nominatim-fel');
    const data = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!data.length) {
      res.status(404).json({ error: 'Adressen hittades inte' });
      return;
    }
    res.json({ lat: data[0].lat, lon: data[0].lon, display_name: data[0].display_name });
  } catch (err) {
    res.status(500).json({ error: 'Kunde inte söka adress' });
  }
});

export default router;
