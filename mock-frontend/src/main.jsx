import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { SimulationProvider } from './context/SimulationContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <SocketProvider>
          <SimulationProvider>
            <App />
          </SimulationProvider>
        </SocketProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);
