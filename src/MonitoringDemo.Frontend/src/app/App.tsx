import { useEffect, useState } from 'react';
import { ScenarioConsole } from '@/features/scenarios/ScenarioConsole';
import { LearnPage } from '@/pages/LearnPage';
import { AppShell, type AppRoute } from '@/shared/components/AppShell';

export default function App() {
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const onHashChange = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    document.title = route === 'learn'
      ? 'Learn · Observability Scenario Lab'
      : 'Scenario Lab · Observability data generator';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [route]);

  return (
    <AppShell activeRoute={route}>
      {route === 'learn' ? <LearnPage /> : <ScenarioConsole />}
    </AppShell>
  );
}

function readRoute(): AppRoute {
  return window.location.hash.replace(/^#\/?/, '') === 'learn' ? 'learn' : 'scenarios';
}
