import React from 'react';
import { FileQuestion } from 'lucide-react';
import AppShell from './app/AppShell';
import { Link, useRoute } from './app/router';
import { ThemeProvider } from './app/theme';
import { EmptyState } from './components/ui';
import { MODEL_CONFIGS } from './models/configs';
import ModelLibrary from './pages/ModelLibrary';
import SimulationPage from './pages/SimulationPage';

const NotFound: React.FC = () => (
  <div className="page page-narrow">
    <EmptyState icon={<FileQuestion size={28} />} title="Page not found">
      <p>
        That address doesn’t match a model. <Link to="/">Go to the model library</Link> to pick one.
      </p>
    </EmptyState>
  </div>
);

const Routes: React.FC = () => {
  const route = useRoute();
  let page: React.ReactNode;
  if (route.name === 'library') page = <ModelLibrary />;
  else if (route.name === 'model' && MODEL_CONFIGS[route.id]) page = <SimulationPage config={MODEL_CONFIGS[route.id]} />;
  else page = <NotFound />;
  return <AppShell route={route}>{page}</AppShell>;
};

const App: React.FC = () => (
  <ThemeProvider>
    <Routes />
  </ThemeProvider>
);

export default App;
