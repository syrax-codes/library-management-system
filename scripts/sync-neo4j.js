// Copies the borrowing network from MySQL into Neo4j.
//
//   npm run neo4j:sync
//
// Graph model
//   (:Member {memberId, name})  (:Book {bookId, title})  (:Genre {name})
//   (:Member)-[:BORROWED {times, lastIssueDate}]->(:Book)
//   (:Member)-[:REVIEWED {rating}]->(:Book)
//   (:Book)-[:IN_GENRE]->(:Genre)
//
// MySQL is the source of truth, so the graph is rebuilt from it each time.
// Every write uses MERGE, so running the script twice never creates
// duplicates, and the uniqueness constraints guarantee it.
import mysql from 'mysql2/promise';
import neo4j from 'neo4j-driver';

const env = process.env;

async function main() {
  const sql = await mysql.createConnection({
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME || 'library',
    dateStrings: true,
  });
  const driver = neo4j.driver(env.NEO4J_URI || 'bolt://localhost:7687', neo4j.auth.basic(env.NEO4J_USER || 'neo4j', env.NEO4J_PASSWORD));

  try {
    await driver.verifyConnectivity();
  } catch (err) {
    console.error(`Cannot reach Neo4j at ${env.NEO4J_URI}. Is the database started in Neo4j Desktop?\n${err.message}`);
    process.exit(1);
  }

  const run = (cypher, params = {}) => driver.executeQuery(cypher, params);
  const int = (v) => neo4j.int(v);

  // 1. Uniqueness constraints (each one also creates an index for lookups)
  await run('CREATE CONSTRAINT member_id IF NOT EXISTS FOR (m:Member) REQUIRE m.memberId IS UNIQUE');
  await run('CREATE CONSTRAINT book_id IF NOT EXISTS FOR (b:Book) REQUIRE b.bookId IS UNIQUE');
  await run('CREATE CONSTRAINT genre_name IF NOT EXISTS FOR (g:Genre) REQUIRE g.name IS UNIQUE');

  // 2. Clear the old copy of the graph (MySQL is the source of truth)
  await run('MATCH (n) WHERE n:Member OR n:Book OR n:Genre DETACH DELETE n');

  // 3. Nodes
  const [members] = await sql.query("SELECT MemberID, CONCAT(Fname, ' ', Lname) AS Name FROM Members");
  await run('UNWIND $rows AS row MERGE (m:Member {memberId: row.id}) SET m.name = row.name', {
    rows: members.map((m) => ({ id: int(m.MemberID), name: m.Name })),
  });

  const [books] = await sql.query('SELECT BookID, Title FROM Books');
  await run('UNWIND $rows AS row MERGE (b:Book {bookId: row.id}) SET b.title = row.title', {
    rows: books.map((b) => ({ id: int(b.BookID), title: b.Title })),
  });

  // 4. Relationships
  const [genres] = await sql.query('SELECT BookID, Genre FROM Book_Genres');
  await run(
    `UNWIND $rows AS row
     MATCH (b:Book {bookId: row.bookId})
     MERGE (g:Genre {name: row.genre})
     MERGE (b)-[:IN_GENRE]->(g)`,
    { rows: genres.map((g) => ({ bookId: int(g.BookID), genre: g.Genre })) }
  );

  // One BORROWED edge per member and book, with how many times it was borrowed
  const [loans] = await sql.query(
    `SELECT MemberID, BookID, COUNT(*) AS Times, MAX(IssueDate) AS LastIssueDate
     FROM Loans GROUP BY MemberID, BookID`
  );
  await run(
    `UNWIND $rows AS row
     MATCH (m:Member {memberId: row.memberId}), (b:Book {bookId: row.bookId})
     MERGE (m)-[r:BORROWED]->(b)
     SET r.times = row.times, r.lastIssueDate = date(row.lastIssueDate)`,
    {
      rows: loans.map((l) => ({
        memberId: int(l.MemberID),
        bookId: int(l.BookID),
        times: int(l.Times),
        lastIssueDate: l.LastIssueDate,
      })),
    }
  );

  const [reviews] = await sql.query('SELECT MemberID, BookID, StarRating FROM Reviews');
  await run(
    `UNWIND $rows AS row
     MATCH (m:Member {memberId: row.memberId}), (b:Book {bookId: row.bookId})
     MERGE (m)-[r:REVIEWED]->(b)
     SET r.rating = row.rating`,
    { rows: reviews.map((r) => ({ memberId: int(r.MemberID), bookId: int(r.BookID), rating: int(r.StarRating) })) }
  );

  console.log(
    `Synced ${members.length} members, ${books.length} books, ${new Set(genres.map((g) => g.Genre)).size} genres, ` +
      `${loans.length} BORROWED and ${reviews.length} REVIEWED relationships.`
  );

  await sql.end();
  await driver.close();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
