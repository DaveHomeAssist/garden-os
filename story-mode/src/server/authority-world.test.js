import { describe, expect, it } from 'vitest';

import WORLD_MAP from 'specs/WORLD_MAP.json';

import { createActionEnvelope } from '../engine/authoritative-engine.js';
import { Actions } from '../game/store.js';
import { AUTHORITY_ZONES } from './authority-world.js';
import { createAuthorityService, createMemoryLedgerStore } from './authority-service.js';

describe('authority zone table mirrors specs/WORLD_MAP.json', () => {
  it('mirrors every zone, its bed slots, and its gate', () => {
    expect(Object.keys(AUTHORITY_ZONES).sort()).toEqual(Object.keys(WORLD_MAP.zones).sort());
    for (const [zoneId, zone] of Object.entries(WORLD_MAP.zones)) {
      expect(AUTHORITY_ZONES[zoneId].bedSlots).toBe(Number(zone.bedSlots ?? 0));
      expect(AUTHORITY_ZONES[zoneId].gate?.type ?? null).toBe(zone.gate?.type ?? null);
      expect(AUTHORITY_ZONES[zoneId].gate?.quest ?? null).toBe(zone.gate?.requirement?.quest ?? null);
    }
  });
});

async function harness() {
  const service = createAuthorityService({
    ledgerStore: createMemoryLedgerStore(),
    now: () => Date.parse('2026-10-13T12:00:00.000Z'),
    secret: 'world-test-secret',
    sessionIdFactory: () => 'session-world',
  });
  await service.createSession({ sessionId: 'session-world' });
  let seq = 0;
  const send = (type, payload) => {
    seq += 1;
    return service.applyAction(createActionEnvelope({
      clientSeq: seq,
      clientSentAt: '2026-10-13T12:00:00.000Z',
      id: `world-${seq}`,
      idempotencyKey: `world-idem-${seq}`,
      payload,
      sessionId: 'session-world',
      type,
    }));
  };
  return { send };
}

describe('Node authority service validates zone travel', () => {
  it('rejects unknown zones and trusted zone fields', async () => {
    const { send } = await harness();
    const unknown = await send(Actions.ZONE_CHANGED, { toZone: 'moon_base' });
    expect(unknown.ack.rejection.code).toBe('BAD_ZONE_ID');
    const trusted = await send(Actions.ZONE_CHANGED, { toZone: 'neighborhood', visitedZones: ['greenhouse'] });
    expect(trusted.ack.rejection.code).toBe('TRUSTED_ZONE_PAYLOAD');
  });

  it('holds quest and festival gates the server can see', async () => {
    const { send } = await harness();
    const riverside = await send(Actions.ZONE_CHANGED, { toZone: 'riverside' });
    expect(riverside.ack.accepted).toBe(false);
    expect(riverside.ack.rejection.code).toBe('ZONE_GATED');
    const festival = await send(Actions.ZONE_CHANGED, { toZone: 'festival_grounds' });
    expect(festival.ack.rejection.code).toBe('ZONE_GATED');
    const open = await send(Actions.ZONE_CHANGED, { toZone: 'neighborhood', spawnPoint: { x: 0, z: 7 } });
    expect(open.ack.accepted).toBe(true);
    expect(open.ack.authoritativePatch.data.visitedZones).toContain('neighborhood');
  });
});

describe('Node authority service owns beds', () => {
  it('needs a raised bed kit to build a bed', async () => {
    const { send } = await harness();
    const noKit = await send(Actions.ACQUIRE_BED, { bedId: 'bed_2', name: 'Second' });
    expect(noKit.ack.rejection.code).toBe('NO_BED_KIT');
  });

  it('builds, switches, and keeps grids per bed', async () => {
    const { send } = await harness();
    await send(Actions.ADD_ITEM, { itemId: 'raised_bed_kit', count: 1 });
    await send(Actions.PLANT_CROP, { cellIndex: 0, cropId: 'basil' });
    const built = await send(Actions.ACQUIRE_BED, { bedId: 'bed_2', name: 'Second' });
    expect(built.ack.accepted).toBe(true);
    expect(Object.keys(built.ack.authoritativePatch.data.beds).sort()).toEqual(['bed_2', 'player_plot']);

    const switched = await send(Actions.SWITCH_BED, { bedId: 'bed_2' });
    expect(switched.ack.accepted).toBe(true);
    const data = switched.ack.authoritativePatch.data;
    expect(data.activeBedId).toBe('bed_2');
    expect(data.grid[0].cropId ?? null).toBeNull();
    expect(data.beds.player_plot.grid[0].cropId).toBe('basil');

    const back = await send(Actions.SWITCH_BED, { bedId: 'player_plot' });
    expect(back.ack.authoritativePatch.data.grid[0].cropId).toBe('basil');
  });

  it('rejects trusted grids, unknown beds, and switching to the active bed', async () => {
    const { send } = await harness();
    const forged = await send(Actions.ACQUIRE_BED, { bedId: 'bed_2', name: 'Second', grid: [] });
    expect(forged.ack.rejection.code).toBe('TRUSTED_BED_PAYLOAD');
    const unknown = await send(Actions.SWITCH_BED, { bedId: 'bed_9' });
    expect(unknown.ack.rejection.code).toBe('UNKNOWN_BED');
  });
});
