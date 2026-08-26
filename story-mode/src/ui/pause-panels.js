import { showReadOnlySheet, escapeHtml } from './read-only-sheet.js';

function formatSeasonLabel(season) {
  if (!season) return 'Season';
  return season.charAt(0).toUpperCase() + season.slice(1);
}

function renderJournalEntries(entries) {
  if (!entries.length) {
    return `
      <div class="read-only-sheet__empty">
        No journal entries yet. Finish a season to populate this archive.
      </div>
    `;
  }

  return `
    <div class="read-only-sheet__list">
      ${entries.map((entry) => `
        <article class="read-only-sheet__card">
          <div class="read-only-sheet__card-top">
            <div>
              <div class="read-only-sheet__card-title">Chapter ${entry.chapter}</div>
              <div class="read-only-sheet__card-meta">${formatSeasonLabel(entry.season)} · ${escapeHtml(entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : 'Saved')}</div>
            </div>
            <div class="read-only-sheet__score">${escapeHtml(entry.score)}</div>
          </div>
          <div class="read-only-sheet__card-row">
            <span class="read-only-sheet__chip">${escapeHtml(entry.grade)}</span>
            <span class="read-only-sheet__chip">${(entry.eventsEncountered?.length ?? 0)} events</span>
            <span class="read-only-sheet__chip">${(entry.cropsPlanted?.length ?? 0)} crops</span>
          </div>
          <div class="read-only-sheet__card-copy">
            ${(entry.eventsEncountered?.length ? entry.eventsEncountered : ['No events recorded']).map(escapeHtml).join(' · ')}
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function renderBugReports(reports) {
  if (!reports.length) {
    return `
      <div class="read-only-sheet__empty">
        No bug reports saved yet. Open the bug report panel to file one.
      </div>
    `;
  }

  return `
    <div class="read-only-sheet__list">
      ${reports.map((report, index) => `
        <article class="read-only-sheet__card read-only-sheet__card--bug">
          <div class="read-only-sheet__card-top">
            <div>
              <div class="read-only-sheet__card-title">Report ${index + 1}</div>
              <div class="read-only-sheet__card-meta">${escapeHtml(report.timestamp ? new Date(report.timestamp).toLocaleString() : 'Saved locally')}</div>
            </div>
            <div class="read-only-sheet__score">Ch ${escapeHtml(report.chapter ?? '--')}</div>
          </div>
          <div class="read-only-sheet__card-row">
            <span class="read-only-sheet__chip">${escapeHtml(report.phase ?? 'Unknown phase')}</span>
            <span class="read-only-sheet__chip">${escapeHtml(report.season ?? 'Unknown season')}</span>
            <span class="read-only-sheet__chip">${escapeHtml(report.interventionChosen ?? 'No intervention')}</span>
          </div>
          <div class="read-only-sheet__card-copy">${escapeHtml(report.text ?? '')}</div>
        </article>
      `).join('')}
    </div>
  `;
}

export function showSeasonJournalSheet(container, entries, options = {}) {
  return showReadOnlySheet(container, {
    id: 'season-journal-sheet',
    title: 'Season Journal',
    subtitle: 'A read-only archive of completed seasons',
    bodyHtml: renderJournalEntries(entries),
    closeLabel: 'Close journal',
    onClose: options.onClose,
  });
}

export function buildBugReportExport(reports, now = new Date()) {
  return {
    tool: 'garden-os-story-mode',
    kind: 'bug-reports',
    exportedAt: now.toISOString(),
    reportCount: reports.length,
    reports,
  };
}

function downloadBugReports(reports) {
  const now = new Date();
  const payload = buildBugReportExport(reports, now);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `garden-os-bug-reports-${now.toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function showBugReportsSheet(container, reports, options = {}) {
  const footerHtml = reports.length ? `
    <button type="button" id="bug-reports-export" class="pause-action" data-export-bugs="true">
      <span class="pause-action__icon" aria-hidden="true">⬇</span>
      <span>
        <span class="pause-action__title">Export Reports (.json)</span>
        <span class="pause-action__copy">Download every saved report as one JSON file you can attach to a GitHub issue or email. Nothing is sent anywhere automatically.</span>
      </span>
    </button>
  ` : '';
  const sheet = showReadOnlySheet(container, {
    id: 'bug-reports-sheet',
    title: 'Bug Reports',
    subtitle: 'Read-only local archive from this device',
    bodyHtml: renderBugReports(reports),
    footerHtml,
    closeLabel: 'Close bug reports',
    onClose: options.onClose,
  });
  sheet.querySelector('[data-export-bugs]')?.addEventListener('click', () => {
    downloadBugReports(reports);
  });
  return sheet;
}
