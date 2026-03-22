import React from 'react';
import { PrestigeState, ResourceState } from '../game/config';
import { formatNumber } from './Formatters';

interface PrestigePanelProps {
  resources: ResourceState;
  prestige: PrestigeState;
  prestigeTab: 'cycle' | 'fork';
  setPrestigeTab: (tab: 'cycle' | 'fork') => void;
  requirements: {
    cycle: { distance: number; data: number };
    fork: { cycles: number; distance: number; data: number };
  };
  projections: {
    cycle: {
      projectedGain: number;
      baseGain: number;
      nextMultiplier: number;
      currentMultiplier: number;
      projectedKnowledge: number;
    };
    fork: {
      gain: number;
      nextPrime: number;
      nextFork: number;
    };
  };
  progress: {
    cycle: { distance: number; data: number };
    fork: { cycle: number; distance: number; data: number };
  };
  resonance: {
    current: number;
    projected: number;
  };
  ready: {
    cycle: boolean;
    fork: boolean;
  };
  onPrestige: () => void;
  onFork: () => void;
}

export const PrestigePanel: React.FC<PrestigePanelProps> = ({
  resources,
  prestige,
  prestigeTab,
  setPrestigeTab,
  requirements,
  projections,
  progress,
  resonance,
  ready,
  onPrestige,
  onFork,
}) => {
  return (
    <section className="prestige-panel" aria-labelledby="prestige-heading">
      <h2 id="prestige-heading" className="visually-hidden">Prestige Options</h2>
      <div className="prestige-tabs" role="tablist" aria-label="Prestige Options">
        <button
          role="tab"
          aria-selected={prestigeTab === 'cycle'}
          className={prestigeTab === 'cycle' ? 'active' : ''}
          onClick={() => setPrestigeTab('cycle')}
        >
          Cycle Reboot
        </button>
        <button
          role="tab"
          aria-selected={prestigeTab === 'fork'}
          className={prestigeTab === 'fork' ? 'active' : ''}
          onClick={() => setPrestigeTab('fork')}
        >
          Continuum Fork
        </button>
      </div>

      {prestigeTab === 'cycle' ? (
        <div role="tabpanel" className="prestige-content" tabIndex={0}>
          <div>
            <h2>Recompile the Origin</h2>
            <p>
              Reboot the origin node to bake your discoveries into the next generation. Resets resources and
              structures but grants lasting knowledge boosts.
            </p>
            <ul>
              <li>Requires {formatNumber(requirements.cycle.distance)} ly explored and {formatNumber(requirements.cycle.data)} data.</li>
            </ul>
            <div className="prestige-progress-grid">
              <div className="prestige-progress-block">
                <span>Exploration: {formatNumber(resources.distance)} / {formatNumber(requirements.cycle.distance)} ly</span>
                <div className="progress-bar"><div style={{ width: `${progress.cycle.distance * 100}%` }} /></div>
              </div>
              <div className="prestige-progress-block">
                <span>Archives: {formatNumber(resources.data)} / {formatNumber(requirements.cycle.data)} data</span>
                <div className="progress-bar"><div style={{ width: `${progress.cycle.data * 100}%` }} /></div>
              </div>
            </div>
            <div className="prestige-stats">
              <div><strong>Projected Memory Gain:</strong> {formatNumber(projections.cycle.projectedGain)}</div>
              <div><strong>Current Throughput:</strong> {projections.cycle.currentMultiplier.toFixed(2)}×</div>
              <div><strong>Next Cycle Throughput:</strong> {projections.cycle.nextMultiplier.toFixed(2)}×</div>
            </div>
          </div>
          <button className="prestige-button" onClick={onPrestige} disabled={!ready.cycle}>
            Initiate Ascension
          </button>
        </div>
      ) : (
        <div role="tabpanel" className="prestige-content" tabIndex={0}>
          <div>
            <h2>Fork the Continuum</h2>
            <p>
              Splinter your network into a higher-order seed. Consumes all cycles and knowledge to mint permanent Prime Archives.
            </p>
            <div className="prestige-progress-grid">
              <div className="prestige-progress-block">
                <span>Cycle Depth: {prestige.cycles + 1} / {requirements.fork.cycles + 1}</span>
                <div className="progress-bar"><div style={{ width: `${progress.fork.cycle * 100}%` }} /></div>
              </div>
            </div>
            <div className="prestige-stats">
              <div><strong>Prime Archives Gained:</strong> {formatNumber(projections.fork.gain)}</div>
              <div><strong>Resonance After Fork:</strong> {resonance.projected.toFixed(2)}×</div>
            </div>
          </div>
          <button className="prestige-button" onClick={onFork} disabled={!ready.fork}>
            Fork the Continuum
          </button>
        </div>
      )}
    </section>
  );
};
