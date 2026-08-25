import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from './db';

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'retiro_super_secret';

app.use(cors());
app.use(express.json());

// Init DB and Default Admin User
db.serialize(() => {
  db.get("SELECT * FROM users WHERE username = 'admin'", (err, row) => {
    if (!row) {
      bcrypt.hash('admin123', 10, (err, hash) => {
        db.run("INSERT INTO users (username, password, role) VALUES ('admin', ?, 'admin')", [hash]);
        console.log("Admin user created (admin / admin123)");
      });
    }
  });
});

// Basic Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user: any) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    bcrypt.compare(password, user.password, (err, result) => {
      if (result) {
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
        res.json({ token, role: user.role });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
