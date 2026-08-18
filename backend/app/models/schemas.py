from pydantic import BaseModel, Field
from typing import Optional, List


class ConjunctionEvent(BaseModel):
    target_id: str
    chaser_id: str
    tca_utc: str
    miss_distance_km: float
    relative_velocity_km_s: Optional[float] = None
    ml_prescreen_score: Optional[float] = None
    pc: float
    risk_tier: str


class ScanResponse(BaseModel):
    data_as_of: str
    object_count: int
    candidate_pairs: int
    events_found: int
    events: List[ConjunctionEvent]


class ManeuverRequest(BaseModel):
    miss_distance_km: float = Field(..., gt=0, description="Miss distance at TCA in km")
    relative_velocity_km_s: float = Field(..., gt=0, description="Relative velocity at TCA in km/s")
    delta_v_budget_m_s: float = Field(1.0, gt=0, description="Delta-V budget in m/s")
    burn_lead_time_hours: float = Field(24.0, gt=0, description="Burn lead time before TCA in hours")


class ManeuverResponse(BaseModel):
    burn_direction_rtn: List[float]
    delta_v_m_s: float
    baseline_miss_distance_km: float
    projected_miss_distance_km: float
    note: str


class ValidationResponse(BaseModel):
    description: str
    data_source: str
    assumption_sigma_km: float
    assumption_hbr_km: float
    tca_utc: str
    miss_distance_km: float
    relative_velocity_km_s: float
    pc: float
    risk_tier: str
