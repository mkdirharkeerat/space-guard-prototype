import math
from typing import List, Tuple
from skyfield.api import EarthSatellite
from ..config import MU_EARTH_KM3_S2

def semi_major_axis_km(mean_motion_rev_per_day: float) -> float:
    n_rad_s = mean_motion_rev_per_day * 2 * math.pi / 86400
    return (MU_EARTH_KM3_S2 / n_rad_s**2) ** (1/3)

def altitude_band_km(a_km: float, e: float) -> Tuple[float, float]:
    return a_km * (1 - e), a_km * (1 + e)   # perigee, apogee radii

def bands_overlap(band_a: Tuple[float, float], band_b: Tuple[float, float], margin_km: float = 50.0) -> bool:
    return not (band_a[1] + margin_km < band_b[0] or band_b[1] + margin_km < band_a[0])

def filter_pairs(satellites: List[EarthSatellite], margin_km: float = 50.0) -> List[Tuple[EarthSatellite, EarthSatellite]]:
    """
    O(N^2) pass using cheap orbital elements to filter out safe pairs.
    Returns a list of candidate pairs that require refined screening.
    """
    bands = []
    for sat in satellites:
        # sat.model.no_kozai is mean motion in radians per minute
        n_rad_min = sat.model.no_kozai
        mean_motion_rev_per_day = n_rad_min * 1440 / (2 * math.pi)
        
        e = sat.model.ecco
        
        a_km = semi_major_axis_km(mean_motion_rev_per_day)
        band = altitude_band_km(a_km, e)
        bands.append(band)
        
    candidates = []
    n = len(satellites)
    for i in range(n):
        for j in range(i + 1, n):
            if bands_overlap(bands[i], bands[j], margin_km):
                candidates.append((satellites[i], satellites[j]))
                
    return candidates
