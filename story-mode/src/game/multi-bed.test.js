/**
 * Unit tests for MultiBedManager.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MultiBedManager } from './multi-bed.js';
import { Store, Actions } from './store.js';
import { createGameState, COLS, ROWS } from './state.js';

describe('MultiBedManager', () => {
  let store;
  let manager;

  beforeEach(() => {
    store = new Store(createGameState());
    manager = new MultiBedManager(store);
  });

  describe('acquireBed', () => {
    it('creates a new bed with correct properties', () => {
      const bed = manager.acquireBed('test_bed', {
        name: 'Test Bed',
        zone: 'player_plot',
      });

      expect(bed).toBeTruthy();
      expect(bed.id).toBe('test_bed');
      expect(bed.name).toBe('Test Bed');
      expect(bed.zone).toBe('player_plot');
      expect(bed.gridCols).toBe(COLS);
      expect(bed.gridRows).toBe(ROWS);
      expect(bed.grid.length).toBe(COLS * ROWS);
      expect(bed.harvestResult).toBeNull();
    });

    it('stores the bed in campaign state', () => {
      manager.acquireBed('plot_a', { name: 'Plot A', zone: 'player_plot' });

      const state = store.getState();
      expect(state.campaign.beds.plot_a).toBeTruthy();
      expect(state.campaign.beds.plot_a.name).toBe('Plot A');
    });

    it('supports custom grid dimensions', () => {
      manager.acquireBed('big_bed', {
        name: 'Big Bed',
        zone: 'community',
        initialGridCols: 8,
        initialGridRows: 6,
      });

      const bed = manager.getBed('big_bed');
      expect(bed.gridCols).toBe(8);
      expect(bed.gridRows).toBe(6);
      expect(bed.grid.length).toBe(48);
    });
  });

  describe('getBed / getAllBeds', () => {
    it('returns null for non-existent bed', () => {
      expect(manager.getBed('nope')).toBeNull();
    });

    it('returns all acquired beds', () => {
      manager.acquireBed('bed_1', { name: 'Bed 1', zone: 'z1' });
      manager.acquireBed('bed_2', { name: 'Bed 2', zone: 'z2' });

      const all = manager.getAllBeds();
      expect(all.length).toBe(2);
      const ids = all.map((b) => b.id);
      expect(ids).toContain('bed_1');
      expect(ids).toContain('bed_2');
    });
  });

  describe('getActiveBed / switchActiveBed', () => {
    it('returns null when no beds exist', () => {
      expect(manager.getActiveBed()).toBeNull();
    });

    it('switches to an acquired bed', () => {
      manager.acquireBed('bed_a', { name: 'A', zone: 'z1' });
      manager.acquireBed('bed_b', { name: 'B', zone: 'z2' });

      const switched = manager.switchActiveBed('bed_b');
      expect(switched).toBe(true);

      const active = manager.getActiveBed();
      expect(active.id).toBe('bed_b');
    });

    it('returns false when switching to non-existent bed', () => {
      expect(manager.switchActiveBed('ghost_bed')).toBe(false);
    });
  });

  describe('independent grids', () => {
    it('each bed has its own grid state', () => {
      manager.acquireBed('bed_a', { name: 'A', zone: 'z1' });
      manager.acquireBed('bed_b', { name: 'B', zone: 'z2' });

      // Manually plant in bed_a via the store
      const state = store.getState();
      state.campaign.beds.bed_a.grid[0].cropId = 'basil';
      store.dispatch({ type: Actions.REPLACE_STATE, payload: { state } });

      const bedA = manager.getBed('bed_a');
      const bedB = manager.getBed('bed_b');
      expect(bedA.grid[0].cropId).toBe('basil');
      expect(bedB.grid[0].cropId).toBeNull();
    });
  });

  describe('expandBedGrid', () => {
    it('expands a bed grid with more rows', () => {
      manager.acquireBed('expandable', { name: 'Expandable', zone: 'z1' });

      const result = manager.expandBedGrid('expandable', 6);
      expect(result).toBe(true);

      const bed = manager.getBed('expandable');
      expect(bed.gridRows).toBe(6);
      expect(bed.grid.length).toBe(COLS * 6);
    });

    it('rejects invalid row counts', () => {
      manager.acquireBed('small', { name: 'Small', zone: 'z1' });

      // Same rows
      expect(manager.expandBedGrid('small', ROWS)).toBe(false);
      // Fewer rows
      expect(manager.expandBedGrid('small', 2)).toBe(false);
      // Way too many rows
      expect(manager.expandBedGrid('small', 100)).toBe(false);
    });

    it('returns false for non-existent bed', () => {
      expect(manager.expandBedGrid('nope', 6)).toBe(false);
    });
  });

  describe('getActiveGrid / getGridForBed', () => {
    it('returns grid for active bed', () => {
      manager.acquireBed('my_bed', { name: 'My Bed', zone: 'z1' });
      manager.switchActiveBed('my_bed');

      const grid = manager.getActiveGrid();
      expect(grid).toBeTruthy();
      expect(grid.length).toBe(COLS * ROWS);
    });

    it('returns null when no active bed', () => {
      expect(manager.getActiveGrid()).toBeNull();
    });

    it('returns grid for specific bed', () => {
      manager.acquireBed('specific', { name: 'S', zone: 'z1' });

      const grid = manager.getGridForBed('specific');
      expect(grid).toBeTruthy();
      expect(grid.length).toBe(COLS * ROWS);
    });

    it('returns null for non-existent bed', () => {
      expect(manager.getGridForBed('missing')).toBeNull();
    });
  });

  describe('serialize / load', () => {
    it('serializes and loads beds correctly', () => {
      manager.acquireBed('bed_1', { name: 'Bed 1', zone: 'z1' });
      manager.acquireBed('bed_2', { name: 'Bed 2', zone: 'z2' });

      const serialized = manager.serializeBeds();
      expect(serialized.length).toBe(2);

      // Create a fresh store and manager
      const freshStore = new Store(createGameState());
      const freshManager = new MultiBedManager(freshStore);

      freshManager.loadBeds(serialized);

      const loaded = freshManager.getAllBeds();
      expect(loaded.length).toBe(2);

      const ids = loaded.map((b) => b.id);
      expect(ids).toContain('bed_1');
      expect(ids).toContain('bed_2');

      freshManager.dispose();
    });

    it('handles null/invalid input gracefully', () => {
      manager.loadBeds(null);
      manager.loadBeds('not-an-array');
      manager.loadBeds([null, undefined, { noId: true }]);

      expect(manager.getAllBeds().length).toBe(0);
    });
  });

  describe('dispose', () => {
    it('prevents further operations after disposal', () => {
      manager.dispose();

      const bed = manager.acquireBed('after_dispose', { name: 'X', zone: 'z' });
      expect(bed).toBeNull();
      expect(manager.switchActiveBed('any')).toBe(false);
      expect(manager.expandBedGrid('any', 6)).toBe(false);
    });
  });
});
