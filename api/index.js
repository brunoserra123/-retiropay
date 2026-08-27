"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_SECRET = void 0;
const express_1 = __importStar(require("express"));
const cors_1 = __importDefault(require("cors"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const path_1 = __importDefault(require("path"));
const db_1 = require("./db");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// CHAVE EXPORTADA para gerar e validar tokens
exports.JWT_SECRET = 'retiro_super_secret_exportada';
app.use((0, cors_1.default)({ origin: 'http://localhost:5173', credentials: true }));
app.use(express_1.default.json());
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato: Bearer TOKEN
    if (!token) {
        res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
        return;
    }
    jsonwebtoken_1.default.verify(token, exports.JWT_SECRET, (err, user) => {
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
        const user = await (0, db_1.dbGet)('SELECT * FROM users WHERE username = ?', [username]);
        if (!user || !bcrypt_1.default.compareSync(password, user.password)) {
            res.status(401).json({ error: 'Credenciais inválidas' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, username: user.username, role: user.role }, exports.JWT_SECRET, { expiresIn: '12h' });
        res.json({ token, role: user.role });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});
// 2. ROTA DE CATÁLOGO (Protegida)
app.get('/api/products', authenticateToken, async (req, res) => {
    try {
        const products = await (0, db_1.dbAll)('SELECT * FROM products');
        res.json(products);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
});
// 3. ROTA DE VENDAS/CONTRATOS (Protegida)
app.post('/api/checkout', authenticateToken, async (req, res) => {
    try {
        const { team, buyerName, buyerPhone, cart, total } = req.body;
        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            res.status(400).json({ error: 'Carrinho inválido' });
            return;
        }
        // Registra a transação
        await (0, db_1.dbRun)(`INSERT INTO transactions (seller, team, buyerName, buyerPhone, total, date, cart) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [req.user.username, team, buyerName || '', buyerPhone || '', total, new Date().toISOString(), JSON.stringify(cart)]);
        // Atualiza saldo da equipe (se foi fiado)
        if (team !== 'Dinheiro' && team !== 'Pix') {
            const existingTeam = await (0, db_1.dbGet)('SELECT * FROM teams WHERE name = ?', [team]);
            if (existingTeam) {
                await (0, db_1.dbRun)('UPDATE teams SET balance = balance + ? WHERE id = ?', [total, existingTeam.id]);
            }
            else {
                await (0, db_1.dbRun)('INSERT INTO teams (name, balance) VALUES (?, ?)', [team, total]);
            }
        }
        res.json({ message: 'Venda registrada com sucesso!' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao registrar venda' });
    }
});
// 4. ROTA DE RELATÓRIOS/TRANSAÇÕES (Protegida)
app.get('/api/transactions', authenticateToken, async (req, res) => {
    try {
        const transactions = await (0, db_1.dbAll)('SELECT * FROM transactions ORDER BY id DESC');
        // Faz o parse do cart que está como string JSON no SQLite
        const parsed = transactions.map(t => ({
            ...t,
            cart: JSON.parse(t.cart)
        }));
        res.json(parsed);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar transações' });
    }
});
// ==========================================
// ARQUIVOS ESTÁTICOS (Frontend Fullstack)
// ==========================================
// Servir a pasta dist do frontend
const frontendPath = path_1.default.join(__dirname, '../../frontend/dist');
app.use(express_1.default.static(frontendPath));
// Qualquer rota que não seja /api, entrega o index.html do React
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(frontendPath, 'index.html'));
});
// ==========================================
// INICIALIZAÇÃO
// ==========================================
const startServer = async () => {
    try {
        await (0, db_1.initDb)();
        // Cria admin se não existir
        const admin = await (0, db_1.dbGet)('SELECT * FROM users WHERE username = ?', ['admin']);
        if (!admin) {
            const hash = bcrypt_1.default.hashSync('admin123', 10);
            await (0, db_1.dbRun)('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hash, 'admin']);
            console.log('Usuário admin criado!');
        }
        app.listen(PORT, () => {
            console.log(`Backend rodando em http://localhost:${PORT}`);
        });
    }
    catch (err) {
        console.error('Falha ao inicializar o banco de dados:', err);
    }
};
startServer();
//# sourceMappingURL=index.js.map