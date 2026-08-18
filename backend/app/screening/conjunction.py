from scipy.optimize import minimize_scalar
import numpy as np
from typing import List, Dict, Any
from skyfield.api import EarthSatellite, Time
from ..config import COARSE_TIME_STEP_S, SCREEN_THRESHOLD_KM

def relative_distance_km(t_offset_s: float, sat_i: EarthSatellite, sat_j: EarthSatellite, ts: Any, t_start: Time) -> float:
    # t_offset_s is seconds from t_start
    ti = ts.tt_jd(t_start.tt + t_offset_s / 86400.0)
    ri = sat_i.at(ti).position.km
    rj = sat_j.at(ti).position.km
    return float(np.linalg.norm(ri - rj))

def find_conjunctions(sat_i: EarthSatellite, sat_j: EarthSatellite, ts: Any, t_start: Time, t_end: Time,
                       coarse_step_s: float = COARSE_TIME_STEP_S, 
                       screen_threshold_km: float = SCREEN_THRESHOLD_KM) -> List[Dict[str, Any]]:
    
    t_start_s = 0.0
    t_end_s = (t_end.tt - t_start.tt) * 86400.0
    
    times = np.arange(t_start_s, t_end_s, coarse_step_s)
    dists = [relative_distance_km(t, sat_i, sat_j, ts, t_start) for t in times]

    events = []
    for k in range(1, len(dists) - 1):
        if dists[k] < dists[k-1] and dists[k] < dists[k+1]:
            # Local minimum found
            result = minimize_scalar(
                relative_distance_km, args=(sat_i, sat_j, ts, t_start),
                bounds=(times[k-1], times[k+1]), method="bounded",
            )
            if result.fun < screen_threshold_km:
                tca_time = ts.tt_jd(t_start.tt + result.x / 86400.0)
                
                events.append({
                    "sat_i": sat_i,
                    "sat_j": sat_j,
                    "tca_time": tca_time,
                    "miss_distance_km": float(result.fun)
                })
    return events
