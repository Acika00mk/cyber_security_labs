const bcrypt = require('bcryptjs');
const { db } = require('../src/db');

const users = [
  ['alice@shoplab.test', 'alice123'],
  ['bob@shoplab.test', 'bob123'],
];

const updateUser = db.prepare(
  'UPDATE users SET password_hash = ?, password = NULL WHERE email = ?',
);

db.exec('BEGIN');
try {
  for (const [email, password] of users) {
    const result = updateUser.run(bcrypt.hashSync(password, 10), email);
    if (result.changes !== 1) {
      throw new Error(`Expected exactly one account for ${email}`);
    }
  }
  db.exec('COMMIT');
  console.log(`Reset bcrypt passwords for ${users.length} accounts.`);
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}
