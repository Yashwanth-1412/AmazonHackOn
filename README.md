# Amazon Now — AI-Powered Quick Commerce

> **Amazon Hackathon 2026** — Bengaluru  
> 10-minute grocery delivery with voice-powered shopping via Gemini Live API + Amazon Nova Sonic

---

## What is this?

Amazon Now is a quick-commerce grocery delivery app with a **voice shopping canvas** (Ramble) — speak naturally to build a cart, just like Todoist Ramble but for groceries.

**Say:** _"Add a litre of Amul milk and blue lays"_  
**Result:** Canvas instantly shows both items, ready to checkout.

---

## Architecture

```
Browser (Next.js)
  │  PCM16 audio @ 16kHz
  ▼
FastAPI Backend (WebSocket)
  │  Bidirectional stream
  ├──► Gemini Live API   (current default)
  └──► Amazon Nova Sonic (swap with VOICE_PROVIDER=nova_sonic)
         │
         ▼ Tool calls: search_products, add/update/remove_from_canvas
         │
         ├──► ChromaDB (mxbai-embed-large embeddings, 24k products)
         └──► catalog.json (enriched with LLM: common_names, search_terms, tags)
```

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, TypeScript, Zustand, Tailwind CSS, Framer Motion |
| Backend | FastAPI, Python 3.12, uv |
| Voice (default) | Google Gemini Live API (`gemini-3.1-flash-live-preview`) |
| Voice (AWS) | Amazon Nova Sonic (`amazon.nova-sonic-v1:0`) via Bedrock |
| Vector Search | ChromaDB + `mxbai-embed-large` (Ollama) |
| Database | Amazon DynamoDB (local via Docker for dev) |
| Catalog | 24,138 products from BigBasket, enriched with Mistral Nemo |

---

## Quick Start

### Prerequisites
- Python 3.12+, Node 18+, [uv](https://docs.astral.sh/uv/), [Ollama](https://ollama.com)
- Docker (for local DynamoDB)

### 1. Clone & install

```bash
git clone <repo>
cd Amazon_Hackathon
```

### 2. Backend setup

```bash
cd backend
cp .env.example .env
# Fill in GEMINI_API_KEY in .env

uv sync

# Pull embedding model
ollama pull mxbai-embed-large

# Seed ChromaDB (24k products)
uv run python -m app.db.embed_catalog --source json --reset

# Start backend
uv run uvicorn app.main:app --reload --port 8000
```

### 3. Frontend setup

```bash
cd frontend
npm install
# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Open http://localhost:3000 and tap **Tap & Ramble** to start voice shopping.

---

## Voice Shopping (Ramble)

The Ramble feature streams your microphone audio to Gemini Live API (or Nova Sonic), which:

1. **Transcribes** your speech in real-time
2. **Understands intent** — "add 2 packets of Maggi and blue Lays"
3. **Searches** the product catalog via embeddings
4. **Cross-verifies** — won't add "laptop charger" just because it sounds like something
5. **Updates the canvas** instantly with matched products

### How to use
1. Tap the mic button (bottom-right)
2. Speak: _"Add Amul milk, Maggi noodles, and a packet of Parle-G"_
3. Watch items appear on the canvas
4. Tap **Add to Cart** to checkout, or **×** to discard

### Voice Commands
| Say | Action |
|-----|--------|
| "Add [product]" | Search + add to canvas |
| "Make that 2" | Update quantity |
| "Remove the milk" | Remove from canvas |
| "What's in my cart?" | Read back canvas |
| "Done" / "That's all" | End session |

---

## Switching to Amazon Nova Sonic

Once you have AWS credentials with Bedrock access:

```bash
# In backend/.env
VOICE_PROVIDER=nova_sonic
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=ap-south-1
NOVA_SONIC_MODEL=amazon.nova-sonic-v1:0
```

> **Enable model access:** AWS Console → Bedrock → Model access → Amazon Nova Sonic → Request access  
> **Region:** `ap-south-1` (Mumbai) recommended for India

The backend automatically uses `NovaSonicClient` when `VOICE_PROVIDER=nova_sonic` — zero frontend changes needed.

---

## Catalog Enrichment

The 24k-product catalog was enriched with Mistral Nemo to add:
- `common_names` — colloquial Indian names (e.g. "blue lays", "maggi 2 min")
- `search_terms` — voice-search phrases
- `tags` — searchable keywords
- `packaging_color` — actual packet color
- `description` — short product summary

To re-enrich (e.g. after adding new products):

```bash
cd backend
# Set ENRICH_API_KEY in .env (Mistral API key)
uv run python -m app.db.enrich_catalog --workers 10 --batch-size 10 --concurrency 5
# On crash/stop, resume with:
uv run python -m app.db.enrich_catalog --resume
# After completion:
uv run python -m app.db.enrich_catalog --merge
uv run python -m app.db.embed_catalog --source json --reset
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `WS` | `/api/ramble/stream?user_id=X` | Voice shopping WebSocket |
| `GET` | `/api/products` | List products (with category/search filter) |
| `GET` | `/api/products/{id}` | Single product |
| `GET` | `/api/products/{id}/image` | Product image (SVG fallback) |
| `GET` | `/api/home/{user_id}` | Home page data |
| `GET` | `/api/orders/{user_id}` | Order history |
| `GET` | `/health` | Health check |

---

## Environment Variables

See [`backend/.env.example`](backend/.env.example) for full reference.

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes (if `VOICE_PROVIDER=gemini`) | Google AI Studio key |
| `AWS_ACCESS_KEY_ID` | Yes (if `VOICE_PROVIDER=nova_sonic`) | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | Yes (if `VOICE_PROVIDER=nova_sonic`) | AWS credentials |
| `ENRICH_API_KEY` | Only for re-enrichment | Mistral API key |
| `DYNAMODB_ENDPOINT` | No | Default: `http://localhost:8001` |

---

## Project Structure

```
Amazon_Hackathon/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py              # All settings via pydantic-settings
│   │   │   ├── embeddings/            # mxbai-embed-large client + ChromaDB index
│   │   │   ├── gemini/                # Gemini Live API client
│   │   │   └── aws/                   # Amazon Nova Sonic client
│   │   ├── db/
│   │   │   ├── catalog.json           # 24k enriched products
│   │   │   ├── embed_catalog.py       # Seed ChromaDB
│   │   │   └── enrich_catalog.py      # LLM enrichment pipeline
│   │   └── routers/
│   │       ├── ramble.py              # Voice shopping WebSocket
│   │       ├── products.py            # Product CRUD
│   │       └── product_image.py       # On-demand product images (SVG)
│   ├── .env.example
│   └── pyproject.toml
└── frontend/
    ├── app/                           # Next.js App Router pages
    ├── components/voice/              # RambleButton, RambleCanvas, CanvasItemCard
    ├── hooks/useRambleWebSocket.ts    # WebSocket + audio capture hook
    ├── store/ramble.ts                # Zustand canvas state
    └── lib/audio-capture.ts           # PCM16 microphone capture
```
