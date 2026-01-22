const http = require('http');

const hostname = '127.0.0.1';
const port = 3000;

// Track shutdown state to reject new requests during graceful shutdown
let isShuttingDown = false;

// Allowed HTTP methods for input validation
const allowedMethods = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'];

// Maximum URL length to prevent URI attacks
const MAX_URL_LENGTH = 2048;

const server = http.createServer((req, res) => {
  // Reject new requests during shutdown
  if (isShuttingDown) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Service Unavailable - Server is shutting down\n');
    return;
  }

  // Input validation: HTTP method
  if (!allowedMethods.includes(req.method)) {
    res.statusCode = 405;
    res.setHeader('Allow', allowedMethods.join(', '));
    res.setHeader('Content-Type', 'text/plain');
    res.end('Method Not Allowed\n');
    return;
  }

  // Input validation: URL length
  if (req.url && req.url.length > MAX_URL_LENGTH) {
    res.statusCode = 414;
    res.setHeader('Content-Type', 'text/plain');
    res.end('URI Too Long\n');
    return;
  }

  // Route handling
  const urlPath = req.url.split('?')[0]; // Remove query string for routing

  if (urlPath === '/' || urlPath === '/health') {
    // Root path and health endpoint
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Hello, World!\n');
  } else {
    // 404 for unknown paths
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Not Found\n');
  }
});

// Configure server timeouts for protection against slow-loris attacks
server.timeout = 120000;        // 2 minutes request timeout
server.keepAliveTimeout = 5000; // 5 seconds keep-alive timeout
server.headersTimeout = 60000;  // 60 seconds header timeout

// Server error handler for server-level errors (EADDRINUSE, EACCES, etc.)
server.on('error', (error) => {
  console.error(`Server error: ${error.message}`);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Please use a different port or stop the other process.`);
  } else if (error.code === 'EACCES') {
    console.error(`Permission denied to use port ${port}. Try using a port above 1024 or run with elevated privileges.`);
  }
  process.exit(1);
});

// Client error handler for connection-level errors
server.on('clientError', (error, socket) => {
  console.error(`Client error: ${error.message}`);
  if (socket.writable) {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  }
});

// Graceful shutdown function
function gracefulShutdown(signal) {
  console.log(`${signal} signal received. Starting graceful shutdown...`);
  isShuttingDown = true;

  // Stop accepting new connections
  server.close((err) => {
    if (err) {
      console.error('Error during server close:', err);
      process.exit(1);
    }
    console.log('Server closed successfully. Exiting...');
    process.exit(0);
  });

  // Force shutdown after timeout (5 seconds)
  setTimeout(() => {
    console.error('Graceful shutdown timeout. Forcing exit...');
    process.exit(1);
  }, 5000);
}

// Signal handlers for graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Global exception handlers
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the server
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

// Export for testing purposes
module.exports = { server, gracefulShutdown, isShuttingDown: () => isShuttingDown };
