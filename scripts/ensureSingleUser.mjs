import admin from 'firebase-admin';
import { readFile } from 'node:fs/promises';

const [, , account, serviceAccountPath = './serviceAccountKey.json'] = process.argv;

if (!account) {
  console.error('Usage: node scripts/ensureSingleUser.mjs <account-or-email> [serviceAccountKey.json]');
  process.exit(1);
}

const email = account.includes('@') ? account.toLowerCase() : `${account.toLowerCase()}@votes.com`;
const displayName = email.split('@')[0];
const serviceAccount = JSON.parse((await readFile(serviceAccountPath, 'utf8')).replace(/^\uFEFF/, ''));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

let userRecord = await auth.getUserByEmail(email).catch((error) => {
  if (error.code === 'auth/user-not-found') return null;
  throw error;
});

if (!userRecord) {
  userRecord = await auth.createUser({
    email,
    password: 'Acme.com',
    displayName,
    disabled: false,
  });
  console.log(`CREATED ${email}`);
} else {
  await auth.updateUser(userRecord.uid, {
    email,
    password: 'Acme.com',
    displayName,
    disabled: false,
  });
  console.log(`UPDATED ${email}`);
}

await db.collection('users').doc(userRecord.uid).set({
  email,
  displayName,
  account: displayName,
  role: 'user',
  updatedAt: now,
  createdAt: now,
}, { merge: true });

console.log(JSON.stringify({ uid: userRecord.uid, email, role: 'user', password: 'Acme.com' }, null, 2));
