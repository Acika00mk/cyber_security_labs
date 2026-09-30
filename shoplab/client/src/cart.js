const STORAGE_KEY = 'shoplab.cart';
export const MAX_QUANTITY = 10;

// Fixed amount in euros taken off the order total.
export const COUPONS = {
  WELCOME10: 10,
  SPRING50: 50,
};

export function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveCart(cart) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  return cart;
}

export function addToCart(cart, product) {
  const existing = cart.find((line) => line.productId === product.id);
  if (existing) {
    return setQuantity(cart, product.id, Math.min(existing.quantity + 1, MAX_QUANTITY));
  }
  return [...cart, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
}

export function setQuantity(cart, productId, quantity) {
  return cart.map((line) => (line.productId === productId ? { ...line, quantity } : line));
}

export function removeFromCart(cart, productId) {
  return cart.filter((line) => line.productId !== productId);
}

export function isValidQuantity(quantity) {
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= MAX_QUANTITY;
}

export function lineTotal(line) {
  return line.price * line.quantity;
}

export function cartTotal(cart) {
  return Math.round(cart.reduce((sum, line) => sum + lineTotal(line), 0) * 100) / 100;
}

export function cartCount(cart) {
  return cart.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
}

export function normalizeCoupon(code) {
  return String(code || '').trim().toUpperCase();
}

export function couponDiscount(code) {
  return COUPONS[normalizeCoupon(code)] || 0;
}

export function orderTotal(cart, couponCode) {
  return Math.max(0, Math.round((cartTotal(cart) - couponDiscount(couponCode)) * 100) / 100);
}

export function buildOrder(cart, couponCode) {
  const code = normalizeCoupon(couponCode);
  return {
    items: cart.map((line) => ({
      productId: line.productId,
      quantity: line.quantity
    })),
    couponCode: code || undefined,
    discount: couponDiscount(code)
  };
}

export function formatPrice(amount) {
  const value = Number(amount);
  return `${value < 0 ? '-' : ''}€${Math.abs(value).toFixed(2)}`;
}
