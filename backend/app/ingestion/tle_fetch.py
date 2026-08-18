import os
import json
from datetime import datetime, timezone
import httpx
from ..config import CELESTRAK_ACTIVE_URL, TLE_CACHE_DIR, CACHE_TTL_HOURS

CACHE_FILE_PATH = TLE_CACHE_DIR / "active.txt"
METADATA_FILE_PATH = TLE_CACHE_DIR / "metadata.json"

def is_cache_valid() -> bool:
    if not METADATA_FILE_PATH.exists() or not CACHE_FILE_PATH.exists():
        return False
    
    try:
        with open(METADATA_FILE_PATH, "r") as f:
            metadata = json.load(f)
            
        fetched_at = metadata.get("fetched_at")
        if not fetched_at:
            return False
            
        fetched_time = datetime.fromisoformat(fetched_at)
        now = datetime.now(timezone.utc)
        delta_hours = (now - fetched_time).total_seconds() / 3600
        
        return delta_hours < CACHE_TTL_HOURS
    except Exception:
        return False

def fetch_active_tles(force_refresh: bool = False) -> str:
    if not force_refresh and is_cache_valid():
        with open(CACHE_FILE_PATH, "r") as f:
            return f.read()
            
    print("Fetching new TLEs from CelesTrak...")
    response = httpx.get(CELESTRAK_ACTIVE_URL, timeout=30.0)
    response.raise_for_status()
    
    tle_data = response.text
    
    # Save cache
    with open(CACHE_FILE_PATH, "w") as f:
        f.write(tle_data)
        
    metadata = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "source": "CelesTrak (active)"
    }
    with open(METADATA_FILE_PATH, "w") as f:
        json.dump(metadata, f)
        
    return tle_data
