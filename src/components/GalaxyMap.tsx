import type { CSSProperties } from 'react';
import { AnomalyKey, ANOMALY_CONFIG } from '../game/config';

interface Star {
  id: number;
  left: number;
  top: number;
  size: number;
  delay: number;
}

interface Probe {
  id: number;
  angle: number;
  radius: number;
  duration: number;
  hue: number;
}

interface GalaxyMapProps {
  starfield: Star[];
  swarmSeed: Probe[];
  activeProbeCount: number;
  orbitExpansion: number;
  distance: number;
  scannedAnomalies: AnomalyKey[];
}

const anomalyKeys = Object.keys(ANOMALY_CONFIG) as AnomalyKey[];

export function GalaxyMap({
  starfield,
  swarmSeed,
  activeProbeCount,
  orbitExpansion,
  distance,
  scannedAnomalies,
}: GalaxyMapProps) {
  'use no memo';

  return (
    <div className="galaxy-map">
      {starfield.slice(0, 60).map((star) => (
        <span
          key={`map-${star.id}`}
          className="map-star"
          style={{
            left: `${(star.left / 100) * 90 + 5}%`,
            top: `${(star.top / 100) * 70 + 10}%`,
            width: `${star.size * 1.5}px`,
            height: `${star.size * 1.5}px`,
            animationDelay: `${star.delay * 0.6}s`,
          }}
        />
      ))}
      <div className="probe-swarm" aria-hidden="true">
        {swarmSeed.slice(0, activeProbeCount).map((probe) => (
          <span
            key={`probe-${probe.id}`}
            className="probe"
            style={{
              '--angle': `${probe.angle}deg`,
              '--radius': `${(probe.radius * orbitExpansion).toFixed(2)}%`,
              '--duration': `${probe.duration}s`,
              '--glow': `hsla(${probe.hue}, 90%, 70%, 0.9)`,
            } as CSSProperties}
          />
        ))}
      </div>

      {/* Anomaly Markers */}
      {anomalyKeys.map((key) => {
        const config = ANOMALY_CONFIG[key];
        const isScanned = scannedAnomalies.includes(key);
        const isVisible = distance >= config.distanceReq;
        if (!isVisible && !isScanned) return null;

        const angle = (config.distanceReq * 137.5) % 360;
        const radius = 25 + (config.distanceReq / 800) * 60;

        return (
          <div
            key={`anomaly-marker-${key}`}
            className={`anomaly-marker ${isScanned ? 'scanned' : ''}`}
            style={{
              left: `${50 + Math.cos(angle * Math.PI / 180) * radius}%`,
              top: `${50 + Math.sin(angle * Math.PI / 180) * radius}%`,
            }}
            title={config.name}
          />
        );
      })}

      <div
        className="exploration-wave pulse"
        style={{
          transform: `scale(${1 + distance / 220})`,
          opacity: Math.min(1, 0.25 + distance / 280),
        }}
      />
      <div className="origin-node">Origin</div>
    </div>
  );
}
