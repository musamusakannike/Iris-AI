# Walkthrough: Self-Hosted VLM Server Integration

We have integrated support for **Self-Hosted Open-Source Vision-Language Models (VLMs)** into the Lumina Eye backend, allowing you to use **Ollama (Moondream 2 / Qwen2.5-VL)** or any **OpenAI-compatible VLM server** hosted on a cheap VPS or locally.

---

## Key Changes Made

### 1. Self-Hosted VLM Service
- **[vlm.service.ts](file:///Users/MACBOOK/Documents/FULLSTACK/LUMINA%20EYE/server/src/services/vlm.service.ts)**:
  - Supports **Ollama API** (`/api/generate` with base64 image data) and **OpenAI-compatible** `/v1/chat/completions`.
  - Built-in assistive mode prompts (`explore`, `read`, `hazard`, `color`, `ask`).
  - Robust JSON parsing and fallback heuristic recovery.
  - Connection health check helper (`checkOllamaHealth`).

### 2. Unified AI Vision Gateway & Auto-Failover
- **[aiVision.service.ts](file:///Users/MACBOOK/Documents/FULLSTACK/LUMINA%20EYE/server/src/services/aiVision.service.ts)**:
  - Dynamically routes requests based on `AI_PROVIDER` (`'ollama' | 'openai-compatible' | 'gemini' | 'mock'`).
  - **Graceful Failover**: If the self-hosted Ollama server is temporarily down or unreachable, it automatically falls back to Gemini (if configured) or the local assistive mock engine without dropping WebSocket connections or throwing 500 errors.

### 3. API & WebSocket Updates
- **[vision.route.ts](file:///Users/MACBOOK/Documents/FULLSTACK/LUMINA%20EYE/server/src/routes/vision.route.ts)**:
  - Updated `/api/v1/vision/analyze` and `/api/v1/vision/ask` to use the unified `aiVisionService`.
  - Added new `GET /api/v1/vision/status` endpoint to verify the active provider and check VPS/Ollama connectivity.
- **[websocket.service.ts](file:///Users/MACBOOK/Documents/FULLSTACK/LUMINA%20EYE/server/src/services/websocket.service.ts)**:
  - Updated real-time `FRAME_STREAM` and `VOICE_QUERY` handlers to use `aiVisionService`.

### 4. Configuration
- **[env.ts](file:///Users/MACBOOK/Documents/FULLSTACK/LUMINA%20EYE/server/src/config/env.ts)** & **[.env.example](file:///Users/MACBOOK/Documents/FULLSTACK/LUMINA%20EYE/server/.env.example)**:
  - Added `AI_PROVIDER`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OPENAI_COMPATIBLE_BASE_URL`, and `OPENAI_COMPATIBLE_MODEL`.

---

## How to Test

### 1. Test Locally with Ollama
If you have Ollama installed on your machine:
```bash
# Pull and start moondream
ollama pull moondream

# In server/.env, set:
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=moondream
```

### 2. Test with Your Cheap VPS
Once your VPS is set up following the guide:
```bash
# In server/.env, update:
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://<YOUR_VPS_IP>:11434
OLLAMA_MODEL=moondream
```

### 3. Check Provider Health
Visit or curl:
```bash
curl http://localhost:5000/api/v1/vision/status
```
Response will return:
```json
{
  "success": true,
  "data": {
    "activeProvider": "ollama",
    "ollamaStatus": {
      "available": true,
      "models": ["moondream:latest"]
    },
    "geminiConfigured": true
  }
}
```
