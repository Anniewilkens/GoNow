import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const { address } = req.query;

  if (!address) {
    res.status(400).json({ error: 'address krävs' });
    return;
  }

  const raw = String(address).trim();
  const q = /sverige/i.test(raw) ? raw : `${raw}, Sverige`;

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('accept-language', 'sv');

  try {
    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': 'GoNow-App/1.0 (annie.alveborn@gmail.com)' },
    });

    if (!response.ok) {
      res.status(502).json({ error: `Nominatim svarade med ${response.status}` });
      return;
    }

    const data = (await response.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;

    if (!data.length) {
      res.status(404).json({ error: 'Adressen hittades inte' });
      return;
    }

    res.json({ lat: data[0].lat, lon: data[0].lon, display_name: data[0].display_name });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'okänt fel';
    res.status(500).json({ error: `Kunde inte söka adress: ${msg}` });
  }
});

export default router;
