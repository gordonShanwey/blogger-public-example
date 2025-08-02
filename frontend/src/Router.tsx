import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Dashboard from './Dashboard';
import PostDetail from './PostDetail';
import AcceptedPostDetail from './AcceptedPostDetail';
import Login from './Login';

import ProtectedRoute from './components/ProtectedRoute';
import Navigation from './components/Navigation';
import { AuthProvider } from './contexts/AuthContext';

function AppRouter() {
  // Print environment variables to check if they're being read
    return (
    <AuthProvider>
      <Router>
        <Navigation />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/post/:postId" 
            element={<PostDetail />} 
          />
          <Route
            path="/accepted-post/:postId"
            element={<AcceptedPostDetail />}
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default AppRouter; 