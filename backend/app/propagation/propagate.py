from skyfield.api import EarthSatellite, Time
from typing import Tuple
import numpy as np

def propagate_satellite(sat: EarthSatellite, t: Time) -> Tuple[np.ndarray, np.ndarray]:
    """
    Propagates a satellite to a given Skyfield Time `t`.
    Returns position (km) and velocity (km/s) in GCRS (near-ECI) as numpy arrays.
    """
    geocentric = sat.at(t)
    r_km = geocentric.position.km
    v_km_s = geocentric.velocity.km_per_s
    
    return r_km, v_km_s
