import { useEffect, useState } from 'react';
import { listenPollById, listenPolls } from '../services/pollService';

export function usePolls(enabled = true) {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled) {
      setPolls([]);
      setLoading(false);
      setError('');
      return undefined;
    }

    setLoading(true);
    const unsubscribe = listenPolls((items) => {
      setPolls(items);
      setLoading(false);
      setError('');
    }, (err) => {
      setError(err.message);
      setLoading(false);
    });

    return unsubscribe;
  }, [enabled]);

  return { polls, loading, error };
}

export function usePoll(pollId, enabled = true) {
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(Boolean(pollId && enabled));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!pollId || !enabled) {
      setPoll(null);
      setLoading(false);
      setError('');
      return undefined;
    }

    setLoading(true);
    const unsubscribe = listenPollById(pollId, (item) => {
      setPoll(item);
      setLoading(false);
      setError('');
    }, (err) => {
      setError(err.message);
      setLoading(false);
    });

    return unsubscribe;
  }, [pollId, enabled]);

  return { poll, loading, error };
}
