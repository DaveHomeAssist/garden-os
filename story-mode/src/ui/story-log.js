import { showReadOnlySheet, escapeHtml } from './read-only-sheet.js';

function formatDate(timestamp) {
  if (!timestamp) return 'Saved';
  return new Date(timestamp).toLocaleString();
}

function formatEventTitle(entry) {
  if (entry.type === 'quest_complete') {
    return entry.title ? `Quest Complete: ${entry.title}` : 'Quest Complete';
  }
  if (entry.type === 'choice') {
    return entry.label ? `Choice: ${entry.label}` : 'Choice Recorded';
  }
  if (entry.type === 'reputation') {
    return `Reputation: ${entry.npcId ?? 'neighbor'}`;
  }
  return entry.type ? entry.type.replace(/_/g, ' ') : 'Story Event';
}

function formatEventCopy(entry) {
  if (entry.summary) return entry.summary;
  if (entry.type === 'quest_complete' && entry.outcomeId) {
    return `Outcome ${entry.outcomeId} changed the campaign state.`;
  }
  if (entry.type === 'choice' && entry.questId) {
    return `Choice recorded for ${entry.questId}.`;
  }
  if (entry.type === 'reputation') {
    const direction = Number(entry.amount ?? 0) >= 0 ? '+' : '';
    return `${direction}${entry.amount ?? 0} reputation. Current value ${entry.value ?? 0}.`;
  }
  return 'Campaign event saved.';
}

function renderStoryEntries(entries) {
  const sorted = [...entries].sort((left, right) => (left.timestamp ?? 0) - (right.timestamp ?? 0));
  if (!sorted.length) {
    return `
      <div class="read-only-sheet__empty">
        No story events yet. Complete quests or reputation actions to populate this archive.
      </div>
    `;
  }

  return `
    <div class="read-only-sheet__list">
      ${sorted.map((entry) => `
        <article class="read-only-sheet__card">
          <div class="read-only-sheet__card-top">
            <div>
              <div class="read-only-sheet__card-title">${escapeHtml(formatEventTitle(entry))}</div>
              <div class="read-only-sheet__card-meta">${escapeHtml(formatDate(entry.timestamp))}</div>
            </div>
            <div class="read-only-sheet__score">${escapeHtml(entry.outcomeId ?? entry.npcId ?? entry.type ?? 'story')}</div>
          </div>
          <div class="read-only-sheet__card-copy">${escapeHtml(formatEventCopy(entry))}</div>
        </article>
      `).join('')}
    </div>
  `;
}

export function buildStoryLogModel(campaign = {}) {
  return {
    entries: Array.isArray(campaign.storyLog) ? [...campaign.storyLog] : [],
    choices: campaign.choiceLog ?? {},
    zoneReputation: campaign.zoneReputation ?? {},
  };
}

export function showStoryLogSheet(container, campaign, options = {}) {
  const model = buildStoryLogModel(campaign);
  return showReadOnlySheet(container, {
    id: 'story-log-sheet',
    title: 'Story Log',
    subtitle: `${model.entries.length} saved events`,
    bodyHtml: renderStoryEntries(model.entries),
    closeLabel: 'Close story log',
    onClose: options.onClose,
  });
}
