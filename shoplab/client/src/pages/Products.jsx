import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { addToCart, formatPrice } from '../cart.js';

export default function Products({ cart, onCartChange }) {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('id');

  useEffect(() => {
    setError('');
    api
      .products({ search, sort })
      .then(setProducts)
      .catch((err) => setError(err.message));
  }, [search, sort]);

  function add(product) {
    onCartChange(addToCart(cart, product));
    setAdded(product.id);
  }

  return (
    <section>
      <h1>Products</h1>
      <div className="row toolbar">
        <label className="search">
          Search
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or description"
          />
        </label>
        <label>
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="id">Default</option>
            <option value="name">Name</option>
            <option value="price_cents ASC">Price: low to high</option>
            <option value="price_cents DESC">Price: high to low</option>
          </select>
        </label>
      </div>
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
