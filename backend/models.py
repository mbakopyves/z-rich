from sqlalchemy import Column, Integer, String, Float, DateTime
from .database import Base
import datetime

class DataPoint(Base):
    __tablename__ = 'data_points'
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    source = Column(String, index=True)
    category = Column(String, index=True)
    value1 = Column(Float, nullable=False)
    value2 = Column(Float, nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    notes = Column(String, nullable=True)
