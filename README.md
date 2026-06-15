# Amazon Now — AI-Powered Quick Commerce

> **Amazon Hackathon 2026** — Bengaluru  
> 10-minute grocery delivery with voice-powered shopping via Gemini Live API + Amazon Nova Sonic

---

## What is this?

Amazon Now is a quick-commerce grocery delivery app with two AI-powered shopping features:

- **Ramble (Voice)** — speak naturally to build a cart: _"Add Amul milk and blue Lays"_ → items appear instantly
- **Vision Scan** — point your camera at groceries → products auto-added to canvas

---

## Architecture

```
Browser (Next.js 16)
  │  PCM16 audio @ 16kHz  │  JPEG image frame
  ▼                        ▼
FastAPI Backend  ──────────────────────────────────────
  │  Bidirectional stream (WebSocket)
  ├──► Gemini Live API   (default — voice + vision)
  └──► Amazon Nova Sonic (voice only — VOICE_PROVIDER=nova_sonic)
         │
         ▼  Tool calls: search_products, add/update/remove_from_canvas
         │
         ├──► ChromaDB  (vector embeddings — 24k products)
         └──► DynamoDB  (users, orders, consumption_rates, reminders)
                         │
                         └──► Local Docker (dev) | AWS DynamoDB (prod)
```

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, TypeScript, Zustand, Tailwind CSS, Framer Motion |
| Backend | FastAPI, Python 3.12, uv |
| Voice/Vision (default) | Google Gemini Live API (`gemini-3.1-flash-live-preview`) |
| Voice (AWS) | Amazon Nova Sonic (`amazon.nova-sonic-v1:0`) via Bedrock |
| Vector Search | ChromaDB + configurable embedding model (Ollama / OpenAI / Cohere) |
| Database | Amazon DynamoDB |
| Catalog | 24,138 products from BigBasket, LLM-enriched with Mistral Nemo |

---

## Local Development

