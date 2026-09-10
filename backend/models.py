from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, JSON, DateTime
from backend.database import Base


class CertificateRecord(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    cert_id = Column(String(100), unique=True, index=True, nullable=False)
    domain = Column(String(20), index=True, nullable=False)
    inputs = Column(JSON, nullable=False)
    coefficients = Column(JSON, nullable=True)
    shap_values = Column(JSON, nullable=False)
    baseline_prob = Column(Float, nullable=False)
    full_prob = Column(Float, nullable=False)
    verdict = Column(String(50), nullable=False)
    sha256_hash = Column(String(64), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
