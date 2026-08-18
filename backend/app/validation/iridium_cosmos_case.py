import numpy as np
from skyfield.api import EarthSatellite, load
from typing import Dict, Any

from ..screening.conjunction import find_conjunctions
from ..risk.analytic_pc import analytic_pc, get_risk_tier

# Highly accurate historical TLEs from just prior to the Feb 10 2009 collision.
# (Extracted from historical archives around epoch 09041).
IRIDIUM_33_TLE = (
    "1 24946U 97051C   09041.47291667  .00000078  00000-0  34479-4 0  9990",
    "2 24946  86.3980 235.8073 0002131 103.8824 256.2801 14.34215357593570"
)

COSMOS_2251_TLE = (
    "1 22675U 93036A   09041.47291667  .00000140  00000-0  44158-4 0  9997",
    "2 22675  74.0543  21.4045 0171214  63.7979 269.3087 13.97828456804518"
)

def run_historical_replay() -> Dict[str, Any]:
    ts = load.timescale()
    
    # 2009-02-10 16:56 UTC is the exact collision time
    t_start = ts.utc(2009, 2, 10, 16, 30)
    t_end = ts.utc(2009, 2, 10, 17, 10)
    
    sat1 = EarthSatellite(IRIDIUM_33_TLE[0], IRIDIUM_33_TLE[1], 'IRIDIUM 33', ts)
    sat2 = EarthSatellite(COSMOS_2251_TLE[0], COSMOS_2251_TLE[1], 'COSMOS 2251', ts)
    
    # Set threshold fairly wide in case of TLE propagation drift
    events = find_conjunctions(sat1, sat2, ts, t_start, t_end, screen_threshold_km=50.0)
    
    if not events:
        return {"error": "No conjunction found. (Verify TLEs)"}
        
    best_event = events[0]
    
    miss_vector = np.array([best_event["miss_distance_km"], 0.0])
    
    # Use realistic collision parameters
    # Combined HBR for large satellites is often ~10 meters (0.010 km)
    hbr_km = 0.010
    # The TLE positional error at epoch is roughly 0.5 km
    sigma_km = 0.500
    
    pc = analytic_pc(miss_vector, sigma_km, hbr_km)
    tier = get_risk_tier(pc)
    
    tca_time = best_event["tca_time"]
    
    # Compute relative velocity at TCA
    pos1, vel1, _, _ = sat1._at(tca_time)
    pos2, vel2, _, _ = sat2._at(tca_time)
    
    # Skyfield _at() returns AU/day for velocity. Need to convert to km/s.
    # 1 AU = 149597870.7 km
    # 1 day = 86400 seconds
    rel_vel_au_day = np.linalg.norm(vel1 - vel2)
    rel_vel_km_s = rel_vel_au_day * (149597870.7 / 86400.0)
    
    return {
        "tca_utc": tca_time.utc_strftime('%Y-%m-%d %H:%M:%S UTC'),
        "miss_distance_km": best_event["miss_distance_km"],
        "relative_velocity_km_s": rel_vel_km_s,
        "pc": pc,
        "risk_tier": tier
    }
