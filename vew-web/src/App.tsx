import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { RecordPage } from './pages/RecordPage';
import { CompletePage } from './pages/CompletePage';
import { HistoryPage } from './pages/HistoryPage';
import { PlayerPage } from './pages/PlayerPage';
import { InteractiveRecordPage } from './pages/InteractiveRecordPage';
import { StreamingDemoPage } from './pages/StreamingDemoPage';
import { DemoLoginPage } from './pages/DemoLoginPage';
import { AITestPage } from './pages/AITestPage';
import { ProtectedRoute } from './components/ProtectedRoute';

export const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<DemoLoginPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/test-ai" element={<AITestPage />} />
        <Route path="/record" element={<ProtectedRoute><RecordPage /></ProtectedRoute>} />
        <Route path="/interactive-record" element={<ProtectedRoute><InteractiveRecordPage /></ProtectedRoute>} />
        <Route path="/streaming-demo" element={<ProtectedRoute><StreamingDemoPage /></ProtectedRoute>} />
        <Route path="/complete" element={<CompletePage />} />
        <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path="/player/:id" element={<ProtectedRoute><PlayerPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
