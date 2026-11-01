# Library Management System

A hybrid library resource tracking system for the DBMS mini-project. One normalized MySQL database (15 tables) holds every loan, fine, room booking and gate log, and enforces the library's rules with constraints, triggers and stored procedures. A Neo4j graph powers book recommendations. A Next.js web app ties it together with login and three roles.

**Team:** Abhiraj Dhananjay (PES1UG24CS016) · Alisha Kulshrestha (PES1UG24CS049)

## Features

| Area | What it does |
| --- | --- |
| Catalog | Full-text search over titles and descriptions, genre and availability filters, book detail with shelf locations |
| Circulation | Issue and return books; 14-day loans, at most 3 per member, ₹5/day late fine, checkout blocked above ₹100 unpaid |
| Members | Registration with phones, guardian details and a login account; activity summary; fine payment |
| Study rooms | Rooms with amenities, bookings per date, conflict-free booking and cancellation |
| Gate log | Entry and exit with stay time computed by MySQL |
| Digital media | Opening a PDF, EPUB or audiobook is written to an access log |
| Reviews | One review per member per book |
| Recommendations | Neo4j: "also borrowed", "for you", similar readers and a reading profile |
| Roles | Admin, Librarian and Member, checked on every API call |

## Tech stack

MySQL 8 · Neo4j 5 (Neo4j Desktop) · Next.js 15 (App Router, JavaScript) · Tailwind CSS · mysql2 · neo4j-driver · bcryptjs · jose

## Setup

You need **Node.js 20.6 or newer**, **MySQL 8.0.31 or newer** and **Neo4j Desktop**.

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create `.env.local`** by copying `.env.example`, then fill in:
   - `DB_ADMIN_USER` / `DB_ADMIN_PASSWORD`: your MySQL root login (only used to build the database)
   - `DB_PASSWORD`: any password; the setup script creates the `library_app` user with it
   - `JWT_SECRET`: any long random string
   - `NEO4J_PASSWORD`: the password you set for your Neo4j database

3. **Build the MySQL database** (drops and recreates `library`, then seeds it)

   ```bash
   npm run db:setup
   ```

   You can also run `db/schema.sql`, `db/advanced.sql` and `db/seed.sql` in that order in MySQL Workbench.

4. **Start Neo4j and load the graph.** In Neo4j Desktop, create a local database (Neo4j 5), start it, then:

   ```bash
   npm run neo4j:sync
   ```

   Re-run this after `db:setup`. If Neo4j is not running, the app still works and the recommendation cards say they are offline.

5. **Run the app**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

### Demo accounts

Every demo account uses the password **`library123`**.

| Role | Email |
| --- | --- |
| Admin | `admin@library.com` |
| Librarian | `librarian1@library.com` (also 2–4) |
| Member | `aarav.sharma@example.com` (any member's `firstname.lastname@example.com`) |

Useful demo members: **Aditya Joshi** has 3 active loans (loan limit), **Rahul Desai** owes ₹175 (fine limit), **Diya Mishra**, **Meera Krishnan** and **Yash Agarwal** are under 18 (guardian on file).

## Database

| File | Contents |
| --- | --- |
| `db/schema.sql` | 15 tables; keys, CHECK constraints, foreign keys and indexes added with `ALTER TABLE` |
| `db/advanced.sql` | 2 views, 1 function, 2 stored procedures, 2 triggers |
| `db/seed.sql` | Demo data; loans go through `sp_CheckoutBook` and returns fire `trg_BookReturned` |
| `db/queries.sql` | Viva demos: rule violations, two-terminal locking, CTE, `RANK()`, `HAVING`, subquery, `EXPLAIN` |

| Object | Purpose |
| --- | --- |
| `vw_ActiveLoans` | Unreturned loans with days overdue; also tells who currently holds each copy |
| `vw_BookCatalog` | Each book with genres, copy counts, formats and average rating |
| `fn_GetMemberTotalFines` | A member's total pending fines |
| `sp_CheckoutBook` | Locks the copy row (`FOR UPDATE`), checks availability, loan limit and fines, inserts the loan |
| `sp_ReserveRoom` | Locks the room row, rejects overlapping bookings, inserts the reservation |
| `trg_BookReturned` | On return: frees the copy and adds a ₹5/day fine if late |
| `trg_ValidateMember` | Rejects a future DOB, and members under 18 without guardian details |

The web app connects as `library_app`, which can only `SELECT`, `INSERT`, `UPDATE`, `DELETE` and `EXECUTE`.

### Neo4j graph

```
(:Member {memberId, name})-[:BORROWED {times, lastIssueDate}]->(:Book {bookId, title})
(:Member)-[:REVIEWED {rating}]->(:Book)
(:Book)-[:IN_GENRE]->(:Genre {name})
```

Uniqueness constraints on `memberId`, `bookId` and genre `name`. `scripts/sync-neo4j.js` rebuilds the graph from MySQL, and each checkout adds its `BORROWED` edge immediately. Queries are in `lib/recommendations.js`.

## Project structure

```
app/
  api/            28 API routes (auth, books, loans, fines, members, recommendations,
                  rooms, media, gate, reviews, stats, admin)
  login/  me/  catalog/  loans/  members/  rooms/  gate/  admin/  page.js (dashboard)
components/       AppShell (layout and navigation), shared UI, recommendation cards
db/               schema.sql, advanced.sql, seed.sql, queries.sql
lib/              db.js (MySQL pool), neo4j.js, auth.js (JWT and roles), api.js,
                  reports.js (CTE, RANK, HAVING, subquery), recommendations.js
scripts/          setup-db.js, sync-neo4j.js
middleware.js     sends logged-out users to /login and keeps each role on its own pages
```

## API conventions

Success returns `{ data }`; failure returns `{ error }` with status 400, 401, 403, 404, 409 or 500. Rule violations raised inside MySQL with `SIGNAL` come back as 400 with the database's message. All SQL uses `?` placeholders.

## Test cases

| ID | Test | Expected |
| --- | --- | --- |
| TC01 | Log in with a wrong password | 401, no cookie |
| TC02 | Member calls `POST /api/loans/issue` | 403 |
| TC03 | Member opens another member's profile | 403 |
| TC04 | Issue an available copy | Loan created, copy Checked Out |
| TC05 | Issue the same copy again | "Copy is not available" |
| TC06 | Issue to Aditya (3 active loans) | "Loan limit reached" |
| TC07 | Issue to Rahul (₹175 unpaid) | "Checkout blocked" |
| TC08 | Return an overdue loan | Pending fine at ₹5/day, copy Available |
| TC09 | Return on time | No fine |
| TC10 | Book an overlapping room slot | "Room is already booked" |
| TC11 | Two terminals check out the same copy | Second waits, then fails |
| TC12 | Register a 16-year-old without a guardian | Rejected by trigger |
| TC13 | Invalid email, 9-digit phone, 6-star rating | Rejected by CHECK |
| TC14 | Second review of the same book | Rejected by UNIQUE |
| TC15 | Delete a copy with loan history | Rejected by foreign key |
| TC16 | Search "database design" | Ranked by relevance |
| TC17 | Search `' OR 1=1 --` | Treated as text, no rows |
| TC18 | "Also borrowed" on a popular book | Ranked by shared readers |
