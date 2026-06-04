import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth } from '../lib/firebase';
import { db } from '../lib/firebase';

const SESSION_STORAGE_KEY = 'acmevote_session_id';
const SESSION_STARTING_KEY = 'acmevote_session_starting_id';
const SESSION_ACTIVATING_UNTIL_KEY = 'acmevote_session_activating_until';
const SESSION_ACTIVATION_GRACE_MS = 8000;

const createSessionId = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const getCurrentSessionId = () => window.localStorage.getItem(SESSION_STORAGE_KEY);

export const isSessionStarting = () => {
  const currentSessionId = getCurrentSessionId();
  const activatingUntil = Number(window.sessionStorage.getItem(SESSION_ACTIVATING_UNTIL_KEY) || 0);

  return Boolean(
    currentSessionId
    && (
      window.sessionStorage.getItem(SESSION_STARTING_KEY) === currentSessionId
      || Date.now() < activatingUntil
    ),
  );
};

export const getSessionActivationRemainingMs = () => (
  Math.max(0, Number(window.sessionStorage.getItem(SESSION_ACTIVATING_UNTIL_KEY) || 0) - Date.now())
);

export const clearSessionActivation = () => {
  window.sessionStorage.removeItem(SESSION_STARTING_KEY);
  window.sessionStorage.removeItem(SESSION_ACTIVATING_UNTIL_KEY);
};

export const clearCurrentSession = () => {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  clearSessionActivation();
};

export const startUserSession = async (user) => {
  const sessionId = createSessionId();
  window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  window.sessionStorage.setItem(SESSION_STARTING_KEY, sessionId);
  window.sessionStorage.setItem(SESSION_ACTIVATING_UNTIL_KEY, String(Date.now() + SESSION_ACTIVATION_GRACE_MS));

  try {
    await updateDoc(doc(db, 'users', user.uid), {
      activeSessionId: sessionId,
      activeSessionUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } finally {
    window.sessionStorage.removeItem(SESSION_STARTING_KEY);
  }

  return sessionId;
};

export const listenUserSession = (uid, callback, onError) => (
  onSnapshot(doc(db, 'users', uid), (snapshot) => {
    callback(snapshot.exists() ? snapshot.data()?.activeSessionId : null);
  }, onError)
);

export const login = async (email, password) => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  try {
    await startUserSession(credential.user);
    return credential;
  } catch (error) {
    clearCurrentSession();
    await signOut(auth);
    throw error;
  }
};

export const logout = async () => {
  clearCurrentSession();
  return signOut(auth);
};
export const listenAuthState = (callback) => onAuthStateChanged(auth, callback);
