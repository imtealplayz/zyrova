/* ============================================================
   ZYROVA — Main JavaScript
   Modules: ProductLoader | Pagination | Cart | Wishlist | Search | UI
   ============================================================ */

'use strict';

/* ── Constants ──────────────────────────────────────────────── */
const PRODUCTS_URL      = 'products.json';
const PRODUCTS_PER_PAGE = 10;
const LS_CART          = 'zyrova_cart';
const LS_WISHLIST      = 'zyrova_wishlist';

/* ── State ──────────────────────────────────────────────────── */
const state = {
  allProducts:     [],  // full list from products.json
  filteredProducts: [], // after category/search filter
  currentPage:     1,
  activeCategory:  'All',
  searchQuery:     '',
};

/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */

/** Format a number as currency */
function formatPrice(n) {
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Render star rating SVG */
function renderStars(rating) {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  let html = '<div class="stars">';
  for (let i = 0; i < full;  i++) html += starSVG('full');
  if (half)                        html += starSVG('half');
  for (let i = 0; i < empty; i++) html += starSVG('empty');
  html += '</div>';
  return html;
}
function starSVG(type) {
  const cls = `star-${type}`;
  return `<svg class="${cls}" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 1l2.4 6.8H19l-5.4 4 2 6.6L10 14.4l-5.6 4 2-6.6L1 7.8h6.6z"/>
  </svg>`;
}

/** Show a toast notification */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toast.innerHTML = `<span>${icons[type] || '✓'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/** Update nav badge counts */
function updateBadges() {
  const cart     = getCart();
  const wishlist = getWishlist();
  const cartCount = cart.reduce((acc, i) => acc + i.qty, 0);
  const wishCount = wishlist.length;

  document.querySelectorAll('.cart-badge').forEach(el => {
    el.textContent = cartCount;
    el.style.display = cartCount > 0 ? 'flex' : 'none';
  });
  document.querySelectorAll('.wish-badge').forEach(el => {
    el.textContent = wishCount;
    el.style.display = wishCount > 0 ? 'flex' : 'none';
  });
}

/* ============================================================
   CART MANAGEMENT
   ============================================================ */

function getCart() {
  try { return JSON.parse(localStorage.getItem(LS_CART)) || []; }
  catch { return []; }
}
function saveCart(cart) {
  localStorage.setItem(LS_CART, JSON.stringify(cart));
  updateBadges();
}

/** Add a product to cart or increment quantity */
function addToCart(product, qty = 1) {
  const cart = getCart();
  const idx  = cart.findIndex(i => i.id === product.id);
  if (idx > -1) {
    cart[idx].qty += qty;
  } else {
    cart.push({ ...product, qty });
  }
  saveCart(cart);
  showToast(`"${product.name}" added to cart`, 'success');
  animateBadge('.cart-badge');
}

/** Remove an item from cart by product id */
function removeFromCart(productId) {
  const cart = getCart().filter(i => i.id !== productId);
  saveCart(cart);
}

/** Update quantity of a cart item */
function updateCartQty(productId, delta) {
  const cart = getCart();
  const idx  = cart.findIndex(i => i.id === productId);
  if (idx < 0) return;
  cart[idx].qty = Math.max(1, cart[idx].qty + delta);
  saveCart(cart);
}

/** Get cart total */
function getCartTotal() {
  return getCart().reduce((acc, i) => acc + i.price * i.qty, 0);
}

/* ============================================================
   WISHLIST MANAGEMENT
   ============================================================ */

function getWishlist() {
  try { return JSON.parse(localStorage.getItem(LS_WISHLIST)) || []; }
  catch { return []; }
}
function saveWishlist(list) {
  localStorage.setItem(LS_WISHLIST, JSON.stringify(list));
  updateBadges();
}

function isWishlisted(productId) {
  return getWishlist().some(i => i.id === productId);
}

/** Toggle wishlist for a product */
function toggleWishlist(product) {
  const list = getWishlist();
  const idx  = list.findIndex(i => i.id === product.id);
  if (idx > -1) {
    list.splice(idx, 1);
    saveWishlist(list);
    showToast(`Removed from wishlist`, 'info');
    return false; // removed
  } else {
    list.push(product);
    saveWishlist(list);
    showToast(`"${product.name}" wishlisted`, 'success');
    animateBadge('.wish-badge');
    return true; // added
  }
}

function animateBadge(selector) {
  document.querySelectorAll(selector).forEach(el => {
    el.classList.remove('bump');
    void el.offsetWidth; // reflow
    el.classList.add('bump');
  });
}

/* ============================================================
   PRODUCT LOADING
   ============================================================ */

/** Fetch products.json and store in state */
async function loadProducts() {
  const res  = await fetch(PRODUCTS_URL);
  if (!res.ok) throw new Error('Failed to load products.json');
  return res.json();
}

/** Get unique categories from product list */
function getCategories(products) {
  const cats = [...new Set(products.map(p => p.category))].sort();
  return ['All', ...cats];
}

/* ============================================================
   FILTERING & SEARCH
   ============================================================ */

function applyFilters() {
  const q   = state.searchQuery.toLowerCase().trim();
  const cat = state.activeCategory;
  state.filteredProducts = state.allProducts.filter(p => {
    const matchCat = cat === 'All' || p.category === cat;
    const matchQ   = !q ||
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q);
    return matchCat && matchQ;
  });
  state.currentPage = 1;
}

/* ============================================================
   PAGINATION
   ============================================================ */

function getPageProducts() {
  const start = (state.currentPage - 1) * PRODUCTS_PER_PAGE;
  return state.filteredProducts.slice(start, start + PRODUCTS_PER_PAGE);
}

function getTotalPages() {
  return Math.max(1, Math.ceil(state.filteredProducts.length / PRODUCTS_PER_PAGE));
}

/** Render pagination controls */
function renderPagination(container) {
  if (!container) return;
  const total = getTotalPages();
  const cur   = state.currentPage;

  let html = `
    <button class="page-btn" id="prev-btn" ${cur === 1 ? 'disabled' : ''}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
      Prev
    </button>
    <span class="page-info">Page ${cur} of ${total}</span>
    <button class="page-btn" id="next-btn" ${cur === total ? 'disabled' : ''}>
      Next
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
    </button>
  `;
  container.innerHTML = html;

  container.querySelector('#prev-btn')?.addEventListener('click', () => {
    if (state.currentPage > 1) { state.currentPage--; renderProductSection(); scrollToProducts(); }
  });
  container.querySelector('#next-btn')?.addEventListener('click', () => {
    if (state.currentPage < getTotalPages()) { state.currentPage++; renderProductSection(); scrollToProducts(); }
  });
}

function scrollToProducts() {
  document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ============================================================
   PRODUCT CARD RENDERING
   ============================================================ */

function buildProductCard(product) {
  const wished = isWishlisted(product.id);
  return `
    <div class="product-card" data-id="${product.id}">
      <div class="product-image-wrap">
        <span class="product-category-tag">${product.category}</span>
        <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80'">
        <button class="product-wishlist-btn ${wished ? 'active' : ''}" data-id="${product.id}" title="Wishlist">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${wished ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </button>
      </div>
      <div class="product-info">
        <div class="product-name">${product.name}</div>
        <div class="product-desc">${product.description}</div>
        <div class="product-rating">
          ${renderStars(product.rating)}
          <span class="rating-value">${product.rating}</span>
        </div>
        <div class="product-footer">
          <div class="product-price"><span class="currency">$</span>${product.price.toFixed(2)}</div>
          <button class="add-to-cart-btn" data-id="${product.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <span>Add</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

/* ============================================================
   INDEX PAGE — RENDER
   ============================================================ */

function renderProductSection() {
  const grid       = document.getElementById('products-grid');
  const pagination = document.getElementById('pagination');
  if (!grid) return;

  const products = getPageProducts();

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="no-results" style="grid-column:1/-1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <h3>No products found</h3>
        <p>Try a different search or category.</p>
      </div>`;
  } else {
    grid.innerHTML = products.map(buildProductCard).join('');
    attachCardListeners(grid);
  }
  renderPagination(pagination);
}

function attachCardListeners(grid) {
  // Navigate to product detail on card click
  grid.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('button')) return; // don't navigate if button clicked
      window.location.href = `product.html?id=${card.dataset.id}`;
    });
  });

  // Add to cart
  grid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id      = parseInt(btn.dataset.id);
      const product = state.allProducts.find(p => p.id === id);
      if (product) addToCart(product);
    });
  });

  // Wishlist toggle
  grid.querySelectorAll('.product-wishlist-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id      = parseInt(btn.dataset.id);
      const product = state.allProducts.find(p => p.id === id);
      if (!product) return;
      const added = toggleWishlist(product);
      btn.classList.toggle('active', added);
      const svg = btn.querySelector('svg');
      svg.setAttribute('fill', added ? 'currentColor' : 'none');
    });
  });
}

/** Render category filter buttons */
function renderCategoryBar(container) {
  if (!container) return;
  const cats = getCategories(state.allProducts);
  container.innerHTML = cats.map(cat =>
    `<button class="cat-btn ${cat === state.activeCategory ? 'active' : ''}" data-cat="${cat}">${cat}</button>`
  ).join('');

  container.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeCategory = btn.dataset.cat;
      container.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilters();
      renderProductSection();
    });
  });
}

/* ============================================================
   INDEX PAGE — INIT
   ============================================================ */

async function initIndex() {
  const grid       = document.getElementById('products-grid');
  const catBar     = document.getElementById('category-bar');
  const searchInp  = document.getElementById('search-input');
  const navSearch  = document.getElementById('nav-search-input');
  if (!grid) return;

  // Show loader
  grid.innerHTML = `<div class="loader" style="grid-column:1/-1"><div class="loader-spinner"></div></div>`;

  try {
    state.allProducts      = await loadProducts();
    state.filteredProducts = [...state.allProducts];
    renderCategoryBar(catBar);
    renderProductSection();
  } catch (err) {
    grid.innerHTML = `<p style="color:var(--red);grid-column:1/-1">Error loading products. Make sure products.json is in the same folder and served from a local server.</p>`;
    console.error(err);
  }

  // Search input on page
  if (searchInp) {
    searchInp.addEventListener('input', () => {
      state.searchQuery = searchInp.value;
      if (navSearch) navSearch.value = searchInp.value;
      applyFilters();
      renderProductSection();
    });
  }

  // Nav search
  if (navSearch) {
    navSearch.addEventListener('input', () => {
      state.searchQuery = navSearch.value;
      applyFilters();
      renderProductSection();
      document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
    });
  }
}

/* ============================================================
   PRODUCT DETAIL PAGE — INIT
   ============================================================ */

async function initProductDetail() {
  const container = document.getElementById('product-detail');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const id     = parseInt(params.get('id'));
  if (!id) { container.innerHTML = '<p>Product not found.</p>'; return; }

  container.innerHTML = `<div class="loader"><div class="loader-spinner"></div></div>`;

  try {
    const products = await loadProducts();
    const product  = products.find(p => p.id === id);
    if (!product) { container.innerHTML = '<p>Product not found.</p>'; return; }

    state.allProducts = products; // needed for isWishlisted
    const wished = isWishlisted(product.id);
    let qty = 1;

    container.innerHTML = `
      <button class="back-btn" onclick="history.back()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
        Back
      </button>
      <div class="detail-grid">
        <div class="detail-image-wrap">
          <img src="${product.image}" alt="${product.name}" onerror="this.src='https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80'">
        </div>
        <div class="detail-info">
          <span class="detail-category">${product.category}</span>
          <h1 class="detail-name">${product.name}</h1>
          <div class="detail-rating">
            ${renderStars(product.rating)}
            <span class="detail-rating-text">${product.rating} out of 5</span>
          </div>
          <div class="detail-price">${formatPrice(product.price)}</div>
          <div class="detail-divider"></div>
          <p class="detail-desc">${product.description}</p>

          <label style="font-size:13px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;display:block;margin-bottom:10px;">Quantity</label>
          <div class="qty-control">
            <button class="qty-btn" id="qty-minus">−</button>
            <span class="qty-value" id="qty-val">1</span>
            <button class="qty-btn" id="qty-plus">+</button>
          </div>

          <div class="detail-actions">
            <button class="btn btn-primary btn-lg" id="detail-add-cart">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              Add to Cart
            </button>
            <button class="btn btn-secondary btn-lg" id="detail-wishlist" style="${wished ? 'color:var(--red);border-color:rgba(239,68,68,.3)' : ''}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="${wished ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              ${wished ? 'Wishlisted' : 'Wishlist'}
            </button>
          </div>
        </div>
      </div>
    `;

    // Qty controls
    document.getElementById('qty-minus').addEventListener('click', () => {
      qty = Math.max(1, qty - 1);
      document.getElementById('qty-val').textContent = qty;
    });
    document.getElementById('qty-plus').addEventListener('click', () => {
      qty++;
      document.getElementById('qty-val').textContent = qty;
    });

    // Add to cart
    document.getElementById('detail-add-cart').addEventListener('click', () => {
      addToCart(product, qty);
    });

    // Wishlist
    const wishBtn = document.getElementById('detail-wishlist');
    wishBtn.addEventListener('click', () => {
      const added = toggleWishlist(product);
      const svg   = wishBtn.querySelector('svg');
      svg.setAttribute('fill', added ? 'currentColor' : 'none');
      wishBtn.style.color      = added ? 'var(--red)' : '';
      wishBtn.style.borderColor = added ? 'rgba(239,68,68,.3)' : '';
      wishBtn.innerHTML = wishBtn.innerHTML.replace(/Wishlisted|Wishlist/, added ? 'Wishlisted' : 'Wishlist');
    });

  } catch (err) {
    container.innerHTML = '<p style="color:var(--red)">Error loading product.</p>';
    console.error(err);
  }
}

/* ============================================================
   CART PAGE — INIT
   ============================================================ */

function initCart() {
  const container = document.getElementById('cart-items');
  if (!container) return;
  renderCartPage();
}

function renderCartPage() {
  const container  = document.getElementById('cart-items');
  const summary    = document.getElementById('cart-summary');
  const emptyState = document.getElementById('cart-empty');
  const cart       = getCart();

  if (cart.length === 0) {
    if (container)  container.style.display  = 'none';
    if (summary)    summary.style.display    = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (container)  container.style.display  = 'flex';
  if (summary)    summary.style.display    = 'block';

  // Render cart items
  container.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <img class="cart-item-img" src="${item.image}" alt="${item.name}" onerror="this.src='https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80'">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-category">${item.category}</div>
        <div class="cart-item-qty">
          <button class="cart-qty-btn" data-action="dec" data-id="${item.id}">−</button>
          <span class="cart-qty-val">${item.qty}</span>
          <button class="cart-qty-btn" data-action="inc" data-id="${item.id}">+</button>
        </div>
      </div>
      <div class="cart-item-price">${formatPrice(item.price * item.qty)}</div>
      <button class="cart-remove-btn" data-id="${item.id}" title="Remove">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </button>
    </div>
  `).join('');

  // Qty buttons
  container.querySelectorAll('.cart-qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id    = parseInt(btn.dataset.id);
      const delta = btn.dataset.action === 'inc' ? 1 : -1;
      updateCartQty(id, delta);
      renderCartPage();
    });
  });

  // Remove buttons
  container.querySelectorAll('.cart-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      removeFromCart(parseInt(btn.dataset.id));
      showToast('Item removed', 'info');
      renderCartPage();
    });
  });

  // Summary
  if (summary) {
    const subtotal  = getCartTotal();
    const shipping  = subtotal > 0 ? (subtotal > 500 ? 0 : 9.99) : 0;
    const tax       = subtotal * 0.08;
    const total     = subtotal + shipping + tax;
    summary.innerHTML = `
      <div class="summary-title">Order Summary</div>
      <div class="summary-row"><span>Subtotal (${cart.reduce((a,i)=>a+i.qty,0)} items)</span><span>${formatPrice(subtotal)}</span></div>
      <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? '<span style="color:var(--green)">Free</span>' : formatPrice(shipping)}</span></div>
      <div class="summary-row"><span>Tax (8%)</span><span>${formatPrice(tax)}</span></div>
      <div class="summary-row total"><span>Total</span><span class="val">${formatPrice(total)}</span></div>
      <a href="checkout.html" class="btn btn-primary btn-full btn-lg">Proceed to Checkout</a>
      <a href="index.html" class="btn btn-secondary btn-full" style="margin-top:10px">Continue Shopping</a>
    `;
  }
}

