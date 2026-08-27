import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_6vXUGz7kYbiO@ep-little-dust-ac4158o0-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

// Helper para converter ? (SQLite) para $1, $2 (Postgres)
const convertSqliteToPg = (sql: string) => {
  let i = 1;
  return sql.replace(/\?/g, () => `$${i++}`);
};

export const dbRun = async (sql: string, params: any[] = []): Promise<any> => {
  const pgSql = convertSqliteToPg(sql);
  const result = await pool.query(pgSql, params);
  return result;
};

export const dbGet = async <T>(sql: string, params: any[] = []): Promise<T | undefined> => {
  const pgSql = convertSqliteToPg(sql);
  const result = await pool.query(pgSql, params);
  return result.rows[0] as T;
};

export const dbAll = async <T>(sql: string, params: any[] = []): Promise<T[]> => {
  const pgSql = convertSqliteToPg(sql);
  const result = await pool.query(pgSql, params);
  return result.rows as T[];
};

// Initialize tables and default data
export const initDb = async () => {
  await dbRun(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE,
    balance REAL DEFAULT 0
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT,
    price REAL,
    stock INTEGER
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name TEXT,
    phone TEXT,
    team TEXT
  )`);

  await dbRun(`CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    seller TEXT,
    team TEXT,
    buyerName TEXT,
    buyerPhone TEXT,
    total REAL,
    date TEXT,
    cart TEXT
  )`);

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
