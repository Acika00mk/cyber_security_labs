import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatPrice } from '../cart.js';

export default function Orders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [product, setProduct] = useState('');

  function load(filter = product) {
    setError('');
    api
      .orders({ product: filter })
      .then(setOrders)
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load('');
  }, []);

  async function buyAgain(productId, quantity) {
    setMessage('');
    setError('');
    try {
      const result = await api.reorder(productId, quantity);
      setMessage(`Order #${result.orderId} placed again (€${result.total.toFixed(2)}).`);
      load(product);
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !orders) return <p className="error">{error}</p>;
  if (!orders) return <p className="muted">Loading…</p>;

  return (
    <section>
      <h1>My orders</h1>
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}
      <div className="row toolbar">
        <label className="search">
          Filter by product name
          <input
            type="search"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            placeholder="e.g. Monitor"
          />
        </label>
        <button type="button" onClick={() => load(product)}>Apply filter</button>
        <button type="button" className="link" onClick={() => { setProduct(''); load(''); }}>
          Clear
        </button>
      </div>
      {orders.length === 0 ? (
        <p className="muted">No orders match this filter.</p>
      ) : (
        <table className="card table">
          <thead>
            <tr><th>Order</th><th>Date</th><th>Items</th><th>Discount</th><th>Total</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>{new Date(order.createdAt).toLocaleString()}</td>
                <td>
                  {order.items.map((item) => (
                    <div key={`${order.id}-${item.productId}`} className="order-line">
                      <span>{item.quantity} × {item.name}</span>
                      <button
                        type="button"
                        className="link small"
                        onClick={() => buyAgain(item.productId, item.quantity)}
                      >
                        Buy again
                      </button>
                    </div>
                  ))}
                </td>
                <td>{order.couponCode ? `-${formatPrice(order.discount)} (${order.couponCode})` : '–'}</td>
                <td>{formatPrice(order.total)}</td>
                <td><span className="badge">{order.status}</span></td>
                <td />
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
