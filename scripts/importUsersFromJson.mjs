import admin from 'firebase-admin';
import { readFile } from 'node:fs/promises';

const [, , usersPath, serviceAccountPath = './serviceAccountKey.json'] = process.argv;

if (!usersPath) {
  console.error('Usage: node scripts/importUsersFromJson.mjs <users.json> [serviceAccountKey.json]');
  process.exit(1);
}

const parseJsonFile = async (path) => JSON.parse((await readFile(path, 'utf8')).replace(/^\uFEFF/, ''));

const serviceAccount = await parseJsonFile(serviceAccountPath);
const users = await parseJsonFile(usersPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

let created = 0;
let updated = 0;
let failed = 0;

for (const [index, row] of users.entries()) {
  const email = String(row.email || '').trim().toLowerCase();
  const password = String(row.password || '').trim();

  if (!email || !password) {
    failed += 1;
    console.error(`SKIP row ${index + 1}: missing email/password`);
    continue;
  }

  const displayName = email.split('@')[0];

  try {
    let userRecord;
    let existed = false;

    try {
      userRecord = await auth.getUserByEmail(email);
      existed = true;
      await auth.updateUser(userRecord.uid, {
        email,
        password,
        displayName,
        disabled: false,
      });
    } catch (error) {
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }

      userRecord = await auth.createUser({
        email,
        password,
        displayName,
        disabled: false,
      });
    }

    const userRef = db.collection('users').doc(userRecord.uid);
    const snapshot = await userRef.get();

    if (snapshot.exists) {
      await userRef.set(
        {
          email,
          displayName,
          role: 'user',
          updatedAt: now,
        },
        { merge: true },
      );
    } else {
      await userRef.set({
        email,
        displayName,
        role: 'user',
        createdAt: now,
        updatedAt: now,
      });
    }

    if (existed) {
      updated += 1;
    } else {
      created += 1;
    }

    console.log(`${existed ? 'UPDATED' : 'CREATED'} ${email}`);
  } catch (error) {
    failed += 1;
    console.error(`FAILED ${email}: ${error.message}`);
  }
}

console.log(JSON.stringify({ total: users.length, created, updated, failed }, null, 2));

if (failed > 0) {
  process.exitCode = 1;
}
