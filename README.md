# Amazon Now — AI-Powered Quick Commerce

> **Amazon Hackathon 2026 — Bengaluru**  
> 10-minute grocery delivery with real-time voice shopping + camera vision scanning

---

## What is this?

Amazon Now is a quick-commerce grocery delivery app with two AI-powered shopping features that use the same backend pipeline:

- **Ramble (Voice)** — speak naturally to build a cart in real-time: _"Add 2 packets of Maggi and blue Lays"_ → products appear on canvas instantly via Gemini Live API function calls
- **Vision Scan (Camera)** — point your phone camera at a grocery shelf, fridge, or shopping list → Gemini identifies products and adds them to the same canvas

Both use identical canvas management, product search, and tool call pipeline — only the input layer differs.

---

## Full Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser (Next.js 16)                         │
│                                                                     │
│  ┌──────────────┐  ┌──────────────────────────────────────────────┐ │
│  │  Ramble UI   │  │  Pages: /, /products, /cart, /checkout,      │ │
│  │  CanvasItems │  │         /payment, /orders, /profile, /login  │ │
│  │  VisionBtn   │  │  Stores: cart, ramble, checkout, auth,       │ │
│  │  RambleBtn   │  │          notifications                       │ │
│  └──────┬───────┘  └───────────────────────┬────────────────────┘ │
│         │ WebSocket                         │ HTTP REST              │
└─────────┼─────────────────────────────────┼──────────────────────┘
          │ PCM16 audio / JPEG image          │ GET /api/*
          ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FastAPI Backend (Python 3.12)                    │
│                                                                     │
│  /api/ramble/stream ──────────────────────────────────────────────┐ │
│     CanvasState (per session)                                     │ │
│     _make_voice_client()                                          │ │
│          │                                                        │ │
│          ├──► GeminiLiveClient ──► wss://generativelanguage...   │ │
│          └──► NovaSonicClient  ──► https://bedrock-runtime...    │ │
│               (VOICE_PROVIDER env)    (HTTP/2 bidir stream)      │ │
│                                                                   │ │
│     6 Tool Functions:                                            │ │
│       search_products    → ProductIndex (ChromaDB hybrid)        │ │
│       add_to_canvas      → catalog.json lookup + DynamoDB        │ │
│       update_canvas_item → CanvasState mutation                  │ │
│       remove_from_canvas → CanvasState mutation                  │ │
│       get_canvas         → return current CanvasState            │ │
│       notify_user        → toast to browser                      │ │
│                                                                   │ │
│  /api/products  ──► ProductIndex.search() (hybrid)               │ │
│  /api/home/{id} ──► DynamoDB multi-table fetch                   │ │
│  /api/orders    ──► DynamoDB orders + routines                   │ │
│  /api/products/{id}/image ──► local JPG or SVG card              │ │
│                                                                   │ │
└───────────────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
┌──────────────────────┐    ┌───────────────────────────────────────┐
│   Amazon DynamoDB    │    │        ChromaDB (local persistent)    │
│                      │    │                                       │
│  products            │    │  24,138 product embeddings            │
│  users               │    │  mxbai-embed-large (1024 dim)         │
│  orders              │    │  cosine similarity HNSW index         │
│  consumption_rates   │    │  Hybrid: keyword-first + embedding    │
│  reminders           │    │  fallback                             │
│  routines            │    │                                       │
└──────────────────────┘    └───────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | Next.js (App Router) | 16.2.9 |
| **UI** | React | 19.2.4 |
| **Animations** | Framer Motion | 12.x |
| **State** | Zustand | 5.x (5 stores) |
| **Icons** | Lucide React | 1.x |
| **Toasts** | Sonner | 2.x |
| **CSS** | Tailwind CSS | 4.x |
| **Components** | Radix UI + CVA | — |
| **Language** | TypeScript | 5.x |
| **Backend** | FastAPI | 0.136+ |
| **Runtime** | Python | 3.12 |
| **Package mgr** | uv | latest |
| **ASGI** | Uvicorn + uvloop | 0.49+ |
| **Database** | Amazon DynamoDB | via boto3 |
| **Vector DB** | ChromaDB | 0.5+ |
| **Embeddings** | Ollama mxbai-embed-large (dev) / OpenAI (prod) | — |
| **Voice AI** | Google Gemini Live API | `gemini-3.1-flash-live-preview` |
| **Voice AI (AWS)** | Amazon Nova Sonic via Bedrock | `amazon.nova-sonic-v1:0` |
| **WS Client** | websockets | 13+ |
| **HTTP Client** | httpx + aiohttp | — |
| **AWS SDK** | boto3 + aws-sdk-bedrock-runtime | — |

---

## Frontend Pages

| Route | Type | Purpose |
|-------|------|---------|
| `/` | Server Component | Home feed — smart notifications, running low items, frequently bought, category strip, promo banners |
| `/products` | Server Component | Product catalog with embedding-powered search + category filters |
| `/cart` | Client Component | Full cart with quantity controls, order summary, fixed checkout bar |
| `/checkout` | Client Component | Smart checkout — "Also running low" AI upsells, frequently bought suggestions, delivery fee calculation |
| `/payment` | Client Component | 4 payment methods (Amazon Pay, UPI, Card, CoD), animated success screen with confetti |
| `/orders` | Server Component | AI-detected shopping routines + order history |
| `/profile` | Server Component | User profile, Shopping DNA insights, settings |
| `/login` | Client Component | Demo single-click admin login (cookie-based auth) |

---

## Backend API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `WS` | `/api/ramble/stream?user_id=X` | **Voice + vision canvas WebSocket** — Gemini Live or Nova Sonic, 6 tool functions |
| `GET` | `/api/products` | Product listing/search (`?category=`, `?search=`, `?limit=`) — embedding-powered |
| `GET` | `/api/products/{id}` | Single product from DynamoDB |
| `GET` | `/api/products/{id}/image` | Product image — serves scraped JPG or generates SVG card |
| `GET` | `/api/home/{user_id}` | Composite home data: profile + reminders + running_low + frequently_bought |
| `GET` | `/api/orders/{user_id}` | Order history (newest first) |
| `GET` | `/api/orders/{user_id}/routines` | AI-detected shopping routines with confidence scores |
| `GET` | `/health` | Health check + active config (voice provider, embedding model, DynamoDB mode) |

---

## Zustand State Stores

| Store | State | Purpose |
|-------|-------|---------|
| `cart.ts` | `items`, `isOpen` | Shopping cart — add/remove/update quantities, open/close drawer |
| `checkout.ts` | `items`, `source`, `suggestedProducts` | Checkout session — separate cart copy, computed subtotal/delivery/total |
| `ramble.ts` | `isConnected`, `isListening`, `isPaused`, `canvasItems`, `total` | Voice/vision canvas state — updated via WebSocket messages |
| `notifications.ts` | `items`, `dismissed` | Running low notification banner state |
| `auth.ts` | `isAuthenticated`, `userId` | Demo auth via cookie, `DEMO_USER_ID` from env |

---

## Voice + Vision Pipeline (Deep Dive)

### Voice Flow

```
1. User taps mic button
   → useRambleWebSocket.startListening()
   → WebSocket opens to /api/ramble/stream
   → AudioCapture starts (PCM16 @ 16kHz via ScriptProcessorNode)

2. Audio streams continuously
   → {type:"audio", audio:"<b64>"}  (every ~256ms chunk)
   → Backend: gemini.send_audio(b64)
   → realtimeInput.audio → Gemini Live API

3. Gemini detects speech intent
   → Fires toolCall: [{name:"search_products", args:{query:"amul milk"}}]
   → Backend executes: ProductIndex.search("amul milk", top_k=5)
   → Confidence filter: score >= 0.55
   → Returns top results to Gemini

4. Gemini verifies match (cross-verification in system prompt)
   → If match makes sense: toolCall: [{name:"add_to_canvas", args:{product_id:"...", qty:1}}]
   → If mismatch: toolCall: [{name:"notify_user", args:{message:"Couldn't find...", kind:"warning"}}]

5. Backend executes add_to_canvas
   → catalog.json lookup (instant, 24k in-memory)
   → CanvasState.add(product, qty)
   → Sends toolResponse back to Gemini
   → Sends {type:"canvas_update", canvas:[...], total:₹X} to browser

6. Browser RambleCanvas updates live
   → New item appears with animation
   → Running total updates

7. User taps "Add to Cart"
   → sendRaw({type:"action", action:"add_to_cart"})
   → Backend: sends cart_action to browser
   → Frontend: useCartStore.addItem() × each item
   → Canvas cleared, cart opens
```

### Vision Flow

```
1. User taps camera button → VisionButton modal opens
   → Camera (getUserMedia) or Gallery (file input)
   → Image captured → compressed (max 800px, JPEG 0.8)

2. connectOnly() — opens WebSocket WITHOUT starting mic
   → sendRaw({type:"image", image:"<b64>", mime:"image/jpeg"})

3. Backend: gemini.send_image(b64, mime)
   → clientContent {turns:[{role:"user", parts:[
       {inline_data:{mime_type, data}},
       {text:"Identify grocery products and add to canvas..."}
     ]}, turnComplete:true]}

4. Gemini identifies products from image
   → Same tool call pipeline as voice: search → verify → add_to_canvas
   → Canvas updates in real-time (no mic used)
```

### Voice Provider Switch

```python
# _make_voice_client() in ramble.py
VOICE_PROVIDER=gemini      → GeminiLiveClient  (voice + vision, default)
VOICE_PROVIDER=nova_sonic  → NovaSonicClient   (voice only, needs AWS creds)
                           → auto-falls back to GeminiLiveClient if no AWS creds
```

### Gemini Session Management

- **8-minute limit**: Gemini Live sessions expire after 8 min via GoAway signal → `GeminiSessionExpired` raised → backend auto-reconnects preserving canvas state
- **Quota errors** (1011): Shows toast "Rate limited, try again in 1-2 min"
- **Pause/Resume**: `stopSilent()` stops mic WITHOUT sending `audio_end` (preserves Gemini session)

---

## Hybrid Product Search

```
Query: "blue lays"
         │
         ▼
Stage 1: KEYWORD SCAN (no embedding, O(n) over metadata in memory)
  _expand_color_query("blue") → ["lays classic salted", "blue packet", ...]
  _keyword_score() per product:
    brand "lays" in query        → +0.12
    name word "lays" overlap     → +0.06
    color alias "classic salted" → +0.08
    total = 0.26 ≥ threshold 0.22 ✓
  score = min(1.0, 0.85 + 0.26) = 1.000
  → Returns instantly [Lays Classic Salted, Lays American Cream, ...]

Stage 2: EMBEDDING SIMILARITY (only if Stage 1 returns nothing)
  embed("blue lays") → 1024-dim vector (mxbai-embed-large)
  ChromaDB HNSW cosine query → score = 1 - distance
  → Returns semantically similar products

Voice canvas additionally filters: score >= 0.55
  → Below threshold → notify_user("Couldn't find X in catalog", "warning")
```

---

## 24k Product Catalog Pipeline (Offline)

```
Step 1: fetch_catalog.py
  Download BigBasket CSV (~40k rows from GitHub)
  → Filter: 60 explicit (category, sub_category) mappings → 9 internal categories
  → Dedup by name+brand, parse prices, assign UUIDs
  → Assign delivery_mins + cycle_days per category
  → Seed into DynamoDB + save catalog.json

Step 2: enrich_catalog.py (--workers 10 --concurrency 8)
  For each product batch of 10 → Mistral open-mistral-nemo:
    + description      → "Classic salted potato chips"
    + common_names     → ["blue lays", "lays chips", "classic lays"]
    + packaging_color  → "blue"
    + tags             → ["chips", "snacks", "crispy"]
    + use_cases        → ["evening snack", "party"]
    + search_terms     → ["lays chips", "blue packet chips", "potato chips"]
  Crash-safe: saves to enrich_data.json after every batch
  Resume: --resume flag skips already enriched products
  Finish: --merge writes enrichment into catalog.json

Step 3: embed_catalog.py
  For each product, build embedding text:
    "{brand} {name} {variant} {category} {description}
     {common_names...} {search_terms...} {tags...} {packaging_color}"
  → Embed in batches of 200 (mxbai-embed-large via Ollama)
  → Store in ChromaDB (cosine HNSW, batch of 500 to ChromaDB)
  → Validate: test searches ("blue lays" → Lays 1.000 ✓)
```

---

## DynamoDB Schema

| Table | PK | SK | Key Data |
|-------|----|----|----------|
| `products` | `PRODUCT#{id}` | `METADATA` | name, brand, price, category, delivery_mins, cycle_days, tags |
| `users` | `USER#{id}` | `PROFILE` | name, email, location, household_type, household_size |
| `orders` | `USER#{id}` | `ORDER#{timestamp}#{id}` | items, total, status, delivery_mins |
| `consumption_rates` | `USER#{id}` | `PRODUCT#{id}` | avg_gap_days, predicted_runout_at, regularity_score |
| `reminders` | `USER#{id}` | `REMINDER#{id}` | product_id, type, priority, urgency, show_from |
| `routines` | `USER#{id}` | `ROUTINE#{id}` | product_ids, day_of_week, time_slot, frequency, confidence |

**GSIs:** `products`: `category-index` (PK=category, SK=SK) · `reminders`: `status-index`

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Local Dev | Production | Notes |
|----------|-----------|------------|-------|
| `APP_ENV` | `development` | `production` | Enables `/docs` in dev |
| `CORS_ORIGINS` | `*` | `https://yourdomain.com` | Comma-separated |
| `DYNAMODB_ENDPOINT` | `http://localhost:8001` | *(empty)* | Empty = real AWS |
| `DYNAMODB_REGION` | `ap-south-1` | `ap-south-1` | Mumbai |
| `DYNAMODB_ACCESS_KEY` | `local` | *(empty)* | Empty = IAM role |
| `DYNAMODB_SECRET_KEY` | `local` | *(empty)* | Empty = IAM role |
| `VOICE_PROVIDER` | `gemini` | `gemini` or `nova_sonic` | |
| `GEMINI_API_KEY` | your key | your key | aistudio.google.com |
| `GEMINI_MODEL` | `gemini-3.1-flash-live-preview` | same | v1alpha bidi model |
| `AWS_ACCESS_KEY_ID` | *(empty)* | *(empty or key)* | Empty = IAM role |
| `AWS_SECRET_ACCESS_KEY` | *(empty)* | *(empty or key)* | Empty = IAM role |
| `AWS_REGION` | `ap-south-1` | `ap-south-1` | |
| `NOVA_SONIC_MODEL` | `amazon.nova-sonic-v1:0` | same | |
| `EMBEDDING_PROVIDER` | `ollama` | `openai` | Swap without code change |
| `EMBEDDING_BASE_URL` | `http://localhost:11434/v1` | `https://api.openai.com/v1` | |
| `EMBEDDING_API_KEY` | `ollama` | your OpenAI key | |
| `EMBEDDING_MODEL` | `mxbai-embed-large` | `text-embedding-3-small` | |
| `EMBEDDING_DIMENSIONS` | `1024` | `1536` | Must match model |
| `ENRICH_API_KEY` | Mistral key | not needed at runtime | Offline enrichment only |

### Frontend (`frontend/.env.local`)

| Variable | Dev | Production | Notes |
|----------|-----|------------|-------|
| `NEXT_PUBLIC_API_URL` | *(unset — auto)* | `https://api.yourdomain.com` | Auto-detects from hostname if unset |
| `NEXT_PUBLIC_BACKEND_PORT` | `8000` | *(unset if using domain)* | Port for auto-detection |
| `NEXT_PUBLIC_USER_ID` | `u001` | per-user | DynamoDB user key |

---

## Local Development

### Prerequisites
```
Python 3.12+   Node 18+   uv   Ollama   Docker
```

### 1. Clone
```bash
git clone https://github.com/nagajaideep/Amazon-HackON.git
cd Amazon-HackON
```

### 2. Local DynamoDB + seed
```bash
docker-compose up -d                      # DynamoDB Local on :8001
cd backend && uv sync
uv run python -m app.db.tables            # create tables
uv run python -m app.db.seed              # seed users, orders, consumption rates
```

### 3. Pull embedding model
```bash
ollama pull mxbai-embed-large             # 670MB, MTEB 64.68, 1024-dim
```

### 4. Build product search index
```bash
# One-time, ~3 min for 24k products
uv run python -m app.db.embed_catalog --source json --reset
```

### 5. Start backend
```bash
# --host 0.0.0.0 makes it accessible from phone on same WiFi
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 6. Start frontend
```bash
cd ../frontend && npm install && npm run dev
```

Open **http://localhost:3000** → Login → **Tap & Ramble** or **Scan**

> **Phone testing:** `http://<your-laptop-ip>:3000` — mic/voice works over HTTP.  
> Camera requires HTTPS — use AWS deployment or ngrok for full phone testing.

---

## AWS Deployment

### Recommended Architecture

```
Route 53 (yourdomain.com)
    │
    ├──► Amplify / CloudFront + S3  ─────── Next.js frontend (HTTPS ✓)
    │
    └──► Application Load Balancer (HTTPS)
              │
              EC2 / ECS Fargate  ────────── FastAPI backend :8000
                    │
                    ├──► DynamoDB    (ap-south-1, same region, IAM role)
                    └──► Bedrock     (Nova Sonic — optional)
```

### Option A — EC2 (Quickest for Hackathon)

**1. Launch EC2 instance**
```
AMI:           Amazon Linux 2023
Type:          t3.medium (2 vCPU, 4GB) — t3.large if running Ollama locally
Security Group: inbound 22 (SSH), 8000 (API), 3000 (frontend) from 0.0.0.0/0
IAM Role:      attach role with AmazonDynamoDBFullAccess + AmazonBedrockFullAccess
```

**2. Install dependencies**
```bash
# Python + uv
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc

# Node.js 20
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
DYNAMODB_ENDPOINT=          # empty → real AWS DynamoDB
DYNAMODB_REGION=ap-south-1
DYNAMODB_ACCESS_KEY=        # empty → uses EC2 IAM role
DYNAMODB_SECRET_KEY=

VOICE_PROVIDER=gemini
GEMINI_API_KEY=your_key

EMBEDDING_PROVIDER=openai
EMBEDDING_BASE_URL=https://api.openai.com/v1
EMBEDDING_API_KEY=your_openai_key
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

CORS_ORIGINS=*              # restrict after testing
```

**4. Seed DynamoDB + build index**
```bash
uv sync
uv run python -m app.db.tables
uv run python -m app.db.seed
uv run python -m app.db.embed_catalog --source json --reset
```

**5. Run backend as systemd service**
```bash
sudo tee /etc/systemd/system/amazonnow-backend.service << 'EOF'
[Unit]
Description=Amazon Now Backend
After=network.target

[Service]
User=ec2-user
WorkingDirectory=/home/ec2-user/Amazon-HackON/backend
EnvironmentFile=/home/ec2-user/Amazon-HackON/backend/.env
ExecStart=/home/ec2-user/.local/bin/uv run uvicorn app.main:app \
  --host 0.0.0.0 --port 8000 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl enable --now amazonnow-backend
```

**6. Build + run frontend**
```bash
cd ../frontend
npm install

# Point to your EC2 IP or domain
echo "NEXT_PUBLIC_API_URL=http://<EC2_PUBLIC_IP>:8000" > .env.local

npm run build

# Run as systemd service
sudo tee /etc/systemd/system/amazonnow-frontend.service << 'EOF'
[Unit]
Description=Amazon Now Frontend
After=network.target

[Service]
User=ec2-user
WorkingDirectory=/home/ec2-user/Amazon-HackON/frontend
ExecStart=/usr/bin/npm start -- --port 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl enable --now amazonnow-frontend
```

**Access:**
- Frontend: `http://<EC2_PUBLIC_IP>:3000`
- API + Swagger: `http://<EC2_PUBLIC_IP>:8000/docs`

---

### Option B — Amplify (Frontend) + EC2 (Backend)

This gives HTTPS automatically on Amplify → camera + mic work on mobile.

**Frontend on AWS Amplify:**
1. AWS Console → Amplify → New app → Connect GitHub repo
2. Build settings (set manually if not auto-detected):
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - cd frontend && npm install
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: frontend/.next
       files:
         - '**/*'
     cache:
       paths:
         - frontend/node_modules/**/*
   ```
3. Set environment variables in Amplify console:
   ```
   NEXT_PUBLIC_API_URL      = https://your-ec2-domain.com:8000
   NEXT_PUBLIC_USER_ID      = u001
   ```
4. Deploy → Amplify provides `https://main.xxxx.amplifyapp.com` ✓

