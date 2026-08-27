import React, { useState, useEffect } from 'react';
import './App.css';

// Tipos
type Product = { id: number, name: string, price: number, stock: number, imageUrl?: string };
type Customer = { id: number, name: string, phone: string, team: string };
type CartItem = Product & { quantity: number };
type Team = { id: number, name: string, balance: number };
type Transaction = { id: number, seller: string, team: string, buyerName: string, buyerPhone: string, total: number, date: string, cart: CartItem[] };

// Gerador de Payload PIX (BR Code)
function generatePixPayload(pixKey: string, amount: number, merchantName = 'Retiro', merchantCity = 'Cidade') {
  const amountStr = amount.toFixed(2);
  const payloadFormat = '000201';
  
  const gui = '0014br.gov.bcb.pix';
  const key = `01${pixKey.length.toString().padStart(2, '0')}${pixKey}`;
  const merchantAccountInfo = `26${(gui.length + key.length).toString().padStart(2, '0')}${gui}${key}`;
  
  const mcc = '52040000';
  const currency = '5303986';
  const amountField = `54${amountStr.length.toString().padStart(2, '0')}${amountStr}`;
  const country = '5802BR';
  
  merchantName = merchantName.substring(0, 25).replace(/[^a-zA-Z0-9 ]/g, '');
  merchantCity = merchantCity.substring(0, 15).replace(/[^a-zA-Z0-9 ]/g, '');
  
  const nameField = `59${merchantName.length.toString().padStart(2, '0')}${merchantName}`;
  const cityField = `60${merchantCity.length.toString().padStart(2, '0')}${merchantCity}`;
  
  const txid = '0503***';
  const additionalData = `62${txid.length.toString().padStart(2, '0')}${txid}`;
  
  let payload = payloadFormat + merchantAccountInfo + mcc + currency + amountField + country + nameField + cityField + additionalData + '6304';
  
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
          if ((crc & 0x8000) > 0) {
              crc = (crc << 1) ^ 0x1021;
          } else {
              crc = crc << 1;
          }
      }
  }
  return payload + (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [role, setRole] = useState(() => localStorage.getItem('role') || '');
  
  // Abas (catalog | reports | settings | manage_products | manage_customers)
  const [activeTab, setActiveTab] = useState<'catalog' | 'reports' | 'settings' | 'manage_products' | 'manage_customers'>('catalog');

  // Configurações
  const [pixKey, setPixKey] = useState(() => localStorage.getItem('pixKey') || '');

  // Dados do BD
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Carrinho e Venda
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerPhone, setBuyerPhone] = useState<string>('');
  const [searchPhone, setSearchPhone] = useState<string>('');

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductImage, setNewProductImage] = useState('');

  const handleSaveProduct = async () => {
    const token = localStorage.getItem('token');
    const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
    const method = editingProduct ? 'PUT' : 'POST';
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: newProductName, price: Number(newProductPrice), stock: 100, imageUrl: newProductImage })
    });
    setEditingProduct(null);
    setNewProductName('');
    setNewProductPrice('');
    setNewProductImage('');
    fetchData();
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('Excluir este produto?')) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchData();
  };

  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerTeam, setNewCustomerTeam] = useState('');

  const handleSaveCustomer = async () => {
    const token = localStorage.getItem('token');
    const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers';
    const method = editingCustomer ? 'PUT' : 'POST';
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: newCustomerName, phone: newCustomerPhone, team: newCustomerTeam })
    });
    setEditingCustomer(null);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerTeam('');
    fetchData();
  };

  const handleDeleteCustomer = async (id: number) => {
    if (!confirm('Excluir esta pessoa?')) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/customers/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchData();
  };

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

      // Busca clientes
      const custRes = await fetch('/api/customers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (custRes.ok) {
        setCustomers(await custRes.json());
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
        localStorage.setItem('role', data.role);
        setRole(data.role);
        setIsLoggedIn(true);
        fetchData();
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

    let finalTeam = selectedTeam;
    if (selectedTeam.startsWith('customer_')) {
      const cId = parseInt(selectedTeam.split('_')[1]);
      const c = customers.find(x => x.id === cId);
      if (c) finalTeam = c.team;
    }

    const token = localStorage.getItem('token');
    fetch('/api/checkout', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({
        team: finalTeam,
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
          <p style={{fontSize: '0.85rem', color: '#999', marginBottom: '1rem'}}>
            Admin: <code>admin</code> / <code>admin123</code><br/>
            Caixa: <code>caixa</code> / <code>caixa123</code>
          </p>
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
          {role === 'admin' && (
            <>
              <button 
                className={`nav-btn ${activeTab === 'manage_products' ? 'active' : ''}`}
                onClick={() => setActiveTab('manage_products')}
              >
                📦 Produtos
              </button>
              <button 
                className={`nav-btn ${activeTab === 'manage_customers' ? 'active' : ''}`}
                onClick={() => setActiveTab('manage_customers')}
              >
                👥 Pessoas
              </button>
              <button 
                className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                ⚙️ Configurações
              </button>
            </>
          )}
          <button onClick={() => {
            setIsLoggedIn(false);
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            setRole('');
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
                    <div className="product-image">
                      {product.imageUrl ? <img src={product.imageUrl} alt={product.name} style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px'}} /> : '📦'}
                    </div>
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
                  onChange={(e) => {
                    setSelectedTeam(e.target.value);
                    if (e.target.value.startsWith('customer_')) {
                      const cId = parseInt(e.target.value.split('_')[1]);
                      const c = customers.find(x => x.id === cId);
                      if (c) {
                        setBuyerName(c.name);
                        setBuyerPhone(c.phone);
                      }
                    } else {
                      setBuyerName('');
                      setBuyerPhone('');
                    }
                  }}
                  style={{marginBottom: '1rem'}}
                >
                  <option value="">-- Forma de Pagamento --</option>
                  <option value="Dinheiro">💵 Pagamento em Dinheiro</option>
                  <option value="Pix">💠 Pagamento via PIX</option>
                  
                  {customers.length > 0 && (
                    <optgroup label="Pessoas Cadastradas (Fiado)">
                      {customers.map(c => (
                        <option key={c.id} value={`customer_${c.id}`}>{c.name} - {c.team}</option>
                      ))}
                    </optgroup>
                  )}

                  <optgroup label="Lançar Fiado (Pessoa Nova)">
                    {teams.map(t => (
                      <option key={t.id} value={t.name}>{t.name} (Digitar Nome)</option>
                    ))}
                  </optgroup>
                </select>

                {selectedTeam === 'Pix' && (
                  <div className="pix-info-box" style={{textAlign: 'center'}}>
                    <strong>Pagamento via PIX</strong>
                    {pixKey ? (
                      <>
                        <div style={{margin: '1rem 0'}}>
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generatePixPayload(pixKey, total))}`} 
                            alt="QR Code PIX" 
                            style={{borderRadius: '8px', border: '4px solid white'}}
                          />
                        </div>
                        <div className="pix-key-display" style={{fontSize: '0.9rem'}}>
                          Chave: {pixKey}
                        </div>
                        <p style={{fontSize: '0.8rem', color: '#ccc', marginTop: '0.5rem'}}>
                          O valor de <strong>R$ {total.toFixed(2).replace('.', ',')}</strong> já está embutido no QR Code.
                        </p>
                      </>
                    ) : (
                      <div className="pix-key-display">
                        Nenhuma chave cadastrada! Vá em ⚙️ Configurações.
                      </div>
                    )}
                  </div>
                )}

                {selectedTeam && selectedTeam !== 'Dinheiro' && selectedTeam !== 'Pix' && !selectedTeam.startsWith('customer_') && (
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

      {activeTab === 'manage_products' && (
        <div className="reports-container">
          <h2>📦 Gerenciar Produtos</h2>
          <div className="settings-card">
            <h3>{editingProduct ? 'Editar Produto' : 'Adicionar Novo Produto'}</h3>
            <div className="settings-field">
              <label>Nome do Produto:</label>
              <input type="text" value={newProductName} onChange={e => setNewProductName(e.target.value)} className="buyer-input" placeholder="Ex: Fandangos" />
            </div>
            <div className="settings-field" style={{marginTop: '1rem'}}>
              <label>Preço (R$):</label>
              <input type="number" step="0.01" value={newProductPrice} onChange={e => setNewProductPrice(e.target.value)} className="buyer-input" placeholder="Ex: 5.50" />
            </div>
            <div className="settings-field" style={{marginTop: '1rem'}}>
              <label>Link da Imagem (URL da foto do Google):</label>
              <input type="text" value={newProductImage} onChange={e => setNewProductImage(e.target.value)} className="buyer-input" placeholder="Ex: https://..." />
            </div>
            <div style={{marginTop: '1rem', display: 'flex', gap: '1rem'}}>
              <button onClick={handleSaveProduct} className="checkout-btn" style={{width: 'auto', padding: '0.5rem 2rem'}}>Salvar</button>
              {editingProduct && <button onClick={() => { setEditingProduct(null); setNewProductName(''); setNewProductPrice(''); setNewProductImage(''); }} className="logout-btn" style={{padding: '0.5rem 1rem', border: 'none', background: '#444'}}>Cancelar</button>}
            </div>
          </div>

          <div className="transactions-list" style={{marginTop: '2rem'}}>
            {products.map(p => (
              <div key={p.id} className="transaction-card" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                  <div style={{width: '50px', height: '50px', background: '#333', borderRadius: '8px', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                    {p.imageUrl ? <img src={p.imageUrl} style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : '📦'}
                  </div>
                  <div>
                    <strong>{p.name}</strong><br/>
                    <span style={{color: '#a78bfa'}}>R$ {p.price.toFixed(2)}</span>
                  </div>
                </div>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <button onClick={() => { setEditingProduct(p); setNewProductName(p.name); setNewProductPrice(p.price.toString()); setNewProductImage(p.imageUrl || ''); }} style={{background: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer'}}>Editar</button>
                  <button onClick={() => handleDeleteProduct(p.id)} style={{background: '#ef4444', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer'}}>Deletar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'manage_customers' && (
        <div className="reports-container">
          <h2>👥 Gerenciar Pessoas</h2>
          <div className="settings-card">
            <h3>{editingCustomer ? 'Editar Pessoa' : 'Cadastrar Nova Pessoa'}</h3>
            <div className="settings-field">
              <label>Nome Completo:</label>
              <input type="text" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} className="buyer-input" placeholder="Ex: João Silva" />
            </div>
            <div className="settings-field" style={{marginTop: '1rem'}}>
              <label>Celular (WhatsApp):</label>
              <input type="text" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} className="buyer-input" placeholder="Ex: (27) 99999-9999" />
            </div>
            <div className="settings-field" style={{marginTop: '1rem'}}>
              <label>Equipe (Obrigatório):</label>
              <select value={newCustomerTeam} onChange={e => setNewCustomerTeam(e.target.value)} className="buyer-input">
                <option value="">-- Selecione a Equipe --</option>
                {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div style={{marginTop: '1rem', display: 'flex', gap: '1rem'}}>
              <button onClick={handleSaveCustomer} className="checkout-btn" style={{width: 'auto', padding: '0.5rem 2rem'}} disabled={!newCustomerName || !newCustomerTeam}>Salvar</button>
              {editingCustomer && <button onClick={() => { setEditingCustomer(null); setNewCustomerName(''); setNewCustomerPhone(''); setNewCustomerTeam(''); }} className="logout-btn" style={{padding: '0.5rem 1rem', border: 'none', background: '#444'}}>Cancelar</button>}
            </div>
          </div>

          <div className="transactions-list" style={{marginTop: '2rem'}}>
            {customers.map(c => (
              <div key={c.id} className="transaction-card" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <strong>{c.name}</strong> <span style={{color: '#a78bfa'}}>({c.team})</span><br/>
                  <span style={{fontSize: '0.9rem', color: '#999'}}>{c.phone || 'Sem número'}</span>
                </div>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                  <button onClick={() => { setEditingCustomer(c); setNewCustomerName(c.name); setNewCustomerPhone(c.phone); setNewCustomerTeam(c.team); }} style={{background: '#3b82f6', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer'}}>Editar</button>
                  <button onClick={() => handleDeleteCustomer(c.id)} style={{background: '#ef4444', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer'}}>Deletar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
