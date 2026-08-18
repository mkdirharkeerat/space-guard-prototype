import numpy as np

def eci_to_rtn(r_target: np.ndarray, v_target: np.ndarray, r_chaser: np.ndarray, v_chaser: np.ndarray):
    """
    Transforms the state of a chaser object into the RTN frame centered on the target object.
    Returns relative position and velocity in the RTN frame.
    """
    # Radial unit vector
    u_r = r_target / np.linalg.norm(r_target)
    
    # Normal (Cross-track) unit vector (direction of angular momentum)
    h = np.cross(r_target, v_target)
    u_n = h / np.linalg.norm(h)
    
    # Transverse (Along-track) unit vector
    u_t = np.cross(u_n, u_r)
    
    # Rotation matrix from ECI to RTN
    R_eci_to_rtn = np.vstack((u_r, u_t, u_n))
    
    # Relative state in ECI
    delta_r_eci = r_chaser - r_target
    delta_v_eci = v_chaser - v_target
    
    # Rigorous frame transformation of velocity includes the target's rotation rate
    omega = h / (np.linalg.norm(r_target)**2)
    
    r_rtn = R_eci_to_rtn @ delta_r_eci
    v_rtn = R_eci_to_rtn @ delta_v_eci - np.cross([0, 0, np.linalg.norm(omega)], r_rtn)
    
    return r_rtn, v_rtn

def cw_stm(n_rad_s: float, dt_s: float):
    """
    Computes the Clohessy-Wiltshire State Transition Matrices Phi_rr and Phi_rv
    for a given mean motion (n) and time interval (dt_s).
    """
    n = n_rad_s
    nt = n * dt_s
    
    s = np.sin(nt)
    c = np.cos(nt)
    
    Phi_rr = np.array([
        [4 - 3*c, 0, 0],
        [6*(s - nt), 1, 0],
        [0, 0, c]
    ])
    
    Phi_rv = np.array([
        [s/n, 2*(1-c)/n, 0],
        [-2*(1-c)/n, (4*s - 3*nt)/n, 0],
        [0, 0, s/n]
    ])
    
    return Phi_rr, Phi_rv

def plan_maneuver(r0_rtn: np.ndarray, v0_rtn: np.ndarray, n_rad_s: float, dt_s: float, delta_v_budget_m_s: float):
    """
    Plans an optimal impulsive avoidance maneuver given a delta_v budget.
    """
    Phi_rr, Phi_rv = cw_stm(n_rad_s, dt_s)
    
    # Use SVD to find the burn direction that maximizes the resulting position shift
    U, S, Vt = np.linalg.svd(Phi_rv)
    burn_direction = Vt[0] # The right singular vector associated with the largest singular value
    
    # Compute the delta v vector in km/s
    delta_v = (delta_v_budget_m_s / 1000.0) * burn_direction
    
    # Baseline miss distance at TCA without maneuver
    baseline_r_tca = Phi_rr @ r0_rtn + Phi_rv @ v0_rtn
    
    # Projected miss distance at TCA with maneuver
    new_r_tca = baseline_r_tca + Phi_rv @ delta_v
    
    return {
        "burn_direction_rtn": burn_direction.tolist(),
        "delta_v_m_s": delta_v_budget_m_s,
        "baseline_miss_distance_km": float(np.linalg.norm(baseline_r_tca)),
        "projected_miss_distance_km": float(np.linalg.norm(new_r_tca)),
    }
