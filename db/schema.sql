-- ============================================================================
-- Library Management System - schema.sql
-- Builds all 15 tables from scratch.
-- Run order: schema.sql -> advanced.sql -> seed.sql   (or: npm run db:setup)
--
-- Tables are created first with their primary keys, NOT NULL, UNIQUE and
-- simple domain CHECKs. Foreign keys, format CHECKs and indexes are added
-- afterwards with ALTER TABLE, so table creation order never breaks a
-- reference.
-- ============================================================================

DROP DATABASE IF EXISTS library;
CREATE DATABASE library CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE library;

-- ============================================================================
-- SECTION A: Catalog and Circulation (Abhiraj)
-- Members, Member_Phone_Numbers, Books, Book_Genres, Physical_Copy, Loans, Fines
-- ============================================================================

CREATE TABLE Members (
  MemberID              INT AUTO_INCREMENT PRIMARY KEY,
  Fname                 VARCHAR(50)  NOT NULL,
  Lname                 VARCHAR(50)  NOT NULL,
  EmailAddress          VARCHAR(100) NOT NULL,
  DOB                   DATE         NOT NULL,
  GuardianContactName   VARCHAR(100),
  GuardianRelationship  VARCHAR(50),
  GuardianContactNumber VARCHAR(20),
  CONSTRAINT uq_members_email UNIQUE (EmailAddress)
);

-- Multi-valued attribute: a member can have several phone numbers
CREATE TABLE Member_Phone_Numbers (
  MemberID    INT         NOT NULL,
  PhoneNumber VARCHAR(20) NOT NULL,
  PRIMARY KEY (MemberID, PhoneNumber)
);

CREATE TABLE Books (
  BookID          INT AUTO_INCREMENT PRIMARY KEY,
  Title           VARCHAR(200) NOT NULL,
  Publisher       VARCHAR(100),
  PublicationYear INT,
  ISBN            VARCHAR(20)  NOT NULL,
  Description     TEXT,
  CONSTRAINT uq_books_isbn UNIQUE (ISBN)
);

-- Multi-valued attribute: a book can belong to several genres
CREATE TABLE Book_Genres (
  BookID INT         NOT NULL,
  Genre  VARCHAR(50) NOT NULL,
  PRIMARY KEY (BookID, Genre)
);

-- Weak entity: identified by its book plus a copy number
CREATE TABLE Physical_Copy (
  BookID             INT         NOT NULL,
  CopyNumber         INT         NOT NULL,
  Floor              VARCHAR(10),
  Aisle              VARCHAR(10),
  ShelfNumber        VARCHAR(10),
  AcquisitionDate    DATE        NOT NULL,
  AvailabilityStatus VARCHAR(20) NOT NULL DEFAULT 'Available',
  PRIMARY KEY (BookID, CopyNumber),
  CONSTRAINT chk_copy_status
    CHECK (AvailabilityStatus IN ('Available', 'Checked Out', 'Lost', 'Under Repair'))
);

CREATE TABLE Loans (
  LoanID           INT AUTO_INCREMENT PRIMARY KEY,
  MemberID         INT  NOT NULL,
  BookID           INT  NOT NULL,
  CopyNumber       INT  NOT NULL,
  IssueDate        DATE NOT NULL,
  DueDate          DATE NOT NULL,
  ActualReturnDate DATE
);

-- Weak entity: identified by its loan plus a fine number
CREATE TABLE Fines (
  LoanID       INT           NOT NULL,
  FineNumber   INT           NOT NULL,
  AssessedDate DATE          NOT NULL,
  FineAmount   DECIMAL(8, 2) NOT NULL,
  FineStatus   VARCHAR(20)   NOT NULL DEFAULT 'Pending',
  PRIMARY KEY (LoanID, FineNumber),
  CONSTRAINT chk_fine_status CHECK (FineStatus IN ('Pending', 'Paid', 'Waived')),
  CONSTRAINT chk_fine_amount CHECK (FineAmount > 0)
);

-- ---- ALTER: foreign keys -----------------------------------------------------
-- Children that mean nothing without their parent CASCADE.
-- Transaction history (loans) is RESTRICT, so a member or copy with history
-- cannot be deleted by accident.

ALTER TABLE Member_Phone_Numbers
  ADD CONSTRAINT fk_phone_member FOREIGN KEY (MemberID)
    REFERENCES Members (MemberID) ON DELETE CASCADE;

ALTER TABLE Book_Genres
  ADD CONSTRAINT fk_genre_book FOREIGN KEY (BookID)
    REFERENCES Books (BookID) ON DELETE CASCADE;

ALTER TABLE Physical_Copy
  ADD CONSTRAINT fk_copy_book FOREIGN KEY (BookID)
    REFERENCES Books (BookID) ON DELETE CASCADE;

