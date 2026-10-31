-- ============================================================================
-- Library Management System - seed.sql
-- Demo data for database v2. Run after schema.sql and advanced.sql.
--
-- Loans are NOT inserted directly: they go through sp_CheckoutBook, and
-- returns are plain UPDATEs that fire trg_BookReturned. So every copy status
-- and every fine below is produced by the database rules themselves.
-- Seed dates run from July to 27 October 2026.
-- ============================================================================

USE library;

-- ============================================================================
-- SECTION A: Catalog and Circulation (Abhiraj)
-- ============================================================================

INSERT INTO Members (Fname, Lname, EmailAddress, DOB, GuardianContactName, GuardianRelationship, GuardianContactNumber) VALUES
('Aarav', 'Sharma', 'aarav.sharma@example.com', '2003-05-14', NULL, NULL, NULL),
('Ananya', 'Rao', 'ananya.rao@example.com', '2004-08-22', NULL, NULL, NULL),
('Rohan', 'Verma', 'rohan.verma@example.com', '2002-11-30', NULL, NULL, NULL),
('Priya', 'Nair', 'priya.nair@example.com', '2005-01-12', NULL, NULL, NULL),
('Vikram', 'Singh', 'vikram.singh@example.com', '2001-04-18', NULL, NULL, NULL),
('Isha', 'Patel', 'isha.patel@example.com', '2003-09-05', NULL, NULL, NULL),
('Aditya', 'Joshi', 'aditya.joshi@example.com', '2002-07-19', NULL, NULL, NULL),
('Kavya', 'Reddy', 'kavya.reddy@example.com', '2004-12-01', NULL, NULL, NULL),
('Siddharth', 'Gupta', 'siddharth.gupta@example.com', '2003-03-25', NULL, NULL, NULL),
('Diya', 'Mishra', 'diya.mishra@example.com', '2009-06-10', 'Manoj Mishra', 'Father', '9876543219'),
('Arjun', 'Menon', 'arjun.menon@example.com', '2004-02-17', NULL, NULL, NULL),
('Sneha', 'Iyer', 'sneha.iyer@example.com', '2003-10-09', NULL, NULL, NULL),
('Karthik', 'Subramanian', 'karthik.subramanian@example.com', '2002-01-28', NULL, NULL, NULL),
('Meera', 'Krishnan', 'meera.krishnan@example.com', '2010-03-03', 'Lakshmi Krishnan', 'Mother', '9876543220'),
('Rahul', 'Desai', 'rahul.desai@example.com', '1998-07-21', NULL, NULL, NULL),
('Neha', 'Kulkarni', 'neha.kulkarni@example.com', '2004-05-30', NULL, NULL, NULL),
('Yash', 'Agarwal', 'yash.agarwal@example.com', '2009-11-15', 'Sanjay Agarwal', 'Father', '9876543221'),
('Pooja', 'Bhat', 'pooja.bhat@example.com', '2003-08-08', NULL, NULL, NULL),
('Farhan', 'Khan', 'farhan.khan@example.com', '2001-12-12', NULL, NULL, NULL),
('Tanvi', 'Shetty', 'tanvi.shetty@example.com', '2004-04-04', NULL, NULL, NULL);

INSERT INTO Member_Phone_Numbers (MemberID, PhoneNumber) VALUES
(1, '9900112233'),
(2, '9900112234'),
(3, '9900112235'),
(4, '9900112236'),
(5, '9900112237'),
(6, '9900112238'),
(7, '9900112239'),
(8, '9900112240'),
(9, '9900112241'),
(10, '9900112242'),
(11, '9900112243'),
(12, '9900112244'),
(13, '9900112245'),
(14, '9900112246'),
(15, '9900112247'),
(16, '9900112248'),
(17, '9900112249'),
(18, '9900112250'),
(19, '9900112251'),
(20, '9900112252'),
(1, '9845020000'),
(3, '9845020014'),
(5, '9845020028'),
(7, '9845020042'),
(10, '9845020063'),
(12, '9845020077'),
(14, '9845020091'),
(16, '9845020105');

