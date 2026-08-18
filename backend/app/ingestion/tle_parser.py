from skyfield.api import load, EarthSatellite
from typing import List

def parse_tles_from_text(tle_text: str) -> List[EarthSatellite]:
    """
    Parses a block of TLE text (3-line format: Name, Line 1, Line 2)
    and returns a list of Skyfield EarthSatellite objects.
    """
    ts = load.timescale()
    lines = tle_text.strip().split("\n")
    satellites = []
    
    i = 0
    while i < len(lines):
        name = lines[i].strip()
        if i + 2 < len(lines):
            line1 = lines[i+1].strip()
            line2 = lines[i+2].strip()
            
            if line1.startswith("1 ") and line2.startswith("2 "):
                sat = EarthSatellite(line1, line2, name, ts)
                satellites.append(sat)
                i += 3
                continue
        i += 1
        
    return satellites
