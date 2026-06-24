import { useState } from 'react';
import { useAddresses } from '../hooks/useAddresses';
import './Settings.css';

type Field = 'home' | 'work';

export default function Settings() {
  const { addresses, setAddress } = useAddresses();
  const [query, setQuery] = useState<Record<Field, string>>({
    home: addresses.home?.display ?? '',
    work: addresses.work?.display ?? '',
  });
  const [status, setStatus] = useState<Record<Field, 'idle' | 'loading' | 'ok' | 'error'>>({
    home: 'idle',
    work: 'idle',
  });
  const [errorMsg, setErrorMsg] = useState<Record<Field, string>>({ home: '', work: '' });

  const search = async (field: Field) => {
    const q = query[field].trim();
    if (!q) return;
    setStatus((s) => ({ ...s, [field]: 'loading' }));
    setErrorMsg((e) => ({ ...e, [field]: '' }));
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(q)}`);
      if (res.status === 404) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        const isApiMissing = !body.error || body.error !== 'Adressen hittades inte';
        setErrorMsg((e) => ({
          ...e,
          [field]: isApiMissing
            ? 'API-funktionen saknas — kontrollera Vercel-deploymenten'
            : 'Adressen hittades inte — prova med gatunamn och stad, t.ex. "Kämpegatan 6, Göteborg"',
        }));
        setStatus((s) => ({ ...s, [field]: 'error' }));
        return;
      }
      if (!res.ok) throw new Error('server');
      const data = await res.json();
      setAddress(field, {
        label: field === 'home' ? 'Hem' : 'Jobb',
        display: data.display_name,
        lat: data.lat,
        lon: data.lon,
      });
      setStatus((s) => ({ ...s, [field]: 'ok' }));
    } catch {
      setErrorMsg((e) => ({ ...e, [field]: 'Kunde inte nå servern — försök igen' }));
      setStatus((s) => ({ ...s, [field]: 'error' }));
    }
  };

  const renderField = (field: Field, emoji: string, title: string) => (
    <div className="address-card">
      <div className="address-header">
        <span className="address-emoji">{emoji}</span>
        <h2 className="address-title">{title}</h2>
      </div>
      {addresses[field] && (
        <p className="address-saved">{addresses[field]!.display}</p>
      )}
      <div className="address-row">
        <input
          className="address-input"
          type="text"
          placeholder="T.ex. Kämpegatan 6, Göteborg"
          value={query[field]}
          onChange={(e) => setQuery((q) => ({ ...q, [field]: e.target.value }))}
          onKeyDown={(e) => e.key === 'Enter' && search(field)}
        />
        <button
          className="address-btn"
          onClick={() => search(field)}
          disabled={status[field] === 'loading'}
        >
          {status[field] === 'loading' ? '…' : 'Spara'}
        </button>
      </div>
      {status[field] === 'ok' && <p className="status ok">✓ Sparad</p>}
      {status[field] === 'error' && <p className="status error">{errorMsg[field]}</p>}
    </div>
  );

  return (
    <div className="settings">
      <h1 className="page-title">Inställningar</h1>
      {renderField('home', '🏠', 'Hem')}
      {renderField('work', '🏢', 'Jobb')}
    </div>
  );
}
