import React, { useState, useEffect } from 'react';
import './App.css';

// Tipos
type Product = { id: number, name: string, price: number, stock: number };
type CartItem = Product & { quantity: number };
type Team = { id: number, name: string, balance: number };
type Transaction = { id: number, seller: string, team: string, buyerName: string, buyerPhone: string, total: number, date: string, cart: CartItem[] };

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // Abas (catalog | reports | settings)
  const [activeTab, setActiveTab] = useState<'catalog' | 'reports' | 'settings'>('catalog');

  // Configurações
  const [pixKey, setPixKey] = useState(() => localStorage.getItem('pixKey') || '');

  // Dados do BD
  const [products, setProducts] = useState<Product[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Carrinho e Venda
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerPhone, setBuyerPhone] = useState<string>('');
  const [searchPhone, setSearchPhone] = useState<string>('');

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      // Busca produtos
      const prodRes = await fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData);
      } else {
        setIsLoggedIn(false);
        localStorage.removeItem('token');
      }
      
      // Busca equipes (estáticas por enquanto)
      setTeams([
        { id: 1, name: 'Troca Roxa', balance: 0 },
        { id: 2, name: 'Troca Amarela', balance: 0 },
        { id: 3, name: 'Troca Verde', balance: 0 }
      ]);
    } catch (err) {
      console.error('Falha ao carregar dados', err);
    }
  };

  const fetchTransactions = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/transactions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch(err) {
      console.error('Falha ao carregar relatórios', err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
      fetchTransactions();
    }
  }, [isLoggedIn, activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        setIsLoggedIn(true);
      } else {
        const errData = await response.json();
        setError(errData.error || 'Credenciais inválidas');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert("O carrinho está vazio!");
      return;
    }
    if (!selectedTeam) {
      alert("Por favor, selecione uma equipe ou a forma de pagamento (Dinheiro/PIX).");
      return;
    }
    if (selectedTeam !== 'Dinheiro' && selectedTeam !== 'Pix' && (!buyerName.trim() || !buyerPhone.trim())) {
      alert("Para venda fiado, por favor digite o NOME e o CELULAR do comprador.");
      return;
    }

    const token = localStorage.getItem('token');
    fetch('/api/checkout', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({
        team: selectedTeam,
        buyerName,
        buyerPhone,
        cart,
        total
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        alert("Erro: " + data.error);
      } else {
        alert(`Sucesso! Compra de R$ ${total.toFixed(2)} registrada!`);
        setCart([]);
        setSelectedTeam('');
        setBuyerName('');
        setBuyerPhone('');
      }
    })
    .catch(() => alert('Erro de conexão com o servidor'));
  };

  const sendWhatsApp = (t: Transaction) => {
    if (!t.buyerPhone) return;
    
    // Limpa o número para deixar só os dígitos
    const cleanPhone = t.buyerPhone.replace(/\D/g, '');
    const phoneWithCode = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;

    let message = `Olá *${t.buyerName}*, aqui está o resumo da sua compra na conta da equipe *${t.team}* no Retiro:\n\n`;
    
    t.cart.forEach(item => {
      message += `▪ ${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}\n`;
    });

    message += `\n*Total da Compra: R$ ${t.total.toFixed(2).replace('.', ',')}*\n\nDeus abençoe! 🙏`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phoneWithCode}?text=${encodedMessage}`, '_blank');
  };

  // Filtragem de transações por telefone ou nome
  const filteredTransactions = transactions.filter(t => {
    const phone = t.buyerPhone || '';
    const name = t.buyerName || '';
    const team = t.team || '';
    const search = searchPhone.toLowerCase();
    
    return phone.includes(search) || 
           name.toLowerCase().includes(search) ||
           team.toLowerCase().includes(search);
  });

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>RetiroPay</h1>
          <p>Faça login para continuar</p>
          {error && <p style={{color: '#ef4444', marginBottom: '1rem'}}>{error}</p>}
          <form onSubmit={handleLogin}>
            <input 
              type="text" 
              placeholder="Usuário" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input 
              type="password" 
              placeholder="Senha" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>RetiroPay</h1>
        <div className="header-nav">
          <button 
            className={`nav-btn ${activeTab === 'catalog' ? 'active' : ''}`}
            onClick={() => setActiveTab('catalog')}
          >
            🛒 Catálogo
          </button>
          <button 
            className={`nav-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            📊 Relatórios
          </button>
          <button 
            className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Configurações
          </button>
          <button onClick={() => {
            setIsLoggedIn(false);
            localStorage.removeItem('token');
          }} className="logout-btn">Sair</button>
        </div>
      </header>
      
      {activeTab === 'catalog' && (
        <div className="dashboard">
          <main className="catalog">
            <h2>Catálogo de Produtos</h2>
            <div className="products-grid">
              {products.length === 0 ? (
                <p>Carregando produtos...</p>
              ) : (
                products.map(product => (
                  <div key={product.id} className="product-card">
                    <div className="product-image">📦</div>
                    <h3>{product.name}</h3>
                    <p className="price">R$ {product.price.toFixed(2).replace('.', ',')}</p>
                    <button onClick={() => addToCart(product)}>+ Adicionar</button>
                  </div>
                ))
              )}
            </div>
          </main>

          <aside className="cart-sidebar">
            <h2>Pedido Atual</h2>
            
            <div className="cart-items">
              {cart.length === 0 ? (
                <p className="empty-cart">Seu carrinho está vazio.</p>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="cart-item">
                    <div className="item-info">
                      <span className="item-name">{item.name}</span>
                      <span className="item-price">{item.quantity}x R$ {item.price.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="remove-btn">❌</button>
                  </div>
                ))
              )}
            </div>

            <div className="cart-footer">
              <div className="total">
                <span>Total:</span>
                <span>R$ {total.toFixed(2).replace('.', ',')}</span>
              </div>
              
              <div className="team-selector">
                <label>Lançar na conta (Fiado):</label>
                <select 
                  value={selectedTeam} 
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  style={{marginBottom: '1rem'}}
                >
                  <option value="">-- Forma de Pagamento --</option>
                  <option value="Dinheiro">💵 Pagamento em Dinheiro</option>
                  <option value="Pix">💠 Pagamento via PIX</option>
                  <optgroup label="Lançar Fiado (Equipes)">
                    {teams.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </optgroup>
                </select>

                {selectedTeam === 'Pix' && (
                  <div className="pix-info-box">
                    <strong>Chave PIX da Igreja/Retiro:</strong>
                    <div className="pix-key-display">
                      {pixKey ? pixKey : 'Nenhuma chave cadastrada! Vá em ⚙️ Configurações.'}
                    </div>
                  </div>
                )}

                {selectedTeam && selectedTeam !== 'Dinheiro' && selectedTeam !== 'Pix' && (
                  <div className="buyer-info-box">
                    <label>Nome da Pessoa:</label>
                    <input 
                      type="text" 
                      placeholder="Nome do Comprador" 
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="buyer-input"
                    />
                    <label style={{marginTop: '0.8rem'}}>Celular (WhatsApp):</label>
                    <input 
                      type="text" 
                      placeholder="(DD) 90000-0000" 
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      className="buyer-input"
                    />
                  </div>
                )}
              </div>

              <button onClick={handleCheckout} className="checkout-btn" disabled={cart.length === 0}>
                Finalizar Venda
              </button>
            </div>
          </aside>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="reports-container">
          <h2>Relatórios e Fiados</h2>
          
          <div className="search-bar">
            <input 
              type="text" 
              placeholder="Pesquisar por celular, nome ou equipe..." 
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
            />
            <button className="search-btn">Buscar</button>
          </div>

          <div className="transactions-list">
            {filteredTransactions.length === 0 ? (
              <p className="empty-cart" style={{marginTop: '2rem'}}>Nenhuma transação encontrada.</p>
            ) : (
              filteredTransactions.map(t => (
                <div key={t.id} className="transaction-card">
                  <div className="t-header">
                    <span className="t-team">{t.team}</span>
                    <span className="t-date">{new Date(t.date).toLocaleString()}</span>
                  </div>
                  <div className="t-buyer">
                    <strong>Comprador:</strong> {t.buyerName || 'N/A'} {t.buyerPhone ? `(${t.buyerPhone})` : ''}
                  </div>
                  <div className="t-items">
                    {t.cart.map((item, idx) => (
                      <div key={idx} className="t-item-row">
                        <span>{item.quantity}x {item.name}</span>
                        <span>R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}</span>
                      </div>
                    ))}
                  </div>
                  <div className="t-total">
                    <strong>Total: R$ {t.total.toFixed(2).replace('.', ',')}</strong>
                  </div>
                  {t.buyerPhone && (
                    <button 
                      className="whatsapp-btn"
                      onClick={() => sendWhatsApp(t)}
                    >
                      📱 Enviar Recibo no WhatsApp
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="reports-container">
          <h2>Configurações do Sistema</h2>
          
          <div className="settings-card">
            <h3>💠 Cadastro de PIX</h3>
            <p className="settings-desc">
              Esta é a chave PIX que vai aparecer na tela para as pessoas pagarem quando você selecionar "Pagamento via PIX" no caixa.
            </p>
            
            <div className="settings-field">
              <label>Sua Chave PIX (Celular, CPF, CNPJ, Email):</label>
              <input 
                type="text" 
                placeholder="Ex: (00) 90000-0000 ou email@igreja.com" 
                value={pixKey}
                onChange={(e) => {
                  setPixKey(e.target.value);
                  localStorage.setItem('pixKey', e.target.value);
                }}
                className="buyer-input"
              />
            </div>
            
            {pixKey && (
              <div className="success-msg">
                Chave PIX salva com sucesso! Ela já vai aparecer nas vendas.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
