// MySQL connection pool shared by every API route.
// Credentials come from environment variables (.env.local), never from code.
import mysql from 'mysql2/promise';

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'library',
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true, // return DATE/DATETIME as text, so no timezone shifts
    decimalNumbers: true, // return DECIMAL (fine amounts) as numbers
  });
}

// Reuse one pool across hot reloads in development
const globalForDb = globalThis;
export const pool = globalForDb.__libraryPool ?? createPool();
if (process.env.NODE_ENV !== 'production') globalForDb.__libraryPool = pool;

// Run one parameterized statement. The ? placeholders are sent separately
// from the SQL text, which is what prevents SQL injection.
export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// Run several statements on one connection as a single transaction.
// If the callback throws, everything is rolled back.
export async function transaction(callback) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Call a stored procedure whose last parameter is an OUT value, e.g.
// callWithOut('sp_CheckoutBook', [member, book, copy, date]) -> new LoanID.
// The procedure and the SELECT of the OUT variable must share a connection.
export async function callWithOut(procedure, params) {
  const conn = await pool.getConnection();
  try {
    const placeholders = params.map(() => '?').join(', ');
    await conn.execute(`CALL ${procedure}(${placeholders}, @out_value)`, params);
    const [rows] = await conn.query('SELECT @out_value AS value');
    return rows[0].value;
  } finally {
    conn.release();
  }
}
