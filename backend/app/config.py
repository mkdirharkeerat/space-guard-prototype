import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
TLE_CACHE_DIR = DATA_DIR / "tle_cache"

# Ensure directories exist
TLE_CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Endpoints
CELESTRAK_ACTIVE_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle"
CELESTRAK_STATIONS_URL = "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle"

# Cache settings
CACHE_TTL_HOURS = 6

# Physical constants
MU_EARTH_KM3_S2 = 398600.4418

# Default physical assumptions
DEFAULT_HBR_KM = 0.002  # 2 meters combined
DEFAULT_SIGMA_KM = 1.0  # 1 km positional uncertainty

# Screening thresholds
COARSE_TIME_STEP_S = 300
SCREEN_THRESHOLD_KM = 25.0

# Risk tiers based on Probability of Collision (Pc)
PC_THRESHOLDS = {
    "Critical": 1e-4,
    "High": 1e-5,
    "Moderate": 1e-6,
    "Low": 0.0
}
