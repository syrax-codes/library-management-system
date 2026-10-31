// Cypher queries behind the recommendation features.
// Retrieval strategy: start from a Member or Book through its unique-constraint
// index, expand along BORROWED, score candidates by counting distinct readers,
// return the top bookIds. The API then reads titles and live availability
// from MySQL, so availability is never stale.
import { int, runCypher } from './neo4j';

// "Readers of this book also borrowed": book -> its readers -> their other books
export function alsoBorrowed(bookId) {
  return runCypher(
    `MATCH (b:Book {bookId: $bookId})<-[:BORROWED]-(m:Member)-[:BORROWED]->(other:Book)
     WHERE other <> b
     RETURN other.bookId AS bookId, count(DISTINCT m) AS sharedReaders
     ORDER BY sharedReaders DESC, bookId
     LIMIT 5`,
    { bookId: int(bookId) }
  );
}

// "For you": popular books in the genres this member reads, not yet borrowed
export function forYou(memberId) {
  return runCypher(
    `MATCH (me:Member {memberId: $memberId})-[:BORROWED]->(:Book)-[:IN_GENRE]->(g:Genre)<-[:IN_GENRE]-(rec:Book)
     WHERE NOT (me)-[:BORROWED]->(rec)
     WITH rec, collect(DISTINCT g.name) AS viaGenres
     OPTIONAL MATCH (rec)<-[:BORROWED]-(reader:Member)
     RETURN rec.bookId AS bookId, viaGenres, count(DISTINCT reader) AS popularity
     ORDER BY popularity DESC, bookId
     LIMIT 5`,
    { memberId: int(memberId) }
  );
}

// Members who borrowed the most of the same books as this member
export function similarReaders(memberId) {
  return runCypher(
    `MATCH (me:Member {memberId: $memberId})-[:BORROWED]->(b:Book)<-[:BORROWED]-(other:Member)
     WHERE other <> me
     RETURN other.memberId AS memberId, other.name AS name,
            count(DISTINCT b) AS sharedBooks, collect(DISTINCT b.title)[0..3] AS examples
     ORDER BY sharedBooks DESC, name
     LIMIT 5`,
    { memberId: int(memberId) }
  );
}

// NoSQL aggregation: books borrowed per genre and the member's average rating
// per genre, using count(), avg() and collect()
export function readingProfile(memberId) {
  return runCypher(
    `MATCH (me:Member {memberId: $memberId})-[:BORROWED]->(b:Book)-[:IN_GENRE]->(g:Genre)
     OPTIONAL MATCH (me)-[r:REVIEWED]->(b)
     RETURN g.name AS genre,
            count(DISTINCT b) AS booksBorrowed,
            round(avg(r.rating), 1) AS avgRating,
            collect(DISTINCT b.title) AS titles
     ORDER BY booksBorrowed DESC, genre`,
    { memberId: int(memberId) }
  );
}
