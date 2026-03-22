import React from 'react';
import { UpgradeKey, UPGRADE_CONFIG } from '../game/config';
import { formatCostLabel } from './Formatters';

interface UpgradeCardProps {
  upgradeKey: UpgradeKey;
  purchased: boolean;
  unlocked: boolean;
  onPurchase: () => void;
  canAfford: boolean;
}

export const UpgradeCard: React.FC<UpgradeCardProps> = ({ upgradeKey, purchased, unlocked, onPurchase, canAfford }) => {
  const config = UPGRADE_CONFIG[upgradeKey];
  return (
    <article
      className={`upgrade-card ${purchased ? 'purchased' : ''} ${!unlocked ? 'locked' : ''}`}
      style={{ '--accent': config.accent } as React.CSSProperties}
    >
      <header>
        <h3>{config.name}</h3>
      </header>
      <p>{config.description}</p>
      <span className="effect">{config.effect}</span>
      {config.requiresCycle && !purchased && (
        <span className="requires">Requires Cycle {config.requiresCycle}</span>
      )}
      <footer>
        {!purchased && unlocked && (
          <span className="unit-cost">Cost: {formatCostLabel(config.cost as Record<string, number>)}</span>
        )}
        <button
          className="secondary"
          onClick={onPurchase}
          disabled={purchased || !unlocked || !canAfford}
        >
          {purchased ? 'Installed' : unlocked ? 'Install Upgrade' : 'Locked'}
        </button>
      </footer>
    </article>
  );
};
