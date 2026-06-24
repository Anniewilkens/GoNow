import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';

const router = Router();

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

router.get('/', async (req: Request, res: Response) => {
  const { address } = req.query;

  if (!address) {
    res.status(400).json({ error: 'address krävs' });
    return;
  }

  const url = new URL('https://photon.komoot.io/api/');
  url.searchParams.set('q', String(address));
  url.searchParams.set('limit', '6');
  url.searchParams.set('lang', 'default');
  url.searchParams.set('lat', '57.7089');
  url.searchParams.set('lon', '11.9746');

  try {
    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': 'GoNow-App/1.0 (annie.alveborn@gmail.com)' },
    });

    if (!response.ok) {
      res.status(502).json({ error: `Geokodning svarade med ${response.status}` });
      return;
    }

    const data = (await response.json()) as { features?: PhotonFeature[] };

    const seen = new Set<string>();
    const results = (data.features ?? [])
      .map(toResult)
      .filter((r) => {
        if (!r.label || seen.has(r.label)) return false;
        seen.add(r.label);
        return true;
      });

    res.json({ results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'okänt fel';
    res.status(500).json({ error: `Kunde inte söka adress: ${msg}` });
  }
});

export default router;
