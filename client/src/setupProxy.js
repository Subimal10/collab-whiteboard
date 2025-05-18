const { createProxyMiddleware } = require("http-proxy-middleware");

const simpleRequestLogger = (proxyServer, options) => {
  proxyServer.on("proxyReq", (proxyReq, req, res) => {
    console.log(`[HPM] [${req.method}] ${req.url}`);
  });
};

module.exports = function (app) {
  app.use(
    "/api",
    createProxyMiddleware({
      target: "http://127.0.0.1:5000",
      changeOrigin: true,
      plugins: [simpleRequestLogger],
    })
  );
};
