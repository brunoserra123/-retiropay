"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDb = exports.dbAll = exports.dbGet = exports.dbRun = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const dbPath = path_1.default.resolve(__dirname, 'database.sqlite');
const db = new sqlite3_1.default.Database(dbPath);
// Utility functions to wrap sqlite3 in Promises
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err)
                reject(err);
            else
                resolve(this);
        });
    });
};
exports.dbRun = dbRun;
const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row);
        });
    });
};
exports.dbGet = dbGet;
const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.dbAll = dbAll;
// Initialize tables and default data
const initDb = async () => {
    await (0, exports.dbRun)(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  )`);
    await (0, exports.dbRun)(`CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    balance REAL DEFAULT 0
  )`);
    await (0, exports.dbRun)(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    price REAL,
    stock INTEGER
  )`);
    await (0, exports.dbRun)(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller TEXT,
    team TEXT,
    buyerName TEXT,
    buyerPhone TEXT,
    total REAL,
    date TEXT,
    cart TEXT
  )`);
    // Insert default products if the table is empty
    const products = await (0, exports.dbAll)('SELECT * FROM products');
    if (products.length === 0) {
        await (0, exports.dbRun)('INSERT INTO products (name, price, stock) VALUES (?, ?, ?)', ['Refrigerante Lata', 5.0, 100]);
        await (0, exports.dbRun)('INSERT INTO products (name, price, stock) VALUES (?, ?, ?)', ['Chocolate', 3.5, 50]);
        await (0, exports.dbRun)('INSERT INTO products (name, price, stock) VALUES (?, ?, ?)', ['Cachorro Quente', 10.0, 30]);
    }
};
exports.initDb = initDb;
//# sourceMappingURL=db.js.map