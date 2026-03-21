import { useState, useEffect } from 'react';

export function useAuthProfile() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const checkAuth = async () => {
    try {
      const res = await fetch('/auth/profile');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setAuthLoading(false);
        return true;
      }
    } catch (e) {
      // Ignored
    }
    setAuthLoading(false);
    return false;
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const ensureLoggedIn = async (): Promise<boolean> => {
    if (user) return true;
    const isLoggedIn = await checkAuth();
    if (!isLoggedIn) {
      window.location.href = '/auth/login?returnTo=' + encodeURIComponent(window.location.pathname);
      return false;
    }
    return true;
  };

  return { user, isAuthenticated: !!user, ensureLoggedIn, authLoading };
}
