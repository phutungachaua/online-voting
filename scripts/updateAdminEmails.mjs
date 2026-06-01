import admin from 'firebase-admin';
import { readFile } from 'node:fs/promises';

const [, , serviceAccountPath = './serviceAccountKey.json'] = process.argv;
const targetEmails = ['admin@votes.com', 'admin1@votes.com'];

const serviceAccount = JSON.parse((await readFile(serviceAccountPath, 'utf8')).replace(/^\uFEFF/, ''));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

const adminDocs = await db.collection('users').where('role', '==', 'admin').get();
const admins = adminDocs.docs.map((docSnapshot) => ({ uid: docSnapshot.id, ...docSnapshot.data() }));

if (admins.length < targetEmails.length) {
  console.error(`Need at least ${targetEmails.length} admin users, found ${admins.length}.`);
  process.exit(1);
}

admins.sort((a, b) => String(a.email || '').localeCompare(String(b.email || '')));

for (let index = 0; index < targetEmails.length; index += 1) {
  const adminUser = admins[index];
  const email = targetEmails[index];
  const displayName = email.split('@')[0];

  try {
    const existingTarget = await auth.getUserByEmail(email).catch((error) => {
      if (error.code === 'auth/user-not-found') return null;
      throw error;
    });

    if (existingTarget && existingTarget.uid !== adminUser.uid) {
      await auth.deleteUser(existingTarget.uid);
      await db.collection('users').doc(existingTarget.uid).delete().catch(() => {});
      console.log(`REMOVED conflicting non-target account ${email}`);
    }

    await auth.updateUser(adminUser.uid, {
      email,
      displayName,
      password: 'Acme.com',
      disabled: false,
    });

    await db.collection('users').doc(adminUser.uid).set({
      email,
      displayName,
      role: 'admin',
      updatedAt: now,
    }, { merge: true });

    console.log(`UPDATED admin uid=${adminUser.uid} email=${email}`);
  } catch (error) {
    console.error(`FAILED ${adminUser.uid} -> ${email}: ${error.message}`);
    process.exitCode = 1;
  }
}

console.log(JSON.stringify({
  updated: targetEmails.length,
  emails: targetEmails,
}, null, 2));
