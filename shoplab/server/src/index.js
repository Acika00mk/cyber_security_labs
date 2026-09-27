const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 3000;
const HOST = '127.0.0.1';

createApp().listen(PORT, HOST, () => {
  console.log(`ShopLab running on http://localhost:${PORT}`);
});
