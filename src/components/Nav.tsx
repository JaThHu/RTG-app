import { NavLink } from 'react-router-dom';
import { IconMicro, IconMore, IconPlan, IconStats, IconToday } from './Icons';

const ITEMS = [
  { to: '/', label: 'Heute', Icon: IconToday, end: true },
  { to: '/plan', label: 'Plan', Icon: IconPlan, end: false },
  { to: '/mikro', label: 'Mikro', Icon: IconMicro, end: false },
  { to: '/stats', label: 'Stats', Icon: IconStats, end: false },
  { to: '/mehr', label: 'Mehr', Icon: IconMore, end: false },
];

export function Nav() {
  return (
    <nav className="nav" aria-label="Hauptnavigation">
      {ITEMS.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end} className="nav__item">
          <Icon className="nav__icon" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
