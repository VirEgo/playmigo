module.exports = {
  '/api/lm-studio/**': {
    target: 'http://127.0.0.1:1234',
    changeOrigin: true,
    pathRewrite: { '^/api/lm-studio': '' },
    proxyTimeout: 125000,
    timeout: 125000,
  },
};
