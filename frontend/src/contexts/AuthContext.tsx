import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User } from 'firebase/auth';
import authService from '../services/authService';

// Define the shape of our context
interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (displayName: string, photoURL?: string) => Promise<void>;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Component to wrap the app with the auth context provider
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Set up auth state listener on component mount
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });

    // Clean up on unmount
    return unsubscribe;
  }, []);

  // Login method
  const login = async (email: string, password: string) => {
    await authService.login(email, password);
  };

  // Google login method
  const loginWithGoogle = async () => {
    await authService.loginWithGoogle();
  };

  // Register method
  const register = async (email: string, password: string, displayName: string) => {
    await authService.register(email, password, displayName);
  };

  // Logout method
  const logout = async () => {
    await authService.logout();
  };

  // Reset password method
  const resetPassword = async (email: string) => {
    await authService.resetPassword(email);
  };

  // Update profile method
  const updateProfile = async (displayName: string, photoURL?: string) => {
    await authService.updateUserProfile(displayName, photoURL);
  };

  // Create the value object to be provided to consumers
  const value: AuthContextType = {
    currentUser,
    isLoading,
    login,
    loginWithGoogle,
    register,
    logout,
    resetPassword,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 