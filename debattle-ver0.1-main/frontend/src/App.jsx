import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { PrivateRoute } from './context/PrivateRoute';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import DebatePage from './pages/Debate';
import Leaderboard from './pages/Leaderboard';
import SpectatorPage from './pages/Spectator';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route path="/" element={<AuthPage />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/debate"
              element={
                <PrivateRoute>
                  <DebatePage />
                </PrivateRoute>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <PrivateRoute>
                  <Leaderboard />
                </PrivateRoute>
              }
            />
            <Route path="/spectate" element={<SpectatorPage />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

