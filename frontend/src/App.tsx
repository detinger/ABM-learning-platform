import React from 'react';
import { FileQuestion } from 'lucide-react';
import AppShell from './app/AppShell';
import { Link, useRoute } from './app/router';
import { ThemeProvider } from './app/theme';
import { EmptyState } from './components/ui';
import { MODEL_CONFIGS } from './models/configs';
import ModelLibrary from './pages/ModelLibrary';
import SimulationPage from './pages/SimulationPage';
import LearnPage from './pages/LearnPage';
import LessonPage from './pages/LessonPage';
import ChallengesPage from './pages/ChallengesPage';
import ChallengePage from './pages/ChallengePage';
import { LESSON_BY_ID } from './learn/lessons';
import { CHALLENGE_BY_ID } from './learn/challenges';

const NotFound: React.FC = () => (
  <div className="page page-narrow">
    <EmptyState icon={<FileQuestion size={28} />} title="Page not found">
      <p>
        That address doesn’t match a model, lesson or challenge. <Link to="/">Go to the model library</Link> to pick one.
      </p>
    </EmptyState>
  </div>
);

const Routes: React.FC = () => {
  const route = useRoute();
  let page: React.ReactNode;
  if (route.name === 'library') page = <ModelLibrary />;
  else if (route.name === 'model' && MODEL_CONFIGS[route.id]) page = <SimulationPage config={MODEL_CONFIGS[route.id]} />;
  else if (route.name === 'learn') page = <LearnPage />;
  else if (route.name === 'lesson' && LESSON_BY_ID[route.id])
    page = <LessonPage key={route.id} lesson={LESSON_BY_ID[route.id]} />;
  else if (route.name === 'challenges') page = <ChallengesPage />;
  else if (route.name === 'challenge' && CHALLENGE_BY_ID[route.id])
    page = <ChallengePage key={route.id} challenge={CHALLENGE_BY_ID[route.id]} />;
  else page = <NotFound />;
  return <AppShell route={route}>{page}</AppShell>;
};

const App: React.FC = () => (
  <ThemeProvider>
    <Routes />
  </ThemeProvider>
);

export default App;
