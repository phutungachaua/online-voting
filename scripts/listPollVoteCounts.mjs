import admin from 'firebase-admin';
import { readFile } from 'node:fs/promises';

const [, , serviceAccountPath = './serviceAccountKey.json'] = process.argv;
const serviceAccount = JSON.parse((await readFile(serviceAccountPath, 'utf8')).replace(/^\uFEFF/, ''));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const pollsSnapshot = await db.collection('polls').orderBy('createdAt', 'desc').get();

for (const pollDoc of pollsSnapshot.docs) {
  const poll = pollDoc.data();
  const votesSnapshot = await pollDoc.ref.collection('votes').get();
  console.log(JSON.stringify({
    id: pollDoc.id,
    title: poll.title,
    type: poll.type,
    status: poll.status,
    voteCount: votesSnapshot.size,
  }));
}
