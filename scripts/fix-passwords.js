'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

client.connect()
  .then(async () => {
    const adminHash = await bcrypt.hash('admin@!23p', 10);
    const opHash    = await bcrypt.hash('operator123', 10);

    await client.query("UPDATE users SET password_hash=$1 WHERE username='admin'",    [adminHash]);
    await client.query("UPDATE users SET password_hash=$1 WHERE username='operator'", [opHash]);

    const result = await client.query('SELECT username, password_hash FROM users');
    console.log('[OK] Passwords updated:');
    result.rows.forEach(r => console.log(' ', r.username, '->', r.password_hash.slice(0, 20) + '...'));
  })
  .catch(err => {
    console.error('[ERR]', err.message);
    process.exit(1);
  })
  .finally(() => client.end());
