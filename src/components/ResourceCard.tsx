import React from 'react';
import { ResourceKey } from '../game/config';
import { formatNumber, resourceLabels } from './Formatters';

interface Multipliers {
  prestige: number;
  latency: number;
  entropy: number;
  upgrades: {
    energy: number;
    probes: number;
    data: number;
    distance: number;
  };
  artifacts: {
    metal: number;
    energy: number;
    data: number;
    distance: number;
  };
}

interface ResourceCardProps {
  resource: ResourceKey;
  amount: number;
  rate: number;
  flavour: string;
  multipliers: Multipliers;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({ resource, amount, rate, flavour, multipliers }) => {
  const getResourceMultipliers = () => {
    const list = [
      { name: 'Prestige', val: multipliers.prestige },
      { name: 'Latency', val: multipliers.latency },
      { name: 'Entropy', val: multipliers.entropy },
    ];

    if (resource === 'energy') list.push({ name: 'Dyson Upgrade', val: multipliers.upgrades.energy });
    if (resource === 'probes') list.push({ name: 'Autoforge Upgrade', val: multipliers.upgrades.probes });
    if (resource === 'data') list.push({ name: 'Archive Upgrade', val: multipliers.upgrades.data });

    if (resource === 'metal') list.push({ name: 'Dense Matter Artifact', val: multipliers.artifacts.metal });
    if (resource === 'energy') list.push({ name: 'Zero-Point Artifact', val: multipliers.artifacts.energy });
    if (resource === 'data') list.push({ name: 'Xeno-Code Artifact', val: multipliers.artifacts.data });

    return list.filter(m => m.val !== 1);
  };

  const activeMultipliers = getResourceMultipliers();

  return (
    <article className="resource-card">
      <header>
        <h2>{resourceLabels[resource]}</h2>
        <span className="resource-amount">{formatNumber(amount)}</span>
      </header>
      <p>{flavour}</p>
      <footer>
        <div className="rate-container" title={activeMultipliers.map(m => `${m.name}: ${m.val.toFixed(2)}x`).join('\n')}>
           <span className="rate">+{formatNumber(rate)} /s</span>
           {activeMultipliers.length > 0 && <span className="info-icon">ⓘ</span>}
        </div>
      </footer>
    </article>
  );
};
