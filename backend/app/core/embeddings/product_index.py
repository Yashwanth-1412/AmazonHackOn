"""
Product search using ChromaDB + vector embeddings.

Embeds the product catalog and provides cosine similarity search.
Hybrid: embedding similarity + keyword boost for exact brand/product matches.
"""

import re
import chromadb
from pathlib import Path
from typing import Optional

from app.core.config import settings
from app.core.embeddings.client import EmbeddingClient, embedding_client
from app.db.helpers import table, _serialize

CHROMA_PATH = Path(__file__).parent.parent.parent.parent / "chroma_db"
COLLECTION_NAME = "products"

# Common packaging color mappings (Indian grocery context)
_COLOR_ALIASES = {
    "blue": ["lays classic salted", "parle g", "blue packet"],
    "red": ["lays classic salted red", "kurkure", "red packet", "tomato"],
    "green": ["lays american cream onion", "green packet", "mint"],
    "yellow": ["lays classic salted yellow", "bingo", "yellow packet"],
    "orange": ["lays orange", "orange packet", "cheese"],
    "purple": ["lays purple", "purple packet", "chocolate"],
    "pink": ["lays pink", "strawberry"],
    "black": ["lays black", "black packet", "pepper"],
    "white": ["lays white", "salt"],
}


class ProductIndex:
    def __init__(
        self,
        emb_client: Optional[EmbeddingClient] = None,
        persist_dir: Optional[str] = None,
    ):
        self._emb_client = emb_client
        persist_path = str(persist_dir or CHROMA_PATH)
        self._chroma = chromadb.PersistentClient(path=persist_path)
        self._collection = self._chroma.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )

    @property
    def emb_client(self) -> EmbeddingClient:
        if self._emb_client is None:
            self._emb_client = embedding_client
        return self._emb_client

    async def embed_catalog(self, products: list[dict]) -> int:
        """
        Embed all products into ChromaDB.
        Call once after seeding DynamoDB catalog.
        Returns number of products embedded.
        """
        existing = self._collection.get()
        if existing["ids"]:
            self._collection.delete(ids=existing["ids"])

        if not products:
            return 0

        texts = []
        ids = []
        metadatas = []

        for p in products:
            text = self._product_to_text(p)
            texts.append(text)
            ids.append(p["id"])
            metadatas.append({
                "name": p["name"],
                "brand": p["brand"],
                "category": p.get("category", ""),
                "variant": p.get("variant", ""),
                "price": float(p.get("price", 0)),
            })

        # Embed in batches
        embeddings = await self.emb_client.embed_batch(texts, batch_size=200)

        # Add to ChromaDB in chunks (ChromaDB has a limit too)
        CHUNK = 500
        for i in range(0, len(ids), CHUNK):
            chunk_ids = ids[i:i+CHUNK]
            chunk_docs = texts[i:i+CHUNK]
            chunk_embs = embeddings[i:i+CHUNK]
            chunk_meta = metadatas[i:i+CHUNK]
            self._collection.add(
                ids=chunk_ids,
                documents=chunk_docs,
                embeddings=chunk_embs,
                metadatas=chunk_meta,
            )
            print(f"    ChromaDB: stored {min(i+CHUNK, len(ids))}/{len(ids)}")

        return len(products)

    async def search(self, query: str, top_k: int = 5) -> list[dict]:
        """
        Hybrid search: keyword-first + embedding similarity.
        1. If any product brand/name matches query keywords exactly, return those
        2. Otherwise fall back to embedding similarity
        """
        if self._collection.count() == 0:
            return []

        expanded_terms = self._expand_color_query(query)
        query_lower = query.lower()
        query_words = set(re.findall(r'\w+', query_lower))

        # Scan all products for keyword matches (fast on 24k in-memory metadata)
        all_data = self._collection.get(include=["metadatas"])
        keyword_matches = []

        for i, pid in enumerate(all_data["ids"]):
            meta = all_data["metadatas"][i]
            name = meta.get("name", "").lower()
            brand = meta.get("brand", "").lower()
            variant = meta.get("variant", "").lower()

            boost = self._keyword_score(query, expanded_terms, meta)
            if boost >= 0.22:  # Meaningful keyword match (brand+name or 2+ word overlap)
                keyword_matches.append({
                    "id": pid,
                    "name": meta.get("name", ""),
                    "brand": meta.get("brand", ""),
                    "category": meta.get("category", ""),
                    "variant": meta.get("variant", ""),
                    "price": meta.get("price", 0),
                    "score": round(min(1.0, 0.85 + boost), 3),
                    "document": "",
                })

        # If we have strong keyword matches, return them
        if keyword_matches:
            keyword_matches.sort(key=lambda x: -x["score"])
            return keyword_matches[:top_k]

        # Fallback: embedding similarity
        query_embedding = await self.emb_client.embed(query)
        fetch_k = min(top_k * 3, self._collection.count())
        results = self._collection.query(
            query_embeddings=[query_embedding],
            n_results=fetch_k,
            include=["documents", "metadatas", "distances"],
        )

        if not results["ids"][0]:
            return []

        matches = []
        for i, pid in enumerate(results["ids"][0]):
            distance = results["distances"][0][i]
            score = max(0, 1 - distance)
            meta = results["metadatas"][0][i]

            matches.append({
                "id": pid,
                "name": meta.get("name", ""),
                "brand": meta.get("brand", ""),
                "category": meta.get("category", ""),
                "variant": meta.get("variant", ""),
                "price": meta.get("price", 0),
                "score": round(score, 3),
                "document": results["documents"][0][i],
            })

        matches.sort(key=lambda x: -x["score"])
        return matches[:top_k]

    async def search_from_catalog(self, query: str, top_k: int = 5) -> list[dict]:
        """
        Search: if index is empty, fall back to DynamoDB scan + keyword match.
        Otherwise use hybrid embedding search.
        """
        if self._collection.count() == 0:
            return self._keyword_fallback(query, top_k)

        return await self.search(query, top_k)

    def _expand_color_query(self, query: str) -> list[str]:
        """Expand color references like 'blue lays' → 'classic salted'."""
        terms = []
        query_lower = query.lower()
        for color, aliases in _COLOR_ALIASES.items():
            if color in query_lower:
                terms.extend(aliases)
        return terms

    def _keyword_score(self, query: str, expanded_terms: list[str], meta: dict) -> float:
        """Compute keyword boost score (0.0 to 0.3) for exact matches."""
        boost = 0.0
        query_lower = query.lower()
        name = meta.get("name", "").lower()
        brand = meta.get("brand", "").lower()
        variant = meta.get("variant", "").lower()

        query_words = set(re.findall(r'\w+', query_lower))
        name_words = set(re.findall(r'\w+', name))
        brand_words = set(re.findall(r'\w+', brand))
        all_product_words = name_words | brand_words | set(re.findall(r'\w+', variant))

        # Single-word query that exactly matches a brand → strong signal
        if len(query_words) == 1 and brand and query_lower.strip() == brand:
            boost += 0.25

        # Exact brand in query (e.g. query "amul butter" contains brand "amul")
        elif brand and brand in query_lower:
            boost += 0.12

        # Query words that appear in product name
        name_overlap = query_words & name_words
        if len(name_overlap) >= 2:
            boost += 0.18
        elif len(name_overlap) == 1:
            boost += 0.06

        # Query words that appear anywhere in product (brand+name+variant)
        total_overlap = query_words & all_product_words
        if len(total_overlap) >= 2:
            boost += 0.10

        # Expanded color alias match
        if expanded_terms:
            for term in expanded_terms:
                term_words = set(re.findall(r'\w+', term))
                if term_words & all_product_words:
                    boost += 0.08
                    break

        return min(0.3, boost)

    def _keyword_fallback(self, query: str, top_k: int) -> list[dict]:
        """Fallback keyword search when embedding index is empty."""
        products_table = table("products")
        resp = products_table.scan(Limit=500)
        products = _serialize(resp.get("Items", []))

        query_lower = query.lower()
        expanded_terms = self._expand_color_query(query)
        results = []

        for p in products:
            if p.get("SK", "") != "METADATA":
                continue
            name = p.get("name", "").lower()
            brand = p.get("brand", "").lower()
            variant = p.get("variant", "").lower()
            score = 0

            if query_lower in name:
                score += 10
            if query_lower in brand:
                score += 5
            if any(query_lower in tag.lower() for tag in p.get("tags", [])):
                score += 3

            # Color alias fallback
            for term in expanded_terms:
                if term in name or term in variant:
                    score += 4
                    break

            if score > 0:
                results.append({
                    "id": p["id"],
                    "name": p["name"],
                    "brand": p["brand"],
                    "category": p.get("category", ""),
                    "variant": p.get("variant", ""),
                    "price": float(p.get("price", 0)),
                    "score": score / 10.0,
                })

        results.sort(key=lambda x: -x["score"])
        return results[:top_k]

    def _product_to_text(self, p: dict) -> str:
        """Convert product to embedding-friendly text with enriched context."""
        # Core fields
        parts = [
            p.get("brand", ""),
            p.get("name", ""),
            p.get("variant", ""),
            p.get("category", ""),
        ]

        # Enriched fields — massively boost search quality
        if p.get("description"):
            parts.append(p["description"])

        if p.get("common_names"):
            names = p["common_names"]
            if isinstance(names, list):
                parts.extend(names)
            elif isinstance(names, str):
                parts.append(names)

        if p.get("search_terms"):
            terms = p["search_terms"]
            if isinstance(terms, list):
                parts.extend(terms)
            elif isinstance(terms, str):
                parts.append(terms)

        if p.get("tags"):
            tags = p["tags"]
            if isinstance(tags, list):
                parts.extend(tags)

        if p.get("packaging_color"):
            parts.append(p["packaging_color"])

        return " ".join(filter(None, parts))

    def count(self) -> int:
        return self._collection.count()

    def reset(self):
        """Clear all embeddings."""
        existing = self._collection.get()
        if existing["ids"]:
            self._collection.delete(ids=existing["ids"])


product_index = ProductIndex()
