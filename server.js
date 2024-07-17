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

// Session settings
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, maxAge: 3600000 } // Set secure to true in production
}));

// Database connection with busy timeout
const db = new sqlite3.Database('users.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('데이터베이스 연결 오류:', err.message);
    } else {
        console.log('데이터베이스에 연결되었습니다.');
        db.configure('busyTimeout', 5000); // Set busy timeout to 5000 milliseconds
        initializeDatabase();
    }
});

// Initialize database tables
const initializeDatabase = () => {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            birthdate DATE,
            phone TEXT UNIQUE,
            password TEXT
        )`, (err) => {
            if (err) console.error('users 테이블 생성 오류:', err.message);
        });

        db.run(`CREATE TABLE IF NOT EXISTS data_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            username TEXT,
            phone TEXT,
            age_group TEXT,
            date TEXT,
            b_actin REAL,
            average REAL,
            CLDN10 REAL,
            TIMP3 REAL,
            MMP8 REAL,
            FLG REAL,
            AQP3 REAL,
            COL10A1 REAL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`, (err) => {
            if (err) console.error('data_entries 테이블 생성 오류:', err.message);
        });

        db.run(`CREATE TABLE IF NOT EXISTS result_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            username TEXT,
            phone TEXT,
            age_group TEXT,
            date TEXT,
            b_actin REAL,
            average REAL,
            CLDN10 REAL,
            TIMP3 REAL,
            MMP8 REAL,
            FLG REAL,
            AQP3 REAL,
            COL10A1 REAL,
            result TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`, (err) => {
            if (err) console.error('result_entries 테이블 생성 오류:', err.message);
        });
    });
};

// Utility functions
const validatePhoneNumber = (phone) => /^010-\d{4}-\d{4}$/.test(phone);

const validatePassword = (password) => /^\d{6}$/.test(password);

const hashPassword = async (password) => {
    try {
        return await bcrypt.hash(password, 10);
    } catch (error) {
        throw new Error('비밀번호 해싱 중 오류가 발생했습니다.');
    }
};

const comparePassword = async (password, hash) => {
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        throw new Error('비밀번호 비교 중 오류가 발생했습니다.');
    }
};

const calculateAgeGroup = (birthdate) => {
    const age = new Date().getFullYear() - new Date(birthdate).getFullYear();
    if (age < 20) return '10대 이하';
    if (age < 30) return '20대';
    if (age < 40) return '30대';
    if (age < 50) return '40대';
    if (age < 60) return '50대';
    if (age < 70) return '60대';
    if (age < 80) return '70대';
    if (age < 90) return '80대';
    if (age < 100) return '90대';
    return '100대 이상';
};

const isValidNumber = (value) => {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

const handleDatabaseError = (res, err) => {
    console.error('데이터베이스 오류:', err);
    res.status(500).json({ success: false, message: '데이터베이스 오류가 발생했습니다.' });
};

// User functions
const getUserById = (userId) => new Promise((resolve, reject) => {
    db.get("SELECT * FROM users WHERE id = ?", [userId], (err, user) => {
        if (err) reject(err);
        else resolve(user);
    });
});

const getUserByUsername = (username) => new Promise((resolve, reject) => {
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) reject(err);
        else resolve(user);
    });
});

const insertUser = (username, phone, password, birthdate) => new Promise((resolve, reject) => {
    db.run("INSERT INTO users (username, phone, password, birthdate) VALUES (?, ?, ?, ?)",
        [username, phone, password, birthdate], function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
});

// Entry functions
const insertResultEntry = (userId, username, phone, ageGroup, date, bActin, average, results) => new Promise((resolve, reject) => {
    const tryInsert = (retries = 3) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) return reject(err);

                db.run(`INSERT INTO result_entries (user_id, username, phone, age_group, date, b_actin, average, CLDN10, TIMP3, MMP8, FLG, AQP3, COL10A1, result)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [userId, username, phone, ageGroup, date, bActin, average, results.CLDN10, results.TIMP3, results.MMP8, results.FLG, results.AQP3, results.COL10A1, JSON.stringify(results)], (err) => {
                        if (err) {
                            db.run('ROLLBACK', () => {
                                if (err.code === 'SQLITE_BUSY' && retries > 0) {
                                    setTimeout(() => tryInsert(retries - 1), 1000);
                                } else {
                                    reject(err);
                                }
                            });
                        } else {
                            db.run('COMMIT', (commitErr) => {
                                if (commitErr) reject(commitErr);
                                else resolve();
                            });
                        }
                    });
            });
        });
    };
    tryInsert();
});

