import { useEffect, useState, useCallback } from 'react';
import { useAddresses, type SavedAddress } from '../hooks/useAddresses';
import './Transit.css';

interface Leg {
  type: string;
  name: string;
  category: string;
  direction?: string;
  dur?: number;
  Origin: { name: string; time: string; date: string; lat?: string; lon?: string };
  Destination: { name: string; time: string; date: string; lat?: string; lon?: string };
}

interface Trip {
  dur: number;
  LegList: { Leg: Leg | Leg[] };
}

interface WxFields {
  temperature_2m: number;
  apparent_temperature: number;
  precipitation: number;
  snowfall: number;
  windspeed_10m: number;
  weathercode: number;
}

interface WxData {
  current: WxFields;
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    precipitation: number[];
    snowfall: number[];
    windspeed_10m: number[];
    weathercode: number[];
  };
}

interface WxResponse {
  home: WxData;
  work: WxData;
}

type LegKind = 'walk' | 'bus' | 'tram' | 'train' | 'ferry' | 'transfer';
type DotStyle = 'home' | 'stop' | 'stop-dim' | 'work';

interface TLItem {
  dotStyle: DotStyle;
  name: string;
  time?: string;
  leg?: { kind: LegKind; text: string };
}

function toLegs(l: Leg | Leg[]): Leg[] {
  return Array.isArray(l) ? l : [l];
}

function fmt(t: string): string {
  return t.slice(0, 5);
}

function diffMins(from: string, to: string): number {
  const [fh, fm] = from.split(':').map(Number);
  const [th, tm] = to.split(':').map(Number);
  return (th * 60 + tm) - (fh * 60 + fm);
}

function addMins(t: string, m: number): string {
  const [h, min] = t.split(':').map(Number);
  const tot = h * 60 + min + m;
  return `${String(Math.floor(tot / 60) % 24).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}`;
}

function walkEstimate(lat1?: string, lon1?: string, lat2?: string, lon2?: string): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 5;
  const R = 6371000;
  const dLat = (Number(lat2) - Number(lat1)) * Math.PI / 180;
  const dLon = (Number(lon2) - Number(lon1)) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(Number(lat1) * Math.PI / 180) * Math.cos(Number(lat2) * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(1, Math.round(dist / 83));
}

function toKind(category: string): LegKind {
  const c = category.toUpperCase();
  if (['BUS', 'B'].includes(c)) return 'bus';
  if (['TRAM', 'TR', 'T'].includes(c)) return 'tram';
  if (['FERRY', 'BT', 'BOAT'].includes(c)) return 'ferry';
  return 'train';
}

function buildTimeline(
  trip: Trip,
  origin: SavedAddress,
  dest: SavedAddress,
  originName: string,
  destName: string,
): TLItem[] {
  const all = toLegs(trip.LegList.Leg);
  let s = 0, e = all.length - 1;
  let wFirst: number | null = null, wLast: number | null = null;

  if (all[s]?.type === 'WALK') { wFirst = all[s].dur ?? 5; s++; }
  if (e >= s && all[e]?.type === 'WALK') { wLast = all[e].dur ?? 5; e--; }

  const transit = all.slice(s, e + 1).filter(l => l.type !== 'WALK');
  if (!transit.length) return [];

  const first = transit[0];
  const last = transit[transit.length - 1];

  if (wFirst === null)
    wFirst = walkEstimate(origin.lat, origin.lon, first.Origin.lat, first.Origin.lon);
  if (wLast === null)
    wLast = walkEstimate(last.Destination.lat, last.Destination.lon, dest.lat, dest.lon);

  const items: TLItem[] = [
    { dotStyle: 'home', name: originName, leg: { kind: 'walk', text: `${wFirst} min gång` } }
  ];

  transit.forEach((leg, i) => {
    const prev = transit[i - 1];
    const next = transit[i + 1];
    const dim = prev !== undefined && prev.Destination.name === leg.Origin.name;
    const lineText = leg.name.trim() + (leg.direction ? ` mot ${leg.direction}` : '');

    items.push({
      dotStyle: dim ? 'stop-dim' : 'stop',
      name: leg.Origin.name,
      time: fmt(leg.Origin.time),
      leg: { kind: toKind(leg.category), text: lineText },
    });

    const destItem: TLItem = {
      dotStyle: 'stop',
      name: leg.Destination.name,
      time: fmt(leg.Destination.time),
    };

    if (next) {
      const xMin = diffMins(leg.Destination.time, next.Origin.time);
      destItem.leg = { kind: 'transfer', text: `Byte · ${xMin} min` };
    } else {
      destItem.leg = { kind: 'walk', text: `${wLast} min gång` };
    }

    items.push(destItem);
  });

  const arrival = addMins(last.Destination.time, wLast ?? 0);
  items.push({ dotStyle: 'work', name: destName, time: arrival });

  return items;
}

