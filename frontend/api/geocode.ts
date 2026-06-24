import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { address } = req.query;

  if (!address) {
    return res.status(400).json({ error: 'address krävs' });
  }

  const raw = String(address).trim();
  // Lägg till ", Sverige" om det inte redan finns, för att styra Nominatim rätt
  const q = /sverige/i.test(raw) ? raw : `${raw}, Sverige`;

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('accept-language', 'sv');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { 'User-Agent': 'GoNow-App/1.0 (annie.alveborn@gmail.com)' },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({ error: `Nominatim svarade med ${response.status}` });
    }

    const data = (await response.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;

    if (!data.length) {
      return res.status(404).json({ error: 'Adressen hittades inte' });
    }

    return res.json({
      lat: data[0].lat,
      lon: data[0].lon,
      display_name: data[0].display_name,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'okänt fel';
    return res.status(500).json({ error: `Kunde inte söka adress: ${msg}` });
  }
}
