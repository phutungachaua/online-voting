import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearCurrentSession,
  clearSessionActivation,
  getCurrentSessionId,
  getSessionActivationRemainingMs,
  isSessionStarting,
  listenAuthState,
  listenUserSession,
  logout,
} from '../services/authService';

const AuthContext = createContext({ user: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const latestActiveSessionIdRef = useRef(null);
  const activationCheckTimerRef = useRef(null);

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
    const clearActivationTimer = () => {
      if (activationCheckTimerRef.current) {
        window.clearTimeout(activationCheckTimerRef.current);
        activationCheckTimerRef.current = null;
      }
    };

    const scheduleActivationMismatchCheck = () => {
      clearActivationTimer();
      const delay = getSessionActivationRemainingMs() + 100;
      activationCheckTimerRef.current = window.setTimeout(async () => {
        const currentSessionId = getCurrentSessionId();
        const activeSessionId = latestActiveSessionIdRef.current;

        if (currentSessionId && activeSessionId && activeSessionId !== currentSessionId) {
          clearCurrentSession();
          await logout();
        }
      }, delay);
    };

    const unsubscribe = listenUserSession(user.uid, async (activeSessionId) => {
      latestActiveSessionIdRef.current = activeSessionId;
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

      if (activeSessionId === currentSessionId) {
        clearActivationTimer();
        clearSessionActivation();
        return;
      }

      if (activeSessionId && activeSessionId !== currentSessionId) {
        if (isSessionStarting()) {
          scheduleActivationMismatchCheck();
          return;
        }
        clearCurrentSession();
        await logout();
      }
    }, async () => {
      clearCurrentSession();
      await logout();
    });

    return () => {
      clearActivationTimer();
      unsubscribe();
    };
  }, [user]);

  const value = useMemo(() => ({ user, loading }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