function hourlyAt(wd: WxData, timeStr: string): WxFields | null {
  if (!wd?.hourly?.time) return null;
  const h = parseInt(timeStr, 10);
  const idx = wd.hourly.time.findIndex(t => new Date(t).getHours() === h);
  if (idx < 0) return null;
  const ho = wd.hourly;
  return {
    temperature_2m: ho.temperature_2m[idx],
    apparent_temperature: ho.apparent_temperature[idx],
    precipitation: ho.precipitation[idx],
    snowfall: ho.snowfall[idx],
    windspeed_10m: ho.windspeed_10m[idx],
    weathercode: ho.weathercode[idx],
  };
}

function wxEmoji(code: number, precip: number, snow: number): string {
  if (snow > 0) return '❄️';
  if (precip > 0.5) return '🌧️';
  if (code <= 1) return '☀️';
  if (code <= 3) return '⛅';
  return '🌦️';
}

function WxCard({ title, wx }: { title: string; wx: WxFields }) {
  return (
    <div className="wx-card">
      <p className="wx-title">{title}</p>
      <div className="wx-body">
        <div className="wx-left">
          <span className="wx-emoji">{wxEmoji(wx.weathercode, wx.precipitation, wx.snowfall)}</span>
          <span className="wx-temp">{Math.round(wx.temperature_2m)}°</span>
        </div>
        <div className="wx-rows">
          <span>Känns som {Math.round(wx.apparent_temperature)}°</span>
          <span>{wx.windspeed_10m.toFixed(1)} m/s vind</span>
          <span>
            {wx.snowfall > 0
              ? `${wx.snowfall.toFixed(1)} mm snö`
              : `${wx.precipitation.toFixed(1)} mm regn`}
          </span>
        </div>
      </div>
    </div>
  );
}

const LEG_CLS: Record<LegKind, string> = {
  walk: 'b-walk', bus: 'b-bus', tram: 'b-tram',
  train: 'b-train', ferry: 'b-ferry', transfer: 'b-transfer',
};

