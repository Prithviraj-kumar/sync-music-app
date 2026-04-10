import { BrowserRouter, Routes, Route } from 'react-router-dom';
import JoinRoom from './pages/JoinRoom';
import ListeningRoom from './pages/ListeningRoom';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<JoinRoom />} />
        <Route path="/room/:roomId" element={<ListeningRoom />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;