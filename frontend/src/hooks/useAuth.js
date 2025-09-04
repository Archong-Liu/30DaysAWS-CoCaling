import { useState, useEffect } from 'react';
import { signOut, getCurrentUser, signInWithRedirect } from 'aws-amplify/auth';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isDemo = String(process.env.REACT_APP_DEMO_MODE).toLowerCase() === 'true';

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      setLoading(true);
      if (isDemo) {
        setIsAuthenticated(true);
        setUser({ username: 'demo-user', attributes: { email: 'demo@example.com' } });
        return;
      }
      const currentUser = await getCurrentUser();
      setIsAuthenticated(true);
      setUser(currentUser);
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut({ global: true });
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSignIn = () => {
    signInWithRedirect();
  };

  return {
    isAuthenticated,
    user,
    loading,
    isDemo,
    handleSignOut,
    handleSignIn,
    checkAuthState
  };
};
