import type { Page } from '../App';
import './NavBar.css';

interface Props {
  current: Page;
  onNavigate: (page: Page) => void;
}

const items: { id: Page; label: string; icon: string }[] = [
  { id: 'transit', label: 'Resa', icon: '🚌' },
  { id: 'weather', label: 'Väder', icon: '🌤️' },
  { id: 'settings', label: 'Inställningar', icon: '⚙️' },
];

export default function NavBar({ current, onNavigate }: Props) {
  return (
    <nav className="navbar">
      {items.map((item) => (
        <button
          key={item.id}
          className={`nav-btn ${current === item.id ? 'active' : ''}`}
          onClick={() => onNavigate(item.id)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
