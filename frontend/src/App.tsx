import React, { useState } from 'react';
import ModelLibrary from './pages/ModelLibrary';
import SimulationPage from './pages/SimulationPage';

const App: React.FC = () => {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  if (selectedModel) {
    return (
      <SimulationPage
        modelId={selectedModel}
        onBack={() => setSelectedModel(null)}
      />
    );
  }

  return <ModelLibrary onSelectModel={setSelectedModel} />;
};

export default App;
