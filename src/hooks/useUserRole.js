import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';

export function useUserRole(user) {
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      setRole(null);
      setProfile(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      const data = snapshot.exists() ? snapshot.data() : null;
      setProfile(data);
      setRole(data?.role || 'user');
      setLoading(false);
      setError('');
    }, (err) => {
      setError(err.message);
      setRole(null);
      setProfile(null);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  return { role, profile, loading, error, isAdmin: role === 'admin' };
}
