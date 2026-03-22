import React from 'react';
import { UnitKey, Cost, UNIT_CONFIG, ANOMALY_CONFIG, ARTIFACT_CONFIG, AnomalyKey } from '../game/config';
import { formatCostLabel } from './Formatters';

interface UnitCardProps {
  unitKey?: UnitKey;
  anomalyKey?: AnomalyKey;
  count?: number;
  cost: Cost;
  onAction: () => void;
  canAfford: boolean;
  isScanned?: boolean;
}

export const UnitCard: React.FC<UnitCardProps> = ({ unitKey, anomalyKey, count, cost, onAction, canAfford, isScanned }) => {
  if (unitKey) {
    const config = UNIT_CONFIG[unitKey];
    return (
      <article className="unit-card" style={{ '--accent': config.accent } as React.CSSProperties}>
        <header>
          <span className="unit-icon" aria-hidden>{config.icon}</span>
          <div>
            <h3>{config.name}</h3>
            <span className="unit-count">{count} active</span>
          </div>
        </header>
        <p>{config.description}</p>
        <footer>
          <span className="unit-cost">Cost: {formatCostLabel(cost as Record<string, number>)}</span>
          <button className="primary" onClick={onAction} disabled={!canAfford}>
            Construct Unit
          </button>
        </footer>
      </article>
    );
  }

  if (anomalyKey) {
    const config = ANOMALY_CONFIG[anomalyKey];
    const rewardConfig = ARTIFACT_CONFIG[config.reward];
    return (
      <article key={anomalyKey} className={`unit-card ${isScanned ? 'scanned' : ''}`} style={{ '--accent': rewardConfig.accent } as React.CSSProperties}>
        <header>
          <span className="unit-icon" aria-hidden>🔭</span>
          <div>
            <h3>{config.name}</h3>
            <span className="unit-count">{isScanned ? 'Analysis Complete' : 'Anomaly Detected'}</span>
          </div>
        </header>
        <p>{config.description}</p>
        {isScanned ? (
          <div className="artifact-reward">
            <strong>Artifact: {rewardConfig.name}</strong>
            <p className="effect">{rewardConfig.effect}</p>
          </div>
        ) : (
          <footer>
            <span className="unit-cost">Scan Cost: {formatCostLabel(config.cost as Record<string, number>)}</span>
            <button className="primary" onClick={onAction} disabled={!canAfford}>
              Analyze Anomaly
            </button>
          </footer>
        )}
      </article>
    );
  }

  return null;
};
