// Builds the database from scratch: schema.sql -> advanced.sql -> seed.sql,
// then creates the app's least-privilege MySQL user.
//
//   npm run db:setup
//
// Uses DB_ADMIN_USER / DB_ADMIN_PASSWORD (e.g. root) to build, and creates
// DB_USER / DB_PASSWORD with only SELECT, INSERT, UPDATE, DELETE and EXECUTE.
// The same .sql files also run unchanged in MySQL Workbench or the mysql CLI.

import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

const FILES = ['schema.sql', 'advanced.sql', 'seed.sql'];

// Split a .sql file into statements, honouring DELIMITER lines the way the
// mysql CLI and Workbench do (needed for procedures, functions and triggers).
function splitStatements(sql) {
  const statements = [];
  let delimiter = ';';
  let buffer = '';

  for (const line of sql.split(/\r?\n/)) {
    const trimmed = line.trim();
    const match = trimmed.match(/^DELIMITER\s+(\S+)$/i);
    if (match) {
      delimiter = match[1];
      continue;
    }
    if (trimmed === '' || trimmed.startsWith('--')) {
      if (buffer) buffer += line + '\n'; // keep comments inside a statement, skip the rest
      continue;
    }
    buffer += line + '\n';
    if (trimmed.endsWith(delimiter)) {
      statements.push(buffer.trimEnd().slice(0, -delimiter.length).trim());
      buffer = '';
    }
  }
  if (buffer.trim()) statements.push(buffer.trim());
  return statements;
}

async function main() {
  const { DB_HOST = 'localhost', DB_PORT = '3306', DB_ADMIN_USER, DB_ADMIN_PASSWORD, DB_USER, DB_PASSWORD, DB_NAME = 'library' } =
    process.env;

  if (!DB_ADMIN_USER || !DB_USER || !DB_PASSWORD) {
    console.error('Set DB_ADMIN_USER, DB_ADMIN_PASSWORD, DB_USER and DB_PASSWORD in .env.local');
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_ADMIN_USER,
    password: DB_ADMIN_PASSWORD || '',
  });

  for (const file of FILES) {
    const filePath = path.join(process.cwd(), 'db', file);
    if (!fs.existsSync(filePath)) {
      console.log(`Skipping ${file} (not found)`);
      continue;
    }
    const sql = fs.readFileSync(filePath, 'utf8');
    const statements = splitStatements(sql);
    process.stdout.write(`Running ${file} (${statements.length} statements)... `);
    for (const statement of statements) {
      try {
        await conn.query(statement);
      } catch (err) {
        console.error(`\n\nFailed in ${file}:\n${statement.slice(0, 300)}\n\n${err.message}`);
        process.exit(1);
      }
    }
    console.log('done');
  }

  // Least-privilege user for the web app: no CREATE, ALTER or DROP
  await conn.query('CREATE USER IF NOT EXISTS ?@? IDENTIFIED BY ?', [DB_USER, 'localhost', DB_PASSWORD]);
  await conn.query('ALTER USER ?@? IDENTIFIED BY ?', [DB_USER, 'localhost', DB_PASSWORD]);
  await conn.query(`GRANT SELECT, INSERT, UPDATE, DELETE, EXECUTE ON \`${DB_NAME}\`.* TO ?@?`, [DB_USER, 'localhost']);
  console.log(`App user '${DB_USER}'@'localhost' ready (SELECT, INSERT, UPDATE, DELETE, EXECUTE on ${DB_NAME}).`);

  await conn.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
