-- ============================================================================
-- Library Management System - schema.sql (database v2)
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
-- (added in a later patch)
-- ============================================================================
