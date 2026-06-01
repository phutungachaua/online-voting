import admin from 'firebase-admin';
import { readFile } from 'node:fs/promises';

const [, , serviceAccountPath = './serviceAccountKey.json'] = process.argv;
const targetAdmins = [
  { email: 'admin@votes.com', displayName: 'admin' },
  { email: 'admin1@votes.com', displayName: 'admin1' },
];

const serviceAccount = JSON.parse((await readFile(serviceAccountPath, 'utf8')).replace(/^\uFEFF/, ''));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

for (const target of targetAdmins) {
  let userRecord = await auth.getUserByEmail(target.email).catch((error) => {
    if (error.code === 'auth/user-not-found') return null;
    throw error;
  });

  if (!userRecord) {
    userRecord = await auth.createUser({
      email: target.email,
      password: 'Acme.com',
      displayName: target.displayName,
      disabled: false,
    });
    console.log(`CREATED ${target.email}`);
  } else {
    await auth.updateUser(userRecord.uid, {
      email: target.email,
      password: 'Acme.com',
      displayName: target.displayName,
      disabled: false,
    });
    console.log(`UPDATED ${target.email}`);
  }

  await db.collection('users').doc(userRecord.uid).set({
    email: target.email,
    displayName: target.displayName,
    role: 'admin',
    updatedAt: now,
  }, { merge: true });
}

const adminDocs = await db.collection('users').where('role', '==', 'admin').get();
for (const docSnapshot of adminDocs.docs) {
  const data = docSnapshot.data();
  if (targetAdmins.some((target) => target.email === data.email)) continue;

  const existsInAuth = await auth.getUser(docSnapshot.id).then(() => true).catch((error) => {
    if (error.code === 'auth/user-not-found') return false;
    throw error;
  });

  if (!existsInAuth) {
    await docSnapshot.ref.delete();
    console.log(`DELETED orphan admin doc uid=${docSnapshot.id}`);
  }
}

const finalAdmins = await db.collection('users').where('role', '==', 'admin').get();
console.log(JSON.stringify(finalAdmins.docs.map((docSnapshot) => ({
  uid: docSnapshot.id,
  email: docSnapshot.data().email,
  role: docSnapshot.data().role,
})), null, 2));
