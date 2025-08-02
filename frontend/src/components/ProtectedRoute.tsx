import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

function ProtectedRoute({ children, redirectTo = '/login' }: ProtectedRouteProps) {
  const { currentUser, isLoading } = useAuth();
  
  // If still loading auth state, you could show a loading indicator
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  // If not authenticated, redirect to login
  if (!currentUser) {
    return <Navigate to={redirectTo} />;
  }
  
  // If authenticated, render the children
  return <>{children}</>;
}

export default ProtectedRoute; 