INSERT INTO Books (Title, Publisher, PublicationYear, ISBN, Description) VALUES
('Database System Concepts', 'McGraw-Hill', 2019, '978-0078022159', 'Covers relational databases from the ground up: the relational model, SQL, database design with the entity-relationship model, normalization, indexing, query processing, transactions and concurrency control.'),
('Introduction to Algorithms', 'MIT Press', 2009, '978-0262033848', 'A comprehensive treatment of algorithm design and analysis, including sorting, graph algorithms, dynamic programming, greedy methods and NP-completeness, with rigorous proofs.'),
('Clean Code', 'Prentice Hall', 2008, '978-0132350884', 'Practical advice on writing readable, maintainable code: naming, small functions, error handling, unit tests and refactoring, illustrated with worked examples.'),
('Operating System Concepts', 'Wiley', 2018, '978-1118063330', 'Explains how operating systems manage processes, threads, CPU scheduling, memory, virtual memory, file systems and storage, with examples from Linux and Windows.'),
('Computer Networks', 'Pearson', 2012, '978-0132126953', 'A layered tour of computer networking, from the physical layer through routing, TCP and UDP, to application protocols and network security.'),
('Artificial Intelligence: A Modern Approach', 'Pearson', 2020, '978-0134610993', 'The standard introduction to artificial intelligence: search, logic, planning, probabilistic reasoning, machine learning and intelligent agents.'),
('Design Patterns', 'Addison-Wesley', 1994, '978-0201633610', 'Catalogues reusable object-oriented design patterns such as factory, observer, strategy and decorator, explaining when and why to apply each.'),
('The Pragmatic Programmer', 'Addison-Wesley', 2019, '978-0135957059', 'Career-long habits for software developers: taking responsibility, avoiding duplication, automation, testing, and designing for change.'),
('Computer Organization and Architecture', 'Pearson', 2015, '978-0132936330', 'How computers are built: instruction sets, the processor datapath, pipelining, the memory hierarchy, caches and input/output.'),
('Introduction to the Theory of Computation', 'Cengage Learning', 2012, '978-1133187790', 'Automata, regular and context-free languages, Turing machines, decidability and complexity theory, presented with clear proofs.'),
('Fundamentals of Database Systems', 'Pearson', 2015, '978-0133970777', 'Database design and implementation: ER and EER modelling, relational algebra, SQL, functional dependencies, normal forms, NoSQL and big data systems.'),
('Designing Data-Intensive Applications', 'O''Reilly', 2017, '978-1449373320', 'How modern data systems work: storage engines, replication, partitioning, transactions, consistency and stream processing, with trade-offs between databases.'),
('Graph Databases', 'O''Reilly', 2015, '978-1491930892', 'Modelling connected data as nodes and relationships, querying it with Cypher in Neo4j, and when a graph database beats a relational one.'),
('Hands-On Machine Learning', 'O''Reilly', 2022, '978-1098125974', 'Practical machine learning with Python: regression, classification, decision trees, ensembles, neural networks and deep learning projects.'),
('Deep Learning', 'MIT Press', 2016, '978-0262035613', 'The mathematical and conceptual foundations of deep learning: optimization, regularization, convolutional and recurrent networks, and generative models.'),
('Computer Networking: A Top-Down Approach', 'Pearson', 2021, '978-0136681557', 'Networking taught from the application layer down: HTTP, DNS, transport protocols, congestion control, routing and wireless networks.'),
('Cryptography and Network Security', 'Pearson', 2016, '978-0134444284', 'Principles of cryptography and their use in network security: ciphers, public keys, hashing, digital signatures, TLS and firewalls.'),
('Discrete Mathematics and Its Applications', 'McGraw-Hill', 2018, '978-1259676512', 'Logic, proofs, sets, counting, relations, graphs and trees, the mathematics that underpins computer science.'),
('The Mythical Man-Month', 'Addison-Wesley', 1995, '978-0201835953', 'Essays on managing software projects and why adding people to a late project makes it later.'),
('To Kill a Mockingbird', 'Harper Perennial', 2006, '978-0060935467', 'A novel of childhood, justice and prejudice in a small Alabama town, told by a young girl watching her lawyer father defend an innocent man.'),
('1984', 'Signet Classics', 1961, '978-0451524935', 'A dystopian novel about a surveillance state that controls truth, language and memory, and one man who tries to resist it.'),
('Sapiens', 'Harper', 2015, '978-0062316097', 'A history of humankind from early foragers through the agricultural and scientific revolutions to the present day.'),
('A Brief History of Time', 'Bantam', 1998, '978-0553380163', 'An accessible explanation of the universe: the big bang, black holes, time and the search for a unified theory of physics.'),
('Atomic Habits', 'Avery', 2018, '978-0735211292', 'A practical framework for building good habits and breaking bad ones through small, consistent changes.'),
('The Alchemist', 'HarperOne', 2014, '978-0062315007', 'A fable about a shepherd boy who travels from Spain to Egypt in search of treasure and learns to follow his dreams.');

