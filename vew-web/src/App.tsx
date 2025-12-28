import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { RecordPage } from './pages/RecordPage';
import { CompletePage } from './pages/CompletePage';
import { HistoryPage } from './pages/HistoryPage';
import { PlayerPage } from './pages/PlayerPage';
import { InteractiveRecordPage } from './pages/InteractiveRecordPage';
import { StreamingDemoPage } from './pages/StreamingDemoPage';
import { DemoLoginPage } from './pages/DemoLoginPage';

export const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<DemoLoginPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/record" element={<RecordPage />} />
        <Route path="/interactive-record" element={<InteractiveRecordPage />} />
        <Route path="/streaming-demo" element={<StreamingDemoPage />} />
        <Route path="/complete" element={<CompletePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/player/:id" element={<PlayerPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
