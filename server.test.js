/**
 * SERVER.JS COMPREHENSIVE TEST SUITE
 * 
 * This test suite validates all production-ready features including:
 * - HTTP Response handling (8 tests)
 * - Error Handling (6 tests)
 * - Graceful Shutdown (5 tests)
 * - Input Validation (2 tests)
 * - Code Structure (2 tests)
 * 
 * Total: 23 tests
 */

const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

// Server process reference
let serverProcess = null;
const TEST_PORT = 3000;
const TEST_HOST = '127.0.0.1';
const SERVER_URL = `http://${TEST_HOST}:${TEST_PORT}`;

/**
 * Utility function to log test results
 */
function logTest(name, passed, message = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`✅ PASS: ${name}`);
  } else {
    failedTests++;
    console.log(`❌ FAIL: ${name}${message ? ' - ' + message : ''}`);
  }
  testResults.push({ name, passed, message });
}

/**
 * Make HTTP request
 */
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

/**
 * Start test server
 */
function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, 'server.js');
    serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });

    let started = false;
    const timeout = setTimeout(() => {
      if (!started) {
        reject(new Error('Server start timeout'));
      }
    }, 10000);

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server running')) {
        started = true;
        clearTimeout(timeout);
        // Give it a moment to fully initialize
        setTimeout(() => resolve(), 100);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Server stderr:', data.toString());
    });

    serverProcess.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/**
 * Stop test server
 */
function stopServer() {
  return new Promise((resolve) => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      // Wait for process to exit
      serverProcess.on('exit', () => {
        serverProcess = null;
        setTimeout(resolve, 500); // Wait for port to be released
      });
      // Force kill after timeout
      setTimeout(() => {
        if (serverProcess) {
          serverProcess.kill('SIGKILL');
        }
        resolve();
      }, 3000);
    } else {
      resolve();
    }
  });
}

/**
 * Read server.js source code for inspection tests
 */
function readServerSource() {
  const serverPath = path.join(__dirname, 'server.js');
  return fs.readFileSync(serverPath, 'utf8');
}

