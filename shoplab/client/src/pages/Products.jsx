import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { addToCart, formatPrice } from '../cart.js';
import DOMPurify from 'dompurify';

function ProductReviews({ productId, user }) {
  const [open, setOpen] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    api
      .productReviews(productId)
      .then(setReviews)
      .catch((err) => setError(err.message));
  }, [open, productId]);

  async function submitReview(event) {
    event.preventDefault();
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      await api.postReview(productId, draft);
      setDraft('');
      const next = await api.productReviews(productId);
      setReviews(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="reviews">
      <button type="button" className="link" onClick={() => setOpen((value) => !value)}>
        {open ? 'Hide reviews' : 'Reviews'}
      </button>
      {open && (
        <div className="reviews-panel card">
          <p className="muted small">Reviews support simple HTML for bold text.</p>
          {error && <p className="error">{error}</p>}
          {reviews.length === 0 ? (
            <p className="muted">No reviews yet.</p>
          ) : (
            <ul className="review-list">
              {reviews.map((review) => (
                <li key={review.id}>
                  <div className="review-meta">
                    <strong>{review.authorName}</strong>
                    <span className="muted">{new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(review.body, { ALLOWED_TAGS: ['b', 'i', 'u', 'a', 'p', 'img'] }) }} />
                </li>
              ))}
            </ul>
            
          )}
          {user ? (
            <form className="review-form" onSubmit={submitReview}>
              <label>
                Your review
                <textarea
                  rows={3}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Share your experience…"
                  required
                />
              </label>
              <button type="submit" disabled={loading}>{loading ? 'Posting…' : 'Post review'}</button>
            </form>
          ) : (
            <p className="muted small">Log in to post a review.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function Products({ cart, onCartChange, user }) {
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
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
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
            <ProductReviews productId={product.id} user={user} />
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
