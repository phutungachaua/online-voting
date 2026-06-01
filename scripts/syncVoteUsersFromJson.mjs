import admin from 'firebase-admin';
import { readFile } from 'node:fs/promises';

const [, , usersPath, serviceAccountPath = './serviceAccountKey.json'] = process.argv;

if (!usersPath) {
  console.error('Usage: node scripts/syncVoteUsersFromJson.mjs <users.json> [serviceAccountKey.json]');
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

const usersSnapshot = await db.collection('users').get();
const adminUidSet = new Set();
const nonAdminUserDocRefs = [];

usersSnapshot.forEach((docSnapshot) => {
  const data = docSnapshot.data();
  if (data.role === 'admin') {
    adminUidSet.add(docSnapshot.id);
  } else {
    nonAdminUserDocRefs.push(docSnapshot.ref);
  }
});

const authUsersToDelete = [];
let nextPageToken;
do {
  const result = await auth.listUsers(1000, nextPageToken);
  result.users.forEach((userRecord) => {
    if (!adminUidSet.has(userRecord.uid)) {
      authUsersToDelete.push(userRecord.uid);
    }
  });
  nextPageToken = result.pageToken;
} while (nextPageToken);

for (let index = 0; index < authUsersToDelete.length; index += 1000) {
  const chunk = authUsersToDelete.slice(index, index + 1000);
  if (chunk.length) {
    const result = await auth.deleteUsers(chunk);
    if (result.failureCount > 0) {
      result.errors.forEach((error) => console.error(`DELETE AUTH FAILED ${chunk[error.index]}: ${error.error.message}`));
    }
  }
}

for (let index = 0; index < nonAdminUserDocRefs.length; index += 500) {
  const batch = db.batch();
  nonAdminUserDocRefs.slice(index, index + 500).forEach((ref) => batch.delete(ref));
  await batch.commit();
}

let created = 0;
let failed = 0;

for (const row of users) {
  const email = String(row.email || '').trim().toLowerCase();
  const password = String(row.password || 'Acme.com');
  const displayName = String(row.displayName || '').trim();
  const unit = String(row.unit || '').trim();
  const account = String(row.account || '').trim();

  if (!email || !displayName) {
    failed += 1;
    console.error(`SKIP invalid row: ${JSON.stringify(row)}`);
    continue;
  }

  try {
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      disabled: false,
    });

    await db.collection('users').doc(userRecord.uid).set({
      email,
      displayName,
      account,
      unit,
      role: 'user',
      createdAt: now,
      updatedAt: now,
    });

    created += 1;
    console.log(`CREATED ${email}`);
  } catch (error) {
    failed += 1;
    console.error(`FAILED ${email}: ${error.message}`);
  }
}

console.log(JSON.stringify({
  deletedAuthUsers: authUsersToDelete.length,
  deletedUserDocs: nonAdminUserDocRefs.length,
  created,
  failed,
  adminsKept: adminUidSet.size,
}, null, 2));

if (failed > 0) process.exitCode = 1;
