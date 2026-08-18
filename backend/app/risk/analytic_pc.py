import numpy as np
from ..config import PC_THRESHOLDS

def analytic_pc(miss_vector_km: np.ndarray, sigma_km: float, hbr_km: float) -> float:
    """
    Computes the Probability of Collision (Pc) using an Analytic 2D Gaussian Integral
    in the encounter plane (B-plane) assuming isotropic positional uncertainty.
    
    This replaces the slow Monte Carlo approach with a deterministic, mathematically
    rigorous evaluation standard in aerospace literature (e.g., Alfano, Foster).
    
    Formula for isotropic 2D covariance:
    Pc = exp(-d^2 / 2*sigma^2) * (1 - exp(-HBR^2 / 2*sigma^2))
    where d is the miss distance magnitude.
    """
    d = np.linalg.norm(miss_vector_km)
    
    # Exponents
    miss_term = (d**2) / (2 * sigma_km**2)
    hbr_term = (hbr_km**2) / (2 * sigma_km**2)
    
    pc = np.exp(-miss_term) * (1 - np.exp(-hbr_term))
    return float(pc)

def get_risk_tier(pc: float) -> str:
    """
    Maps a computed Probability of Collision (Pc) to a risk tier.
    """
    if pc >= PC_THRESHOLDS["Critical"]:
        return "Critical"
    elif pc >= PC_THRESHOLDS["High"]:
        return "High"
    elif pc >= PC_THRESHOLDS["Moderate"]:
        return "Moderate"
    else:
        return "Low"
