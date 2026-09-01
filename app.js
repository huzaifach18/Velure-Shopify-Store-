/* ==========================================================================
   VELURE — STORE APPLICATION LOGIC & CHECKOUT CONTROLLER
   ========================================================================== */

// --- Global Store State ---
let cart = [];
let appliedDiscount = null; // { code: 'VELURE10', percent: 10 } or null
let currentShippingCost = 0;
let currentShippingName = 'Standard Express';
let quickViewProduct = null;
let selectedSize = 'M';
let selectedColor = '';
let qvQuantity = 1;

// --- Category-Aware Fallback Images ---
const BACKUP_MEN_IMG = "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=700";
const BACKUP_WOMEN_IMG = "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=700";
const BACKUP_ACC_IMG = "https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&q=80&w=700";

function handleImgError(img, category = 'Men') {
  img.onerror = null; // Prevent infinite loop
  if (category === 'Women') {
    img.src = BACKUP_WOMEN_IMG;
  } else if (category === 'Accessories') {
    img.src = BACKUP_ACC_IMG;
  } else {
    img.src = BACKUP_MEN_IMG;
  }
}

// --- DOM Elements ---
const menProductsGrid = document.getElementById('men-products-grid');
const womenProductsGrid = document.getElementById('women-products-grid');
const accessoriesProductsGrid = document.getElementById('accessories-products-grid');

const cartIcon = document.getElementById('cart-icon');
const cartDrawer = document.getElementById('cart-drawer');
const cartOverlay = document.getElementById('cart-overlay');
const closeCartBtn = document.getElementById('close-cart');
const cartCountElements = [document.getElementById('cart-count'), document.getElementById('cart-drawer-count')];
const cartItemsContainer = document.getElementById('cart-items-container');

const cartSubtotalEl = document.getElementById('cart-subtotal');
const cartDiscountEl = document.getElementById('cart-discount');
const discountLineEl = document.getElementById('discount-line');
const discountCodeNameEl = document.getElementById('discount-code-name');
const cartTotalEl = document.getElementById('cart-total');
const shippingProgressText = document.getElementById('shipping-progress-text');
const shippingProgressFill = document.getElementById('shipping-progress-fill');

const navbar = document.getElementById('navbar');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileNavDrawer = document.getElementById('mobile-nav-drawer');
const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
const closeMobileNavBtn = document.getElementById('close-mobile-nav');

const searchToggleBtn = document.getElementById('search-toggle-btn');
const searchOverlay = document.getElementById('search-overlay');
const closeSearchBtn = document.getElementById('close-search-btn');
const globalSearchInput = document.getElementById('global-search-input');

// Checkout Modal Elements
const checkoutModalOverlay = document.getElementById('checkout-modal-overlay');
const checkoutItemsList = document.getElementById('checkout-items-list');
const checkoutItemCountEl = document.getElementById('checkout-item-count');
const checkoutSubtotalEl = document.getElementById('checkout-subtotal');
const checkoutDiscountRow = document.getElementById('checkout-discount-row');
const checkoutDiscountTag = document.getElementById('checkout-discount-tag');
const checkoutDiscountEl = document.getElementById('checkout-discount');
const checkoutShippingNameEl = document.getElementById('checkout-shipping-name');
const checkoutShippingCostEl = document.getElementById('checkout-shipping-cost');
const checkoutTaxEl = document.getElementById('checkout-tax');
const checkoutGrandTotalEl = document.getElementById('checkout-grand-total');
const checkoutBtnTotalEl = document.getElementById('checkout-btn-total');
const checkoutFormContainer = document.getElementById('checkout-form-container');
const orderSuccessView = document.getElementById('order-success-view');

// Quick View Elements
const quickViewOverlay = document.getElementById('quick-view-overlay');
const qvMainImg = document.getElementById('qv-main-img');
const qvCategory = document.getElementById('qv-category');
const qvTitle = document.getElementById('qv-title');
const qvRatingScore = document.getElementById('qv-rating-score');
const qvPrice = document.getElementById('qv-price');
const qvDesc = document.getElementById('qv-desc');
const qvSizesContainer = document.getElementById('qv-sizes-container');
const qvColorsContainer = document.getElementById('qv-colors-container');
const selectedSizeLabel = document.getElementById('selected-size-label');
const qvQtyEl = document.getElementById('qv-qty');
const qvAddToBagBtn = document.getElementById('qv-add-to-bag-btn');

