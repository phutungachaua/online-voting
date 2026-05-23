import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const normalizePoll = (snapshot) => ({ id: snapshot.id, ...snapshot.data() });

const scorePlaceholderOptions = [
  { id: 'score-placeholder-min', text: 'Score placeholder min' },
  { id: 'score-placeholder-max', text: 'Score placeholder max' },
];

const normalizeOptions = (type, options = []) => {
  if (type !== 'vote') return scorePlaceholderOptions;

  return options
    .map((option) => ({ id: option.id, text: option.text.trim() }))
    .filter((option) => option.text);
};

export const listenPolls = (callback, onError) => {
  const pollsQuery = query(collection(db, 'polls'), orderBy('createdAt', 'desc'));
  return onSnapshot(pollsQuery, (snapshot) => {
    callback(snapshot.docs.map(normalizePoll));
  }, onError);
};

export const listenPollById = (pollId, callback, onError) => {
  return onSnapshot(doc(db, 'polls', pollId), (snapshot) => {
    callback(snapshot.exists() ? normalizePoll(snapshot) : null);
  }, onError);
};

export const createPoll = (data) => {
  const type = data.type || 'vote';
  const options = normalizeOptions(type, data.options);

  return addDoc(collection(db, 'polls'), {
    title: data.title.trim(),
    description: data.description.trim(),
    type,
    options,
    status: data.status || 'active',
    createdBy: data.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updatePoll = (pollId, data) => {
  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  if (Object.prototype.hasOwnProperty.call(data, 'options')) {
    payload.options = normalizeOptions(data.type || 'vote', data.options);
  }

  return updateDoc(doc(db, 'polls', pollId), payload);
};

export const deletePoll = (pollId) => deleteDoc(doc(db, 'polls', pollId));