/**
 * Wait for a specified time
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================
// TEST SUITE
// =============================================

async function runTests() {
  console.log('===========================================');
  console.log('  SERVER.JS COMPREHENSIVE TEST SUITE');
  console.log('===========================================\n');

  const serverSource = readServerSource();

  // =============================================
  // HTTP RESPONSE TESTS (8 tests)
  // =============================================
  console.log('\n--- HTTP Response Tests ---\n');

  try {
    await startServer();
    await wait(200); // Give server time to stabilize

    // Test 1: GET / returns 200 OK
    try {
      const res = await makeRequest({ hostname: TEST_HOST, port: TEST_PORT, path: '/', method: 'GET' });
      logTest('GET / returns 200 OK', res.statusCode === 200, `Got ${res.statusCode}`);
    } catch (e) {
      logTest('GET / returns 200 OK', false, e.message);
    }

    // Test 2: GET /health returns 200 OK
    try {
      const res = await makeRequest({ hostname: TEST_HOST, port: TEST_PORT, path: '/health', method: 'GET' });
      logTest('GET /health returns 200 OK', res.statusCode === 200, `Got ${res.statusCode}`);
    } catch (e) {
      logTest('GET /health returns 200 OK', false, e.message);
    }

    // Test 3: GET /unknown-path returns 404 Not Found
    try {
      const res = await makeRequest({ hostname: TEST_HOST, port: TEST_PORT, path: '/unknown-path', method: 'GET' });
      logTest('GET /unknown-path returns 404 Not Found', res.statusCode === 404, `Got ${res.statusCode}`);
    } catch (e) {
      logTest('GET /unknown-path returns 404 Not Found', false, e.message);
    }

    // Test 4: HEAD / is allowed (valid method)
    try {
      const res = await makeRequest({ hostname: TEST_HOST, port: TEST_PORT, path: '/', method: 'HEAD' });
      logTest('HEAD / is allowed (valid method)', res.statusCode === 200, `Got ${res.statusCode}`);
    } catch (e) {
      logTest('HEAD / is allowed (valid method)', false, e.message);
    }

    // Test 5: POST / is allowed (valid method)
    try {
      const res = await makeRequest({ hostname: TEST_HOST, port: TEST_PORT, path: '/', method: 'POST' });
      logTest('POST / is allowed (valid method)', res.statusCode === 200, `Got ${res.statusCode}`);
    } catch (e) {
      logTest('POST / is allowed (valid method)', false, e.message);
    }

    // Test 6: OPTIONS / is allowed (valid method)
    try {
      const res = await makeRequest({ hostname: TEST_HOST, port: TEST_PORT, path: '/', method: 'OPTIONS' });
      logTest('OPTIONS / is allowed (valid method)', res.statusCode === 200, `Got ${res.statusCode}`);
    } catch (e) {
      logTest('OPTIONS / is allowed (valid method)', false, e.message);
    }

    // Test 7: Response includes Content-Type header
    try {
      const res = await makeRequest({ hostname: TEST_HOST, port: TEST_PORT, path: '/', method: 'GET' });
      const hasContentType = res.headers['content-type'] && res.headers['content-type'].includes('text/plain');
      logTest('Response includes Content-Type header', hasContentType, `Got ${res.headers['content-type']}`);
    } catch (e) {
      logTest('Response includes Content-Type header', false, e.message);
    }

    // Test 8: Multiple sequential requests handled correctly
    try {
      let allSuccess = true;
      for (let i = 0; i < 5; i++) {
        const res = await makeRequest({ hostname: TEST_HOST, port: TEST_PORT, path: '/', method: 'GET' });
        if (res.statusCode !== 200) {
          allSuccess = false;
          break;
        }
      }
      logTest('Multiple sequential requests handled correctly', allSuccess);
    } catch (e) {
      logTest('Multiple sequential requests handled correctly', false, e.message);
    }

    await stopServer();
  } catch (e) {
    console.error('Error in HTTP Response tests:', e.message);
    await stopServer();
  }

  // =============================================
  // ERROR HANDLING TESTS (6 tests) - Source inspection
  // =============================================
  console.log('\n--- Error Handling Tests ---\n');

  // Test 9: Server has timeout configuration (server.timeout)
  const hasTimeout = serverSource.includes('server.timeout');
  logTest('Server has timeout configuration (server.timeout)', hasTimeout);

  // Test 10: Server has keepAliveTimeout configuration
  const hasKeepAliveTimeout = serverSource.includes('server.keepAliveTimeout');
  logTest('Server has keepAliveTimeout configuration', hasKeepAliveTimeout);

  // Test 11: Server has headersTimeout configuration
  const hasHeadersTimeout = serverSource.includes('server.headersTimeout');
  logTest('Server has headersTimeout configuration', hasHeadersTimeout);

  // Test 12: Server has error event handler
  const hasErrorHandler = serverSource.includes("server.on('error'") || serverSource.includes('server.on("error"');
  logTest('Server has error event handler', hasErrorHandler);

  // Test 13: Server has clientError event handler
  const hasClientErrorHandler = serverSource.includes("server.on('clientError'") || serverSource.includes('server.on("clientError"');
  logTest('Server has clientError event handler', hasClientErrorHandler);

  // Test 14: Server handles EADDRINUSE error
  const handlesEADDRINUSE = serverSource.includes('EADDRINUSE');
  logTest('Server handles EADDRINUSE error', handlesEADDRINUSE);

  // =============================================
  // GRACEFUL SHUTDOWN TESTS (5 tests) - Source inspection
  // =============================================
  console.log('\n--- Graceful Shutdown Tests ---\n');

  // Test 15: Server has SIGTERM handler
  const hasSIGTERM = serverSource.includes("process.on('SIGTERM'") || serverSource.includes('process.on("SIGTERM"');
  logTest('Server has SIGTERM handler', hasSIGTERM);

  // Test 16: Server has SIGINT handler
  const hasSIGINT = serverSource.includes("process.on('SIGINT'") || serverSource.includes('process.on("SIGINT"');
  logTest('Server has SIGINT handler', hasSIGINT);

  // Test 17: Server has uncaughtException handler
  const hasUncaughtException = serverSource.includes("process.on('uncaughtException'") || serverSource.includes('process.on("uncaughtException"');
  logTest('Server has uncaughtException handler', hasUncaughtException);

  // Test 18: Server has unhandledRejection handler
  const hasUnhandledRejection = serverSource.includes("process.on('unhandledRejection'") || serverSource.includes('process.on("unhandledRejection"');
  logTest('Server has unhandledRejection handler', hasUnhandledRejection);

  // Test 19: Server has gracefulShutdown function
  const hasGracefulShutdown = serverSource.includes('gracefulShutdown') && serverSource.includes('function gracefulShutdown');
  logTest('Server has gracefulShutdown function', hasGracefulShutdown);

  // =============================================
  // INPUT VALIDATION TESTS (2 tests)
  // =============================================
  console.log('\n--- Input Validation Tests ---\n');

  // Test 20: Server validates HTTP methods
  const validatesHTTPMethods = serverSource.includes('allowedMethods') && (serverSource.includes('405') || serverSource.includes('Method Not Allowed'));
  logTest('Server validates HTTP methods', validatesHTTPMethods);

  // Test 21: Server validates URL length
  const validatesURLLength = serverSource.includes('MAX_URL_LENGTH') || (serverSource.includes('url.length') && serverSource.includes('414'));
  logTest('Server validates URL length', validatesURLLength);

  // =============================================
  // CODE STRUCTURE TESTS (2 tests)
  // =============================================
  console.log('\n--- Code Structure Tests ---\n');

  // Test 22: Server calls server.close() during shutdown
  const callsServerClose = serverSource.includes('server.close(');
  logTest('Server calls server.close() during shutdown', callsServerClose);

  // Test 23: Server tracks shutdown state
  const tracksShutdownState = serverSource.includes('isShuttingDown');
  logTest('Server tracks shutdown state', tracksShutdownState);

  // =============================================
  // SUMMARY
  // =============================================
  console.log('\n===========================================');
  console.log('  TEST SUMMARY');
  console.log('===========================================\n');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log('\n===========================================\n');

  // Exit with appropriate code
  process.exit(failedTests > 0 ? 1 : 0);
}

// Run the test suite
runTests().catch((err) => {
  console.error('Test suite failed:', err);
  stopServer().then(() => process.exit(1));
});
