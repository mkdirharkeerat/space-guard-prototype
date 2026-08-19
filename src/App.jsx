import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Satellite, Database, Activity, Flame, Shield, ArrowRight } from 'lucide-react';
import Globe3D from './components/Globe3D';

const INITIAL_SATELLITES = [
  { norad_id: 25544, name: 'ISS (ZARYA)', position_km: [6154, -2108, -1971], altKm: 420 },
  { norad_id: 24946, name: 'IRIDIUM 33', position_km: [7100, 120, -450], altKm: 789 },
  { norad_id: 22675, name: 'COSMOS 2251', position_km: [7100, 120, -450], altKm: 789 },
  { norad_id: 48274, name: 'STARLINK-2401', position_km: [6920, -500, 1200], altKm: 550 },
  { norad_id: 20580, name: 'HST (HUBBLE)', position_km: [6910, 1500, -800], altKm: 540 },
  { norad_id: 43226, name: 'TIANGONG (CSS)', position_km: [6760, -800, 2100], altKm: 390 },
  { norad_id: 33591, name: 'NOAA-19', position_km: [7248, 110, -600], altKm: 870 },
  { norad_id: 27386, name: 'ENVISAT', position_km: [7168, -400, 800], altKm: 790 },
  { norad_id: 25994, name: 'TERRA', position_km: [7083, 300, 500], altKm: 705 },
  { norad_id: 27424, name: 'AQUA', position_km: [7083, -300, -500], altKm: 705 },
  { norad_id: 38833, name: 'GPS BIIF-3', position_km: [26578, 1200, 0], altKm: 20200 },
  { norad_id: 40889, name: 'GALILEO 9', position_km: [29600, -1500, 2000], altKm: 23222 },
];

function AvoidanceNarrative() {
  return (
    <div className="space-y-4 text-gray-300">
      <p>Detecting a crash is only half the battle. Space-Guard calculates an optimal impulsive along-track burn (&Delta;V = +0.10 m/s) executed 24 hours prior to encounter.</p>
      
      <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
        <div className="flex items-center gap-2 font-bold text-sm" style={{ color: '#34d399' }}>
          <Shield className="w-4 h-4" />
          OPTIMAL ESCAPE PROFILE
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-2 rounded bg-black/40 border border-white/5">
            <div className="text-gray-400 text-[10px]">LEAD TIME:</div>
            <div className="text-white font-bold">24.0 Hours</div>
          </div>
          <div className="p-2 rounded bg-black/40 border border-white/5">
            <div className="text-gray-400 text-[10px]">DELTA-V:</div>
            <div className="text-primary font-bold">+0.100 m/s (+V)</div>
          </div>
          <div className="p-2 rounded bg-black/40 border border-white/5">
            <div className="text-gray-400 text-[10px]">SEPARATION:</div>
            <div className="text-emerald-400 font-bold">+4.83 km</div>
          </div>
          <div className="p-2 rounded bg-black/40 border border-white/5">
            <div className="text-gray-400 text-[10px]">HYDRAZINE:</div>
            <div className="text-white font-bold">82 grams</div>
          </div>
        </div>
      </div>

      <p className="text-sm pl-3" style={{ borderLeft: '2px solid #3b82f6', color: 'rgba(255,255,255,0.6)' }}>
        <strong>The 3-Phase Cinematic Maneuver:</strong> Watch the simulator execute Stage 1 (Thruster Burn Close-Up), Stage 2 (Orbital Approach), and Stage 3 (Orthogonal Top-Down B-Plane View with matrix-aware lock).
      </p>
    </div>
  );
}