INSERT INTO Book_Genres (BookID, Genre) VALUES
(1, 'Computer Science'),
(1, 'Databases'),
(2, 'Algorithms'),
(2, 'Mathematics'),
(3, 'Software Engineering'),
(4, 'Computer Science'),
(4, 'Operating Systems'),
(5, 'Networking'),
(6, 'Artificial Intelligence'),
(6, 'Computer Science'),
(7, 'Software Engineering'),
(8, 'Software Engineering'),
(9, 'Computer Science'),
(10, 'Computer Science'),
(10, 'Mathematics'),
(11, 'Databases'),
(12, 'Databases'),
(12, 'Software Engineering'),
(13, 'Databases'),
(14, 'Artificial Intelligence'),
(15, 'Artificial Intelligence'),
(15, 'Mathematics'),
(16, 'Networking'),
(17, 'Networking'),
(17, 'Security'),
(18, 'Mathematics'),
(19, 'Software Engineering'),
(20, 'Fiction'),
(20, 'Classics'),
(21, 'Fiction'),
(21, 'Classics'),
(22, 'History'),
(23, 'Science'),
(24, 'Self-Help'),
(25, 'Fiction');

INSERT INTO Physical_Copy (BookID, CopyNumber, Floor, Aisle, ShelfNumber, AcquisitionDate) VALUES
(1, 1, '1', 'A2', 'S-01', '2024-08-02'),
(1, 2, '1', 'A2', 'S-01', '2021-08-17'),
(1, 3, '1', 'A2', 'S-01', '2021-02-21'),
(2, 1, '1', 'A3', 'S-02', '2022-07-18'),
(2, 2, '1', 'A3', 'S-02', '2022-05-17'),
(3, 1, '2', 'B1', 'S-03', '2022-04-03'),
(3, 2, '2', 'B1', 'S-03', '2021-10-13'),
(4, 1, '2', 'B2', 'S-04', '2021-07-29'),
(4, 2, '2', 'B2', 'S-04', '2024-10-17'),
(5, 1, '2', 'B3', 'S-05', '2024-01-22'),
(5, 2, '2', 'B3', 'S-05', '2021-06-28'),
(6, 1, '2', 'B4', 'S-06', '2024-04-24'),
(6, 2, '2', 'B4', 'S-06', '2023-05-15'),
(7, 1, '2', 'B1', 'S-07', '2021-03-07'),
(8, 1, '2', 'B1', 'S-08', '2021-03-03'),
(9, 1, '1', 'A1', 'S-09', '2021-07-11'),
(10, 1, '1', 'A4', 'S-10', '2022-03-24'),
(11, 1, '1', 'A2', 'S-11', '2022-04-22'),
(11, 2, '1', 'A2', 'S-11', '2023-11-01'),
(12, 1, '1', 'A2', 'S-12', '2024-05-17'),
(12, 2, '1', 'A2', 'S-12', '2021-02-24'),
(13, 1, '1', 'A2', 'S-01', '2024-02-24'),
(13, 2, '1', 'A2', 'S-01', '2022-02-12'),
(14, 1, '2', 'B4', 'S-02', '2025-01-06'),
(14, 2, '2', 'B4', 'S-02', '2024-08-23'),
(15, 1, '2', 'B4', 'S-03', '2024-12-07'),
(16, 1, '2', 'B3', 'S-04', '2024-01-22'),
(17, 1, '2', 'B3', 'S-05', '2023-05-10'),
(18, 1, '1', 'A4', 'S-06', '2022-03-28'),
(19, 1, '2', 'B1', 'S-07', '2023-07-09'),
(20, 1, 'G', 'G1', 'S-08', '2024-04-21'),
(20, 2, 'G', 'G1', 'S-08', '2022-07-24'),
(21, 1, 'G', 'G1', 'S-09', '2021-01-14'),
(21, 2, 'G', 'G1', 'S-09', '2021-11-23'),
(22, 1, 'G', 'G2', 'S-10', '2024-11-30'),
(22, 2, 'G', 'G2', 'S-10', '2023-05-16'),
(23, 1, 'G', 'G2', 'S-11', '2022-11-28'),
(24, 1, 'G', 'G3', 'S-12', '2022-07-24'),
(24, 2, 'G', 'G3', 'S-12', '2021-11-15'),
(25, 1, 'G', 'G1', 'S-01', '2022-03-17');

