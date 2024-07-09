const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const session = require('express-session');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

// 세션 설정
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: true, maxAge: 3600000 } // 세큐어 모드는 프로덕션 환경에서 true로 설정
}));

// Database connection with busy timeout
const db = new sqlite3.Database('users.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
db.configure('busyTimeout', 5000); // Set busy timeout to 5000 milliseconds

// Initialize database tables
const initializeDatabase = () => {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            birthdate DATE,
            phone TEXT UNIQUE,
            password TEXT
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS data_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            username TEXT,
            phone TEXT,
            age_group TEXT,
            date TEXT,
            b_actin REAL,
            average REAL,
            a REAL,
            b REAL,
            c REAL,
            d REAL,
            e REAL,
            f REAL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS result_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            username TEXT,
            phone TEXT,
            age_group TEXT,
            date TEXT,
            b_actin REAL,
            average REAL,
            a REAL,
            b REAL,
            c REAL,
            d REAL,
            e REAL,
            f REAL,
            result TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);
    });
};

// Validate phone number format
const validatePhoneNumber = (phone) => {
    const phoneRegex = /^010-\d{4}-\d{4}$/;
    return phoneRegex.test(phone);
};

// Validate password format
const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    return passwordRegex.test(password);
};

// Hash password
const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

// Compare password hash
const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

// Calculate age group based on birthdate
const calculateAgeGroup = (birthdate) => {
    const today = new Date();
    const birthDate = new Date(birthdate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    if (age < 20) return '10대 이하';
    else if (age < 30) return '20대';
    else if (age < 40) return '30대';
    else if (age < 50) return '40대';
    else if (age < 60) return '50대';
    else if (age < 70) return '60대';
    else if (age < 80) return '70대';
    else if (age < 90) return '80대';
    else if (age < 100) return '90대';
    else return '100대 이상';
};

// Initialize database tables on startup
initializeDatabase();

// Handle database errors
const handleDatabaseError = (res, err) => {
    console.error(err);
    res.status(500).json({ success: false, message: '데이터베이스 오류가 발생했습니다.' });
};

// Function to get user by ID
const getUserById = (userId) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM users WHERE id = ?", [userId], (err, user) => {
            if (err) reject(err);
            resolve(user);
        });
    });
};

// Function to insert result entry with retry mechanism and transaction
const insertResultEntry = (userId, username, phone, ageGroup, date, bActin, average, results) => {
    return new Promise((resolve, reject) => {
        const tryInsert = (retries = 3) => {
            db.serialize(() => {
                db.run('BEGIN TRANSACTION', (err) => {
                    if (err) {
                        if (err.code === 'SQLITE_ERROR' && err.message.includes('cannot start a transaction within a transaction')) {
                            db.run('ROLLBACK', () => {
                                tryInsert(retries);
                            });
                        } else {
                            reject(err);
                        }
                    } else {
                        db.run(`INSERT INTO result_entries (user_id, username, phone, age_group, date, b_actin, average, a, b, c, d, e, f, result)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [userId, username, phone, ageGroup, date, bActin, average, results.a, results.b, results.c, results.d, results.e, results.f, JSON.stringify(results)], (err) => {
                                if (err) {
                                    db.run('ROLLBACK', () => {
                                        if (err.code === 'SQLITE_BUSY' && retries > 0) {
                                            setTimeout(() => tryInsert(retries - 1), 1000); // Wait 1 second before retrying
                                        } else {
                                            reject(err);
                                        }
                                    });
                                } else {
                                    db.run('COMMIT', (commitErr) => {
                                        if (commitErr) {
                                            reject(commitErr);
                                        } else {
                                            resolve();
                                        }
                                    });
                                }
                            });
                    }
                });
            });
        };
        tryInsert();
    });
};

// Function to insert data entry
const insertDataEntry = (userId, username, phone, ageGroup, date, bActin, average, inputData) => {
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO data_entries (user_id, username, phone, age_group, date, b_actin, average, a, b, c, d, e, f)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, username, phone, ageGroup, date, bActin, average, inputData.a, inputData.b, inputData.c, inputData.d, inputData.e, inputData.f], (err) => {
                if (err) reject(err);
                resolve();
            });
    });
};

// Register endpoint
app.post('/register', async (req, res) => {
    const { username, phone, password, birthdate } = req.body;

    try {
        if (!validatePhoneNumber(phone)) {
            return res.status(400).json({ success: false, message: '올바른 전화번호 형식이 아닙니다.' });
        }

        if (!validatePassword(password)) {
            return res.status(400).json({ success: false, message: '비밀번호 형식이 올바르지 않습니다.' });
        }

        const hash = await hashPassword(password);

        const birthdateObj = new Date(birthdate);
        const formattedBirthdate = birthdateObj.toISOString().split('T')[0];

        await insertUser(username, phone, hash, formattedBirthdate);

        res.json({ success: true });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed: users.username')) {
            res.status(409).json({ success: false, message: '이미 존재하는 사용자 이름입니다.' });
        } else if (err.message.includes('UNIQUE constraint failed: users.phone')) {
            res.status(409).json({ success: false, message: '이미 등록된 전화번호입니다.' });
        } else {
            handleDatabaseError(res, err);
        }
    }
});

// Function to insert user
const insertUser = (username, phone, password, birthdate) => {
    return new Promise((resolve, reject) => {
        db.run("INSERT INTO users (username, phone, password, birthdate) VALUES (?, ?, ?, ?)",
            [username, phone, password, birthdate], (err) => {
                if (err) reject(err);
                resolve();
            });
    });
};

// Login endpoint
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await getUserByUsername(username);

        if (!user) {
            return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
        }

        const result = await comparePassword(password, user.password);

        if (result) {
            req.session.userId = user.id; // Set session userId
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, message: '비밀번호가 일치하지 않습니다.' });
        }
    } catch (err) {
        handleDatabaseError(res, err);
    }
});

// Function to get user by username
const getUserByUsername = (username) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
            if (err) reject(err);
            resolve(user);
        });
    });
};

// Submit results endpoint
app.post('/submit-results', async (req, res) => {
    const { date, b_actin, average, a, b, c, d, e, f } = req.body;
    const userId = req.session.userId;

    if (!userId) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }

    try {
        const user = await getUserById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
        }

        const ageGroup = calculateAgeGroup(user.birthdate);

        // Ensure b_actin is converted to a valid number
        const bActinValue = parseFloat(b_actin);
        if (isNaN(bActinValue)) {
            return res.status(400).json({ success: false, message: 'b_actin 값이 유효하지 않습니다.' });
        }

        // Calculate results based on the received data
        const calculatedResults = {
            a: parseFloat(a) - bActinValue,
            b: parseFloat(b) - bActinValue,
            c: parseFloat(c) - bActinValue,
            d: parseFloat(d) - bActinValue,
            e: parseFloat(e) - bActinValue,
            f: parseFloat(f) - bActinValue
        };

        // Store the calculated results as part of the result_entries
        await insertResultEntry(userId, user.username, user.phone, ageGroup, date, bActinValue, average, calculatedResults);

        // Insert data entry
        await insertDataEntry(userId, user.username, user.phone, ageGroup, date, bActinValue, average, {
            a: parseFloat(a),
            b: parseFloat(b),
            c: parseFloat(c),
            d: parseFloat(d),
            e: parseFloat(e),
            f: parseFloat(f)
        });

        res.json({ success: true });
    } catch (err) {
        handleDatabaseError(res, err);
    }
});

// Logout endpoint
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, message: '로그아웃 중 오류가 발생했습니다.' });
        }
        res.json({ success: true });
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});