import { useState } from 'react';
import Transit from './pages/Transit';
import Weather from './pages/Weather';
import Settings from './pages/Settings';
import NavBar from './components/NavBar';
import './App.css';

export type Page = 'transit' | 'weather' | 'settings';

export default function App() {
  const [page, setPage] = useState<Page>('transit');

  return (
    <div className="app">
      <main className="main">
        {page === 'transit' && <Transit />}
        {page === 'weather' && <Weather />}
        {page === 'settings' && <Settings />}
      </main>
      <NavBar current={page} onNavigate={setPage} />
    </div>
  );
}
