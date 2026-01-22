# hao-backprop-test

A simple Node.js server built with Express.js that provides greeting endpoints.

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

## Installation

```bash
npm install
```

## Running the Server

```bash
npm start
```

Or directly:

```bash
node server.js
```

The server will start on `http://127.0.0.1:3000/`.

## API Endpoints

### GET /

Returns a "Hello, World!" greeting.

**Example:**
```bash
curl http://localhost:3000/
```

**Response:**
```
Hello, World!
```

### GET /evening

Returns a "Good evening" greeting.

**Example:**
```bash
curl http://localhost:3000/evening
```

**Response:**
```
Good evening
```

## License

MIT
