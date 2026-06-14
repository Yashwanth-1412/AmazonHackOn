"""
Enrich product catalog using LLM — parallel, resumable, crash-safe.

Usage:
  uv run python -m app.db.enrich_catalog                    # full run
  uv run python -m app.db.enrich_catalog --workers 5        # more workers
  uv run python -m app.db.enrich_catalog --resume           # resume from enrich_data.json
  uv run python -m app.db.enrich_catalog --limit 500        # only first 500
  uv run python -m app.db.enrich_catalog --status           # show progress
  uv run python -m app.db.enrich_catalog --merge            # merge into catalog.json
"""

import json
import asyncio
import argparse
import time
import signal
import sys
import os
import random
from pathlib import Path

# Force unbuffered output
os.environ["PYTHONUNBUFFERED"] = "1"
sys.stdout.reconfigure(line_buffering=True)

from openai import AsyncOpenAI

CATALOG_PATH = Path(__file__).parent / "catalog.json"
ENRICH_DATA_PATH = Path(__file__).parent / "enrich_data.json"

from app.core.config import settings

API_KEY = settings.ENRICH_API_KEY or ""
BASE_URL = settings.ENRICH_BASE_URL
MODEL = settings.ENRICH_MODEL

BATCH_SIZE = 10
STOP_FLAG = False

# Global semaphore — caps actual in-flight API calls regardless of worker count
# Gemini free tier: safe at 3 concurrent, tested OK at 5
API_SEMAPHORE: asyncio.Semaphore = None  # initialised in main()

SYSTEM_PROMPT = """You enrich Indian grocery products. Return a JSON array where each object has EXACTLY these keys:
{"id": "<copy from input>", "description": "short 1-sentence", "common_names": ["colloquial Indian name1","name2"], "packaging_color": "color", "tags": ["tag1","tag2","tag3"], "use_cases": ["use1","use2"], "search_terms": ["term1","term2","term3"]}

Rules:
- Output ONLY the JSON array. No markdown. No extra text. Start with [ and end with ].
- id must match input exactly.
- common_names = how Indian consumers colloquially refer to it (e.g. "blue lays", "maggi 2 min", "parle g biscuit").
- packaging_color = actual packet/bottle color in plain English.
- search_terms = natural voice-search phrases an Indian shopper would say."""


def atomic_write_json(path: Path, data):
    tmp = path.with_suffix(".tmp")
    with open(tmp, "w") as f:
        json.dump(data, f)
    tmp.replace(path)


def load_catalog() -> list[dict]:
    with open(CATALOG_PATH) as f:
        return json.load(f)


def load_enrich_data() -> dict:
    if ENRICH_DATA_PATH.exists():
        with open(ENRICH_DATA_PATH) as f:
            return json.load(f)
    return {}


def save_enrich_data(enrich_map: dict):
    atomic_write_json(ENRICH_DATA_PATH, enrich_map)


def show_status():
    catalog = load_catalog()
    enrich_map = load_enrich_data()
    total = len(catalog)
    done = len(enrich_map)
    remaining = total - done
    batches = (remaining + BATCH_SIZE - 1) // BATCH_SIZE if remaining > 0 else 0
    print(f"  Total:     {total}")
    print(f"  Enriched:  {done} ({done*100//total if total else 0}%)")
    print(f"  Remaining: {remaining}")
    print(f"  Batches:   {batches}")


async def enrich_batch(client: AsyncOpenAI, batch: list[dict]) -> list[dict]:
    simple_input = [
        {
            "id": p["id"],
            "name": p["name"],
            "brand": p["brand"],
            "variant": p.get("variant", ""),
            "category": p.get("category", ""),
            "price": p.get("price", 0),
        }
        for p in batch
    ]

    content = ""
    for attempt in range(4):
        try:
            # Semaphore caps concurrent in-flight requests
            async with API_SEMAPHORE:
                resp = await client.chat.completions.create(
                    model=MODEL,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": json.dumps(simple_input)},
                    ],
                    max_tokens=4000,
                    temperature=0.2,
                )
            content = (resp.choices[0].message.content or "").strip()

            # Strip markdown fences if present
            if content.startswith("```"):
                lines = content.split("\n")
                content = "\n".join(lines[1:-1]) if len(lines) > 2 else content

            result = json.loads(content)
            if isinstance(result, list):
                return result
            return []

        except json.JSONDecodeError:
            # Try to salvage a partial JSON array
            start = content.find("[")
            end = content.rfind("]") + 1
            if start >= 0 and end > start:
                try:
                    return json.loads(content[start:end])
                except json.JSONDecodeError:
                    pass
            if attempt < 3:
                await asyncio.sleep(1 + random.random())

        except Exception as e:
            msg = str(e)
            if "429" in msg:
                # Exponential backoff + jitter so workers don't all retry together
                wait = (2 ** attempt) * 5 + random.uniform(0, 3)
                print(f"    [W429] rate limit — wait {wait:.1f}s (attempt {attempt+1}/4)")
                await asyncio.sleep(wait)
            elif attempt < 3:
                await asyncio.sleep(2 + random.random())
            else:
                print(f"    [FAIL] {msg[:80]}")

    return []


