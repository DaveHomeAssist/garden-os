import { Actions } from './store.js';

const ReputationTiers = {
  STRANGER: { id: 'stranger', label: 'Stranger', threshold: 0 },
  ACQUAINTANCE: { id: 'acquaintance', label: 'Acquaintance', threshold: 25 },
  FRIEND: { id: 'friend', label: 'Friend', threshold: 50 },
  TRUSTED: { id: 'trusted', label: 'Trusted', threshold: 75 },
  FAMILY: { id: 'family', label: 'Family', threshold: 100 },
};

const ORDERED_TIERS = Object.values(ReputationTiers).sort((a, b) => a.threshold - b.threshold);

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

class ReputationSystem {
  constructor(store) {
    this.store = store;
  }

  getState() {
    return this.store.getState();
  }

  getReputation(npcId) {
    return clamp(this.getState().campaign.reputation?.[npcId] ?? 0);
  }

  getTier(npcId) {
    const value = this.getReputation(npcId);
    let active = ReputationTiers.STRANGER;
    for (const tier of ORDERED_TIERS) {
      if (value >= tier.threshold) active = tier;
    }
    return active;
  }

  addReputation(npcId, amount) {
    if (!npcId) return this.getReputation(npcId);
    this.store.dispatch({
      type: Actions.ADD_REPUTATION,
      payload: { npcId, amount },
    });
    return this.getReputation(npcId);
  }

  applyDecay() {
    this.store.dispatch({
      type: Actions.DECAY_REPUTATION,
      payload: {},
    });
    return this.getAllReputations();
  }

  meetsRequirement(requirement = {}) {
    return Object.entries(requirement).every(([npcId, minValue]) => this.getReputation(npcId) >= (minValue ?? 0));
  }

  getAllReputations() {
    const state = this.getState();
    return { ...(state.campaign.reputation ?? {}) };
  }
}

export {
  ReputationSystem,
  ReputationTiers,
};
