import { useEffect, useState } from 'react';
import { useAddresses } from '../hooks/useAddresses';
import './Weather.css';

interface WeatherCurrent {
  temperature_2m: number;
  apparent_temperature: number;
  precipitation: number;
  snowfall: number;
  windspeed_10m: number;
  weathercode: number;
}

interface WeatherData {
  current: WeatherCurrent;
}

interface WeatherResponse {
  home: WeatherData;
  work: WeatherData;
}

function weatherIcon(code: number, precip: number, snowfall: number): string {
  if (snowfall > 0) return '❄️';
  if (precip > 0) return '🌧️';
  if (code <= 1) return '☀️';
  if (code <= 3) return '⛅';
  if (code <= 48) return '🌫️';
  return '🌦️';
}

function WindBar({ speed }: { speed: number }) {
  const pct = Math.min((speed / 20) * 100, 100);
  return (
    <div className="wind-bar-wrap">
      <div className="wind-bar" style={{ width: `${pct}%` }} />
    </div>
  );
}

function WeatherCard({ label, emoji, data }: { label: string; emoji: string; data: WeatherCurrent }) {
  return (
    <div className="weather-card">
      <div className="weather-card-header">
        <span>{emoji}</span>
        <span className="weather-label">{label}</span>
        <span className="weather-icon-big">{weatherIcon(data.weathercode, data.precipitation, data.snowfall)}</span>
      </div>
      <div className="temp-row">
        <span className="temp-main">{Math.round(data.temperature_2m)}°</span>
        <span className="temp-feels">känns som {Math.round(data.apparent_temperature)}°</span>
      </div>
      <div className="detail-row">
        <div className="detail">
          <span className="detail-label">💨 Vind</span>
          <span className="detail-value">{data.windspeed_10m.toFixed(1)} m/s</span>
          <WindBar speed={data.windspeed_10m} />
        </div>
        {data.snowfall > 0 ? (
          <div className="detail">
            <span className="detail-label">❄️ Snö</span>
            <span className="detail-value">{data.snowfall.toFixed(1)} mm</span>
          </div>
        ) : (
          <div className="detail">
            <span className="detail-label">🌧️ Regn</span>
            <span className="detail-value">{data.precipitation.toFixed(1)} mm</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Weather() {
  const { addresses } = useAddresses();
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!addresses.home || !addresses.work) return;
    setLoading(true);
    setError('');
    const { home, work } = addresses;
    fetch(
      `/api/weather?homeLat=${home.lat}&homeLon=${home.lon}&workLat=${work.lat}&workLon=${work.lon}`
    )
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setData)
      .catch(() => setError('Kunde inte hämta väder'))
      .finally(() => setLoading(false));
  }, [addresses]);

  if (!addresses.home || !addresses.work) {
    return (
      <div className="weather">
        <h1 className="page-title">Väder</h1>
        <p className="empty">Spara hem- och jobbadress under Inställningar först.</p>
      </div>
    );
  }

  return (
    <div className="weather">
      <h1 className="page-title">Väder just nu</h1>
      {loading && <p className="loading">Hämtar väder…</p>}
      {error && <p className="error-msg">{error}</p>}
      {data && (
        <>
          <WeatherCard label="Hemma" emoji="🏠" data={data.home.current} />
          <WeatherCard label="Jobbet" emoji="🏢" data={data.work.current} />
        </>
      )}
    </div>
  );
}