// Toast Element
const toastNotification = document.getElementById('toast-notification');
const toastMessage = document.getElementById('toast-message');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  renderCategorySections();
  setupEventListeners();
  updateCartUI();
});

// --- Render Dedicated Category Grids ---
function renderCategorySections(filterQuery = '') {
  const q = filterQuery.toLowerCase().trim();

  // Men
  if (menProductsGrid) {
    let menList = products.filter(p => p.category === 'Men');
    if (q) {
      menList = menList.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q) ||
        (p.badge && p.badge.toLowerCase().includes(q))
      );
    }
    menProductsGrid.innerHTML = menList.length > 0
      ? menList.map(p => createProductCardHTML(p)).join('')
      : '<p style="grid-column: 1/-1; text-align: center; color: var(--secondary); padding: 2rem;">No matching items in Men\'s collection.</p>';
  }

  // Women
  if (womenProductsGrid) {
    let womenList = products.filter(p => p.category === 'Women');
    if (q) {
      womenList = womenList.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q) ||
        (p.badge && p.badge.toLowerCase().includes(q))
      );
    }
    womenProductsGrid.innerHTML = womenList.length > 0
      ? womenList.map(p => createProductCardHTML(p)).join('')
      : '<p style="grid-column: 1/-1; text-align: center; color: var(--secondary); padding: 2rem;">No matching items in Women\'s collection.</p>';
  }

  // Accessories
  if (accessoriesProductsGrid) {
    let accList = products.filter(p => p.category === 'Accessories');
    if (q) {
      accList = accList.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.description.toLowerCase().includes(q) ||
        (p.badge && p.badge.toLowerCase().includes(q))
      );
    }
    accessoriesProductsGrid.innerHTML = accList.length > 0
      ? accList.map(p => createProductCardHTML(p)).join('')
      : '<p style="grid-column: 1/-1; text-align: center; color: var(--secondary); padding: 2rem;">No matching items in Accessories.</p>';
  }
}

// --- Product Card Component Generator ---
function createProductCardHTML(product) {
  const badgeHTML = product.badge 
    ? `<span class="product-badge ${product.badge === 'Bestseller' || product.badge === 'Luxury' ? 'gold' : ''}">${product.badge}</span>` 
    : '';

  const sizesText = product.sizes ? product.sizes.join(' • ') : '';

  return `
    <div class="product-card" data-id="${product.id}" onclick="handleCardClick(event, ${product.id})">
      <div class="card-image-box">
        ${badgeHTML}
        <img src="${product.image}" alt="${product.name}" class="main-img" loading="lazy" onerror="handleImgError(this, '${product.category}')">
        <img src="${product.hoverImage}" alt="${product.name} lifestyle" class="hover-img" loading="lazy" onerror="handleImgError(this, '${product.category}')">
        
        <div class="card-quick-actions">
          <button class="quick-view-btn" onclick="event.stopPropagation(); openQuickView(${product.id})">
            <i class="ph ph-eye"></i> Quick View
          </button>
          <button class="card-add-btn" onclick="event.stopPropagation(); quickAddToCart(${product.id})" title="Quick Add">
            <i class="ph ph-shopping-bag"></i>
          </button>
        </div>
      </div>

      <div class="product-content">
        <div class="product-meta-row">
          <span class="product-category-label">${product.category}</span>
          <span class="product-rating"><i class="ph-fill ph-star"></i> ${product.rating.toFixed(1)}</span>
        </div>
        <h3 class="product-title">${product.name}</h3>
        <div class="product-price-row">
          <span class="product-price">$${product.price.toFixed(2)}</span>
          <span class="product-sizes-preview">${sizesText}</span>
        </div>
      </div>
    </div>
  `;
}

function handleCardClick(event, productId) {
  // On mobile/tablet, clicking the card directly opens Quick View
  if (window.innerWidth <= 868) {
    openQuickView(productId);
  }
}

