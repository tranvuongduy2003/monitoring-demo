import React from 'react';
import { AmbientBackground } from './components/dashboard/AmbientBackground';
import { GlassSidebar } from './components/dashboard/GlassSidebar';
import { DashboardLayout } from './components/dashboard/DashboardLayout';

function App() {
  return (
    <AmbientBackground>
      <div className="flex min-h-screen">
        <GlassSidebar />
        <main className="flex-1 h-screen overflow-y-auto">
          <DashboardLayout />
        </main>
      </div>
    </AmbientBackground>
  );
}

export default App;