**Backend on EC2:** Follow Option A steps 1–5.

---

### Add HTTPS (Required for Camera + Mic on Mobile)

**Option 1 — Nginx + Certbot (free SSL)**
```bash
sudo yum install -y nginx certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
# Nginx proxies :443 → :8000 (backend) and :443/app → :3000 (frontend)
```

**Option 2 — AWS ALB + ACM certificate**
1. ACM: request free certificate for your domain
2. ALB: create HTTPS listener (443) → forward to EC2 target group :8000
3. Update `NEXT_PUBLIC_API_URL=https://your-alb-dns.amazonaws.com`

Once HTTPS is live → camera scan and microphone work on all mobile browsers.

---

## Switching Voice Provider to Nova Sonic

```bash
# backend/.env
VOICE_PROVIDER=nova_sonic
AWS_ACCESS_KEY_ID=your_key     # or use IAM role on EC2 (leave empty)
AWS_SECRET_ACCESS_KEY=your_key
AWS_REGION=ap-south-1
```

**Enable in AWS Console:** Bedrock → Model access → Amazon Nova Sonic → Request access

> **Note:** Nova Sonic is audio-only. Vision scanning (camera) requires `VOICE_PROVIDER=gemini`.  
> If AWS credentials are missing, backend auto-falls back to Gemini with a log warning.

