from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class DataPointCreate(BaseModel):
    timestamp: Optional[datetime] = None
    source: str = Field(..., min_length=1)
    category: str = Field(..., min_length=1)
    value1: float
    value2: Optional[float] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    notes: Optional[str] = None

class DataPointOut(BaseModel):
    id: int
    timestamp: datetime
    source: str
    category: str
    value1: float
    value2: Optional[float]
    lat: Optional[float]
    lng: Optional[float]
    notes: Optional[str]

    class Config:
        orm_mode = True