-- Loan history in date order: checkouts through the procedure, returns as UPDATEs
CALL sp_CheckoutBook(4, 4, 1, '2026-07-01', @loan_id);
CALL sp_CheckoutBook(20, 22, 1, '2026-07-02', @loan_id);
CALL sp_CheckoutBook(4, 17, 1, '2026-07-03', @loan_id);
CALL sp_CheckoutBook(12, 14, 2, '2026-07-04', @loan_id);
CALL sp_CheckoutBook(3, 24, 2, '2026-07-07', @loan_id);
CALL sp_CheckoutBook(9, 13, 1, '2026-07-08', @loan_id);
CALL sp_CheckoutBook(12, 5, 1, '2026-07-10', @loan_id);
UPDATE Loans SET ActualReturnDate = '2026-07-11' WHERE LoanID = 1;
CALL sp_CheckoutBook(6, 13, 2, '2026-07-11', @loan_id);
CALL sp_CheckoutBook(13, 7, 1, '2026-07-12', @loan_id);
UPDATE Loans SET ActualReturnDate = '2026-07-14' WHERE LoanID = 2;
CALL sp_CheckoutBook(2, 6, 2, '2026-07-14', @loan_id);
CALL sp_CheckoutBook(9, 1, 2, '2026-07-15', @loan_id);
UPDATE Loans SET ActualReturnDate = '2026-07-16' WHERE LoanID = 7;
CALL sp_CheckoutBook(13, 12, 1, '2026-07-17', @loan_id);
UPDATE Loans SET ActualReturnDate = '2026-07-18' WHERE LoanID = 6;
UPDATE Loans SET ActualReturnDate = '2026-07-18' WHERE LoanID = 8;
UPDATE Loans SET ActualReturnDate = '2026-07-19' WHERE LoanID = 4;
CALL sp_CheckoutBook(18, 20, 1, '2026-07-19', @loan_id);
UPDATE Loans SET ActualReturnDate = '2026-07-20' WHERE LoanID = 3;
CALL sp_CheckoutBook(13, 3, 2, '2026-07-20', @loan_id);
CALL sp_CheckoutBook(16, 1, 3, '2026-07-21', @loan_id);
UPDATE Loans SET ActualReturnDate = '2026-07-22' WHERE LoanID = 5;
UPDATE Loans SET ActualReturnDate = '2026-07-24' WHERE LoanID = 10;
CALL sp_CheckoutBook(20, 20, 2, '2026-07-24', @loan_id);
UPDATE Loans SET ActualReturnDate = '2026-07-25' WHERE LoanID = 9;
CALL sp_CheckoutBook(17, 10, 1, '2026-07-25', @loan_id);
UPDATE Loans SET ActualReturnDate = '2026-07-27' WHERE LoanID = 15;
CALL sp_CheckoutBook(9, 16, 1, '2026-07-27', @loan_id);
CALL sp_CheckoutBook(6, 7, 1, '2026-07-28', @loan_id);
CALL sp_CheckoutBook(17, 6, 1, '2026-07-29', @loan_id);
UPDATE Loans SET ActualReturnDate = '2026-07-30' WHERE LoanID = 13;
UPDATE Loans SET ActualReturnDate = '2026-07-30' WHERE LoanID = 17;
CALL sp_CheckoutBook(17, 15, 1, '2026-07-30', @loan_id);
CALL sp_CheckoutBook(17, 2, 1, '2026-08-01', @loan_id);
UPDATE Loans SET ActualReturnDate = '2026-08-02' WHERE LoanID = 12;
UPDATE Loans SET ActualReturnDate = '2026-08-03' WHERE LoanID = 11;
UPDATE Loans SET ActualReturnDate = '2026-08-04' WHERE LoanID = 20;
CALL sp_CheckoutBook(10, 22, 1, '2026-08-04', @loan_id);
UPDATE Loans SET ActualReturnDate = '2026-08-05' WHERE LoanID = 14;
UPDATE Loans SET ActualReturnDate = '2026-08-05' WHERE LoanID = 18;
UPDATE Loans SET ActualReturnDate = '2026-08-07' WHERE LoanID = 16;
CALL sp_CheckoutBook(3, 21, 2, '2026-08-07', @loan_id);
CALL sp_CheckoutBook(18, 8, 1, '2026-08-08', @loan_id);
UPDATE Loans SET ActualReturnDate = '2026-08-13' WHERE LoanID = 22;
UPDATE Loans SET ActualReturnDate = '2026-08-14' WHERE LoanID = 24;
UPDATE Loans SET ActualReturnDate = '2026-08-16' WHERE LoanID = 21;
UPDATE Loans SET ActualReturnDate = '2026-08-17' WHERE LoanID = 19;
CALL sp_CheckoutBook(1, 11, 1, '2026-08-18', @loan_id);
UPDATE Loans SET ActualReturnDate = '2026-08-23' WHERE LoanID = 23;
CALL sp_CheckoutBook(3, 22, 2, '2026-08-26', @loan_id);
UPDATE Loans SET ActualReturnDate = '2026-08-27' WHERE LoanID = 25;
CALL sp_CheckoutBook(5, 24, 2, '2026-08-28', @loan_id);
UPDATE Loans SET ActualReturnDate = '2026-09-01' WHERE LoanID = 26;
CALL sp_CheckoutBook(12, 10, 1, '2026-09-01', @loan_id);
CALL sp_CheckoutBook(11, 13, 1, '2026-09-04', @loan_id);
UPDATE Loans SET ActualReturnDate = '2026-09-06' WHERE LoanID = 29;
UPDATE Loans SET ActualReturnDate = '2026-09-07' WHERE LoanID = 27;
UPDATE Loans SET ActualReturnDate = '2026-09-09' WHERE LoanID = 28;
CALL sp_CheckoutBook(6, 6, 2, '2026-09-09', @loan_id);
CALL sp_CheckoutBook(18, 3, 2, '2026-09-10', @loan_id);
UPDATE Loans SET ActualReturnDate = '2026-09-12' WHERE LoanID = 30;
UPDATE Loans SET ActualReturnDate = '2026-09-15' WHERE LoanID = 31;
CALL sp_CheckoutBook(16, 11, 2, '2026-09-15', @loan_id);
CALL sp_CheckoutBook(1, 6, 2, '2026-09-18', @loan_id);
CALL sp_CheckoutBook(14, 17, 1, '2026-09-19', @loan_id);
CALL sp_CheckoutBook(5, 21, 2, '2026-09-20', @loan_id);
CALL sp_CheckoutBook(18, 7, 1, '2026-09-21', @loan_id);
UPDATE Loans SET ActualReturnDate = '2026-09-23' WHERE LoanID = 32;
CALL sp_CheckoutBook(16, 13, 2, '2026-09-23', @loan_id);
UPDATE Loans SET ActualReturnDate = '2026-09-25' WHERE LoanID = 36;
UPDATE Loans SET ActualReturnDate = '2026-09-26' WHERE LoanID = 33;
UPDATE Loans SET ActualReturnDate = '2026-09-26' WHERE LoanID = 37;
CALL sp_CheckoutBook(3, 7, 1, '2026-09-26', @loan_id);
CALL sp_CheckoutBook(4, 16, 1, '2026-09-28', @loan_id);
CALL sp_CheckoutBook(2, 14, 2, '2026-09-29', @loan_id);
UPDATE Loans SET ActualReturnDate = '2026-09-30' WHERE LoanID = 34;
CALL sp_CheckoutBook(19, 5, 1, '2026-09-30', @loan_id);
CALL sp_CheckoutBook(8, 8, 1, '2026-10-01', @loan_id);
UPDATE Loans SET ActualReturnDate = '2026-10-02' WHERE LoanID = 35;
UPDATE Loans SET ActualReturnDate = '2026-10-02' WHERE LoanID = 39;
CALL sp_CheckoutBook(3, 3, 1, '2026-10-03', @loan_id);
CALL sp_CheckoutBook(4, 5, 2, '2026-10-04', @loan_id);
CALL sp_CheckoutBook(9, 6, 1, '2026-10-05', @loan_id);
UPDATE Loans SET ActualReturnDate = '2026-10-06' WHERE LoanID = 38;
CALL sp_CheckoutBook(10, 21, 1, '2026-10-07', @loan_id);
UPDATE Loans SET ActualReturnDate = '2026-10-08' WHERE LoanID = 42;
CALL sp_CheckoutBook(10, 24, 2, '2026-10-08', @loan_id);
CALL sp_CheckoutBook(10, 20, 1, '2026-10-10', @loan_id);
UPDATE Loans SET ActualReturnDate = '2026-10-11' WHERE LoanID = 46;
CALL sp_CheckoutBook(5, 22, 2, '2026-10-13', @loan_id);
CALL sp_CheckoutBook(17, 18, 1, '2026-10-16', @loan_id);
UPDATE Loans SET ActualReturnDate = '2026-10-17' WHERE LoanID = 49;
CALL sp_CheckoutBook(9, 4, 1, '2026-10-19', @loan_id);
UPDATE Loans SET ActualReturnDate = '2026-10-21' WHERE LoanID = 48;
CALL sp_CheckoutBook(6, 11, 1, '2026-10-21', @loan_id);
CALL sp_CheckoutBook(15, 19, 1, '2026-09-01', @loan_id);
UPDATE Loans SET ActualReturnDate = '2026-10-20' WHERE LoanID = 54;
CALL sp_CheckoutBook(7, 2, 1, '2026-10-24', @loan_id);
CALL sp_CheckoutBook(7, 6, 1, '2026-10-25', @loan_id);
CALL sp_CheckoutBook(7, 10, 1, '2026-10-26', @loan_id);

-- Some fines have since been paid or waived
UPDATE Fines SET FineStatus = 'Paid'   WHERE LoanID IN (SELECT LoanID FROM Loans WHERE MemberID IN (1, 4, 9, 12)) AND FineStatus = 'Pending';
UPDATE Fines SET FineStatus = 'Waived' WHERE LoanID IN (SELECT LoanID FROM Loans WHERE MemberID = 18) AND FineStatus = 'Pending';

-- Copies taken out of circulation (none of them is on loan)
UPDATE Physical_Copy SET AvailabilityStatus = 'Under Repair' WHERE BookID = 24 AND CopyNumber = 2;
UPDATE Physical_Copy SET AvailabilityStatus = 'Lost' WHERE BookID = 20 AND CopyNumber = 2;

-- ============================================================================
-- SECTION B: Facilities, Accounts and Analytics (Alisha)
-- (added in a later patch)
-- ============================================================================
