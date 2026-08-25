// State
let products = JSON.parse(localStorage.getItem('retiropay_products')) || [];
let cart = [];
let settings = JSON.parse(localStorage.getItem('retiropay_settings')) || { pix: '' };

// DOM Elements
const tabs = document.querySelectorAll('.tab-btn');
const panes = document.querySelectorAll('.tab-pane');

// Product Management
const posGrid = document.getElementById('pos-product-grid');
const productsList = document.getElementById('products-list');
const btnAddProduct = document.getElementById('btn-add-product');
const modalProduct = document.getElementById('modal-product');
const formProduct = document.getElementById('form-product');

// Settings
const btnSettings = document.getElementById('btn-settings');
const modalSettings = document.getElementById('modal-settings');
const formSettings = document.getElementById('form-settings');
const setPixInput = document.getElementById('set-pix');

// Cart
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalValue = document.getElementById('cart-total-value');
const btnCheckout = document.getElementById('btn-checkout');
const btnClearCart = document.getElementById('btn-clear-cart');

// Checkout
const modalCheckout = document.getElementById('modal-checkout');
const formCheckout = document.getElementById('form-checkout');

// Utils
const formatMoney = (val) => `R$ ${parseFloat(val).toFixed(2).replace('.', ',')}`;
const closeAllModals = () => document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));

// Setup Tabs
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    });
});

// Modal Close logic
document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
});
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if(e.target === modal) closeAllModals();
    });
});

// Load Products
function renderProducts() {
    // POS View
    posGrid.innerHTML = '';
    if (products.length === 0) {
        posGrid.innerHTML = '<p style="color:var(--text-secondary); grid-column: 1/-1; margin-top: 1rem;">Nenhum produto cadastrado. Vá na aba "Produtos" para cadastrar.</p>';
    } else {
        products.forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <div class="product-name">${p.name}</div>
                <div class="product-price">${formatMoney(p.price)}</div>
            `;
            card.addEventListener('click', () => addToCart(p));
            posGrid.appendChild(card);
        });
    }

    // List View (Management)
    productsList.innerHTML = '';
    products.forEach(p => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div>
                <div style="font-weight:600">${p.name}</div>
                <div style="color:var(--text-secondary)">${formatMoney(p.price)}</div>
            </div>
            <div class="list-item-actions">
                <button class="btn-delete" onclick="deleteProduct('${p.id}')" title="Excluir"><i class="ph ph-trash"></i></button>
            </div>
        `;
        productsList.appendChild(item);
    });
}

function saveProducts() {
    localStorage.setItem('retiropay_products', JSON.stringify(products));
    renderProducts();
}

// Product CRUD
btnAddProduct.addEventListener('click', () => {
    formProduct.reset();
    document.getElementById('prod-id').value = '';
    modalProduct.classList.add('active');
});

formProduct.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('prod-id').value || Date.now().toString();
    const name = document.getElementById('prod-name').value;
    const price = parseFloat(document.getElementById('prod-price').value);

    const existingIndex = products.findIndex(p => p.id === id);
    if (existingIndex >= 0) {
        products[existingIndex] = { id, name, price };
    } else {
        products.push({ id, name, price });
    }
    
    saveProducts();
    closeAllModals();
});

window.deleteProduct = (id) => {
    if(confirm('Tem certeza que deseja remover este produto?')) {
        products = products.filter(p => p.id !== id);
        saveProducts();
        
        // Remove from cart if exists
        cart = cart.filter(item => item.id !== id);
        renderCart();
    }
};

// Cart Logic
function renderCart() {
    cartItemsContainer.innerHTML = '';
    let total = 0;
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="color:var(--text-secondary); text-align:center; margin-top:2rem;">O carrinho está vazio</p>';
        btnCheckout.disabled = true;
    } else {
        btnCheckout.disabled = false;
        cart.forEach((item, index) => {
            total += item.price * item.qty;
            const el = document.createElement('div');
            el.className = 'cart-item';
            el.innerHTML = `
                <div class="cart-item-info">
                    <span class="cart-item-name">${item.name}</span>
                    <span class="cart-item-price">${formatMoney(item.price)} x ${item.qty}</span>
                </div>
                <div class="cart-item-actions">
                    <button class="qty-btn" onclick="updateQty(${index}, -1)"><i class="ph ph-minus"></i></button>
                    <span>${item.qty}</span>
                    <button class="qty-btn" onclick="updateQty(${index}, 1)"><i class="ph ph-plus"></i></button>
                </div>
            `;
            cartItemsContainer.appendChild(el);
        });
    }
    
    cartTotalValue.innerText = formatMoney(total);
}

function addToCart(product) {
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    renderCart();
}

window.updateQty = (index, delta) => {
    cart[index].qty += delta;
    if (cart[index].qty <= 0) {
        cart.splice(index, 1);
    }
    renderCart();
}

btnClearCart.addEventListener('click', () => {
    if(cart.length > 0 && confirm('Limpar o carrinho?')) {
        cart = [];
        renderCart();
    }
});

// Settings
btnSettings.addEventListener('click', () => {
    setPixInput.value = settings.pix || '';
    modalSettings.classList.add('active');
});

formSettings.addEventListener('submit', (e) => {
    e.preventDefault();
    settings.pix = setPixInput.value.trim();
    localStorage.setItem('retiropay_settings', JSON.stringify(settings));
    closeAllModals();
});

// Checkout (WhatsApp)
btnCheckout.addEventListener('click', () => {
    document.getElementById('checkout-phone').value = '';
    modalCheckout.classList.add('active');
});

formCheckout.addEventListener('submit', (e) => {
    e.preventDefault();
    const phone = document.getElementById('checkout-phone').value.replace(/\D/g, '');
    
    let message = `*RetiroPay - Resumo do Pedido*\n\n`;
    let total = 0;
    cart.forEach(item => {
        let sub = item.price * item.qty;
        total += sub;
        message += `▪ ${item.qty}x ${item.name} - ${formatMoney(sub)}\n`;
    });
    
    message += `\n*Total a pagar: ${formatMoney(total)}*`;
    
    if (settings.pix) {
        message += `\n\n💳 *Chave PIX para pagamento:*\n${settings.pix}`;
        message += `\n\n_Por favor, envie o comprovante por aqui mesmo._`;
    }
    
    let waUrl = `https://wa.me/`;
    if (phone) {
        // Assume código 55 (Brasil) se não fornecido
        waUrl += phone.startsWith('55') ? phone : \`55\${phone}\`;
    }
    waUrl += `?text=${encodeURIComponent(message)}`;
    
    // Abre a aba do WhatsApp
    window.open(waUrl, '_blank');
    closeAllModals();
    
    // Oferece a opção de limpar o carrinho após enviar a cobrança
    setTimeout(() => {
        if(confirm('Cobrança enviada! Deseja limpar o carrinho para a próxima venda?')) {
            cart = [];
            renderCart();
        }
    }, 500);
});

// Init
renderProducts();
renderCart();
