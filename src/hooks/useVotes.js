import { useEffect, useMemo, useState } from 'react';
import { listenUserVote, listenVotes } from '../services/voteService';

export function useVotes(pollId, poll = null, enabled = true) {
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(Boolean(pollId && enabled));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!pollId || !enabled) {
      setVotes([]);
      setLoading(false);
      setError('');
      return undefined;
    }

    setLoading(true);
    const unsubscribe = listenVotes(pollId, (items) => {
      setVotes(items);
      setLoading(false);
      setError('');
    }, (err) => {
      setError(err.message);
      setLoading(false);
    });

    return unsubscribe;
  }, [pollId, enabled]);

  const options = poll?.options || [];
  const type = poll?.type || 'vote';

  const results = useMemo(() => {
    const total = votes.length;
    const counts = options.reduce((acc, option) => ({ ...acc, [option.id]: 0 }), {});

    votes.forEach((vote) => {
      if (counts[vote.optionId] !== undefined) counts[vote.optionId] += 1;
    });

    return options.map((option) => {
      const count = counts[option.id] || 0;
      return {
        ...option,
        count,
        percent: total === 0 ? 0 : Math.round((count / total) * 100),
      };
    });
  }, [options, votes]);

  const averageScore = useMemo(() => {
    if (!type.startsWith('score') || votes.length === 0) return null;
    const totalScore = votes.reduce((sum, vote) => sum + Number(vote.score || 0), 0);
    return Number((totalScore / votes.length).toFixed(1));
  }, [type, votes]);

  return { votes, results, totalVotes: votes.length, averageScore, loading, error };
}

export function useUserVote(pollId, userId) {
  const [userVote, setUserVote] = useState(null);
  const [loading, setLoading] = useState(Boolean(pollId && userId));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!pollId || !userId) {
      setUserVote(null);
      setLoading(false);
      setError('');
      return undefined;
    }

    setLoading(true);
    const unsubscribe = listenUserVote(pollId, userId, (vote) => {
      setUserVote(vote);
      setLoading(false);
      setError('');
    }, (err) => {
      setError(err.message);
      setLoading(false);
    });

    return unsubscribe;
  }, [pollId, userId]);

  return { userVote, loading, error };
}

export function useUserPollVotes(polls = [], userId = null) {
  const [votesByPollId, setVotesByPollId] = useState({});
  const [loading, setLoading] = useState(Boolean(polls.length && userId));
  const pollIds = useMemo(() => polls.map((poll) => poll.id), [polls]);
  const pollIdsKey = pollIds.join('|');

  useEffect(() => {
    if (!userId || pollIds.length === 0) {
      setVotesByPollId({});
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const unsubscribes = pollIds.map((pollId) => (
      listenUserVote(pollId, userId, (vote) => {
        setVotesByPollId((current) => {
          const next = { ...current };
          if (vote) next[pollId] = vote;
          else delete next[pollId];
          return next;
        });
      }, () => {
        setVotesByPollId((current) => {
          const next = { ...current };
          delete next[pollId];
          return next;
        });
      })
    ));

    setLoading(false);
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [pollIdsKey, userId]);

  return { votesByPollId, loading };
}
