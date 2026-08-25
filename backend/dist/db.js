import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);
// Utility functions to wrap sqlite3 in Promises
export const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err)
                reject(err);
            else
                resolve(this);
        });
    });
};
export const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row);
        });
    });
};
export const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
// Initialize tables and default data
export const initDb = async () => {
    await dbRun(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  )`);
    await dbRun(`CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE,
    balance REAL DEFAULT 0
  )`);
    await dbRun(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    price REAL,
    stock INTEGER
  )`);
    await dbRun(`CREATE TABLE IF NOT EXISTS transactions (
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
    const products = await dbAll('SELECT * FROM products');
    if (products.length === 0) {
        await dbRun('INSERT INTO products (name, price, stock) VALUES (?, ?, ?)', ['Refrigerante Lata', 5.0, 100]);
        await dbRun('INSERT INTO products (name, price, stock) VALUES (?, ?, ?)', ['Chocolate', 3.5, 50]);
        await dbRun('INSERT INTO products (name, price, stock) VALUES (?, ?, ?)', ['Cachorro Quente', 10.0, 30]);
    }
};
//# sourceMappingURL=db.js.map