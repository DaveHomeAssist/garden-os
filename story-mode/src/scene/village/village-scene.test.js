// Engine interface used by the game layer (garden-os #77 village-trigger-adapter.js).
import { describe, expect, it, vi } from 'vitest';
import { createVillageScene } from './village-scene.js';
import { getVillageLayout } from './village-layout.js';

const make = () => createVillageScene({ renderer: null, quality: { tier: 'low', choice: 'low', source: 'test' }, overlayParent: null, loadProps: false });

describe('village engine interface', () => {
  const layout = getVillageLayout();

  it('builds one InstancedMesh per graybox asset part plus one road and one sidewalk mesh', () => {
    const v = make();
    const names = [];
    v.scene.traverse((o) => { if (o.isMesh) names.push(o.name); });
    expect(names.filter((n) => n === 'village-road')).toHaveLength(1);
    expect(names.filter((n) => n === 'village-sidewalk')).toHaveLength(1);
    expect(names.filter((n) => n === 'village-house_graybox-walls')).toHaveLength(1);
    expect(v.getDebugState().instancedKinds.length).toBeGreaterThanOrEqual(10);
    v.dispose();
  });

  it('getPlayerPose / setPlayerPose snap player and camera without stale triggers', () => {
    const v = make();
    const listener = vi.fn();
    const off = v.onTrigger(listener);
    expect(typeof off).toBe('function');
    const handler = vi.fn();
    v.setPoseHandler(handler);
    const home = layout.interactables.find((i) => i.type === 'enter_plot');
    // stand in the plot: one enter
    v.setPlayerState({ position: { x: home.position.x + 3, z: home.position.z }, facing: 0 });
    v.update(1 / 60);
    v.setPlayerState({ position: { ...home.position }, facing: 0 });
    v.update(1 / 60);
    expect(listener).toHaveBeenCalledWith('enter', expect.objectContaining({ id: 'plot_home', type: 'enter_plot', exit: home.exit }));
    const calls = listener.mock.calls.length;
    // Back to village: snap to the exit spot, camera follows instantly, no leave/enter fires
    v.setPlayerPose(home.exit);
    expect(v.getPlayerPose()).toEqual({ x: home.exit.x, z: home.exit.z, facingY: home.exit.facingY });
    expect(handler).toHaveBeenCalledWith({ x: home.exit.x, z: home.exit.z, facingY: home.exit.facingY });
    const cam = v.camera.position;
    expect(Math.abs(cam.x - home.exit.x)).toBeLessThan(0.01);
    v.setPlayerState({ position: { x: home.exit.x, z: home.exit.z }, facing: home.exit.facingY });
    v.update(1 / 60);
    expect(listener.mock.calls.length).toBe(calls);
    off();
    v.dispose();
  });

  it('accepts registerInteractables([{ id, type, prompt }]) and ignores the ZoneManager function form', () => {
    const v = make();
    v.registerInteractables([{ id: 'seed_box', type: 'open_seeds', prompt: 'Seed box' }]);
    expect(v.getRegisteredInteractables()).toEqual([{ id: 'seed_box', type: 'open_seeds', prompt: 'Seed box' }]);
    const register = vi.fn();
    v.registerInteractables(register);
    expect(register).not.toHaveBeenCalled();
    v.dispose();
  });

  it('every plot carries an exit sidewalk spot', () => {
    const plots = layout.interactables.filter((i) => i.type === 'enter_plot' || i.type === 'neighbour_plot_reserved');
    expect(plots).toHaveLength(7);
    plots.forEach((p) => expect(p.exit).toEqual(expect.objectContaining({ x: expect.any(Number), z: expect.any(Number), facingY: expect.any(Number) })));
  });
});