### Prerequisites
- Python 3.12+, Node 18+, [uv](https://docs.astral.sh/uv/), [Ollama](https://ollama.com), Docker

### 1. Clone

```bash
git clone https://github.com/nagajaideep/Amazon-HackON.git
cd Amazon-HackON
```

### 2. Start local DynamoDB + seed data

```bash
docker-compose up -d        # starts DynamoDB Local on :8001
cd backend
uv run python -m app.db.tables    # create tables
uv run python -m app.db.seed      # seed products, users, orders
```

### 3. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set GEMINI_API_KEY, DYNAMODB_ENDPOINT=http://localhost:8001

uv sync

# Pull embedding model (or swap to OpenAI via .env)
ollama pull mxbai-embed-large

# Build ChromaDB index (run once, ~5 min)
uv run python -m app.db.embed_catalog --source json --reset

# Start (binds to 0.0.0.0 so phone on same WiFi can connect)
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Frontend

```bash
cd frontend
npm install
# .env.local is pre-configured for auto-detection — no changes needed for local dev
npm run dev
```

Open **http://localhost:3000** → Login → Tap **Tap & Ramble** or **Scan** to test.

> **Phone testing:** Open `http://<your-laptop-ip>:3000` on phone (same WiFi).  
> Camera/mic require HTTPS — use ngrok or deploy to AWS for full phone testing.

---

## AWS Deployment

### Overview

```
Route 53 (DNS)
    │
CloudFront (HTTPS CDN)
    ├──► S3 + Amplify         (Next.js frontend)
    └──► Application Load Balancer
              │
              EC2 / ECS Fargate  (FastAPI backend, port 8000)
                    │
                    ├──► DynamoDB    (managed, same region)
                    ├──► Bedrock     (Nova Sonic — optional)
                    └──► S3          (catalog.json, ChromaDB if needed)
```

### Option A — EC2 (Simplest for hackathon)

**1. Launch EC2**
```
AMI:           Amazon Linux 2023
Instance type: t3.medium (2 vCPU, 4GB RAM) — t3.large if using local Ollama
Security group: inbound 22 (SSH), 8000 (API), 3000 (frontend) from 0.0.0.0/0
IAM role:      attach role with DynamoDB full access + Bedrock invoke
```

**2. Install dependencies on EC2**
```bash
# Python + uv
curl -LsSf https://astral.sh/uv/install.sh | sh
# Node
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs git
```

**3. Clone + configure**
```bash
git clone https://github.com/nagajaideep/Amazon-HackON.git
cd Amazon-HackON/backend
cp .env.example .env
```

Edit `.env` for production:
```bash
APP_ENV=production
DYNAMODB_ENDPOINT=          # empty = real AWS DynamoDB
DYNAMODB_REGION=ap-south-1
DYNAMODB_ACCESS_KEY=        # empty = use EC2 IAM role
DYNAMODB_SECRET_KEY=

VOICE_PROVIDER=gemini       # or nova_sonic
GEMINI_API_KEY=your_key

# Embedding — use OpenAI for production (no Ollama needed)
EMBEDDING_PROVIDER=openai
EMBEDDING_BASE_URL=https://api.openai.com/v1
EMBEDDING_API_KEY=your_openai_key
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

CORS_ORIGINS=*              # restrict to your domain after testing
```

**4. Seed DynamoDB + build ChromaDB**
```bash
cd backend
uv sync
uv run python -m app.db.tables   # create DynamoDB tables
uv run python -m app.db.seed     # seed data
uv run python -m app.db.embed_catalog --source json --reset
```

**5. Run backend**
```bash
# With systemd (recommended)
sudo tee /etc/systemd/system/amazonnow.service << EOF
[Unit]
Description=Amazon Now API
After=network.target

[Service]
User=ec2-user
WorkingDirectory=/home/ec2-user/Amazon-HackON/backend
ExecStart=/home/ec2-user/.local/bin/uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl enable --now amazonnow
```

**6. Frontend — set API URL + build**
```bash
cd ../frontend
npm install
# Point frontend to your EC2 public IP or domain
echo "NEXT_PUBLIC_API_URL=http://<EC2_PUBLIC_IP>:8000" > .env.local
npm run build
npm start &   # runs on port 3000
```

**7. Access**
- Frontend: `http://<EC2_PUBLIC_IP>:3000`
- API docs: `http://<EC2_PUBLIC_IP>:8000/docs`

---

### Option B — Amplify (Frontend) + EC2 (Backend)

**Frontend on Amplify:**
1. AWS Console → Amplify → New app → connect GitHub repo
2. Set build settings:
   ```yaml
   frontend:
     buildCommand: cd frontend && npm install && npm run build
     startCommand: cd frontend && npm start
   ```
3. Set env vars in Amplify console:
   ```
   NEXT_PUBLIC_API_URL = https://your-ec2-or-alb-domain.com
   NEXT_PUBLIC_USER_ID = u001
   ```
4. Amplify auto-provisions HTTPS → camera + mic work on mobile ✓

**Backend on EC2:** same as Option A steps 1–5.

---

### Add HTTPS (Required for camera + mic on mobile)

**Option 1 — Nginx reverse proxy + Certbot (free SSL)**
```bash
sudo yum install -y nginx certbot python3-certbot-nginx
# Configure nginx to proxy :80/:443 → :8000 and :3000
sudo certbot --nginx -d yourdomain.com
```

**Option 2 — AWS ALB with ACM certificate**
1. Request free cert in ACM for your domain
2. Create ALB → HTTPS listener (443) → forward to EC2:8000
3. Update `NEXT_PUBLIC_API_URL` to `https://your-alb-dns.amazonaws.com`

---

## Switching Embedding Model

Change these in `backend/.env` — no code changes needed:

```bash
# OpenAI (production recommended)
EMBEDDING_PROVIDER=openai
EMBEDDING_BASE_URL=https://api.openai.com/v1
EMBEDDING_API_KEY=sk-...
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

# Cohere
EMBEDDING_PROVIDER=cohere
EMBEDDING_BASE_URL=https://api.cohere.ai/v1
EMBEDDING_API_KEY=...
EMBEDDING_MODEL=embed-english-v3.0
EMBEDDING_DIMENSIONS=1024

# Ollama (local GPU)
EMBEDDING_PROVIDER=ollama
EMBEDDING_BASE_URL=http://localhost:11434/v1
EMBEDDING_API_KEY=ollama
EMBEDDING_MODEL=mxbai-embed-large
EMBEDDING_DIMENSIONS=1024
```

After changing model, rebuild ChromaDB:
```bash
uv run python -m app.db.embed_catalog --source json --reset
```

---

## Switching to Amazon Nova Sonic

```bash
# backend/.env
VOICE_PROVIDER=nova_sonic
AWS_ACCESS_KEY_ID=your_key     # or use IAM role on EC2
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=ap-south-1
```

> Enable in AWS Console: **Bedrock → Model access → Amazon Nova Sonic**  
> Note: Nova Sonic is audio-only — vision scan requires `VOICE_PROVIDER=gemini`

---

## Voice & Vision Features

### Ramble (Voice)
1. Tap the **mic button** (bottom-right)
2. Speak: _"Add Amul milk, Maggi noodles, and blue Lays"_
3. Items appear on canvas in real-time
4. Tap **Add to Cart** or **×** to discard

| Say | Action |
|-----|--------|
| "Add [product]" | Search + add to canvas |
| "Make that 2" | Update quantity |
| "Remove the milk" | Remove item |
| "What's in my cart?" | Read back canvas |
| "Done" / "That's all" | End session |

### Vision Scan (Camera)
1. Tap the **camera button** (next to mic)
2. Choose **Camera** or **Gallery**
3. Point at grocery shelf / fridge / shopping list
4. Products auto-added to canvas

> Requires HTTPS for camera access (works on AWS deployment or ngrok locally)

---

## Catalog Enrichment (offline — run once)

```bash
cd backend
# Set ENRICH_API_KEY in .env (Mistral API key from console.mistral.ai)
uv run python -m app.db.enrich_catalog --workers 10 --resume
# After completion:
uv run python -m app.db.enrich_catalog --merge
uv run python -m app.db.embed_catalog --source json --reset
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `WS` | `/api/ramble/stream?user_id=X` | Voice + vision shopping WebSocket |
| `GET` | `/api/products?category=X&search=Y` | Product search (embedding-powered) |
| `GET` | `/api/products/{id}` | Single product |
| `GET` | `/api/products/{id}/image` | Product image (real or SVG) |
| `GET` | `/api/home/{user_id}` | Home feed (reminders, running low) |
| `GET` | `/api/orders/{user_id}` | Order history + routines |
| `GET` | `/health` | Health check + config status |

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Dev default | Production |
|----------|-------------|------------|
| `APP_ENV` | `development` | `production` |
| `CORS_ORIGINS` | `*` | `https://yourdomain.com` |
| `DYNAMODB_ENDPOINT` | `http://localhost:8001` | _(empty — real AWS)_ |
| `DYNAMODB_REGION` | `ap-south-1` | `ap-south-1` |
| `DYNAMODB_ACCESS_KEY` | `local` | _(empty — IAM role)_ |
| `GEMINI_API_KEY` | your key | your key |
| `VOICE_PROVIDER` | `gemini` | `gemini` or `nova_sonic` |
| `EMBEDDING_MODEL` | `mxbai-embed-large` | `text-embedding-3-small` |
| `AWS_REGION` | `ap-south-1` | `ap-south-1` |

### Frontend (`frontend/.env.local`)

| Variable | Dev | Production |
|----------|-----|------------|
| `NEXT_PUBLIC_API_URL` | _(unset — auto)_ | `https://api.yourdomain.com` |
| `NEXT_PUBLIC_BACKEND_PORT` | `8000` | _(unset if using domain)_ |
| `NEXT_PUBLIC_USER_ID` | `u001` | per-user value |

---

## Project Structure

```
Amazon_Hackathon/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py          # All settings via pydantic-settings
│   │   │   ├── embeddings/        # Embedding client + ChromaDB index
│   │   │   ├── gemini/            # Gemini Live API client
│   │   │   └── aws/               # Amazon Nova Sonic client
│   │   ├── db/
│   │   │   ├── catalog.json       # 24k enriched products
│   │   │   ├── client.py          # DynamoDB client (local + AWS)
│   │   │   ├── embed_catalog.py   # Build ChromaDB index
│   │   │   └── enrich_catalog.py  # LLM enrichment pipeline
│   │   └── routers/
│   │       ├── ramble.py          # Voice + vision WebSocket
│   │       ├── products.py        # Product search + CRUD
│   │       └── product_image.py   # On-demand images (real + SVG)
│   ├── .env.example
│   └── pyproject.toml
└── frontend/
    ├── app/                       # Next.js App Router (8 pages)
    ├── components/voice/          # RambleButton, RambleCanvas, VisionButton
    ├── hooks/useRambleWebSocket.ts # WebSocket + audio/image hook
    ├── lib/api-url.ts             # Dynamic API URL (hostname-aware)
    ├── store/                     # Zustand stores (cart, ramble, auth...)
    ├── .env.example
    └── .env.local                 # Local overrides (gitignored)
```
