'use strict';

require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

client.connect()
  .then(async () => {
    const result = await client.query('SELECT username, password_hash FROM users ORDER BY username');
    result.rows.forEach(r => console.log(r.username + '|' + r.password_hash));
  })
  .catch(err => {
    console.error('[ERR]', err.message);
    process.exit(1);
  })
  .finally(() => client.end());
