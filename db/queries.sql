-- ============================================================================
-- Library Management System - queries.sql
-- Demo and report queries to run in MySQL Workbench during the viva.
-- Nothing here changes the schema; run schema.sql, advanced.sql and seed.sql
-- first. Run one block at a time.
-- ============================================================================

USE library;

-- ============================================================================
-- SECTION A: Catalog and Circulation (Abhiraj)
-- ============================================================================

-- ---- Views and the function -------------------------------------------------
SELECT * FROM vw_ActiveLoans ORDER BY DueDate;
SELECT * FROM vw_ActiveLoans WHERE DaysOverdue > 0;          -- overdue loans
SELECT * FROM vw_BookCatalog ORDER BY Title;
SELECT MemberID, fn_GetMemberTotalFines(MemberID) AS UnpaidFines
FROM Members
HAVING UnpaidFines > 0;

-- ---- Full-text search (natural-language mode, ranked) -------------------------
SELECT BookID, Title,
       MATCH(Title, Description) AGAINST ('database design' IN NATURAL LANGUAGE MODE) AS Relevance
FROM Books
WHERE MATCH(Title, Description) AGAINST ('database design' IN NATURAL LANGUAGE MODE)
ORDER BY Relevance DESC;

-- ---- Rules enforced by the procedure and triggers ------------------------------
-- Each of these should fail with a readable message:
CALL sp_CheckoutBook(7, 1, 2, CURDATE(), @loan);   -- Aditya already has 3 active loans
CALL sp_CheckoutBook(15, 1, 2, CURDATE(), @loan);  -- Rahul owes Rs 175
INSERT INTO Members (Fname, Lname, EmailAddress, DOB)
VALUES ('Kid', 'Test', 'kid@example.com', DATE_SUB(CURDATE(), INTERVAL 16 YEAR));  -- under 18, no guardian
INSERT INTO Member_Phone_Numbers VALUES (1, '12345');                              -- CHECK: 10 digits
DELETE FROM Physical_Copy WHERE BookID = 3 AND CopyNumber = 2;                     -- FK: has loan history

-- A successful checkout followed by a late return (fine created by the trigger)
CALL sp_CheckoutBook(1, 1, 1, DATE_SUB(CURDATE(), INTERVAL 20 DAY), @loan);
SELECT @loan AS NewLoanID;
UPDATE Loans SET ActualReturnDate = CURDATE() WHERE LoanID = @loan;   -- 6 days late
SELECT * FROM Fines WHERE LoanID = @loan;                              -- Rs 30, Pending

-- ---- Concurrency demo: two terminals, same copy -------------------------------
-- Terminal A:
--   START TRANSACTION;
--   SELECT * FROM Physical_Copy WHERE BookID = 2 AND CopyNumber = 2 FOR UPDATE;
-- Terminal B (blocks, waiting for A's lock):
--   CALL sp_CheckoutBook(5, 2, 2, CURDATE(), @loan);
-- Terminal A:
--   UPDATE Physical_Copy SET AvailabilityStatus = 'Checked Out' WHERE BookID = 2 AND CopyNumber = 2;
--   INSERT INTO Loans (MemberID, BookID, CopyNumber, IssueDate, DueDate)
--   VALUES (1, 2, 2, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY));
--   COMMIT;
-- Terminal B now unblocks and fails with "Copy is not available".

-- ---- Index effect: EXPLAIN without and with idx_loans_member_return -----------
EXPLAIN SELECT COUNT(*) FROM Loans IGNORE INDEX (idx_loans_member_return)
WHERE MemberID = 7 AND ActualReturnDate IS NULL;     -- type: ALL (full table scan)

EXPLAIN SELECT COUNT(*) FROM Loans
WHERE MemberID = 7 AND ActualReturnDate IS NULL;     -- type: ref on idx_loans_member_return

-- ============================================================================
-- SECTION B: Facilities, Accounts and Analytics (Alisha)
-- ============================================================================

