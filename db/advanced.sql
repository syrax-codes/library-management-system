-- ============================================================================
-- Library Management System - advanced.sql
-- Views, functions, stored procedures and triggers.
-- Run after schema.sql and before seed.sql (seed.sql issues loans through
-- sp_CheckoutBook and returns them through trg_BookReturned).
--
-- Business rules: 14-day loans, max 3 active loans, Rs 5 per late day,
-- checkout blocked when unpaid fines exceed Rs 100, no overlapping room
-- bookings. Rule violations are raised with SIGNAL SQLSTATE '45000'; the API
-- shows MESSAGE_TEXT to the user.
-- ============================================================================

USE library;

-- ============================================================================
-- SECTION A: Catalog and Circulation (Abhiraj)
-- ============================================================================

-- ---- Views ---------------------------------------------------------------------

DROP VIEW IF EXISTS vw_ActiveLoans;
-- Every unreturned loan. Overdue loans are the rows with DaysOverdue > 0.
-- This view replaces the old Physical_Copy.HeldByMemberID column: the current
-- holder of a copy is derived from Loans instead of being stored twice.
CREATE VIEW vw_ActiveLoans AS
SELECT l.LoanID,
       l.MemberID,
       CONCAT(m.Fname, ' ', m.Lname)                 AS MemberName,
       l.BookID,
       b.Title,
       l.CopyNumber,
       l.IssueDate,
       l.DueDate,
       GREATEST(DATEDIFF(CURDATE(), l.DueDate), 0)  AS DaysOverdue
FROM Loans l
JOIN Members m ON m.MemberID = l.MemberID
JOIN Books   b ON b.BookID   = l.BookID
WHERE l.ActualReturnDate IS NULL;

DROP VIEW IF EXISTS vw_BookCatalog;
-- One row per book with its genres, copy counts, digital formats and rating.
-- Each aggregate is computed in its own derived table before joining, so the
-- counts are not multiplied by the other joins.
CREATE VIEW vw_BookCatalog AS
SELECT b.BookID,
       b.Title,
       b.Publisher,
       b.PublicationYear,
       b.ISBN,
       g.Genres,
       COALESCE(c.TotalCopies, 0)     AS TotalCopies,
       COALESCE(c.AvailableCopies, 0) AS AvailableCopies,
       d.Formats,
       r.AvgRating,
       COALESCE(r.ReviewCount, 0)     AS ReviewCount
FROM Books b
LEFT JOIN (SELECT BookID, GROUP_CONCAT(Genre ORDER BY Genre SEPARATOR ', ') AS Genres
           FROM Book_Genres GROUP BY BookID) g ON g.BookID = b.BookID
LEFT JOIN (SELECT BookID,
                  COUNT(*) AS TotalCopies,
                  SUM(AvailabilityStatus = 'Available') AS AvailableCopies
           FROM Physical_Copy GROUP BY BookID) c ON c.BookID = b.BookID
LEFT JOIN (SELECT BookID, GROUP_CONCAT(DISTINCT FileFormat ORDER BY FileFormat SEPARATOR ', ') AS Formats
           FROM Digital_Media GROUP BY BookID) d ON d.BookID = b.BookID
LEFT JOIN (SELECT BookID, ROUND(AVG(StarRating), 1) AS AvgRating, COUNT(*) AS ReviewCount
           FROM Reviews GROUP BY BookID) r ON r.BookID = b.BookID;

-- ---- Function ------------------------------------------------------------------

DROP FUNCTION IF EXISTS fn_GetMemberTotalFines;
DELIMITER $$
-- Total of a member's Pending fines (0 if none)
CREATE FUNCTION fn_GetMemberTotalFines(p_member_id INT)
RETURNS DECIMAL(10, 2)
READS SQL DATA
BEGIN
  DECLARE v_total DECIMAL(10, 2);
  SELECT COALESCE(SUM(f.FineAmount), 0) INTO v_total
  FROM Fines f
  JOIN Loans l ON l.LoanID = f.LoanID
  WHERE l.MemberID = p_member_id
    AND f.FineStatus = 'Pending';
  RETURN v_total;
END$$
DELIMITER ;

-- ---- Procedure: checkout -------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_CheckoutBook;
DELIMITER $$
-- Issues one physical copy to a member inside a transaction.
-- SELECT ... FOR UPDATE locks the copy row, so a second session trying to
-- issue the same copy waits until this one commits, then sees 'Checked Out'
-- and fails. Any error rolls the whole checkout back.
CREATE PROCEDURE sp_CheckoutBook(
  IN p_member_id  INT,
  IN p_book_id    INT,
  IN p_copy_no    INT,
  IN p_issue_date DATE,
  OUT p_loan_id   INT
)
BEGIN
  DECLARE v_status VARCHAR(20) DEFAULT NULL;
  DECLARE v_member INT         DEFAULT NULL;
  DECLARE v_active INT         DEFAULT 0;
  DECLARE v_fines  DECIMAL(10, 2) DEFAULT 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  -- 1. Lock the copy row before reading its status
  SELECT AvailabilityStatus INTO v_status
  FROM Physical_Copy
  WHERE BookID = p_book_id AND CopyNumber = p_copy_no
  FOR UPDATE;

  IF v_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Copy does not exist';
  END IF;
  IF v_status <> 'Available' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Copy is not available';
  END IF;

  -- 2. The member must exist
  SELECT MemberID INTO v_member FROM Members WHERE MemberID = p_member_id;
  IF v_member IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Member does not exist';
  END IF;

  -- 3. At most 3 active loans
  SELECT COUNT(*) INTO v_active
  FROM Loans
  WHERE MemberID = p_member_id AND ActualReturnDate IS NULL;
  IF v_active >= 3 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Loan limit reached: member already has 3 active loans';
  END IF;

  -- 4. Unpaid fines must not exceed Rs 100
  SET v_fines = fn_GetMemberTotalFines(p_member_id);
  IF v_fines > 100 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Checkout blocked: unpaid fines exceed Rs 100';
  END IF;

  -- 5. Create the loan (14 days) and mark the copy as checked out
  INSERT INTO Loans (MemberID, BookID, CopyNumber, IssueDate, DueDate)
  VALUES (p_member_id, p_book_id, p_copy_no, p_issue_date, DATE_ADD(p_issue_date, INTERVAL 14 DAY));

  UPDATE Physical_Copy
  SET AvailabilityStatus = 'Checked Out'
  WHERE BookID = p_book_id AND CopyNumber = p_copy_no;

  SET p_loan_id = LAST_INSERT_ID();

  COMMIT;
