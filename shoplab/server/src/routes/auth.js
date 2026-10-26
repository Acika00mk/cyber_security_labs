const crypto = require('node:crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const requireLogin = require('../middleware/requireLogin');
const { issueCsrfToken } = require('../middleware/csrf');
const { loginBodySchema } = require('../validation/catalog');
const rateLimit = require('express-rate-limit');  


const router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // limit each IP to 5 requests per windowMs
  standardHeaders: 'draft-8', // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  ipv65subnet: true, // Enable IPv6 support
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
});

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const sha256Hex = (password) =>
  crypto.createHash('sha256').update(password, 'utf8').digest('hex');

const passwordMatches = (password, storedHash) => {
  const actual = Buffer.from(sha256Hex(password), 'hex');
  const expected =
    typeof storedHash === 'string' && /^[a-f0-9]{64}$/i.test(storedHash)
      ? Buffer.from(storedHash, 'hex')
      : Buffer.alloc(32);

  return crypto.timingSafeEqual(actual, expected);
};

router.post('/login', limiter, (req, res, next) => {
  try {
    const parsed = loginBodySchema.safeParse(req.body || {});

    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid data' });
    }

    const { email, password } = parsed.data;
    const user = db
      .prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?')
      .get(email);

    const validPassword = passwordMatches(password, user?.password_hash);

    console.log({
      userFound: Boolean(user),
      storedHashIsSha256:
        typeof user?.password_hash === 'string' &&
        /^[a-f0-9]{64}$/i.test(user.password_hash),
      passwordMatches: validPassword,
    });

    if (!user || !validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

    req.session.regenerate((err) => {
      if (err) return next(err);

      req.session.userId = user.id;

      try {
        issueCsrfToken(req);
      } catch (error) {
        return next(error);
      }

      req.session.save((saveError) => {
        if (saveError) return next(saveError);

        return res.json({
          id: user.id,
          name: user.name,
          email: user.email,
          token,
        });
      });
    });
  } catch (err) {
    next(err);
  }
});

router.get('/csrf', requireLogin, (req, res, next) => {
  try {
    if (!req.session.csrfToken) {
      issueCsrfToken(req);
    }

    req.session.save((err) => {
      if (err) return next(err);
      return res.json({ csrfToken: req.session.csrfToken });
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);

    
    res.clearCookie('shoplab.sid', { path: '/' });
    return res.status(204).end();
  });
});

router.get('/me', requireLogin, (req, res, next) => {
  try {
    const user = db
      .prepare('SELECT id, name, email FROM users WHERE id = ?')
      .get(req.session.userId);

    if (!user) {
      return res.status(401).json({ error: 'Please log in' });
    }

    return res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;