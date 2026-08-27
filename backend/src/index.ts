import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbAll, dbGet, dbRun, initDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// CHAVE EXPORTADA para gerar e validar tokens
export const JWT_SECRET = 'retiro_super_secret_exportada';

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

export interface AuthRequest extends Request {
  user?: any;
}

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato: Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      res.status(403).json({ error: 'Token inválido ou expirado.' });
      return;
    }
    req.user = user;
    next();
  });
};

// ==========================================
// ROTAS DA API (Backend)
// ==========================================

// 1. ROTA DE LOGIN (Pública)
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
      res.status(400).json({ error: 'Username e senha obrigatórios' });
      return;
    }

    const user = await dbGet<any>('SELECT * FROM users WHERE username = ?', [username]);
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

// 2. ROTA DE CATÁLOGO (Protegida)
app.get('/api/products', authenticateToken, async (req, res) => {
  try {
    const products = await dbAll('SELECT * FROM products');
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

app.post('/api/products', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Apenas admin pode adicionar produtos' });
  try {
    const { name, price, stock, imageUrl } = req.body;
    await dbRun('INSERT INTO products (name, price, stock, imageUrl) VALUES (?, ?, ?, ?)', [name, price, stock, imageUrl || '']);
    res.json({ message: 'Produto adicionado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao adicionar produto' });
  }
});

app.put('/api/products/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Apenas admin pode editar' });
  try {
    const { name, price, stock, imageUrl } = req.body;
    await dbRun('UPDATE products SET name = ?, price = ?, stock = ?, imageUrl = ? WHERE id = ?', [name, price, stock, imageUrl || '', req.params.id]);
    res.json({ message: 'Produto atualizado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao editar produto' });
  }
});

app.delete('/api/products/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Apenas admin pode deletar' });
  try {
    await dbRun('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Produto deletado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar produto' });
  }
});

// 2.5 ROTAS DE CLIENTES/PESSOAS (Protegida)
app.get('/api/customers', authenticateToken, async (req, res) => {
  try {
    const customers = await dbAll('SELECT * FROM customers ORDER BY name ASC');
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
});

app.post('/api/customers', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Apenas admin pode adicionar clientes' });
  try {
    const { name, phone, team } = req.body;
    await dbRun('INSERT INTO customers (name, phone, team) VALUES (?, ?, ?)', [name, phone, team]);
    res.json({ message: 'Cliente adicionado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao adicionar cliente' });
  }
});

app.put('/api/customers/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Apenas admin pode editar' });
  try {
    const { name, phone, team } = req.body;
    await dbRun('UPDATE customers SET name = ?, phone = ?, team = ? WHERE id = ?', [name, phone, team, req.params.id]);
    res.json({ message: 'Cliente atualizado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao editar cliente' });
  }
});

app.delete('/api/customers/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Apenas admin pode deletar' });
  try {
    await dbRun('DELETE FROM customers WHERE id = ?', [req.params.id]);
    res.json({ message: 'Cliente deletado' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar cliente' });
  }
});

// 3. ROTA DE VENDAS/CONTRATOS (Protegida)
app.post('/api/checkout', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { team, buyerName, buyerPhone, cart, total } = req.body;

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      res.status(400).json({ error: 'Carrinho inválido' });
      return;
    }

    // Registra a transação
    await dbRun(
      `INSERT INTO transactions (seller, team, buyerName, buyerPhone, total, date, cart) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.username, team, buyerName || '', buyerPhone || '', total, new Date().toISOString(), JSON.stringify(cart)]
    );

    // Atualiza saldo da equipe (se foi fiado)
    if (team !== 'Dinheiro' && team !== 'Pix') {
      const existingTeam = await dbGet<any>('SELECT * FROM teams WHERE name = ?', [team]);
      if (existingTeam) {
        await dbRun('UPDATE teams SET balance = balance + ? WHERE id = ?', [total, existingTeam.id]);
      } else {
        await dbRun('INSERT INTO teams (name, balance) VALUES (?, ?)', [team, total]);
      }
    }

    res.json({ message: 'Venda registrada com sucesso!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao registrar venda' });
  }
});

// 4. ROTA DE RELATÓRIOS/TRANSAÇÕES (Protegida)
app.get('/api/transactions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const transactions = await dbAll<any>('SELECT * FROM transactions ORDER BY id DESC');
    // Faz o parse do cart que está como string JSON no SQLite
    const parsed = transactions.map((t: any) => ({
      ...t,
      cart: JSON.parse(t.cart)
    }));
    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar transações' });
  }
});

// ==========================================
// ARQUIVOS ESTÁTICOS (Frontend Fullstack)
// ==========================================
// Servir a pasta dist do frontend
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

// Qualquer rota que não seja /api, entrega o index.html do React
app.use((req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ==========================================
// INICIALIZAÇÃO
// ==========================================
const startServer = async () => {
  try {
    await initDb();
    
    // Cria admin se não existir
    const admin = await dbGet('SELECT * FROM users WHERE username = $1', ['admin']);
    if (!admin) {
      const hash = bcrypt.hashSync('admin123', 10);
      await dbRun('INSERT INTO users (username, password, role) VALUES ($1, $2, $3)', ['admin', hash, 'admin']);
      console.log('Usuário admin criado!');
    }

    // Cria caixa se não existir
    const caixa = await dbGet('SELECT * FROM users WHERE username = $1', ['caixa']);
    if (!caixa) {
      const hash = bcrypt.hashSync('caixa123', 10);
      await dbRun('INSERT INTO users (username, password, role) VALUES ($1, $2, $3)', ['caixa', hash, 'caixa']);
      console.log('Usuário caixa criado!');
    }

    app.listen(PORT as number, '0.0.0.0', () => {
      console.log(`Backend rodando na porta ${PORT}`);
    });
  } catch (err) {
    console.error('Falha ao inicializar o banco de dados:', err);
  }
};

// Vercel não suporta app.listen(). Só roda localmente.
if (!process.env.VERCEL) {
  startServer();
}

// Exporta para Serverless Functions do Vercel
export default app;