END$$
DELIMITER ;

-- ---- Triggers --------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_BookReturned;
DELIMITER $$
-- Fires when a loan's return date is set (a plain UPDATE from the app):
-- the copy becomes Available again, and a late return gets a Pending fine
-- of Rs 5 per day late. Fines are never typed in by hand.
CREATE TRIGGER trg_BookReturned
AFTER UPDATE ON Loans
FOR EACH ROW
BEGIN
  IF OLD.ActualReturnDate IS NULL AND NEW.ActualReturnDate IS NOT NULL THEN

    UPDATE Physical_Copy
    SET AvailabilityStatus = 'Available'
    WHERE BookID = NEW.BookID
      AND CopyNumber = NEW.CopyNumber
      AND AvailabilityStatus = 'Checked Out';

    IF NEW.ActualReturnDate > NEW.DueDate THEN
      INSERT INTO Fines (LoanID, FineNumber, AssessedDate, FineAmount, FineStatus)
      SELECT NEW.LoanID,
             COALESCE(MAX(FineNumber), 0) + 1,
             NEW.ActualReturnDate,
             DATEDIFF(NEW.ActualReturnDate, NEW.DueDate) * 5,
             'Pending'
      FROM Fines
      WHERE LoanID = NEW.LoanID;
    END IF;

  END IF;
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_ValidateMember;
DELIMITER $$
-- Rules that need today's date, which a CHECK constraint cannot use:
-- DOB may not be in the future, and members under 18 need guardian details.
CREATE TRIGGER trg_ValidateMember
BEFORE INSERT ON Members
FOR EACH ROW
BEGIN
  IF NEW.DOB > CURDATE() THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Date of birth cannot be in the future';
  END IF;

  IF TIMESTAMPDIFF(YEAR, NEW.DOB, CURDATE()) < 18
     AND (NEW.GuardianContactName IS NULL OR NEW.GuardianContactName = ''
          OR NEW.GuardianContactNumber IS NULL OR NEW.GuardianContactNumber = '') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Members under 18 must have guardian name and number';
  END IF;
END$$
DELIMITER ;

-- ============================================================================
-- SECTION B: Facilities, Accounts and Analytics (Alisha)
-- ============================================================================

-- ---- Procedure: room booking ---------------------------------------------------

DROP PROCEDURE IF EXISTS sp_ReserveRoom;
DELIMITER $$
-- Books a study room slot inside a transaction.
-- The conflicting reservation may not exist yet, so there is no reservation
-- row to lock. Instead we lock the parent Study_Rooms row: two sessions
-- booking the same room are serialized, while other rooms stay free.
CREATE PROCEDURE sp_ReserveRoom(
  IN p_member_id INT,
  IN p_room_id   INT,
  IN p_date      DATE,
  IN p_start     TIME,
  IN p_end       TIME,
  OUT p_reservation_id INT
)
BEGIN
  DECLARE v_room     INT DEFAULT NULL;
  DECLARE v_conflict INT DEFAULT 0;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  -- Simple input rules (no locking needed)
  IF p_end <= p_start THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'End time must be after start time';
  END IF;
  IF p_start < '08:00:00' OR p_end > '20:00:00' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Rooms can only be booked between 08:00 and 20:00';
  END IF;
  IF p_date < CURDATE() THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot book a date in the past';
  END IF;

  START TRANSACTION;

  -- 1. Lock the room row; other bookings for this room wait here
  SELECT RoomID INTO v_room
  FROM Study_Rooms
  WHERE RoomID = p_room_id
  FOR UPDATE;

  IF v_room IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Room does not exist';
  END IF;

  -- 2. Two slots overlap when each starts before the other ends
  SELECT COUNT(*) INTO v_conflict
  FROM Room_Reservations
  WHERE RoomID = p_room_id
    AND ReservationDate = p_date
    AND BookingStatus = 'Confirmed'
    AND StartTime < p_end
    AND EndTime > p_start;

  IF v_conflict > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Room is already booked for part of that time';
  END IF;

  -- 3. Insert the booking
  INSERT INTO Room_Reservations (MemberID, RoomID, ReservationDate, StartTime, EndTime, BookingStatus)
  VALUES (p_member_id, p_room_id, p_date, p_start, p_end, 'Confirmed');

  SET p_reservation_id = LAST_INSERT_ID();

  COMMIT;
END$$
DELIMITER ;