// --- Event Listeners Setup ---
function setupEventListeners() {
  // Sticky Navbar Blur Effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // Mobile Navigation Menu Triggers
  if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openMobileMenu);
  if (closeMobileNavBtn) closeMobileNavBtn.addEventListener('click', closeMobileMenu);
  if (mobileNavOverlay) mobileNavOverlay.addEventListener('click', closeMobileMenu);

  // Cart Drawer Triggers
  if (cartIcon) cartIcon.addEventListener('click', openCart);
  if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

  // Search Overlay Triggers
  if (searchToggleBtn) {
    searchToggleBtn.addEventListener('click', () => {
      searchOverlay.classList.add('active');
      globalSearchInput.focus();
    });
  }
  if (closeSearchBtn) {
    closeSearchBtn.addEventListener('click', () => {
      searchOverlay.classList.remove('active');
    });
  }
  if (globalSearchInput) {
    globalSearchInput.addEventListener('input', (e) => {
      renderCategorySections(e.target.value);
    });
  }
}

// --- Mobile Navigation Controls ---
function openMobileMenu() {
  if (mobileNavDrawer && mobileNavOverlay) {
    mobileNavDrawer.classList.add('active');
    mobileNavOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeMobileMenu() {
  if (mobileNavDrawer && mobileNavOverlay) {
    mobileNavDrawer.classList.remove('active');
    mobileNavOverlay.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}

// --- Navigation Smooth Scrolling Helper ---
function scrollToSection(sectionId) {
  const target = document.getElementById(sectionId);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth' });
    if (searchOverlay) searchOverlay.classList.remove('active');
  }
}

// ==========================================================================
// SHOPPING CART OPERATIONS
// ==========================================================================

function quickAddToCart(productId) {
  const prod = products.find(p => p.id === productId);
  if (!prod) return;
  const defaultSize = prod.sizes ? prod.sizes[0] : 'Standard';
  const defaultColor = prod.colors ? prod.colors[0] : '#111111';
  addToCart(prod, defaultSize, defaultColor, 1);
}

function addToCart(product, size, color, quantity = 1) {
  const existingIndex = cart.findIndex(item => 
    item.id === product.id && item.size === size && item.color === color
  );

  if (existingIndex > -1) {
    cart[existingIndex].quantity += quantity;
  } else {
    cart.push({
      ...product,
      size: size,
      color: color,
      quantity: quantity
    });
  }

  updateCartUI();
  showToast(`Added "${product.name}" (${size}) to your bag!`);
  openCart();
}

function updateCartQuantity(index, change) {
  if (cart[index]) {
    cart[index].quantity += change;
    if (cart[index].quantity <= 0) {
      cart.splice(index, 1);
    }
  }
  updateCartUI();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartUI();
  showToast("Item removed from bag.");
}

function updateCartUI() {
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  // Update badges
  cartCountElements.forEach(el => {
    if (el) {
      if (el.id === 'cart-count') {
        el.textContent = totalCount;
      } else {
        el.textContent = `(${totalCount} items)`;
      }
    }
  });

  // Render items
  if (cartItemsContainer) {
    if (cart.length === 0) {
      cartItemsContainer.innerHTML = `
        <div style="text-align: center; padding: 4rem 1rem; color: var(--secondary);">
          <i class="ph ph-shopping-bag" style="font-size: 3.5rem; opacity: 0.3; margin-bottom: 1rem; display: block;"></i>
          <h3 style="color: var(--primary); font-size: 1.2rem; margin-bottom: 0.5rem;">Your bag is empty</h3>
          <p style="font-size: 0.9rem; margin-bottom: 1.5rem;">Discover our latest arrivals and elevate your wardrobe.</p>
          <button class="btn btn-primary" onclick="closeCart(); scrollToSection('men-section');">Start Shopping</button>
        </div>
      `;
    } else {
      cartItemsContainer.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
          <img src="${item.image}" alt="${item.name}" class="cart-item-img" onerror="handleImgError(this, '${item.category}')">
          <div class="cart-item-details">
            <div class="cart-item-title">${item.name}</div>
            <div class="cart-item-spec">Size: <strong>${item.size}</strong> • <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${item.color}; vertical-align:middle; border:1px solid #ccc;"></span></div>
            <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
            <div class="cart-item-bottom">
              <div class="qty-controls">
                <button class="qty-btn" onclick="updateCartQuantity(${index}, -1)">-</button>
                <span>${item.quantity}</span>
                <button class="qty-btn" onclick="updateCartQuantity(${index}, 1)">+</button>
              </div>
              <button class="remove-item" onclick="removeFromCart(${index})">Remove</button>
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  // Calculate Totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let discountAmount = 0;

  if (appliedDiscount) {
    discountAmount = subtotal * (appliedDiscount.percent / 100);
    if (discountLineEl) discountLineEl.style.display = 'flex';
    if (discountCodeNameEl) discountCodeNameEl.textContent = appliedDiscount.code;
    if (cartDiscountEl) cartDiscountEl.textContent = `-$${discountAmount.toFixed(2)}`;
  } else {
    if (discountLineEl) discountLineEl.style.display = 'none';
  }

  const finalTotal = Math.max(0, subtotal - discountAmount);

  if (cartSubtotalEl) cartSubtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  if (cartTotalEl) cartTotalEl.textContent = `$${finalTotal.toFixed(2)}`;

  // Free shipping progress ($150 goal)
  const shippingThreshold = 150;
  if (shippingProgressFill && shippingProgressText) {
    if (subtotal >= shippingThreshold) {
      shippingProgressFill.style.width = '100%';
      shippingProgressFill.style.background = 'var(--success)';
      shippingProgressText.innerHTML = '🎉 <strong>Congratulations!</strong> You have unlocked FREE Express Shipping!';
    } else {
      const remaining = shippingThreshold - subtotal;
      const percent = Math.min(100, (subtotal / shippingThreshold) * 100);
      shippingProgressFill.style.width = `${percent}%`;
      shippingProgressFill.style.background = 'var(--accent)';
      shippingProgressText.innerHTML = `Add <strong>$${remaining.toFixed(2)}</strong> more for Free Express Shipping!`;
    }
  }
}

function applyPromoCode() {
  const input = document.getElementById('drawer-promo-input');
  const statusMsg = document.getElementById('promo-status-msg');
  if (!input || !statusMsg) return;

  const code = input.value.trim().toUpperCase();

  if (code === 'VELURE10') {
    appliedDiscount = { code: 'VELURE10', percent: 10 };
    statusMsg.className = 'promo-status-msg success';
    statusMsg.textContent = '✓ 10% discount applied to your order!';
    updateCartUI();
  } else if (code === 'VIP20') {
    appliedDiscount = { code: 'VIP20', percent: 20 };
    statusMsg.className = 'promo-status-msg success';
    statusMsg.textContent = '✓ 20% VIP exclusive discount applied!';
    updateCartUI();
  } else {
    statusMsg.className = 'promo-status-msg error';
    statusMsg.textContent = '✕ Invalid promo code. Try VELURE10';
  }
}

function openCart() {
  if (cartDrawer && cartOverlay) {
    cartDrawer.classList.add('active');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeCart() {
  if (cartDrawer && cartOverlay) {
    cartDrawer.classList.remove('active');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}

// ==========================================================================
// FULL CHECKOUT MODAL & ORDER FULFILLMENT
// ==========================================================================

function openCheckout() {
  if (cart.length === 0) {
    showToast('Your bag is currently empty! Add items before checkout.');
    return;
  }
  closeCart();
  if (checkoutModalOverlay) {
    checkoutModalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    updateCheckoutSummary();
  }
}

function closeCheckout() {
  if (checkoutModalOverlay) {
    checkoutModalOverlay.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}

function selectShippingMethod(cost, name) {
  currentShippingCost = cost;
  currentShippingName = name;

  document.querySelectorAll('.shipping-option-card').forEach(card => {
    const radio = card.querySelector('input[type="radio"]');
    if (radio && parseInt(radio.value) === cost) {
      card.classList.add('active');
      radio.checked = true;
    } else {
      card.classList.remove('active');
    }
  });

  updateCheckoutSummary();
}

function setPaymentType(type) {
  document.querySelectorAll('.payment-tab').forEach(tab => {
    const radio = tab.querySelector('input');
    if (radio && radio.value === type) {
      tab.classList.add('active');
      radio.checked = true;
    } else {
      tab.classList.remove('active');
    }
  });

  const cardBox = document.getElementById('card-fields-box');
  const paypalBox = document.getElementById('paypal-box');
  const codBox = document.getElementById('cod-box');

  if (cardBox) cardBox.style.display = type === 'card' ? 'block' : 'none';
  if (paypalBox) paypalBox.style.display = type === 'paypal' ? 'block' : 'none';
  if (codBox) codBox.style.display = type === 'cod' ? 'block' : 'none';
}

function applyCheckoutPromo() {
  const input = document.getElementById('checkout-promo-input');
  const msg = document.getElementById('checkout-promo-msg');
  if (!input || !msg) return;

  const code = input.value.trim().toUpperCase();

  if (code === 'VELURE10') {
    appliedDiscount = { code: 'VELURE10', percent: 10 };
    msg.className = 'checkout-promo-msg success';
    msg.textContent = '✓ 10% discount applied!';
    updateCheckoutSummary();
  } else if (code === 'VIP20') {
    appliedDiscount = { code: 'VIP20', percent: 20 };
    msg.className = 'checkout-promo-msg success';
    msg.textContent = '✓ 20% VIP Atelier discount applied!';
    updateCheckoutSummary();
  } else {
    msg.className = 'checkout-promo-msg error';
    msg.textContent = '✕ Invalid code. Try VELURE10';
  }
}

function updateCheckoutSummary() {
  const count = cart.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);

  if (checkoutItemCountEl) checkoutItemCountEl.textContent = count;

  // Render thumbnails in checkout sidebar
  if (checkoutItemsList) {
    checkoutItemsList.innerHTML = cart.map(item => `
      <div class="checkout-thumb-item">
        <div class="thumb-wrapper">
          <img src="${item.image}" alt="${item.name}" onerror="handleImgError(this, '${item.category}')">
          <span class="thumb-qty-badge">${item.quantity}</span>
        </div>
        <div class="thumb-details">
          <div class="thumb-title">${item.name}</div>
          <div class="thumb-meta">${item.size} • ${item.category}</div>
        </div>
        <div class="thumb-price">$${(item.price * item.quantity).toFixed(2)}</div>
      </div>
    `).join('');
  }

  let discountAmount = 0;
  if (appliedDiscount) {
    discountAmount = subtotal * (appliedDiscount.percent / 100);
    if (checkoutDiscountRow) checkoutDiscountRow.style.display = 'flex';
    if (checkoutDiscountTag) checkoutDiscountTag.textContent = appliedDiscount.code;
    if (checkoutDiscountEl) checkoutDiscountEl.textContent = `-$${discountAmount.toFixed(2)}`;
  } else {
    if (checkoutDiscountRow) checkoutDiscountRow.style.display = 'none';
  }

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const tax = taxableAmount * 0.08; // 8% estimated tax
  const grandTotal = taxableAmount + currentShippingCost + tax;

  if (checkoutSubtotalEl) checkoutSubtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  if (checkoutShippingNameEl) checkoutShippingNameEl.textContent = currentShippingName;
  if (checkoutShippingCostEl) {
    checkoutShippingCostEl.textContent = currentShippingCost === 0 ? 'FREE' : `$${currentShippingCost.toFixed(2)}`;
  }
  if (checkoutTaxEl) checkoutTaxEl.textContent = `$${tax.toFixed(2)}`;
  if (checkoutGrandTotalEl) checkoutGrandTotalEl.textContent = `$${grandTotal.toFixed(2)}`;
  if (checkoutBtnTotalEl) checkoutBtnTotalEl.textContent = `$${grandTotal.toFixed(2)}`;
}

function simulateExpress(service) {
  showToast(`Initiating ${service} Express Checkout...`);
  setTimeout(() => {
    processOrder(service);
  }, 1000);
}

function processOrder(paymentMethod = 'Credit Card') {
  const btn = document.getElementById('place-order-btn');
  const btnText = btn ? btn.querySelector('.btn-text') : null;
  const btnSpinner = btn ? btn.querySelector('.btn-spinner') : null;

  if (btnText && btnSpinner) {
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline-flex';
  }

  // Simulate server order placement
  setTimeout(() => {
    if (btnText && btnSpinner) {
      btnText.style.display = 'inline-block';
      btnSpinner.style.display = 'none';
    }

    const orderId = '#VEL-' + Math.floor(10000 + Math.random() * 90000);
    const fnameInput = document.getElementById('checkout-fname');
    const customerName = fnameInput && fnameInput.value ? fnameInput.value : 'Valued Client';

    if (document.getElementById('success-customer-name')) {
      document.getElementById('success-customer-name').textContent = customerName;
    }
    if (document.getElementById('success-order-id')) {
      document.getElementById('success-order-id').textContent = orderId;
    }

    // Build receipt
    const receiptEl = document.getElementById('order-receipt-summary');
    if (receiptEl) {
      const subtotal = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
      const discount = appliedDiscount ? subtotal * (appliedDiscount.percent / 100) : 0;
      const finalVal = Math.max(0, subtotal - discount) + currentShippingCost + (subtotal * 0.08);

      receiptEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; font-weight:700; margin-bottom: 0.75rem;">
          <span>Items Ordered (${cart.length})</span>
          <span>$${finalVal.toFixed(2)}</span>
        </div>
        <div style="font-size: 0.85rem; color: var(--secondary); margin-bottom: 0.5rem;">
          ${cart.map(item => `• ${item.quantity}x ${item.name} (${item.size})`).join('<br>')}
        </div>
        <div style="font-size: 0.85rem; border-top: 1px solid var(--border); padding-top: 0.5rem; margin-top: 0.5rem;">
          <strong>Shipping Address:</strong> 740 Park Avenue, New York, NY 10021<br>
          <strong>Delivery Service:</strong> ${currentShippingName} (Tracking link sent to email)
        </div>
      `;
    }

    // Switch View
    if (checkoutFormContainer) checkoutFormContainer.style.display = 'none';
    if (orderSuccessView) orderSuccessView.style.display = 'block';

    showToast(`Order ${orderId} confirmed successfully!`);
  }, 1200);
}

function resetCart() {
  cart = [];
  appliedDiscount = null;
  updateCartUI();
  if (checkoutFormContainer) checkoutFormContainer.style.display = 'grid';
  if (orderSuccessView) orderSuccessView.style.display = 'none';
}

// ==========================================================================
// QUICK VIEW MODAL
// ==========================================================================

function openQuickView(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  quickViewProduct = product;
  selectedSize = product.sizes ? product.sizes[0] : 'One Size';
  selectedColor = product.colors ? product.colors[0] : '#111111';
  qvQuantity = 1;

  if (qvMainImg) {
    qvMainImg.src = product.image;
    qvMainImg.alt = product.name;
    qvMainImg.onerror = () => handleImgError(qvMainImg, product.category);
  }
  if (qvCategory) qvCategory.textContent = product.category;
  if (qvTitle) qvTitle.textContent = product.name;
  if (qvRatingScore) qvRatingScore.textContent = product.rating.toFixed(1);
  if (qvPrice) qvPrice.textContent = `$${product.price.toFixed(2)}`;
  if (qvDesc) qvDesc.textContent = product.description;
  if (selectedSizeLabel) selectedSizeLabel.textContent = selectedSize;
  if (qvQtyEl) qvQtyEl.textContent = '1';

  // Render sizes
  if (qvSizesContainer) {
    if (product.sizes && product.sizes.length > 0) {
      qvSizesContainer.innerHTML = product.sizes.map((s, idx) => `
        <button class="size-pill ${idx === 0 ? 'active' : ''}" onclick="selectQvSize('${s}', this)">${s}</button>
      `).join('');
    } else {
      qvSizesContainer.innerHTML = '<span class="size-pill active">One Size</span>';
    }
  }

  // Render colors
  if (qvColorsContainer) {
    if (product.colors && product.colors.length > 0) {
      qvColorsContainer.innerHTML = product.colors.map((c, idx) => `
        <div class="color-swatch ${idx === 0 ? 'active' : ''}" style="background: ${c};" onclick="selectQvColor('${c}', this)"></div>
      `).join('');
    }
  }

  if (qvAddToBagBtn) {
    qvAddToBagBtn.onclick = () => {
      addToCart(quickViewProduct, selectedSize, selectedColor, qvQuantity);
      closeQuickView();
    };
  }

  if (quickViewOverlay) {
    quickViewOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function selectQvSize(size, btnEl) {
  selectedSize = size;
  if (selectedSizeLabel) selectedSizeLabel.textContent = size;
  document.querySelectorAll('#qv-sizes-container .size-pill').forEach(b => b.classList.remove('active'));
  btnEl.classList.add('active');
}

function selectQvColor(color, swatchEl) {
  selectedColor = color;
  document.querySelectorAll('#qv-colors-container .color-swatch').forEach(s => s.classList.remove('active'));
  swatchEl.classList.add('active');
}

function changeQvQty(change) {
  qvQuantity = Math.max(1, qvQuantity + change);
  if (qvQtyEl) qvQtyEl.textContent = qvQuantity;
}

function closeQuickView() {
  if (quickViewOverlay) {
    quickViewOverlay.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
}

// ==========================================================================
// TOAST NOTIFICATIONS
// ==========================================================================
let toastTimeout = null;
function showToast(message) {
  if (!toastNotification || !toastMessage) return;
  toastMessage.textContent = message;
  toastNotification.classList.add('active');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastNotification.classList.remove('active');
  }, 3500);
}
