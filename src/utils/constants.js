// Space-Guard Constants & Helper Functions

export const RISK_TIERS = {
  CRITICAL: {
    name: 'Critical',
    threshold: 'Pc > 1.0e-4',
    color: '#f87171',
    bgClass: 'bg-red-500/8 text-red-400/90 border border-red-500/20',
    badgeClass: 'bg-red-500/10 text-red-300/90 border border-red-500/25 text-xs font-medium',
    pillClass: 'bg-red-500/10 text-red-300/90 border border-red-500/25 text-xs font-medium',
  },
  HIGH: {
    name: 'High',
    threshold: '1.0e-5 < Pc ≤ 1.0e-4',
    color: '#fb923c',
    bgClass: 'bg-orange-500/8 text-orange-400/90 border border-orange-500/20',
    badgeClass: 'bg-orange-500/10 text-orange-300/90 border border-orange-500/25 text-xs font-medium',
    pillClass: 'bg-orange-500/10 text-orange-300/90 border border-orange-500/25 text-xs font-medium',
  },
  MODERATE: {
    name: 'Moderate',
    threshold: '1.0e-6 < Pc ≤ 1.0e-5',
    color: '#fbbf24',
    bgClass: 'bg-amber-500/8 text-amber-400/90 border border-amber-500/20',
    badgeClass: 'bg-amber-500/10 text-amber-300/90 border border-amber-500/25 text-xs font-medium',
    pillClass: 'bg-amber-500/10 text-amber-300/90 border border-amber-500/25 text-xs font-medium',
  },
  LOW: {
    name: 'Low',
    threshold: 'Pc ≤ 1.0e-6',
    color: '#34d399',
    bgClass: 'bg-emerald-500/8 text-emerald-400/90 border border-emerald-500/20',
    badgeClass: 'bg-emerald-500/10 text-emerald-300/90 border border-emerald-500/25 text-xs font-medium',
    pillClass: 'bg-emerald-500/10 text-emerald-300/90 border border-emerald-500/25 text-xs font-medium',
  },
};

export const DEFAULT_ASSUMPTIONS = {
  sigma_km: 0.5,
  hbr_km: 0.010,
  mu_earth: 398600.4418,
  r_earth: 6378.137,
  algorithm_screening: 'Two-stage (±50km altitude band + Scipy scalar minimization)',
  algorithm_pc: 'Analytic 2D Gaussian B-Plane Integral (Foster/Alfano formulation)',
  algorithm_maneuver: 'Clohessy-Wiltshire STM with SVD Direction Optimization',
};

export function formatScientific(num, decimals = 2) {
  if (num === null || num === undefined) return 'N/A';
  if (num === 0) return '0.00';
  if (Math.abs(num) < 0.001 || Math.abs(num) >= 10000) {
    return Number(num).toExponential(decimals);
  }
  return Number(num).toFixed(decimals);
}

export function formatDistance(km) {
  if (km === null || km === undefined) return 'N/A';
  if (km < 1) {
    return `${(km * 1000).toFixed(1)} m`;
  }
  return `${Number(km).toFixed(3)} km`;
}

export function formatVelocity(kms) {
  if (kms === null || kms === undefined) return 'N/A';
  return `${Number(kms).toFixed(2)} km/s (${(Number(kms) * 3600).toLocaleString('en-US', { maximumFractionDigits: 0 })} km/h)`;
}

export function getTierData(tierStr, pc = 0) {
  if (!tierStr) {
    if (pc > 1e-4) return RISK_TIERS.CRITICAL;
    if (pc > 1e-5) return RISK_TIERS.HIGH;
    if (pc > 1e-6) return RISK_TIERS.MODERATE;
    return RISK_TIERS.LOW;
  }
  const upper = tierStr.toUpperCase();
  if (upper.includes('CRIT')) return RISK_TIERS.CRITICAL;
  if (upper.includes('HIGH')) return RISK_TIERS.HIGH;
  if (upper.includes('MOD')) return RISK_TIERS.MODERATE;
  return RISK_TIERS.LOW;
}