const insertDataEntry = (userId, username, phone, ageGroup, date, bActin, average, inputData) => new Promise((resolve, reject) => {
    db.run(`INSERT INTO data_entries (user_id, username, phone, age_group, date, b_actin, average, CLDN10, TIMP3, MMP8, FLG, AQP3, COL10A1)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, username, phone, ageGroup, date, bActin, average, inputData.CLDN10, inputData.TIMP3, inputData.MMP8, inputData.FLG, inputData.AQP3, inputData.COL10A1], (err) => {
            if (err) reject(err);
            else resolve();
        });
});

// Register endpoint
app.post('/register', async (req, res) => {
    const { username, phone, password, birthdate } = req.body;

    try {
        if (!username || !phone || !password || !birthdate) {
            return res.status(400).json({ success: false, message: '모든 필드를 입력해주세요.' });
        }

        if (!validatePhoneNumber(phone)) {
            return res.status(400).json({ success: false, message: '올바른 전화번호 형식이 아닙니다.' });
        }

        if (!validatePassword(password)) {
            return res.status(400).json({ success: false, message: '비밀번호 형식이 올바르지 않습니다.' });
        }

        const hash = await hashPassword(password);
        const formattedBirthdate = new Date(birthdate).toISOString().split('T')[0];

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

// Login endpoint
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        if (!username || !password) {
            return res.status(400).json({ success: false, message: '사용자 이름과 비밀번호를 입력해주세요.' });
        }

        const user = await getUserByUsername(username);

        if (!user) {
            return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
        }

        const result = await comparePassword(password, user.password);

        if (result) {
            req.session.userId = user.id;
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, message: '비밀번호가 일치하지 않습니다.' });
        }
    } catch (err) {
        handleDatabaseError(res, err);
    }
});

app.post('/submit-results', async (req, res) => {
    const { date, b_actin, average, CLDN10, TIMP3, MMP8, FLG, AQP3, COL10A1 } = req.body;
    const userId = req.session.userId;

    if (!userId) {
        return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
    }

    // 각 필드의 존재 여부 확인
    const requiredFields = { date, b_actin, average, CLDN10, TIMP3, MMP8, FLG, AQP3, COL10A1 };
    const missingFields = Object.keys(requiredFields).filter(field => requiredFields[field] == null);
    
    if (missingFields.length > 0) {
        return res.status(400).json({ success: false, message: `다음 필드가 누락되었습니다: ${missingFields.join(', ')}` });
    }

    try {
        const user = await getUserById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
        }

        const ageGroup = calculateAgeGroup(user.birthdate);

        const bActinValue = parseFloat(b_actin);
        if (!isValidNumber(bActinValue)) {
            return res.status(400).json({ success: false, message: 'b_actin 값이 유효하지 않습니다.' });
        }

        const values = {
            CLDN10: parseFloat(CLDN10),
            TIMP3: parseFloat(TIMP3),
            MMP8: parseFloat(MMP8),
            FLG: parseFloat(FLG),
            AQP3: parseFloat(AQP3),
            COL10A1: parseFloat(COL10A1)
        };

        for (const [key, value] of Object.entries(values)) {
            if (!isValidNumber(value)) {
                return res.status(400).json({ success: false, message: `${key} 값이 유효하지 않습니다.` });
            }
        }

        const calculatedResults = {
            CLDN10: values.CLDN10 - bActinValue,
            TIMP3: values.TIMP3 - bActinValue,
            MMP8: values.MMP8 - bActinValue,
            FLG: values.FLG - bActinValue,
            AQP3: values.AQP3 - bActinValue,
            COL10A1: values.COL10A1 - bActinValue
        };

        // Ensure all calculated results are valid numbers
        for (const [key, value] of Object.entries(calculatedResults)) {
            if (!isValidNumber(value)) {
                calculatedResults[key] = null; // or you could use a default value like 0
            }
        }

        await insertResultEntry(userId, user.username, user.phone, ageGroup, date, bActinValue, average, calculatedResults);
        await insertDataEntry(userId, user.username, user.phone, ageGroup, date, bActinValue, average, values);

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

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: '서버 내부 오류가 발생했습니다.' });
});

// Start the server
app.listen(port, () => {
    console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('데이터베이스 연결이 닫혔습니다.');
        process.exit(0);
    });
});