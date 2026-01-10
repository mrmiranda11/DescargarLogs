import { Routes, Route, Link ,Navigate  } from 'react-router-dom';
import Download from './pages/Download';

function App() {
  return (
    <div>
      <Routes> 
        <Route path="/" element={<Navigate to="/download" replace />} /> 
        <Route path="/download" element={<Download />} /> 
        </Routes>
    </div>
  );
}

export default App;
