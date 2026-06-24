import type { VercelRequest, VercelResponse } from '@vercel/node';

const USER_AGENT = 'GoNow-App/1.0 (annie.alveborn@gmail.com)';

async function nominatimSearch(
  q: string,
  countrycodes?: string,
): Promise<Array<{ lat: string; lon: string; display_name: string }>> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('accept-language', 'sv');
  if (countrycodes) url.searchParams.set('countrycodes', countrycodes);

  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!response.ok) throw new Error('Nominatim-fel');
  return response.json() as Promise<Array<{ lat: string; lon: string; display_name: string }>>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { address } = req.query;

  if (!address) {
    return res.status(400).json({ error: 'address krävs' });
  }

  const q = String(address).trim();
  const qSe = q.toLowerCase().includes('sverige') ? q : `${q}, Sverige`;

  try {
    // 1. Försök med countrycodes=se
    let data = await nominatimSearch(q, 'se');

    // 2. Försök med ", Sverige" i söksträngen utan countrycodes-filter
    if (!data.length) {
      data = await nominatimSearch(qSe);
    }

    // 3. Sista utväg: fri sökning utan landsbegränsning
    if (!data.length) {
      data = await nominatimSearch(q);
    }

    if (!data.length) {
      return res.status(404).json({ error: 'Adressen hittades inte' });
    }

    return res.json({
      lat: data[0].lat,
      lon: data[0].lon,
      display_name: data[0].display_name,
    });
  } catch {
    return res.status(500).json({ error: 'Kunde inte söka adress' });
  }
}
