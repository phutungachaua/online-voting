import admin from 'firebase-admin';
import { readFile } from 'node:fs/promises';

const [, , pollId, serviceAccountPath = './serviceAccountKey.json'] = process.argv;

if (!pollId) {
  console.error('Usage: node scripts/resetPollVotesAdmin.mjs <pollId> [serviceAccountKey.json]');
  process.exit(1);
}

const serviceAccount = JSON.parse((await readFile(serviceAccountPath, 'utf8')).replace(/^\uFEFF/, ''));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const pollRef = db.collection('polls').doc(pollId);
const pollSnapshot = await pollRef.get();

if (!pollSnapshot.exists) {
  console.error(`Poll not found: ${pollId}`);
  process.exit(1);
}

const votesSnapshot = await pollRef.collection('votes').get();
const docs = votesSnapshot.docs;

for (let index = 0; index < docs.length; index += 500) {
  const batch = db.batch();
  docs.slice(index, index + 500).forEach((voteDoc) => {
    batch.delete(voteDoc.ref);
  });
  await batch.commit();
}

await pollRef.update({
  resetAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
});

const remainingSnapshot = await pollRef.collection('votes').get();
const poll = pollSnapshot.data();

console.log(JSON.stringify({
  pollId,
  title: poll.title,
  deleted: docs.length,
  remaining: remainingSnapshot.size,
}, null, 2));

if (!remainingSnapshot.empty) {
  process.exitCode = 1;
}
