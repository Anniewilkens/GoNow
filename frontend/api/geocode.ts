import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { address } = req.query;

  if (!address) {
    return res.status(400).json({ error: 'address krävs' });
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
      return res.status(404).json({ error: 'Adressen hittades inte' });
    }
    return res.json({ lat: data[0].lat, lon: data[0].lon, display_name: data[0].display_name });
  } catch {
    return res.status(500).json({ error: 'Kunde inte söka adress' });
  }
}
