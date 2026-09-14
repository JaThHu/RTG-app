import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { IconBack } from './Icons';

export function PageHeader({
  eyebrow,
  title,
  action,
  back,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  /** Ziel des Zurück-Buttons, oder true für "eine Seite zurück". */
  back?: string | true;
}) {
  const navigate = useNavigate();

  return (
    <header className="page-header">
      <div className="row" style={{ minWidth: 0 }}>
        {back && (
          <button
            className="icon-btn"
            aria-label="Zurück"
            onClick={() => (back === true ? navigate(-1) : navigate(back))}
          >
            <IconBack />
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          {eyebrow && <div className="page-header__eyebrow">{eyebrow}</div>}
          <h1 className="truncate">{title}</h1>
        </div>
      </div>
      {action}
    </header>
  );
}
