import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { clearCurrentSession, getCurrentSessionId, listenAuthState, listenUserSession, logout } from '../services/authService';

const AuthContext = createContext({ user: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = listenAuthState((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    let ignoreFirstEmptySession = true;
    const unsubscribe = listenUserSession(user.uid, async (activeSessionId) => {
      const currentSessionId = getCurrentSessionId();

      if (!currentSessionId) {
        if (ignoreFirstEmptySession) {
          ignoreFirstEmptySession = false;
          window.setTimeout(async () => {
            if (!getCurrentSessionId()) {
              clearCurrentSession();
              await logout();
            }
          }, 1000);
          return;
        }
        clearCurrentSession();
        await logout();
        return;
      }

      if (activeSessionId && activeSessionId !== currentSessionId) {
        clearCurrentSession();
        await logout();
      }
    }, async () => {
      clearCurrentSession();
      await logout();
    });

    return unsubscribe;
  }, [user]);

  const value = useMemo(() => ({ user, loading }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
