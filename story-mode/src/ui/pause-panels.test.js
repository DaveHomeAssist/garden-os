// @vitest-environment jsdom
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { showBugReportsSheet, buildBugReportExport } from './pause-panels.js';

function sampleReports() {
  return [
    {
      text: 'Watering can vanished after the market cutscene.',
      chapter: 2,
      phase: 'PLANT',
      season: 'spring',
      timestamp: '2026-08-20T10:00:00.000Z',
    },
    {
      text: 'Score chip overlapped the pause button on a narrow phone.',
      chapter: 3,
      phase: 'GROW',
      season: 'summer',
      timestamp: '2026-08-21T18:30:00.000Z',
    },
  ];
}

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
});

function getRoot() {
  return document.getElementById('root');
}

describe('showBugReportsSheet', () => {
  it('renders the empty state without an export button', () => {
    const sheet = showBugReportsSheet(getRoot(), []);
    expect(sheet.textContent).toContain('No bug reports saved yet');
    expect(sheet.querySelector('[data-export-bugs]')).toBeNull();
  });

  it('renders saved reports with an export button', () => {
    const sheet = showBugReportsSheet(getRoot(), sampleReports());
    expect(sheet.querySelectorAll('.read-only-sheet__card--bug').length).toBe(2);
    expect(sheet.querySelector('[data-export-bugs]')).not.toBeNull();
  });

  it('export click downloads every report as one JSON file', () => {
    const created = [];
    URL.createObjectURL = vi.fn((blob) => {
      created.push(blob);
      return 'blob:bug-reports';
    });
    URL.revokeObjectURL = vi.fn();
    const clicked = [];
    const originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      clicked.push({ href: this.href, download: this.download });
    };

    try {
      const reports = sampleReports();
      const sheet = showBugReportsSheet(getRoot(), reports);
      sheet.querySelector('[data-export-bugs]').click();

      expect(created.length).toBe(1);
      expect(clicked.length).toBe(1);
      expect(clicked[0].download).toMatch(/^garden-os-bug-reports-\d{4}-\d{2}-\d{2}\.json$/);
    } finally {
      HTMLAnchorElement.prototype.click = originalClick;
    }
  });
});

describe('buildBugReportExport', () => {
  it('wraps all reports with tool, kind, and count metadata', () => {
    const reports = sampleReports();
    const now = new Date('2026-08-26T12:00:00.000Z');
    const payload = buildBugReportExport(reports, now);
    expect(payload.tool).toBe('garden-os-story-mode');
    expect(payload.kind).toBe('bug-reports');
    expect(payload.exportedAt).toBe('2026-08-26T12:00:00.000Z');
    expect(payload.reportCount).toBe(2);
    expect(payload.reports).toEqual(reports);
  });
});
