import { useState } from 'react';

export interface SavedAddress {
  label: string;
  display: string;
  lat: string;
  lon: string;
}

export interface Addresses {
  home: SavedAddress | null;
  work: SavedAddress | null;
}

const STORAGE_KEY = 'gonow_addresses';

function load(): Addresses {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { home: null, work: null };
  } catch {
    return { home: null, work: null };
  }
}

function save(addresses: Addresses) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
}

export function useAddresses() {
  const [addresses, setAddresses] = useState<Addresses>(load);

  const setAddress = (key: 'home' | 'work', address: SavedAddress) => {
    setAddresses((prev) => {
      const next = { ...prev, [key]: address };
      save(next);
      return next;
    });
  };

  return { addresses, setAddress };
}
