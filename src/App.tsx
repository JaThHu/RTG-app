import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Nav } from './components/Nav';
import { ToastProvider } from './components/Toast';
import { dismissStorageError, useStore, useStorageError } from './lib/store';
import { primeAudio } from './lib/feedback';
import { TodayPage } from './pages/TodayPage';
import { PlanPage } from './pages/PlanPage';
import { TemplateEditorPage } from './pages/TemplateEditorPage';
import { WorkoutPage } from './pages/WorkoutPage';
import { MicroPage } from './pages/MicroPage';
import { StatsPage } from './pages/StatsPage';
import { MorePage } from './pages/MorePage';
import { TestsPage } from './pages/TestsPage';
import { HistoryPage } from './pages/HistoryPage';
import { SessionDetailPage } from './pages/SessionDetailPage';

export function App() {
  const theme = useStore((data) => data.settings.theme);
  const location = useLocation();
  const storageError = useStorageError();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', theme === 'light' ? '#f4f7f4' : '#0a0e0c');
  }, [theme]);

  // Beim ersten Tap den Audio-Kontext freischalten (iOS-Anforderung).
  useEffect(() => {
    const onFirstTap = () => primeAudio();
    document.addEventListener('pointerdown', onFirstTap, { once: true });
    return () => document.removeEventListener('pointerdown', onFirstTap);
  }, []);

  // Beim Seitenwechsel nach oben springen.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Das laufende Workout nutzt den ganzen Bildschirm.
  const immersive = location.pathname.startsWith('/workout/');

  return (
    <ToastProvider>
      <div className="app">
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/plan" element={<PlanPage />} />
          <Route path="/plan/:templateId" element={<TemplateEditorPage />} />
          <Route path="/workout/:sessionId" element={<WorkoutPage />} />
          <Route path="/mikro" element={<MicroPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/mehr" element={<MorePage />} />
          <Route path="/mehr/tests" element={<TestsPage />} />
          <Route path="/verlauf" element={<HistoryPage />} />
          <Route path="/verlauf/:sessionId" element={<SessionDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {!immersive && <Nav />}
        {storageError && (
          <button className="toast toast--error" onClick={dismissStorageError}>
            {storageError}
          </button>
        )}
      </div>
    </ToastProvider>
  );
}
