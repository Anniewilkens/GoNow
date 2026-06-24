import { useEffect, useRef, useState } from 'react';
import { useAddresses, SavedAddress } from '../hooks/useAddresses';
import './Settings.css';

interface Suggestion {
  lat: string;
  lon: string;
  label: string;
  display_name: string;
}

interface AddressFieldProps {
  emoji: string;
  title: string;
  saved: SavedAddress | null;
  onSave: (addr: SavedAddress) => void;
}

function AddressField({ emoji, title, saved, onSave }: AddressFieldProps) {
  const [query, setQuery] = useState(saved?.display ?? '');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedFlash, setSavedFlash] = useState(saved !== null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced sökning medan man skriver
  useEffect(() => {
    const q = query.trim();
    // Sök inte om fältet är tomt, för kort, eller redan matchar sparad adress
    if (q.length < 3 || (saved && q === saved.display)) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const id = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?address=${encodeURIComponent(q)}`);
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Serverfel (${res.status})`);
        }
        const data = (await res.json()) as { results: Suggestion[] };
        setSuggestions(data.results ?? []);
        setOpen(true);
        setError('');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Kunde inte söka adress');
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(id);
  }, [query, saved]);

  // Stäng listan vid klick utanför
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const choose = (s: Suggestion) => {
    onSave({ label: title, display: s.display_name, lat: s.lat, lon: s.lon });
    setQuery(s.display_name);
    setSuggestions([]);
    setOpen(false);
    setError('');
    setSavedFlash(true);
  };

  return (
    <div className="address-card">
      <div className="address-header">
        <span className="address-emoji">{emoji}</span>
        <h2 className="address-title">{title}</h2>
      </div>

      <div className="address-autocomplete" ref={boxRef}>
        <input
          className="address-input"
          type="text"
          placeholder="T.ex. Kämpegatan 6, Göteborg"
          value={query}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.target.value);
            setSavedFlash(false);
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && suggestions.length > 0) choose(suggestions[0]);
            if (e.key === 'Escape') setOpen(false);
          }}
        />
        {loading && <span className="address-spinner">…</span>}

        {open && suggestions.length > 0 && (
          <ul className="suggestions">
            {suggestions.map((s, i) => (
              <li key={`${s.lat},${s.lon},${i}`}>
                <button type="button" className="suggestion" onClick={() => choose(s)}>
                  <span className="suggestion-label">{s.label}</span>
                  <span className="suggestion-sub">{s.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {savedFlash && saved && <p className="status ok">✓ Sparad: {saved.display}</p>}
      {error && <p className="status error">{error}</p>}
      {open && !loading && suggestions.length === 0 && query.trim().length >= 3 && (
        <p className="status muted">Inga träffar — prova med gatunamn och stad</p>
      )}
    </div>
  );
}

export default function Settings() {
  const { addresses, setAddress } = useAddresses();

  return (
    <div className="settings">
      <h1 className="page-title">Inställningar</h1>
      <AddressField
        emoji="🏠"
        title="Hem"
        saved={addresses.home}
        onSave={(addr) => setAddress('home', addr)}
      />
      <AddressField
        emoji="🏢"
        title="Jobb"
        saved={addresses.work}
        onSave={(addr) => setAddress('work', addr)}
      />
    </div>
  );
}
