import { useEffect, useState } from 'react';
import { readRoute, routes, type AppRoute } from '@/app/routes';
import { AppShell } from '@/shared/components/AppShell';

export default function App() {
  const [route, setRoute] = useState<AppRoute>(readRoute);

  useEffect(() => {
    const handleRouteChange = () => setRoute(readRoute());
    window.addEventListener('hashchange', handleRouteChange);
    return () => window.removeEventListener('hashchange', handleRouteChange);
  }, []);

  useEffect(() => {
    document.title = `${routes[route].title} · Pulseboard`;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [route]);

  const ActivePage = routes[route].component;
  return <AppShell activeRoute={route}><ActivePage /></AppShell>;
}
