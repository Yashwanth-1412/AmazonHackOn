"""Voice feature schemas."""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class VoiceItem(BaseModel):
    product_name: str
    quantity: int = Field(ge=1, le=100)
    unit: str
    category: str
    matched_product_id: Optional[str] = None
    confidence: float = Field(ge=0, le=1)
    brand_recommendation: Optional[str] = None
    brand_options: list[dict] = Field(default_factory=list)


class VoiceIntentResponse(BaseModel):
    items: list[VoiceItem]
    action: Literal["add_to_cart", "remove_from_cart", "unknown"]


class BrandChoiceRequest(BaseModel):
    user_id: str
    product_id: str
    selected_brand: str
    original_transcript: str


class BrandChoiceResponse(BaseModel):
    success: bool
    product_id: str
    brand: str
    message: str


class VoiceSessionStart(BaseModel):
    user_id: str
    language_code: str = "en-IN"


class VoiceSessionStatus(BaseModel):
    session_id: str
    status: Literal["connecting", "ready", "processing", "error", "closed"]
    message: Optional[str] = None


class RecognizedProduct(BaseModel):
    product_id: str
    name: str
    brand: str
    variant: str
    category: str = "grocery"
    price: float
    quantity: int
    image: str
    confidence: float
    brand_options: list[dict] = Field(default_factory=list)
    needs_brand_confirmation: bool = False


class VoiceTranscriptUpdate(BaseModel):
    type: Literal["interim", "final"]
    transcript: str
    confidence: float
    recognized_products: list[RecognizedProduct] = Field(default_factory=list)