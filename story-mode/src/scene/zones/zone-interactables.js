import * as THREE from 'three';

const NPC_COLORS = {
  old_gus: { body: 0x6b4226, head: 0xc8a87a },
  maya: { body: 0x3da558, head: 0xb8e86a },
  lila: { body: 0x8b4595, head: 0xe8a8c8 },
};

const SPOT_BUILDERS = {
  herb_patch(pos) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CircleGeometry(0.35, 10), new THREE.MeshStandardMaterial({ color: 0x3a8a30, roughness: 1 }));
    base.rotation.x = -Math.PI / 2; base.position.y = 0.02; g.add(base);
    const lm = new THREE.MeshStandardMaterial({ color: 0x55bb40, roughness: 1 });
    for (let i = 0; i < 3; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 4), lm);
      leaf.position.set((i - 1) * 0.14, 0.14, 0); g.add(leaf);
    }
    g.position.set(pos.x, 0, pos.z); return g;
  },
  rock_pile(pos) {
    const g = new THREE.Group();
    const rm = new THREE.MeshStandardMaterial({ color: 0x8a8a7a, roughness: 1 });
    [[0, 0.24], [-0.18, 0.18], [0.16, 0.2]].forEach(([dx, r]) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), rm);
      s.position.set(dx, r * 0.6, dx * 0.5); s.scale.set(1, 0.7, 1); g.add(s);
    });
    g.position.set(pos.x, 0, pos.z); return g;
  },
  wildflower_field(pos) {
    const g = new THREE.Group();
    const colors = [0xe84488, 0xeecc44, 0xaa66dd, 0xff8844, 0x66bbee];
    for (let i = 0; i < 5; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 5), new THREE.MeshStandardMaterial({ color: colors[i], roughness: 1 }));
      const a = (i / 5) * Math.PI * 2;
      f.position.set(Math.cos(a) * 0.3, 0.15, Math.sin(a) * 0.3); g.add(f);
    }
    g.position.set(pos.x, 0, pos.z); return g;
  },
  berry_bush(pos) {
    const g = new THREE.Group();
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.35, 7, 6), new THREE.MeshStandardMaterial({ color: 0x3a7a3a, roughness: 1 }));
    bush.position.y = 0.25; bush.scale.set(1, 0.7, 1); g.add(bush);
    const brm = new THREE.MeshStandardMaterial({ color: 0xcc2244, roughness: 0.8 });
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.05, 5, 5), brm);
      const a = (i / 4) * Math.PI * 2;
      b.position.set(Math.cos(a) * 0.2, 0.32, Math.sin(a) * 0.2); g.add(b);
    }
    g.position.set(pos.x, 0, pos.z); return g;
  },
  mushroom_log(pos) {
    const g = new THREE.Group();
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 1 }));
    log.rotation.z = Math.PI / 2; log.position.y = 0.14; g.add(log);
    const cm = new THREE.MeshStandardMaterial({ color: 0xcc4422, roughness: 0.9 });
    [[-0.3, 0.28], [0.1, 0.3], [0.4, 0.26]].forEach(([dx, y]) => {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 5), cm);
      c.scale.set(1, 0.5, 1); c.position.set(dx, y, 0); g.add(c);
    });
    g.position.set(pos.x, 0, pos.z); return g;
  },
  driftwood(pos) {
    const g = new THREE.Group();
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.4, 6), new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 1 }));
    d.rotation.z = Math.PI / 2; d.rotation.y = 0.3; d.position.y = 0.08; g.add(d);
    g.position.set(pos.x, 0, pos.z); return g;
  },
};

export function makeNpcMesh(npc) {
  const colors = NPC_COLORS[npc.id] ?? { body: 0xaaaaaa, head: 0xdddddd };
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.5, 8), new THREE.MeshStandardMaterial({ color: colors.body, roughness: 1 }));
  body.position.y = 0.25; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshStandardMaterial({ color: colors.head, roughness: 1 }));
  head.position.y = 0.62; g.add(head);
  const pos = npc.activeSchedule.position;
  g.position.set(pos.x, 0, pos.z);
  g.userData.interactable = {
    id: `npc_${npc.id}`, type: 'npc', npcId: npc.id, label: npc.name,
    position: { x: pos.x, z: pos.z }, radius: 1.0,
  };
  return g;
}

export function makeForageSpotMesh(spot) {
  const builder = SPOT_BUILDERS[spot.type];
  const g = builder ? builder(spot.position) : new THREE.Group();
  g.userData.interactable = {
    id: spot.id, type: 'forage', spotId: spot.id,
    label: spot.type.replace(/_/g, ' '),
    position: { x: spot.position.x, z: spot.position.z }, radius: 0.8,
  };
  return g;
}