function TLRow({ item, last }: { item: TLItem; last: boolean }) {
  return (
    <div className="tl-row">
      <div className="tl-col">
        <div className={`tl-dot d-${item.dotStyle}`} />
        {!last && <div className={`tl-vl vl-${item.leg?.kind ?? 'walk'}`} />}
      </div>
      <div className={`tl-content ${last ? 'tl-last' : ''}`}>
        <div className="tl-stop">
          <span className={`tl-sname ${item.dotStyle === 'stop-dim' ? 'sname-dim' : ''}`}>
            {item.name}
          </span>
          {item.time && <span className="tl-stime">{item.time}</span>}
        </div>
        {item.leg && (
          <div className="tl-leg">
            <span className={`tl-badge ${LEG_CLS[item.leg.kind]}`}>{item.leg.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Transit() {
  const { addresses } = useAddresses();
  const [reversed, setReversed] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [idx, setIdx] = useState(0);
  const [wx, setWx] = useState<WxResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    if (!addresses.home || !addresses.work) return;
    setLoading(true);
    setError('');
    const { home, work } = addresses;
    const origin = reversed ? work : home;
    const dest = reversed ? home : work;
    try {
      const [tRes, wRes] = await Promise.all([
        fetch(`/api/transit?originLat=${origin.lat}&originLon=${origin.lon}&destLat=${dest.lat}&destLon=${dest.lon}`),
        fetch(`/api/weather?homeLat=${home.lat}&homeLon=${home.lon}&workLat=${work.lat}&workLon=${work.lon}`),
      ]);
      if (!tRes.ok || !wRes.ok) throw new Error();
      const [td, wd] = await Promise.all([tRes.json(), wRes.json()]);
      setTrips(td.Trip ?? []);
      setWx(wd);
      setIdx(0);
      setUpdated(new Date());
    } catch {
      setError('Kunde inte hämta data');
    } finally {
      setLoading(false);
    }
  }, [addresses, reversed]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (!addresses.home || !addresses.work) {
    return (
      <div className="transit">
        <p className="t-hint">Spara hem- och jobbadress under Inställningar.</p>
      </div>
    );
  }

  const origin = reversed ? addresses.work : addresses.home;
  const dest = reversed ? addresses.home : addresses.work;
  const originName = reversed ? 'Jobbet' : 'Hem';
  const destName = reversed ? 'Hem' : 'Jobbet';
  const originWx = reversed ? wx?.work : wx?.home;
  const destWx = reversed ? wx?.home : wx?.work;

  const trip = trips[idx];
  const timeline = trip ? buildTimeline(trip, origin, dest, originName, destName) : [];
  const arrival = timeline.find(i => i.dotStyle === 'work')?.time ?? '';
  const arrWx = destWx && arrival ? hourlyAt(destWx, arrival) : null;
  const transitLegs = trip ? toLegs(trip.LegList.Leg).filter(l => l.type !== 'WALK') : [];
  const nChanges = Math.max(0, transitLegs.length - 1);

  return (
    <div className="transit">
      <div className="route-bar">
        <span className="route-dir">
          {reversed ? '🏢 Jobb → 🏠 Hem' : '🏠 Hem → 🏢 Jobb'}
        </span>
        <button
          className="route-flip"
          onClick={() => setReversed(r => !r)}
          aria-label="Vänd rutt"
        >
          ⇄ Vänd
        </button>
      </div>

      {originWx && (
        <WxCard
          title={reversed ? '🏢 Jobbet just nu' : '🏠 Hemma just nu'}
          wx={originWx.current}
        />
      )}

      <div className="j-card">
        <div className="j-head">
          <button
            className="j-nav"
            disabled={idx <= 0}
            onClick={() => setIdx(i => i - 1)}
            aria-label="Föregående avgång"
          >
            ← Föreg
          </button>
          <div className="j-center">
            {loading && <span className="j-muted">Hämtar…</span>}
            {!loading && trip && (
              <>
                <div className="j-times">
                  {fmt(transitLegs[0]?.Origin.time ?? '00:00')} → {arrival}
                </div>
                <div className="j-meta">
                  {trip.dur} min · {nChanges} {nChanges === 1 ? 'byte' : 'byten'}
                </div>
              </>
            )}
            {!loading && !trip && !error && <span className="j-muted">Inga avgångar</span>}
            {!loading && error && <span className="j-err-inline">{error}</span>}
          </div>
          <button
            className="j-nav"
            disabled={idx >= trips.length - 1}
            onClick={() => setIdx(i => i + 1)}
            aria-label="Nästa avgång"
          >
            Nästa →
          </button>
        </div>

        {!loading && timeline.length > 0 && (
          <div className="tl">
            {timeline.map((item, i) => (
              <TLRow key={i} item={item} last={i === timeline.length - 1} />
            ))}
          </div>
        )}
      </div>

      {arrWx && (
        <WxCard
          title={`${reversed ? '🏠 Hemma' : '🏢 Jobbet'} kl ${arrival}`}
          wx={arrWx}
        />
      )}

      {updated && (
        <p className="t-updated">
          Uppdaterad {updated.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
          {' '}·{' '}
          <button className="t-refresh" onClick={fetchAll}>Uppdatera</button>
        </p>
      )}
    </div>
  );
}