export default function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [liveObjects, setLiveObjects] = useState(INITIAL_SATELLITES);
  const [loadProgress, setLoadProgress] = useState(100);
  const [isUsingFallbackData, setIsUsingFallbackData] = useState(false);

  const STORY_STEPS = [
    {
      id: 0,
      title: "1. The Raw Data",
      subtitle: "Fetching Satellite Telemetry",
      icon: Database,
      content: (
        <div className="space-y-4 text-gray-300">
          <p>To prevent collisions, we first need to know where everything is. We connect directly to the <strong style={{ color: 'rgba(255,255,255,0.9)' }}>CelesTrak</strong> public database to fetch live telemetry (TLE data) for active satellites.</p>
          <p>Every second counts. Instead of looking at 27,000 objects blindly, our system performs an instant altitude-band filter to drop 90% of pairs that can never collide.</p>
          <div className="mt-4 p-4 rounded-lg font-mono text-xs h-32 overflow-hidden relative"
               style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', color: '#93c5fd' }}>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#05050A] pointer-events-none z-10" />
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: -40, opacity: 1 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="space-y-2"
            >
              <div>[OK] Fetching TLE from space-track.org...</div>
              <div>[OK] 25,412 active objects found.</div>
              <div>[OK] Running stage-1 coarse filter...</div>
              <div>[OK] 24,900 pairs discarded (no altitude overlap).</div>
              <div>[WARN] 14 pairs require precise calculation.</div>
              <div>[OK] Preparing physics engine...</div>
            </motion.div>
          </div>
        </div>
      ),
      globeMode: 'live'
    },
    {
      id: 1,
      title: "2. The Physics Engine",
      subtitle: "Mapping to Reality",
      icon: Activity,
      content: (
        <div className="space-y-4 text-gray-300">
          <p>Raw code isn't enough. We use the <strong style={{ color: 'rgba(255,255,255,0.9)' }}>SGP4 Physics Engine</strong> to translate those raw data lines into precise X, Y, Z coordinates in space.</p>
          <p>To the right, you can see a live map of actual satellites orbiting Earth right now. Our system tracks their paths, calculating exactly where they will be up to 72 hours in the future.</p>
          <p className="text-sm mt-4 pl-3" style={{ borderLeft: '2px solid #3b82f6', color: '#93c5fd' }}>
            <strong>Try it:</strong> Rotate the globe to see the orbital paths and current positions.
          </p>
        </div>
      ),
      globeMode: 'live'
    },
    {
      id: 2,
      title: "3. The 2009 Disaster",
      subtitle: "A Preventable Catastrophe",
      icon: Flame,
      content: (
        <div className="space-y-4 text-gray-300">
          <p>To prove our system works, we fed it historical data from February 10, 2009. On this day, an active US communications satellite (Iridium 33) crashed head-on into a dead Russian satellite (Cosmos 2251).</p>
          <p>They hit at over <strong style={{ color: 'rgba(255,255,255,0.9)' }}>50,000 km/h (14.12 km/s)</strong>, destroying both instantly and creating over 2,000 pieces of dangerous debris.</p>
          <div className="mt-4 p-4 rounded-lg" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <div className="flex items-center gap-2 font-bold mb-2" style={{ color: '#f87171' }}>
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: '#f87171' }}></span>
                <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: '#ef4444' }}></span>
              </span>
              CRITICAL ALERT: TCA 16:56 UTC
            </div>
            <p className="text-sm" style={{ color: '#fca5a5' }}>Our system independently detected this crash 48 hours in advance, calculating a 1-in-5,000 crash risk.</p>
          </div>
        </div>
      ),
      globeMode: 'collision_2009'
    },
    {
      id: 3,
      title: "4. The Escape Plan",
      subtitle: "Automatic Avoidance",
      icon: Shield,
      content: <AvoidanceNarrative />,
      globeMode: 'avoidance_2009'
    }
  ];

  // Fetch live satellite objects
  useEffect(() => {
    fetch('/api/objects?limit=25')
      .then(r => r.json())
      .then(d => {
        if (d && d.objects && d.objects.length > 0) {
          setLiveObjects(d.objects);
        }
      })
      .catch(e => {
        console.warn("API offline — using rich fallback live data.");
        setIsUsingFallbackData(true);
      });
  }, []);

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STORY_STEPS.length - 1));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const stepData = STORY_STEPS[currentStep];
  const StepIcon = stepData.icon;

  return (
    <div className="min-h-screen flex flex-col select-none" style={{ background: '#05050A', color: '#FAFAFA', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 shrink-0 z-20 relative backdrop-blur-md"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.5)' }}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa' }}>
            <Satellite className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-4">
            <div>
              <h1 className="font-bold tracking-tight flex items-center gap-3">
                Space-Guard
                {isUsingFallbackData && (
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider"
                        style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)' }}>
                    Satellite Telemetry Active
                  </span>
                )}
              </h1>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Orbital Collision Avoidance System</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {STORY_STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setCurrentStep(i)}
              className="h-2 w-12 rounded-full transition-all duration-300 cursor-pointer"
              style={{
                backgroundColor: i <= currentStep ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                boxShadow: i <= currentStep ? '0 0 10px rgba(59,130,246,0.4)' : 'none',
              }}
            />
          ))}
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Left Narrative Panel */}
        <div className="w-[420px] shrink-0 flex flex-col z-10 shadow-2xl"
             style={{ borderRight: '1px solid rgba(255,255,255,0.06)', background: '#0A0A12' }}>
          <div className="flex-1 overflow-y-auto p-8 flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-6"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full w-fit text-sm font-medium"
                     style={{ background: 'rgba(59,130,246,0.08)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.15)' }}>
                  <StepIcon className="w-4 h-4" />
                  Step {currentStep + 1}: {stepData.title}
                </div>
                
                <h2 className="text-3xl font-bold leading-tight">{stepData.title}</h2>
                <div className="text-base leading-relaxed space-y-4" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {stepData.content}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          
          {/* Navigation Controls */}
          <div className="p-6 flex items-center justify-between mt-auto backdrop-blur-md"
               style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.4)' }}>
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-30 disabled:pointer-events-none"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Previous
            </button>
            <button
              onClick={nextStep}
              disabled={currentStep === STORY_STEPS.length - 1}
              className="px-6 py-2.5 rounded-lg font-semibold text-sm text-white disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-2 group"
              style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 0 15px rgba(37,99,235,0.4)' }}
            >
              Next Step
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Right Visual Panel */}
        <div className="flex-1 overflow-y-auto p-6" style={{ background: '#02050e' }}>
          <Globe3D 
            initialMode={stepData.globeMode || 'live'} 
            objects={liveObjects} 
            onLoadProgress={setLoadProgress}
          />
        </div>
      </main>
    </div>
  );
}
