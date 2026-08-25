import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH || path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Utility functions to wrap sqlite3 in Promises
export const dbRun = (sql: string, params: any[] = []): Promise<sqlite3.RunResult> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

export const dbGet = <T>(sql: string, params: any[] = []): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
};

export const dbAll = <T>(sql: string, params: any[] = []): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
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

  // Adiciona a coluna imageUrl se não existir (ignora erro se já existir)
  try {
    await dbRun(`ALTER TABLE products ADD COLUMN imageUrl TEXT`);
  } catch (err) {
    // Coluna já existe, ignorar
  }

  // Insert default products if the table is empty
  const products = await dbAll('SELECT * FROM products');
  if (products.length === 0) {
    await dbRun('INSERT INTO products (name, price, stock, imageUrl) VALUES (?, ?, ?, ?)', ['Refrigerante Lata', 5.0, 100, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=200&auto=format&fit=crop']);
    await dbRun('INSERT INTO products (name, price, stock, imageUrl) VALUES (?, ?, ?, ?)', ['Chocolate', 3.5, 50, 'https://images.unsplash.com/photo-1548883354-94cb30eaf7a5?q=80&w=200&auto=format&fit=crop']);
    await dbRun('INSERT INTO products (name, price, stock, imageUrl) VALUES (?, ?, ?, ?)', ['Cachorro Quente', 10.0, 30, 'https://images.unsplash.com/photo-1612222869049-d8ec83637a3c?q=80&w=200&auto=format&fit=crop']);
  }
};
