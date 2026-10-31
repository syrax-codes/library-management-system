// Reporting queries used by the dashboard, the members page and the admin page.
// Kept in one file so they are easy to find and explain.

// Multi-CTE member activity summary (Members page).
// Each CTE aggregates one table per member; the final SELECT joins them so
// every member appears once, even with no loans, fines or visits.
export const MEMBER_SUMMARY = `
WITH loan_stats AS (
  SELECT MemberID,
         COUNT(*)                     AS TotalLoans,
         SUM(ActualReturnDate IS NULL) AS ActiveLoans
  FROM Loans
  GROUP BY MemberID
),
fine_stats AS (
  SELECT l.MemberID, SUM(f.FineAmount) AS UnpaidFines
  FROM Fines f
  JOIN Loans l ON l.LoanID = f.LoanID
  WHERE f.FineStatus = 'Pending'
  GROUP BY l.MemberID
),
visit_stats AS (
  SELECT MemberID, COUNT(*) AS Visits, MAX(EntryTime) AS LastVisit
  FROM Gate_Attendance
  GROUP BY MemberID
)
SELECT m.MemberID,
       CONCAT(m.Fname, ' ', m.Lname)          AS Name,
       m.EmailAddress,
       TIMESTAMPDIFF(YEAR, m.DOB, CURDATE())  AS Age,
       COALESCE(ls.TotalLoans, 0)             AS TotalLoans,
       COALESCE(ls.ActiveLoans, 0)            AS ActiveLoans,
       COALESCE(fs.UnpaidFines, 0)            AS UnpaidFines,
       COALESCE(vs.Visits, 0)                 AS Visits,
       vs.LastVisit
FROM Members m
LEFT JOIN loan_stats  ls ON ls.MemberID = m.MemberID
LEFT JOIN fine_stats  fs ON fs.MemberID = m.MemberID
LEFT JOIN visit_stats vs ON vs.MemberID = m.MemberID
ORDER BY m.MemberID`;

// Window function: top 3 most-borrowed books in each genre (Dashboard).
// RANK() restarts at 1 for every genre (PARTITION BY) and gives tied books
// the same rank.
export const TOP_BOOKS_PER_GENRE = `
SELECT Genre, BookID, Title, LoanCount, GenreRank
FROM (
  SELECT g.Genre,
         b.BookID,
         b.Title,
         COUNT(l.LoanID) AS LoanCount,
         RANK() OVER (PARTITION BY g.Genre ORDER BY COUNT(l.LoanID) DESC) AS GenreRank
  FROM Book_Genres g
  JOIN Books b ON b.BookID = g.BookID
  JOIN Loans l ON l.BookID = g.BookID
  GROUP BY g.Genre, b.BookID, b.Title
) ranked
WHERE GenreRank <= 3
ORDER BY Genre, GenreRank, Title`;

// JOIN + GROUP BY + HAVING: genres with at least 5 loans (Dashboard)
export const POPULAR_GENRES = `
SELECT g.Genre, COUNT(*) AS LoanCount, COUNT(DISTINCT l.MemberID) AS Readers
FROM Loans l
JOIN Book_Genres g ON g.BookID = l.BookID
GROUP BY g.Genre
HAVING COUNT(*) >= 5
ORDER BY LoanCount DESC`;

// JOIN + GROUP BY + HAVING + SUM: members owing more than Rs 20 (Dashboard)
export const MEMBERS_WITH_DUES = `
SELECT m.MemberID,
       CONCAT(m.Fname, ' ', m.Lname) AS Name,
       COUNT(*)                      AS PendingFines,
       SUM(f.FineAmount)             AS AmountDue
FROM Fines f
JOIN Loans   l ON l.LoanID   = f.LoanID
JOIN Members m ON m.MemberID = l.MemberID
WHERE f.FineStatus = 'Pending'
GROUP BY m.MemberID, m.Fname, m.Lname
HAVING SUM(f.FineAmount) > 20
ORDER BY AmountDue DESC`;

// Subquery with NOT IN: books nobody has borrowed in the last 90 days (Admin)
export const IDLE_BOOKS = `
SELECT b.BookID, b.Title, c.TotalCopies, c.Genres
FROM Books b
JOIN vw_BookCatalog c ON c.BookID = b.BookID
WHERE b.BookID NOT IN (
  SELECT DISTINCT BookID
  FROM Loans
  WHERE IssueDate >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
)
ORDER BY b.Title`;