/* ============================================================
   WISHLIST PAGE — INIT
   ============================================================ */

function initWishlist() {
  const grid = document.getElementById('wishlist-grid');
  if (!grid) return;
  renderWishlistPage();
}

function renderWishlistPage() {
  const grid  = document.getElementById('wishlist-grid');
  const empty = document.getElementById('wishlist-empty');
  const list  = getWishlist();

  if (list.length === 0) {
    if (grid)  grid.style.display  = 'none';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';
  if (grid)  grid.style.display  = 'grid';

  // Reuse product card builder (state.allProducts may be empty; use wishlist items directly)
  grid.innerHTML = list.map(product => {
    return `
      <div class="product-card" style="cursor:default">
        <div class="product-image-wrap">
          <span class="product-category-tag">${product.category}</span>
          <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80'">
          <button class="product-wishlist-btn active" data-id="${product.id}" title="Remove from wishlist" style="opacity:1;transform:scale(1)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
        </div>
        <div class="product-info">
          <div class="product-name">${product.name}</div>
          <div class="product-desc">${product.description}</div>
          <div class="product-rating">
            ${renderStars(product.rating)}
            <span class="rating-value">${product.rating}</span>
          </div>
          <div class="product-footer">
            <div class="product-price"><span class="currency">$</span>${product.price.toFixed(2)}</div>
            <button class="add-to-cart-btn" data-id="${product.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Wishlist remove buttons
  grid.querySelectorAll('.product-wishlist-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id      = parseInt(btn.dataset.id);
      const product = list.find(p => p.id === id);
      if (product) { toggleWishlist(product); renderWishlistPage(); }
    });
  });

  // Add to cart buttons
  grid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id      = parseInt(btn.dataset.id);
      const product = list.find(p => p.id === id);
      if (product) addToCart(product);
    });
  });

  // Navigate to product on card click
  grid.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('button')) return;
      const id = card.querySelector('.product-wishlist-btn')?.dataset.id;
      if (id) window.location.href = `product.html?id=${id}`;
    });
    card.style.cursor = 'pointer';
  });
}

/* ============================================================
   CHECKOUT PAGE — INIT
   ============================================================ */

function initCheckout() {
  const orderEl = document.getElementById('checkout-order');
  if (!orderEl) return;

  const cart = getCart();
  if (cart.length === 0) {
    orderEl.innerHTML = '<p style="color:var(--text-muted)">Your cart is empty. <a href="index.html" style="color:var(--blue)">Shop now →</a></p>';
    return;
  }

  const subtotal = getCartTotal();
  const shipping = subtotal > 500 ? 0 : 9.99;
  const tax      = subtotal * 0.08;
  const total    = subtotal + shipping + tax;

  orderEl.innerHTML = `
    <div class="checkout-items">
      ${cart.map(item => `
        <div class="checkout-item">
          <img src="${item.image}" alt="${item.name}" onerror="this.src='https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&q=80'">
          <div class="checkout-item-info">
            <div class="checkout-item-name">${item.name}</div>
            <div class="checkout-item-qty">Qty: ${item.qty}</div>
          </div>
          <div class="checkout-item-price">${formatPrice(item.price * item.qty)}</div>
        </div>
      `).join('')}
    </div>
    <div class="detail-divider"></div>
    <div class="summary-row"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
    <div class="summary-row"><span>Shipping</span><span>${shipping === 0 ? '<span style="color:var(--green)">Free</span>' : formatPrice(shipping)}</span></div>
    <div class="summary-row"><span>Tax (8%)</span><span>${formatPrice(tax)}</span></div>
    <div class="summary-row total" style="font-size:16px;margin-top:12px;padding-top:12px">
      <span>Total</span><span class="val" style="font-size:20px">${formatPrice(total)}</span>
    </div>
  `;

  // Place order
  document.getElementById('place-order-btn')?.addEventListener('click', () => {
    const form = document.getElementById('checkout-form');
    // Basic validation
    const inputs = form.querySelectorAll('input[required], select[required]');
    let valid = true;
    inputs.forEach(inp => {
      if (!inp.value.trim()) { inp.style.borderColor = 'var(--red)'; valid = false; }
      else inp.style.borderColor = '';
    });
    if (!valid) { showToast('Please fill in all required fields', 'error'); return; }

    // Clear cart and show success
    saveCart([]);
    showSuccessModal();
  });
}

function showSuccessModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
      <h2>Order Placed!</h2>
      <p>Thank you for your purchase. Your order is confirmed and will be shipped within 2–3 business days.</p>
      <a href="index.html" class="btn btn-primary btn-full btn-lg">Continue Shopping</a>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

/* ============================================================
   SHARED — NAVBAR
   ============================================================ */

function initNavbar() {
  // Scroll effect
  window.addEventListener('scroll', () => {
    const nav = document.querySelector('.navbar');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });

  // Badge counts
  updateBadges();
}

/* ============================================================
   ROUTER — detect page and init
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();

  const path = window.location.pathname.toLowerCase();
  const page = path.split('/').pop().replace('.html', '') || 'index';

  if (page === '' || page === 'index') initIndex();
  else if (page === 'product')         initProductDetail();
  else if (page === 'cart')            initCart();
  else if (page === 'wishlist')        initWishlist();
  else if (page === 'checkout')        initCheckout();
});