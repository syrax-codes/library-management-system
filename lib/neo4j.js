// Neo4j driver shared by the API routes.
// MySQL stays the source of truth; Neo4j holds a copy of who borrowed and
// reviewed what, for recommendations. If Neo4j is not running, the rest of
// the app keeps working and recommendation cards say they are offline.
import neo4j from 'neo4j-driver';

export function getDriver() {
  const { NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD } = process.env;
  if (!NEO4J_URI || !NEO4J_PASSWORD) return null;
  if (!globalThis.__neo4jDriver) {
    globalThis.__neo4jDriver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER || 'neo4j', NEO4J_PASSWORD), {
      connectionTimeout: 3000, // fail fast when Neo4j Desktop is stopped
      maxTransactionRetryTime: 2000, // don't keep retrying for the default 30 s
      disableLosslessIntegers: true, // return counts as plain JS numbers
    });
  }
  return globalThis.__neo4jDriver;
}

// IDs are sent as Neo4j integers so they match the nodes created by the sync
export const int = (value) => neo4j.int(Number(value));

// Run a Cypher query and return plain objects, one per row
export async function runCypher(cypher, params = {}) {
  const driver = getDriver();
  if (!driver) throw new Error('Neo4j is not configured');
  const { records } = await driver.executeQuery(cypher, params);
  return records.map((record) => record.toObject());
}

// Called after a checkout commits in MySQL. Adds (or updates) the BORROWED
// edge. Never throws: if Neo4j is down, the next `npm run neo4j:sync`
// catches up.
export async function recordBorrow({ memberId, memberName, bookId, title, genres = [], issueDate }) {
  try {
    await runCypher(
      `MERGE (m:Member {memberId: $memberId})
         SET m.name = $memberName
       MERGE (b:Book {bookId: $bookId})
         SET b.title = $title
       MERGE (m)-[r:BORROWED]->(b)
         ON CREATE SET r.times = 1, r.lastIssueDate = date($issueDate)
         ON MATCH  SET r.times = r.times + 1, r.lastIssueDate = date($issueDate)
       WITH b
       UNWIND $genres AS genreName
       MERGE (g:Genre {name: genreName})
       MERGE (b)-[:IN_GENRE]->(g)`,
      { memberId: int(memberId), memberName, bookId: int(bookId), title, genres, issueDate }
    );
    return true;
  } catch (err) {
    console.warn('Neo4j update skipped:', err.message);
    return false;
  }
}
