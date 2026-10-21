import { describe, expect, it, vi } from 'vitest';
import { createGameState, PHASES } from './state.js';
import { advance, enterPostCampaignFreePlay } from './phase-machine.js';
import { createPhaseRouter } from './phase-router.js';
import { buildCampaignRecap, renderCampaignRecapHTML } from '../ui/campaign-recap.js';

// Chapter 12 (winter, review-only) sitting on its "Season complete" step.
function finalChapterState() {
  const state = createGameState();
  state.campaign.currentChapter = 12;
  state.campaign.currentSeason = 'winter';
  state.campaign.completedChapters = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  state.campaign.seasonHistory = Array.from({ length: 11 }, (_, i) => ({
    chapter: i + 1,
    season: ['spring', 'summer', 'fall', 'winter'][i % 4],
    score: 60 + i,
    grade: i % 4 === 3 ? 'F' : 'B',
  }));
  state.season.chapter = 12;
  state.season.season = 'winter';
  state.season.phase = PHASES.TRANSITION;
  state.season.campaign = state.campaign;
  return state;
}

describe('campaign ending', () => {
  it('finishing Chapter 12 completes the campaign without creating a Chapter 13', () => {
    const state = finalChapterState();
    const result = advance(state);
    expect(result.campaignComplete).toBe(true);
    expect(result.trigger).toEqual({ type: 'campaign_complete' });
    expect(state.campaign.complete).toBe(true);
    expect(state.campaign.currentChapter).toBe(12);
    expect(state.campaign.completedChapters).toContain(12);
  });

  it('advancing a completed save again replays the ending without re-recording history', () => {
    const state = finalChapterState();
    advance(state);
    const historyLength = state.campaign.seasonHistory.length;
    const again = advance(state);
    expect(again.campaignComplete).toBe(true);
    expect(state.campaign.seasonHistory.length).toBe(historyLength);
    expect(state.campaign.currentChapter).toBe(12);
  });

  it('Keep gardening turns the save into Free Play with every crop unlocked', () => {
    const state = finalChapterState();
    advance(state);
    enterPostCampaignFreePlay(state);
    expect(state.campaign.sandbox).toBe(true);
    expect(state.campaign.postCampaign).toBe(true);
    expect(state.campaign.currentChapter).toBe(99);
    expect(state.season.season).toBe('spring');
    expect(state.season.phase).toBe(PHASES.PLANNING);
    expect(state.campaign.cropsUnlocked.length).toBeGreaterThan(40);
  });

  it('the router plays the written ending scene first, then the recap', () => {
    const state = finalChapterState();
    let finish = null;
    const showEndGameOverlay = vi.fn();
    const router = createPhaseRouter({
      getState: () => state,
      isGameInputEnabled: () => true,
      produceState: vi.fn(() => ({ advanced: true, campaignComplete: true, trigger: { type: 'campaign_complete' } })),
      cutsceneMachine: { isActive: () => false, queueFromTrigger: vi.fn((t) => { finish = t; return true; }) },
      clearSceneTargeting: () => {},
      setGameInputEnabled: () => {},
      showToast: () => {},
      updateHUD: () => {},
      persistState: () => {},
      openEventCard: vi.fn(),
      openHarvestReveal: vi.fn(),
      openSeasonTransitionOverlay: vi.fn(),
      openWinterReviewOverlay: vi.fn(),
      showEndGameOverlay,
    });
    router.doAdvance();
    expect(finish).toEqual({ type: 'campaign_complete' });
    expect(showEndGameOverlay).not.toHaveBeenCalled();
    router.onCutsceneFinish();
    expect(showEndGameOverlay).toHaveBeenCalledTimes(1);
  });

  it('shows the recap straight away when the ending scene was already seen', () => {
    const showEndGameOverlay = vi.fn();
    const router = createPhaseRouter({
      getState: () => finalChapterState(),
      isGameInputEnabled: () => true,
      produceState: vi.fn(() => ({ advanced: true, campaignComplete: true, trigger: { type: 'campaign_complete' } })),
      cutsceneMachine: { isActive: () => false, queueFromTrigger: vi.fn(() => false) },
      clearSceneTargeting: () => {},
      setGameInputEnabled: () => {},
      showToast: () => {},
      updateHUD: () => {},
      persistState: () => {},
      openEventCard: vi.fn(),
      openHarvestReveal: vi.fn(),
      openSeasonTransitionOverlay: vi.fn(),
      openWinterReviewOverlay: vi.fn(),
      showEndGameOverlay,
    });
    router.doAdvance();
    expect(showEndGameOverlay).toHaveBeenCalledTimes(1);
  });
});

describe('campaign recap', () => {
  it('lists three years of four seasons, marks winters as review, and never mentions Chapter 13', () => {
    const state = finalChapterState();
    advance(state);
    state.campaign.recipesCompleted = ['moms_sauce'];
    state.campaign.questLog = { lila_basil: { state: 'COMPLETED' }, gus_tools: { state: 'IN_PROGRESS' } };
    const recap = buildCampaignRecap(state.campaign);
    expect(recap.chaptersComplete).toBe(12);
    expect(recap.years).toHaveLength(3);
    expect(recap.years.every((y) => y.seasons.length === 4)).toBe(true);
    expect(recap.years[0].seasons[3].reviewOnly).toBe(true);
    expect(recap.seasonsGrown).toBe(9);
    expect(recap.questsCompleted).toBe(1);
    const html = renderCampaignRecapHTML(recap);
    expect(html).toContain('Keep gardening');
    expect(html).toContain('Main menu');
    expect(html).not.toMatch(/Chapter 13|Ch 13/);
    expect(html).toMatch(/1 neighbor request finished/);
  });
});