-- ---- Multi-CTE member activity summary ------------------------------------------
WITH loan_stats AS (
  SELECT MemberID, COUNT(*) AS TotalLoans, SUM(ActualReturnDate IS NULL) AS ActiveLoans
  FROM Loans GROUP BY MemberID
),
fine_stats AS (
  SELECT l.MemberID, SUM(f.FineAmount) AS UnpaidFines
  FROM Fines f JOIN Loans l ON l.LoanID = f.LoanID
  WHERE f.FineStatus = 'Pending' GROUP BY l.MemberID
),
visit_stats AS (
  SELECT MemberID, COUNT(*) AS Visits, MAX(EntryTime) AS LastVisit
  FROM Gate_Attendance GROUP BY MemberID
)
SELECT m.MemberID, CONCAT(m.Fname, ' ', m.Lname) AS Name,
       COALESCE(ls.TotalLoans, 0) AS TotalLoans, COALESCE(ls.ActiveLoans, 0) AS ActiveLoans,
       COALESCE(fs.UnpaidFines, 0) AS UnpaidFines, COALESCE(vs.Visits, 0) AS Visits, vs.LastVisit
FROM Members m
LEFT JOIN loan_stats ls  ON ls.MemberID = m.MemberID
LEFT JOIN fine_stats fs  ON fs.MemberID = m.MemberID
LEFT JOIN visit_stats vs ON vs.MemberID = m.MemberID
ORDER BY m.MemberID;

-- ---- Window function: top 3 books per genre --------------------------------------
SELECT * FROM (
  SELECT g.Genre, b.Title, COUNT(l.LoanID) AS LoanCount,
         RANK() OVER (PARTITION BY g.Genre ORDER BY COUNT(l.LoanID) DESC) AS GenreRank
  FROM Book_Genres g
  JOIN Books b ON b.BookID = g.BookID
  JOIN Loans l ON l.BookID = g.BookID
  GROUP BY g.Genre, b.BookID, b.Title
) ranked
WHERE GenreRank <= 3
ORDER BY Genre, GenreRank;

-- ---- GROUP BY + HAVING ----------------------------------------------------------------
SELECT g.Genre, COUNT(*) AS LoanCount
FROM Loans l JOIN Book_Genres g ON g.BookID = l.BookID
GROUP BY g.Genre
HAVING COUNT(*) >= 5
ORDER BY LoanCount DESC;

-- ---- Subquery with NOT IN: books not borrowed in 90 days -------------------------------
SELECT BookID, Title FROM Books
WHERE BookID NOT IN (
  SELECT DISTINCT BookID FROM Loans WHERE IssueDate >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
);

-- ---- Generated column ----------------------------------------------------------------------
SELECT LogID, MemberID, EntryTime, ExitTime, StayMinutes FROM Gate_Attendance ORDER BY EntryTime DESC LIMIT 10;

-- ---- Room booking rules -----------------------------------------------------------------
CALL sp_ReserveRoom(1, 1, DATE_ADD(CURDATE(), INTERVAL 7 DAY), '10:00', '12:00', @res);  -- succeeds
CALL sp_ReserveRoom(2, 1, DATE_ADD(CURDATE(), INTERVAL 7 DAY), '11:00', '13:00', @res);  -- overlaps: rejected
CALL sp_ReserveRoom(2, 1, DATE_ADD(CURDATE(), INTERVAL 7 DAY), '12:00', '13:00', @res);  -- touches the end: allowed

-- ---- Concurrency demo: two terminals, same room ---------------------------------------
-- Terminal A:
--   START TRANSACTION;
--   SELECT * FROM Study_Rooms WHERE RoomID = 2 FOR UPDATE;
-- Terminal B (blocks):
--   CALL sp_ReserveRoom(3, 2, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '10:00', '12:00', @res);
-- Terminal A:
--   INSERT INTO Room_Reservations (MemberID, RoomID, ReservationDate, StartTime, EndTime)
--   VALUES (4, 2, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '11:00', '13:00');
--   COMMIT;
-- Terminal B unblocks and fails with "Room is already booked for part of that time".

-- ---- Index effect: EXPLAIN on the overlap check -------------------------------------------
EXPLAIN SELECT COUNT(*) FROM Room_Reservations IGNORE INDEX (idx_reservations_room_date)
WHERE RoomID = 1 AND ReservationDate = CURDATE();    -- type: ALL

EXPLAIN SELECT COUNT(*) FROM Room_Reservations
WHERE RoomID = 1 AND ReservationDate = CURDATE();    -- type: ref on idx_reservations_room_date
