import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';

const App: React.FC = () => {
  // Kiểm tra authentication và role từ localStorage
  const isAuthenticated = localStorage.getItem('token') !== null;
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role_id === 1;

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!isAuthenticated ? <Login /> : <Navigate to={isAdmin ? "/dashboard" : "/user-home"} />} 
        />
        <Route 
          path="/register" 
          element={!isAuthenticated ? <Register /> : <Navigate to={isAdmin ? "/dashboard" : "/user-home"} />} 
        />
        <Route 
          path="/dashboard" 
          element={isAuthenticated && isAdmin ? <Dashboard /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/user-home" 
          element={isAuthenticated && !isAdmin ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/" 
          element={<Navigate to={isAuthenticated ? (isAdmin ? "/dashboard" : "/user-home") : "/login"} />} 
        />
      </Routes>
    </Router>
  );
};

export default App;