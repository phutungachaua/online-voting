import { collection, doc, getDoc, getDocsFromServer, onSnapshot, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const listenVotes = (pollId, callback, onError) => {
  return onSnapshot(collection(db, 'polls', pollId, 'votes'), (snapshot) => {
    callback(snapshot.docs.map((voteDoc) => ({ id: voteDoc.id, ...voteDoc.data() })));
  }, onError);
};

export const listenUserVote = (pollId, userId, callback, onError) => {
  return onSnapshot(doc(db, 'polls', pollId, 'votes', userId), (snapshot) => {
    callback(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
  }, onError);
};

export const submitVote = async (pollId, userId, payload) => {
  const voteRef = doc(db, 'polls', pollId, 'votes', userId);
  const currentVote = await getDoc(voteRef);
  if (currentVote.exists()) {
    throw new Error('Bạn đã gửi bình chọn/chấm điểm cho poll này.');
  }

  return setDoc(voteRef, {
    userId,
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const getUserVote = async (pollId, userId) => {
  const snapshot = await getDoc(doc(db, 'polls', pollId, 'votes', userId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
};

export const resetPollVotes = async (pollId) => {
  const votesRef = collection(db, 'polls', pollId, 'votes');
  const votesSnapshot = await getDocsFromServer(votesRef);
  const docs = votesSnapshot.docs;

  for (let index = 0; index < docs.length; index += 500) {
    const batch = writeBatch(db);
    docs.slice(index, index + 500).forEach((voteDoc) => {
      batch.delete(voteDoc.ref);
    });
    await batch.commit();
  }

  const remainingSnapshot = await getDocsFromServer(votesRef);
  if (!remainingSnapshot.empty) {
    throw new Error(`Reset chưa hoàn tất, vẫn còn ${remainingSnapshot.size} lượt gửi trên Firestore.`);
  }

  return docs.length;
};
