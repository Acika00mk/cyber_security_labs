import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { addToCart, formatPrice } from '../cart.js';

export default function Products({ cart, onCartChange }) {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(null);

  useEffect(() => {
    api.products().then(setProducts).catch((err) => setError(err.message));
  }, []);

  function add(product) {
    onCartChange(addToCart(cart, product));
    setAdded(product.id);
  }

  return (
    <section>
      <h1>Products</h1>
      {error && <p className="error">{error}</p>}
      <div className="grid">
        {products.map((product) => (
          <article key={product.id} className="card product">
            <img src={product.image} alt="" />
            <h2>{product.name}</h2>
            <p className="muted">{product.description}</p>
            <div className="row">
              <strong>{formatPrice(product.price)}</strong>
              <button onClick={() => add(product)}>{added === product.id ? 'Added' : 'Add to cart'}</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