ALTER TABLE Loans
  ADD CONSTRAINT fk_loan_member FOREIGN KEY (MemberID)
    REFERENCES Members (MemberID) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_loan_copy FOREIGN KEY (BookID, CopyNumber)
    REFERENCES Physical_Copy (BookID, CopyNumber) ON DELETE RESTRICT;

ALTER TABLE Fines
  ADD CONSTRAINT fk_fine_loan FOREIGN KEY (LoanID)
    REFERENCES Loans (LoanID) ON DELETE CASCADE;

-- ---- ALTER: format and order CHECKs -----------------------------------------
-- Date-dependent rules (DOB not in the future, guardian if under 18) need
-- CURDATE(), which MySQL does not allow in a CHECK, so they live in
-- trg_ValidateMember (advanced.sql).

ALTER TABLE Members
  ADD CONSTRAINT chk_member_email
    CHECK (EmailAddress REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+[.][A-Za-z]{2,}$'),
  ADD CONSTRAINT chk_guardian_phone
    CHECK (GuardianContactNumber IS NULL OR GuardianContactNumber REGEXP '^[0-9]{10}$');

ALTER TABLE Member_Phone_Numbers
  ADD CONSTRAINT chk_phone_format CHECK (PhoneNumber REGEXP '^[0-9]{10}$');

ALTER TABLE Books
  ADD CONSTRAINT chk_isbn_format CHECK (ISBN REGEXP '^97[89]-?[0-9]{10}$'),
  ADD CONSTRAINT chk_pub_year CHECK (PublicationYear IS NULL OR PublicationYear BETWEEN 1450 AND 2100);

ALTER TABLE Loans
  ADD CONSTRAINT chk_loan_due CHECK (DueDate > IssueDate),
  ADD CONSTRAINT chk_loan_return CHECK (ActualReturnDate IS NULL OR ActualReturnDate >= IssueDate);

-- ---- ALTER: indexes ------------------------------------------------------------
-- InnoDB already indexes every primary and foreign key.

-- Full-text search on the catalog (section 7.4)
ALTER TABLE Books
  ADD FULLTEXT INDEX ft_books (Title, Description);

-- A member's active loans; used by the 3-loan check in sp_CheckoutBook
ALTER TABLE Loans
  ADD INDEX idx_loans_member_return (MemberID, ActualReturnDate);

-- Overdue-loans filter
ALTER TABLE Loans
  ADD INDEX idx_loans_due (DueDate);

-- ============================================================================
-- SECTION B: Facilities, Accounts and Analytics (Alisha)
-- User_Accounts, Study_Rooms, Room_Amenities, Room_Reservations,
-- Gate_Attendance, Digital_Media, Digital_Media_Access, Reviews
-- ============================================================================

-- Login accounts. Member accounts link to a Members row; staff accounts do not.
CREATE TABLE User_Accounts (
  UserID       INT AUTO_INCREMENT PRIMARY KEY,
  Email        VARCHAR(100) NOT NULL,
  PasswordHash CHAR(60)     NOT NULL,          -- bcrypt hash, never the password
  Role         VARCHAR(20)  NOT NULL,
  MemberID     INT,
  IsActive     BOOLEAN      NOT NULL DEFAULT TRUE,
  CreatedAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  LastLoginAt  DATETIME,
  CONSTRAINT uq_account_email  UNIQUE (Email),
  CONSTRAINT uq_account_member UNIQUE (MemberID),
  CONSTRAINT chk_account_role  CHECK (Role IN ('Admin', 'Librarian', 'Member'))
);

CREATE TABLE Study_Rooms (
  RoomID   INT AUTO_INCREMENT PRIMARY KEY,
  RoomName VARCHAR(50) NOT NULL,
  Capacity INT         NOT NULL,
  Floor    VARCHAR(10),
  Wing     VARCHAR(10),
  CONSTRAINT uq_room_name UNIQUE (RoomName),
  CONSTRAINT chk_room_capacity CHECK (Capacity > 0)
);

-- Multi-valued attribute: one row per amenity, so every value is atomic (1NF)
CREATE TABLE Room_Amenities (
  RoomID  INT         NOT NULL,
  Amenity VARCHAR(50) NOT NULL,
  PRIMARY KEY (RoomID, Amenity)
);

CREATE TABLE Room_Reservations (
  ReservationID   INT AUTO_INCREMENT PRIMARY KEY,
  MemberID        INT         NOT NULL,
  RoomID          INT         NOT NULL,
  ReservationDate DATE        NOT NULL,
  StartTime       TIME        NOT NULL,
  EndTime         TIME        NOT NULL,
  BookingStatus   VARCHAR(20) NOT NULL DEFAULT 'Confirmed',
  CONSTRAINT chk_booking_status CHECK (BookingStatus IN ('Confirmed', 'Cancelled', 'Completed'))
);

-- StayMinutes is the ER diagram's derived attribute, computed by MySQL
CREATE TABLE Gate_Attendance (
  LogID       INT AUTO_INCREMENT PRIMARY KEY,
  MemberID    INT      NOT NULL,
  EntryTime   DATETIME NOT NULL,
  ExitTime    DATETIME,
  StayMinutes INT GENERATED ALWAYS AS (TIMESTAMPDIFF(MINUTE, EntryTime, ExitTime)) STORED
);

-- Weak entity: identified by its book plus a media number
CREATE TABLE Digital_Media (
  BookID      INT           NOT NULL,
  MediaNumber INT           NOT NULL,
  FileFormat  VARCHAR(20)   NOT NULL,
  FileSizeMB  DECIMAL(10, 2),
  AccessURL   VARCHAR(255),
  PRIMARY KEY (BookID, MediaNumber),
  CONSTRAINT chk_media_format CHECK (FileFormat IN ('PDF', 'EPUB', 'Audiobook'))
);

-- AccessTimestamp holds date and time, so every access has a unique key
CREATE TABLE Digital_Media_Access (
  MemberID        INT      NOT NULL,
  BookID          INT      NOT NULL,
  MediaNumber     INT      NOT NULL,
  AccessTimestamp DATETIME NOT NULL,
  DeviceType      VARCHAR(30),
  PRIMARY KEY (MemberID, BookID, MediaNumber, AccessTimestamp)
);

CREATE TABLE Reviews (
  ReviewID            INT AUTO_INCREMENT PRIMARY KEY,
  MemberID            INT       NOT NULL,
  BookID              INT       NOT NULL,
  StarRating          INT       NOT NULL,
  ReviewText          TEXT,
  SubmissionTimestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_review_member_book UNIQUE (MemberID, BookID),
  CONSTRAINT chk_star_rating CHECK (StarRating BETWEEN 1 AND 5)
);

-- ---- ALTER: foreign keys -----------------------------------------------------

ALTER TABLE User_Accounts
  ADD CONSTRAINT fk_account_member FOREIGN KEY (MemberID)
    REFERENCES Members (MemberID) ON DELETE RESTRICT;

ALTER TABLE Room_Amenities
  ADD CONSTRAINT fk_amenity_room FOREIGN KEY (RoomID)
    REFERENCES Study_Rooms (RoomID) ON DELETE CASCADE;

ALTER TABLE Room_Reservations
  ADD CONSTRAINT fk_reservation_member FOREIGN KEY (MemberID)
    REFERENCES Members (MemberID) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_reservation_room FOREIGN KEY (RoomID)
    REFERENCES Study_Rooms (RoomID) ON DELETE RESTRICT;

ALTER TABLE Gate_Attendance
  ADD CONSTRAINT fk_gate_member FOREIGN KEY (MemberID)
    REFERENCES Members (MemberID) ON DELETE RESTRICT;

ALTER TABLE Digital_Media
  ADD CONSTRAINT fk_media_book FOREIGN KEY (BookID)
    REFERENCES Books (BookID) ON DELETE CASCADE;

ALTER TABLE Digital_Media_Access
  ADD CONSTRAINT fk_access_member FOREIGN KEY (MemberID)
    REFERENCES Members (MemberID) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_access_media FOREIGN KEY (BookID, MediaNumber)
    REFERENCES Digital_Media (BookID, MediaNumber) ON DELETE RESTRICT;

ALTER TABLE Reviews
  ADD CONSTRAINT fk_review_member FOREIGN KEY (MemberID)
    REFERENCES Members (MemberID) ON DELETE CASCADE,
  ADD CONSTRAINT fk_review_book FOREIGN KEY (BookID)
    REFERENCES Books (BookID) ON DELETE CASCADE;

-- ---- ALTER: CHECKs ---------------------------------------------------------------

-- A Member account must point at a member; staff accounts must not
ALTER TABLE User_Accounts
  ADD CONSTRAINT chk_account_member_link CHECK (
    (Role = 'Member' AND MemberID IS NOT NULL) OR
    (Role IN ('Admin', 'Librarian') AND MemberID IS NULL)
  ),
  ADD CONSTRAINT chk_account_email
    CHECK (Email REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+[.][A-Za-z]{2,}$');

ALTER TABLE Room_Reservations
  ADD CONSTRAINT chk_reservation_time CHECK (EndTime > StartTime);

ALTER TABLE Gate_Attendance
  ADD CONSTRAINT chk_gate_exit CHECK (ExitTime IS NULL OR ExitTime > EntryTime);

-- ---- ALTER: indexes ------------------------------------------------------------

-- Overlap check in sp_ReserveRoom and the bookings-for-a-date list
ALTER TABLE Room_Reservations
  ADD INDEX idx_reservations_room_date (RoomID, ReservationDate);

-- A member's visit history
ALTER TABLE Gate_Attendance
  ADD INDEX idx_gate_member_entry (MemberID, EntryTime);
