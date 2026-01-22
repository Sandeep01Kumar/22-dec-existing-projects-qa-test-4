const express = require('express');
const app = express();
const port = 3000;

// Root endpoint - returns Hello, World!
app.get('/', (req, res) => {
    res.send('Hello, World!\n');
});

// Evening endpoint - returns Good evening
app.get('/evening', (req, res) => {
    res.send('Good evening');
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://127.0.0.1:${port}/`);
});