async def worker(
    worker_id: int,
    client: AsyncOpenAI,
    queue: asyncio.Queue,
    enrich_map: dict,
    lock: asyncio.Lock,
    counter: list,
    total: int,
    start_time: float,
):
    global STOP_FLAG
    while not STOP_FLAG:
        try:
            batch = queue.get_nowait()
        except asyncio.QueueEmpty:
            break

        t0 = time.time()
        results = await enrich_batch(client, batch)
        batch_time = time.time() - t0

        lookup = {e["id"]: e for e in results if isinstance(e, dict) and "id" in e}
        new_count = 0

        async with lock:
            for p in batch:
                if p["id"] in lookup and p["id"] not in enrich_map:
                    enrichment = dict(lookup[p["id"]])
                    enrichment.pop("id", None)
                    enrich_map[p["id"]] = enrichment
                    new_count += 1
                    counter[0] += 1

            # Save after every batch — no data loss on crash
            if new_count > 0:
                save_enrich_data(enrich_map)

        done = counter[0]
        elapsed = time.time() - start_time
        rate = done / elapsed if elapsed > 0 else 0
        eta = (total - done) / rate if rate > 0 else 0
        pct = done * 100 // total if total > 0 else 0
        qsize = queue.qsize()

        status = "✓" if new_count == len(batch) else ("~" if new_count > 0 else "✗")
        print(f"  [W{worker_id:2d}] {status} +{new_count:2d} | {done:5d}/{total} ({pct:2d}%) | "
              f"q:{qsize:4d} | {rate:.1f}/s | ETA:{eta/60:.1f}m | {batch_time:.1f}s")


def signal_handler(sig, frame):
    global STOP_FLAG
    if STOP_FLAG:
        os.write(1, b"\n  *** Force quit ***\n")
        os._exit(1)
    os.write(1, b"\n\n  *** Ctrl+C caught - finishing current batches then saving... ***\n")
    os.write(1, b"  *** Ctrl+C again to force quit ***\n")
    STOP_FLAG = True


async def main():
    global STOP_FLAG, API_SEMAPHORE
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    parser = argparse.ArgumentParser(description="Enrich catalog (parallel, crash-safe)")
    parser.add_argument("--limit",      type=int, default=50000)
    parser.add_argument("--resume",     action="store_true")
    parser.add_argument("--workers",    type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE)
    parser.add_argument("--concurrency",type=int, default=8,
                        help="Simultaneous API calls (8 tested safe for Mistral)")
    parser.add_argument("--status",     action="store_true")
    parser.add_argument("--merge",      action="store_true",
                        help="Merge enrich_data.json into catalog.json and exit")
    args = parser.parse_args()

    if args.status:
        show_status()
        return

    if args.merge:
        print("Merging enrich_data.json into catalog.json...")
        catalog = load_catalog()
        enrich_map = load_enrich_data()
        merged = sum(1 for p in catalog if p["id"] in enrich_map and not p.update(enrich_map[p["id"]]))
        atomic_write_json(CATALOG_PATH, catalog)
        print(f"  Merged {merged}/{len(catalog)} products → {CATALOG_PATH}")
        return

    # Init global semaphore
    API_SEMAPHORE = asyncio.Semaphore(args.concurrency)

    catalog   = load_catalog()
    enrich_map = load_enrich_data() if args.resume else load_enrich_data()

    to_enrich = [p for p in catalog if p["id"] not in enrich_map][:args.limit]
    total     = len(to_enrich)
    batches   = (total + args.batch_size - 1) // args.batch_size

    eta_est = batches / args.concurrency * 8 / 60  # rough: 8s/batch, concurrency in parallel

    print(f"=== Catalog Enrichment ===")
    print(f"  Model:           {MODEL}")
    print(f"  Total catalog:   {len(catalog)}")
    print(f"  Already done:    {len(enrich_map)}")
    print(f"  To enrich:       {total}")
    print(f"  Workers:         {args.workers}  (queue consumers)")
    print(f"  Concurrency:     {args.concurrency}  (max simultaneous API calls)")
    print(f"  Batch size:      {args.batch_size}")
    print(f"  API calls:       {batches}")
    print(f"  ETA estimate:    ~{eta_est:.0f} min")
    print(f"  Auto-save every: 100 products")
    print()

    queue = asyncio.Queue()
    for i in range(0, total, args.batch_size):
        queue.put_nowait(to_enrich[i : i + args.batch_size])

    client       = AsyncOpenAI(base_url=BASE_URL, api_key=API_KEY)
    lock         = asyncio.Lock()
    counter      = [0]
    start_time   = time.time()

    await asyncio.gather(*[
        worker(w, client, queue, enrich_map, lock, counter, total, start_time)
        for w in range(args.workers)
    ])

    # Final save
    print(f"\n  Saving {len(enrich_map)} products to enrich_data.json ...")
    save_enrich_data(enrich_map)

    # Merge into catalog.json
    print(f"  Merging into catalog.json ...")
    for p in catalog:
        if p["id"] in enrich_map:
            p.update(enrich_map[p["id"]])
    atomic_write_json(CATALOG_PATH, catalog)

    elapsed = time.time() - start_time
    print(f"\n=== Done ===")
    print(f"  Enriched:  {counter[0]}/{total}")
    print(f"  Total saved: {len(enrich_map)}")
    print(f"  Time:      {elapsed:.0f}s  ({counter[0]/max(elapsed,1):.1f} products/s)")
    print(f"  Catalog:   {CATALOG_PATH}")
    print(f"\n  Resume:  uv run python -m app.db.enrich_catalog --resume")


if __name__ == "__main__":
    asyncio.run(main())
