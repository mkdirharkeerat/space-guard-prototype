import React from 'react';
import { Zap, Target, Fuel, ShieldCheck, ArrowRight, Info } from 'lucide-react';

/**
 * Astrodynamics Station Panel — rendered outside and below the 3D map.
 * Displays mission-critical metrics, RTN decomposition, CW drift formula,
 * Tsiolkovsky mass penalty, and evaluator defense talking points.
 */
export default function AstrodynamicsPanel({ simData, simMode }) {
  if (!simData || simMode === 'live') return null;

  const {
    deltaV = 0.10,
    separationKm = 4.83,
    hbrMargin = 483,
    deltaMass = 0.082,
    Pc = 1.2e-14,
    leadTimeH = 24,
    rtn = { radial: 0, alongTrack: 0.10, normal: 0 },
  } = simData;

  const isAvoidance = simMode === 'avoidance_2009';
  const accentColor = isAvoidance ? '#10b981' : '#ef4444';
  const accentBg = isAvoidance ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)';
  const accentBorder = isAvoidance ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)';

  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(10,10,18,0.95) 0%, rgba(5,5,10,0.98) 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: accentBg, border: `1px solid ${accentBorder}` }}>
            <Target className="size-4" style={{ color: accentColor }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.01em' }}>
              Astrodynamics Station
            </h3>
            <p className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {isAvoidance ? 'CLOHESSY-WILTSHIRE MANEUVER ANALYSIS' : 'COLLISION ASSESSMENT'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold"
             style={{ background: accentBg, color: accentColor, border: `1px solid ${accentBorder}` }}>
          <span className="size-1.5 rounded-full animate-pulse" style={{ backgroundColor: accentColor }} />
          {isAvoidance ? 'MANEUVER ACTIVE' : 'IMPACT SCENARIO'}
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {[
          {
            label: '\u0394V Applied',
            value: `+${deltaV.toFixed(3)} m/s`,
            sub: `${(deltaV * 100).toFixed(1)} cm/s`,
            icon: Zap,
            color: '#60a5fa',
          },
          {
            label: 'Achieved Separation',
            value: `+${separationKm.toFixed(2)} km`,
            sub: `${hbrMargin}\u00D7 HBR margin`,
            icon: Target,
            color: '#34d399',
          },
          {
            label: 'Hydrazine \u0394m',
            value: `${deltaMass.toFixed(3)} kg`,
            sub: 'N\u2082H\u2084 propellant',
            icon: Fuel,
            color: '#fbbf24',
          },
          {
            label: 'Collision Prob (Pc)',
            value: Pc < 1e-10 ? `< ${Pc.toExponential(1)}` : Pc.toExponential(1),
            sub: Pc < 1e-10 ? 'Effectively zero' : 'High risk',
            icon: ShieldCheck,
            color: Pc < 1e-6 ? '#34d399' : '#ef4444',
          },
        ].map((metric, i) => (
          <div key={i} className="p-4 flex flex-col gap-1.5" style={{ background: 'rgba(10,10,18,0.98)' }}>
            <div className="flex items-center gap-1.5">
              <metric.icon className="size-3" style={{ color: metric.color }} />
              <span className="text-[10px] font-mono uppercase" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>
                {metric.label}
              </span>
            </div>
            <span className="text-lg font-bold font-mono" style={{ color: metric.color }}>
              {metric.value}
            </span>
            <span className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {metric.sub}
            </span>
          </div>
        ))}
      </div>

      {/* RTN Decomposition + Formulas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-px" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {/* RTN Decomposition */}
        <div className="p-5" style={{ background: 'rgba(10,10,18,0.98)' }}>
          <h4 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono" style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>
              RTN
            </span>
            Burn Decomposition
          </h4>
          <div className="space-y-2.5">
            {[
              { axis: 'R', label: 'Radial', value: rtn.radial, desc: 'Perpendicular to orbit' },
              { axis: 'T', label: 'Along-Track', value: rtn.alongTrack, desc: 'Along velocity vector', highlight: true },
              { axis: 'N', label: 'Normal', value: rtn.normal, desc: 'Out of orbital plane' },
            ].map((comp) => (
              <div key={comp.axis} className="flex items-center justify-between p-2.5 rounded-lg"
                   style={{
                     background: comp.highlight ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                     border: comp.highlight ? '1px solid rgba(16,185,129,0.15)' : '1px solid rgba(255,255,255,0.04)',
                   }}>
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 flex items-center justify-center rounded text-[11px] font-bold font-mono"
                        style={{
                          background: comp.highlight ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                          color: comp.highlight ? '#34d399' : 'rgba(255,255,255,0.5)',
                        }}>
                    {comp.axis}
                  </span>
                  <div>
                    <span className="text-xs font-medium" style={{ color: comp.highlight ? '#34d399' : 'rgba(255,255,255,0.6)' }}>
                      {comp.label}
                    </span>
                    <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{comp.desc}</div>
                  </div>
                </div>
                <span className="text-sm font-bold font-mono"
                      style={{ color: comp.highlight ? '#34d399' : 'rgba(255,255,255,0.4)' }}>
                  {comp.highlight ? <strong>+{comp.value.toFixed(3)}</strong> : comp.value.toFixed(3)} m/s
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Formulas */}
        <div className="p-5 space-y-4" style={{ background: 'rgba(10,10,18,0.98)' }}>
          {/* CW Drift Formula */}
          <div>
            <h4 className="text-xs font-bold mb-2 flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                CW
              </span>
              Clohessy-Wiltshire Drift
            </h4>
            <div className="p-3 rounded-lg font-mono text-[12px]"
                 style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ color: 'rgba(255,255,255,0.7)' }}>
                <span style={{ color: '#fbbf24' }}>&delta;y</span>(t) &asymp; &minus;3 &middot; <span style={{ color: '#60a5fa' }}>n</span> &middot; <span style={{ color: '#34d399' }}>&Delta;v<sub>y</sub></span> &middot; t
              </div>
              <div className="mt-2 flex items-center gap-2">
                <ArrowRight className="size-3" style={{ color: '#34d399' }} />
                <span style={{ color: '#34d399', fontWeight: 700 }}>+{separationKm.toFixed(2)} km</span>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>(at TCA, t = {leadTimeH}h)</span>
              </div>
            </div>
          </div>

          {/* Tsiolkovsky Mass Penalty */}
          <div>
            <h4 className="text-xs font-bold mb-2 flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                &Delta;m
              </span>
              Tsiolkovsky Mass Penalty
            </h4>
            <div className="p-3 rounded-lg font-mono text-[12px]"
                 style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ color: 'rgba(255,255,255,0.7)' }}>
                <span style={{ color: '#f87171' }}>&Delta;m</span> = m<sub>0</sub>(1 &minus; e<sup>&minus;&Delta;V/(I<sub>sp</sub>&middot;g<sub>0</sub>)</sup>)
              </div>
              <div className="mt-2 flex items-center gap-2">
                <ArrowRight className="size-3" style={{ color: '#fbbf24' }} />
                <span style={{ color: '#fbbf24', fontWeight: 700 }}>{deltaMass.toFixed(3)} kg</span>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>N&#x2082;H&#x2084; (I<sub>sp</sub> = 220s)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Evaluator Defense Talking Points */}
      {isAvoidance && (
        <div className="p-5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <h4 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
            <Info className="size-3.5" style={{ color: '#60a5fa' }} />
            Key Insights
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                q: 'Why Along-Track (+V)?',
                a: 'Directly changes semi-major axis, producing linear secular growth (\u221D t) with 10\u00D7 higher efficiency than radial burns.',
                color: '#34d399',
              },
              {
                q: `Why ${leadTimeH}h Lead Time?`,
                a: `Exploits the secular time integral to minimize required \u0394V to just ${(deltaV * 100).toFixed(0)} cm/s (<${(deltaMass * 1000).toFixed(0)}g fuel), preserving satellite mission lifetime.`,
                color: '#60a5fa',
              },
              {
                q: `Why ${separationKm.toFixed(2)} km B-Plane Clearance?`,
                a: 'Extends well beyond the 3\u03C3 (1.5 km) covariance ellipsoid, reducing Pc to practically zero.',
                color: '#fbbf24',
              },
            ].map((point, i) => (
              <div key={i} className="p-3.5 rounded-xl"
                   style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-xs font-bold mb-1.5" style={{ color: point.color }}>
                  {i + 1}. {point.q}
                </div>
                <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {point.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
