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
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const normalizePoll = (snapshot) => ({ id: snapshot.id, ...snapshot.data() });

const createdAtMillis = (poll) => poll.createdAt?.toMillis?.() || 0;

const sortPollsByOrder = (polls) => (
  [...polls].sort((a, b) => {
    const aHasOrder = Number.isFinite(Number(a.order));
    const bHasOrder = Number.isFinite(Number(b.order));

    if (aHasOrder && bHasOrder) return Number(a.order) - Number(b.order);
    if (aHasOrder) return -1;
    if (bHasOrder) return 1;
    return createdAtMillis(b) - createdAtMillis(a);
  })
);

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
    callback(sortPollsByOrder(snapshot.docs.map(normalizePoll)));
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
    order: Number.isFinite(Number(data.order)) ? Number(data.order) : Date.now(),
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

export const updatePollOrder = async (polls) => {
  const batch = writeBatch(db);
  polls.forEach((poll, index) => {
    batch.update(doc(db, 'polls', poll.id), {
      order: index + 1,
      updatedAt: serverTimestamp(),
    });
  });
  return batch.commit();
};
