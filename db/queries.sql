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
-- (added in a later patch)
-- ============================================================================
