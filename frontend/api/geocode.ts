import type { VercelRequest, VercelResponse } from '@vercel/node';

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: Record<string, string>;
}

// Bygg ett kort, läsbart label + ett fullständigt display_name från Photon-egenskaper
function toResult(f: PhotonFeature) {
  const p = f.properties;
  const [lon, lat] = f.geometry.coordinates;
  const street = p.street || p.name || '';
  const num = p.housenumber ? ` ${p.housenumber}` : '';
  const city = p.city || p.town || p.village || p.locality || p.district || '';
  const streetPart = `${street}${num}`.trim();
  const label = [streetPart, city].filter(Boolean).join(', ') || p.name || '';
  const display_name = [streetPart, p.district, city, p.postcode]
    .filter(Boolean)
    .join(', ');
  return { lat: String(lat), lon: String(lon), label, display_name };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { address } = req.query;

  if (!address) {
    return res.status(400).json({ error: 'address krävs' });
  }

  const url = new URL('https://photon.komoot.io/api/');
  url.searchParams.set('q', String(address));
  url.searchParams.set('limit', '6');
  url.searchParams.set('lang', 'default');
  // Sök-bias mot Göteborg så lokala adresser rankas högst
  url.searchParams.set('lat', '57.7089');
  url.searchParams.set('lon', '11.9746');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: { 'User-Agent': 'GoNow-App/1.0 (annie.alveborn@gmail.com)' },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({ error: `Geokodning svarade med ${response.status}` });
    }

    const data = (await response.json()) as { features?: PhotonFeature[] };

    // Mappa, filtrera tomma och deduplicera på label
    const seen = new Set<string>();
    const results = (data.features ?? [])
      .map(toResult)
      .filter((r) => {
        if (!r.label || seen.has(r.label)) return false;
        seen.add(r.label);
        return true;
      });

    return res.json({ results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'okänt fel';
    return res.status(500).json({ error: `Kunde inte söka adress: ${msg}` });
  }
}
