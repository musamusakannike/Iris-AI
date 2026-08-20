# Lumina Eye - Backend Server

Production-ready Node.js + Express API & WebSocket server built with TypeScript, Mongoose, Helmet, Morgan, Pino, `@google/genai`, `expo-server-sdk`, and `ws`.

## 🚀 Features

- **TypeScript**: Strict type checking with modern ES2022 setup.
- **Express 4.x & WebSockets (`ws`)**: HTTP REST API + Real-time bidirectional WebSocket support.
- **Mongoose 8.x**: MongoDB object modeling with reconnect handling & graceful shutdown.
- **Google GenAI (`@google/genai`)**: Next-gen Gemini 2.5/Flash AI integrations for multimodal analysis and text generation.
- **Expo Server SDK (`expo-server-sdk`)**: Push notification management with batching and validation for the Lumina Eye mobile app.
- **Pino & Pino-HTTP (`pino`, `pino-http`)**: High-throughput structured logging with colorized development pretty printing (`pino-pretty`).
- **Morgan**: HTTP request logging for development and production.
- **Helmet**: Secures Express apps by setting various HTTP headers.
- **CORS**: Configurable Cross-Origin Resource Sharing.
- **Zod**: Type-safe environment variable parsing & validation.
- **Express Rate Limit**: Protects against brute-force and DDoS attacks.
- **Compression**: Response compression using gzip/deflate.
- **Standardized API Responses**: Consistent JSON response formatting & centralized error handling.
- **Live Reload**: Rapid development with `tsx watch`.

---

## 📁 Project Structure

```
server/
├── .env.example            # Environment variable template
├── .env                    # Local environment variables
├── .gitignore              # Git ignore rules
├── package.json            # Scripts & dependencies
├── tsconfig.json           # TypeScript configuration
├── README.md               # Server documentation
└── src/
    ├── config/
    │   ├── db.ts           # Mongoose MongoDB connection & event handlers
    │   └── env.ts          # Zod-validated environment config
    ├── middlewares/
    │   ├── error.middleware.ts   # 404 handler & global exception handler
    │   ├── logger.middleware.ts  # Morgan & Pino-HTTP logging middlewares
    │   └── rateLimiter.ts        # Express rate limiting middleware
    ├── routes/
    │   ├── index.ts        # Master router mounted at /api/v1
    │   └── health.route.ts # Healthcheck endpoint with DB status & metrics
    ├── services/
    │   ├── gemini.service.ts           # Google GenAI (Gemini) client & helpers
    │   ├── pushNotification.service.ts # Expo Push Notification service
    │   └── websocket.service.ts        # WebSocket (ws) server & client manager
    ├── utils/
    │   ├── apiResponse.ts  # Standardized response & error utilities
    │   └── logger.ts       # Structured Pino logger utility
    ├── app.ts              # Express application configuration
    └── index.ts            # Entry point, HTTP/WS servers, and graceful shutdown
```

---

## 🛠️ Getting Started

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and customize as needed:

```bash
cp .env.example .env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | HTTP Server Port | `5000` |
| `NODE_ENV` | Environment mode (`development`, `test`, `production`) | `development` |
| `LOG_LEVEL` | Pino log level (`debug`, `info`, `warn`, `error`) | `info` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/lumina_eye` |
| `CORS_ORIGIN` | Allowed CORS origins (comma-separated or `*`) | `*` |
| `JWT_SECRET` | Secret key for JWT signing | `...` |
| `JWT_EXPIRES_IN` | Default token expiration | `7d` |
| `GEMINI_API_KEY` | Google GenAI API key | `optional` |
| `EXPO_ACCESS_TOKEN`| Expo Push Notification access token | `optional` |

### 3. Run Development Server

```bash
npm run dev
```

### 4. Build and Run Production

```bash
npm run build
npm start
```

---

## 📡 API & WebSocket Endpoints

- **Root**: `GET http://localhost:5000/`
- **Health Check**: `GET http://localhost:5000/api/v1/health`
- **WebSocket Gateway**: `ws://localhost:5000/ws`