---

## Swapping Embedding Model

Change 4 env vars in `backend/.env` — zero code changes:

```bash
# OpenAI (recommended for production)
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

# Ollama (local GPU — dev default)
EMBEDDING_PROVIDER=ollama
EMBEDDING_BASE_URL=http://localhost:11434/v1
EMBEDDING_API_KEY=ollama
EMBEDDING_MODEL=mxbai-embed-large
EMBEDDING_DIMENSIONS=1024
```

After changing model, **rebuild ChromaDB**:
```bash
cd backend
uv run python -m app.db.embed_catalog --source json --reset
```

---

## Re-enriching the Catalog

Run offline when adding new products or changing enrichment quality:

```bash
cd backend
# Set ENRICH_API_KEY in .env (Mistral API key — get free $5 credit at console.mistral.ai)

# Enrich (crash-safe — saves every batch, resumable)
uv run python -m app.db.enrich_catalog --workers 10 --concurrency 8

# If interrupted, resume:
uv run python -m app.db.enrich_catalog --resume

# Check progress:
uv run python -m app.db.enrich_catalog --status

# Merge + rebuild search index:
uv run python -m app.db.enrich_catalog --merge
uv run python -m app.db.embed_catalog --source json --reset
```

---

## Project Structure

```
Amazon-HackON/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py              # pydantic-settings — all env vars
│   │   │   ├── embeddings/
│   │   │   │   ├── client.py          # Provider-agnostic embedding client
│   │   │   │   └── product_index.py   # ChromaDB hybrid search engine
│   │   │   ├── gemini/
│   │   │   │   └── live_client.py     # Gemini Live WebSocket proxy
│   │   │   ├── aws/
│   │   │   │   └── nova_sonic_client.py # Nova Sonic HTTP/2 bidir client
│   │   │   └── llm/
│   │   │       └── openai_compatible.py # OpenAI-compatible LLM client
│   │   ├── db/
│   │   │   ├── client.py              # DynamoDB boto3 client (IAM-aware)
│   │   │   ├── tables.py              # Create DynamoDB tables
│   │   │   ├── seed.py                # Generate realistic mock data
│   │   │   ├── fetch_catalog.py       # Download + parse BigBasket CSV
│   │   │   ├── enrich_catalog.py      # LLM enrichment pipeline (offline)
│   │   │   ├── embed_catalog.py       # Build ChromaDB index
│   │   │   ├── catalog.json           # 24,138 enriched products
│   │   │   └── helpers.py             # table(), _serialize()
│   │   ├── routers/
│   │   │   ├── ramble.py              # Voice + vision WebSocket + CanvasState
│   │   │   ├── products.py            # Product search + CRUD
│   │   │   ├── home.py                # Composite home feed endpoint
│   │   │   ├── orders.py              # Order history + routines
│   │   │   └── product_image.py       # On-demand images (JPG or SVG)
│   │   └── main.py                    # FastAPI app + CORS + router mounts
│   ├── .env                           # Local dev config (gitignored)
│   ├── .env.example                   # Production template
│   └── pyproject.toml
│
└── frontend/
    ├── app/                           # Next.js App Router
    │   ├── page.tsx                   # Home (SSR)
    │   ├── products/page.tsx          # Product catalog (SSR)
    │   ├── cart/page.tsx              # Cart (CSR)
    │   ├── checkout/page.tsx          # Checkout (CSR)
    │   ├── payment/page.tsx           # Payment + success (CSR)
    │   ├── orders/page.tsx            # Orders + routines (SSR)
    │   ├── profile/page.tsx           # Profile (SSR)
    │   ├── login/page.tsx             # Demo login (CSR)
    │   ├── layout.tsx                 # Root layout + Ramble + Vision buttons
    │   └── globals.css
    ├── components/
    │   ├── shared/                    # Header, BottomNav, SearchBar, AuthShell
    │   ├── home/                      # CategoryStrip, ReminderCards, RunningLow*
    │   ├── voice/                     # RambleButton, RambleCanvas, VisionButton
    │   ├── cart/                      # CartSheet (slide-up drawer)
    │   └── ui/                        # Radix UI primitives (shadcn)
    ├── hooks/
    │   └── useRambleWebSocket.ts      # WebSocket + audio/image hook (singleton WS)
    ├── store/                         # Zustand: cart, checkout, ramble, auth, notifications
    ├── lib/
    │   ├── api.ts                     # Server-side API fetchers
    │   ├── api-url.ts                 # Dynamic API URL (hostname-aware)
    │   └── audio-capture.ts           # PCM16 mic capture (ScriptProcessorNode)
    ├── .env.local                     # Local overrides (gitignored)
    └── .env.example                   # Frontend env template
```

