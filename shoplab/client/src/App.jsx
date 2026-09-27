import { useEffect, useState } from 'react';
import { api } from './api.js';
import { cartCount, loadCart, saveCart } from './cart.js';
import Login from './pages/Login.jsx';
import Products from './pages/Products.jsx';
import Cart from './pages/Cart.jsx';
import Orders from './pages/Orders.jsx';

function readThemeCookie() {
  const match = document.cookie.match(/(?:^|;\s*)theme=(light|dark)/);
  return match ? match[1] : 'light';
}

export default function App() {
  const [route, setRoute] = useState(window.location.hash || '#/products');
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState(loadCart);
  const [theme, setTheme] = useState(readThemeCookie);

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash || '#/products');
    window.addEventListener('hashchange', onHashChange);
    api.me().then(setUser).catch(() => setUser(null));
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    document.cookie = `theme=${next}; path=/; max-age=31536000; SameSite=Lax`;
    setTheme(next);
  }

  function updateCart(next) {
    setCart(saveCart(next));
  }

  async function logout() {
    await api.logout();
    setUser(null);
    window.location.hash = '#/login';
  }

  function onLogin(loggedInUser) {
    setUser(loggedInUser);
    window.location.hash = '#/products';
  }

  let page;
  if (route === '#/login' || (route === '#/orders' && !user)) {
    page = <Login onLogin={onLogin} />;
  } else if (route === '#/cart') {
    page = <Cart cart={cart} onCartChange={updateCart} user={user} />;
  } else if (route === '#/orders') {
    page = <Orders />;
  } else {
    page = <Products cart={cart} onCartChange={updateCart} />;
  }

  return (
    <div className="app">
      <header className="header">
        <a className="brand" href="#/products">ShopLab</a>
        <nav>
          <a href="#/products">Products</a>
          <a href="#/cart">Cart ({cartCount(cart)})</a>
          <a href="#/orders">My orders</a>
        </nav>
        <div className="user">
          {user ? (
            <>
              <span>{user.name}</span>
              <button className="link" onClick={logout}>Logout</button>
            </>
          ) : (
            <a href="#/login">Log in</a>
          )}
          <button className="theme" onClick={toggleTheme} title="Toggle theme">
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
        </div>
      </header>
      <main>{page}</main>
      <footer className="footer">ShopLab – training application. Runs on your own machine only.</footer>
    </div>
  );
}
