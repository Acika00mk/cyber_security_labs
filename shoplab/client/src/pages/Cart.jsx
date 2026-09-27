import { useState } from 'react';
import { api } from '../api.js';
import {
  MAX_QUANTITY, buildOrder, cartTotal, formatPrice, isValidQuantity, lineTotal, removeFromCart, setQuantity,
} from '../cart.js';

export default function Cart({ cart, onCartChange, user }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const allValid = cart.every((line) => isValidQuantity(line.quantity));

  async function placeOrder() {
    setError('');
    setBusy(true);
    try {
      const result = await api.placeOrder(buildOrder(cart));
      onCartChange([]);
      setMessage(`Order #${result.orderId} placed – total ${formatPrice(result.total)}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (cart.length === 0) {
    return (
      <section>
        <h1>Cart</h1>
        {message ? <p className="success">{message}</p> : <p className="muted">Your cart is empty.</p>}
      </section>
    );
  }

  return (
    <section>
      <h1>Cart</h1>
      <table className="card table">
        <thead>
          <tr><th>Product</th><th>Price</th><th>Quantity</th><th>Subtotal</th><th /></tr>
        </thead>
        <tbody>
          {cart.map((line) => (
            <tr key={line.productId}>
              <td>{line.name}</td>
              <td>{formatPrice(line.price)}</td>
              <td>
                <input
                  type="number" min="1" max={MAX_QUANTITY} value={line.quantity}
                  onChange={(e) => onCartChange(setQuantity(cart, line.productId, Number(e.target.value)))}
                />
                {!isValidQuantity(line.quantity) && <div className="error">Quantity must be 1–{MAX_QUANTITY}</div>}
              </td>
              <td>{formatPrice(lineTotal(line))}</td>
              <td><button className="link" onClick={() => onCartChange(removeFromCart(cart, line.productId))}>Remove</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="checkout">
        <p className="total">Total: {formatPrice(cartTotal(cart))}</p>
        {error && <p className="error">{error}</p>}
        {user ? (
          <button onClick={placeOrder} disabled={!allValid || busy}>Place order</button>
        ) : (
          <a href="#/login">Log in to place an order</a>
        )}
        <p className="muted small">Demo checkout, no real payment.</p>
      </div>
    </section>
  );
}