---

## Voice Commands

| Say | Action |
|-----|--------|
| `"Add [product]"` | Search + cross-verify + add to canvas |
| `"Add 2 [product]"` | Add with quantity |
| `"Make that 2"` | Update last added quantity |
| `"Remove the milk"` | Remove item from canvas |
| `"Replace milk with curd"` | Swap product in canvas |
| `"What's in my cart?"` | Gemini reads back canvas |
| `"Done"` / `"That's all"` | End session (no action) |

---

## AWS Services Used

| Service | Usage |
|---------|-------|
| **Amazon DynamoDB** | Primary database — 6 tables, PAY_PER_REQUEST. Runs locally via Docker in dev. IAM role supported for credential-free production on EC2/ECS. |
| **Amazon Nova Sonic** (Bedrock) | Real-time voice AI via `InvokeModelWithBidirectionalStream`. Audio-only. Activated by `VOICE_PROVIDER=nova_sonic`. Full HTTP/2 bidirectional implementation with 6 tool functions — same interface as Gemini. |
| **Amazon EC2 / ECS** | Recommended deployment target for FastAPI backend |
| **AWS Amplify** | Recommended deployment for Next.js frontend (auto-HTTPS) |
| **AWS ALB + ACM** | HTTPS termination for backend (camera/mic on mobile) |
