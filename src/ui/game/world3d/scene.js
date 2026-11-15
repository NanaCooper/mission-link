// The 3D map, drawn with three.js: the Moon or Mars base for the Astronaut, the control room on
// Earth for Mission Control. Every model is built from the game's own pixel sprites (voxels.js).
// It only draws: walking, using places and the text boxes stay in WorldMap.jsx, and the engine
// decides what happens. Like the 2D map, the base never shows the storm coming: the Astronaut
// cannot see it. A radiation hit is only shown after the move, as the 2D map flashes.
//
// createWorld({ canvas, kind, map, hero, world, reducedMotion }) returns
//   frame(state, dt, t)   draws one picture. state = { position, steps, hidden, used, near, scene,
//                         puff, stepMs, celebrate } (the same things WorldMap draws in 2D;
//                         scene = the map's scene3d prop)
//   resize(width, height)
//   dispose()             frees the graphics memory
import * as THREE from 'three';
import { PALETTE, PIECES } from '../../components/pixel/sprites.js';
import {
  ANTENNA, FLAG_A, LANDER, CRATES, BLIP_BOT_A, SATELLITE, SHIELD_TOWER,
  COOLER, SERVER, DESK, SCREEN_BACK, ENGINEER, TELESCOPE, MONITOR, RADIO_DESK, PLANT
} from '../world/props.js';
import { extrude, lathe, hull, ball, island } from './voxels.js';
import {
  TILE3, RIM, gridToWorld, placeCentre, letterCentre, letterSpots, drawingToWorld,
  FACING_ANGLE, turnToward, moveToward, walkFeel, frameCamera, CAMERA_FOV, LOOK_3D
} from './layout.js';

// Colours go to the screen exactly as written, so the 3D view keeps the game's palette.
THREE.ColorManagement.enabled = false;

const PI = Math.PI;
const LIGHT_DIR = new THREE.Vector3(0.6, 1, 0.35).normalize();
const ROOM_LIGHT_DIR = new THREE.Vector3(-0.45, 1, 0.7).normalize();
const SUN_AT = new THREE.Vector3(300, -10, -560);
const STORM_FROM = new THREE.Vector3(0.47, 0.25, -0.88).normalize(); // radiation streams in from the Sun's side
const DOWN_ARROW = ['KKKKKKK', 'KYYYYYK', '.KYYYK.', '..KYK..', '...K...'];
const DOME_SHIFT = 6; // the round dome is two squares deep in 3D, so it sits a little further back
const SHIELD_RADIUS = 80;

// Little stones on the ground, as in the 2D map (drawing squares): [x, y, light?]
const PEBBLES = [
  [8, 16, 1], [30, 42, 0], [52, 18, 1], [70, 45, 0], [95, 40, 1], [16, 70, 0],
  [40, 64, 1], [102, 58, 0], [62, 77, 1], [84, 30, 0], [22, 52, 1], [110, 76, 0]
];

function geometryOf(block) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(block.positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(block.normals, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(block.colors, 3));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

// Small helpers to make meshes
function makeKit(voxelMaterial) {
  return {
    block(data, x = 0, y = 0, z = 0, scale = 1) {
      const mesh = new THREE.Mesh(geometryOf(data), voxelMaterial);
      mesh.position.set(x, y, z);
      mesh.scale.setScalar(scale);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    },
    flat(color, extra = {}) {
      return new THREE.MeshBasicMaterial({ color, ...extra });
    },
    cube(size, color) {
      return new THREE.Mesh(new THREE.BoxGeometry(size, size, size), new THREE.MeshBasicMaterial({ color }));
    }
  };
}

function keyLight(direction, intensity, small) {
  const light = new THREE.DirectionalLight(0xfff3e0, intensity);
  light.position.copy(direction).multiplyScalar(280);
  light.castShadow = true;
  const shadowCamera = light.shadow.camera;
  Object.assign(shadowCamera, { left: -110, right: 110, top: 110, bottom: -110, near: 20, far: 700 });
  shadowCamera.updateProjectionMatrix();
  const size = small ? 1024 : 2048;
  light.shadow.mapSize.set(size, size);
  light.shadow.bias = -0.0006;
  return [light, light.target];
}

function makeStars() {
  const points = [];
  for (let i = 0; i < 1400; i += 1) {
    const u = Math.random() * 2 - 1;
    const a = Math.random() * 2 * PI;
    const s = Math.sqrt(1 - u * u);
    points.push(s * Math.cos(a) * 1100, Math.abs(u) * 1000 - 60, s * Math.sin(a) * 1100);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ color: PALETTE.W, size: 2, sizeAttenuation: false, fog: false }));
}

// A character as three 3D frames: standing, and two steps that take turns while walking
function makeHero(sprites, kit) {
  const side = sprites.side ?? sprites.front;
  const sideLegs = sprites.sideLegs ?? sprites.legs;
  const back = sprites.back ?? sprites.front;
  const mirror = (rows) => rows.map((row) => [...row].reverse().join(''));
  const frame = (legs, legsSide) => kit.block(hull(sprites.front.concat(legs), side.concat(legsSide), back.concat(mirror(legs))));
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const frames = {
    stand: frame(sprites.legs.stand, sideLegs.stand),
    a: frame(sprites.legs.stepLeft, sideLegs.stepLeft),
    b: frame(sprites.legs.stepRight, sideLegs.stepRight)
  };
  Object.values(frames).forEach((mesh) => body.add(mesh));
  return { group, body, frames, x: 0, z: 0, angle: 0, placed: false };
}

// ---------- The Moon or Mars base (the Astronaut's map) ----------
function buildBase({ scene, map, world, kit, register, reducedMotion, small }) {
  const look = LOOK_3D[world] ?? LOOK_3D.moon;
  const add = (object) => {
    scene.add(object);
    return object;
  };
  const placeAt = (id) => {
    const place = map.places.find((p) => p.id === id);
    return place ? placeCentre(map, place) : null;
  };
  const parts = {};

  scene.background = new THREE.Color(look.background);
  add(makeStars());
  add(new THREE.HemisphereLight(look.sky, look.low, 0.5 * PI));
  keyLight(LIGHT_DIR, 0.58 * PI, small).forEach(add);
  add(kit.block(island(map.rows, look, { depthMax: 9 })));

  // Solar panel. It sparkles when Nova saves power.
  const panel = placeAt('solarPanel');
  if (panel) {
    register('solarPanel', add(kit.block(extrude(PIECES.solarPanel, 4), panel.x, 0, panel.z, 1.15)));
    parts.panelSparks = [0, 1, 2, 3, 4, 5].map((i) => {
      const spark = add(kit.cube(1.1, i % 2 ? PALETTE.W : PALETTE.C));
      spark.position.set(panel.x - 5 + i * 2, 9.5, panel.z + 2.7);
      spark.visible = false;
      return spark;
    });
  }

  // The shelter: the dome home. Its lights go off to save power and flicker when power is low.
  const shelter = placeAt('shelter');
  if (shelter) {
    const dome = { x: shelter.x, z: shelter.z - DOME_SHIFT };
    register('shelter', add(kit.block(lathe(PIECES.dome), dome.x, 0, dome.z)));
    parts.windows = [];
    for (const x of [-4, 4]) {
      const z = Math.sqrt(121 - x * x) - 0.6;
      for (const lit of [true, false]) {
        const pane = add(kit.block(extrude(['KKKK', lit ? 'KYYK' : 'KkkK', lit ? 'KYYK' : 'KkkK', 'KKKK'], 1), dome.x + x, 4, dome.z + z));
        pane.rotation.y = Math.atan2(x, z);
        pane.castShadow = false;
        pane.visible = lit;
        parts.windows.push({ pane, lit });
      }
    }
    add(kit.block(extrude(['KKKK', 'KbbK', 'KbbK'], 1), dome.x, 1, dome.z + 12.3)).castShadow = false;
    parts.doorLight = add(kit.cube(1.4, PALETTE.L));
    parts.doorLight.position.set(dome.x, 5.4, dome.z + 12.9);
    parts.doorLight.visible = false;
    parts.dome = dome;
  }

  // Shield tower, with a light on top
  const tower = placeAt('shieldTower');
  if (tower) {
    register('shieldTower', add(kit.block(lathe(SHIELD_TOWER), tower.x, 0, tower.z, 1.2)), 4);
    parts.beacon = add(kit.cube(1.6, PALETTE.r));
    parts.beacon.position.set(tower.x, SHIELD_TOWER.length * 1.2 + 0.9, tower.z);
  }

  // Science rover. Sparks rise when Nova does science.
  const rover = placeAt('rover');
  if (rover) {
    register('rover', add(kit.block(extrude(PIECES.rover, 6), rover.x, 0, rover.z, 1.5)));
    parts.roverSparks = [0, 1, 2, 3, 4, 5].map((i) => {
      const spark = add(kit.cube(1.1, [PALETTE.L, PALETTE.C, PALETTE.Y][i % 3]));
      spark.userData = { x: rover.x - 4 + i * 1.6, z: rover.z, phase: i * 0.37 };
      spark.visible = false;
      return spark;
    });
  }

  // Just there to look at: the radio dish (its light blinks), the flag (it waves), the lander, the crates
  const dish = letterCentre(map, 'a');
  if (dish) {
    add(kit.block(extrude(ANTENNA, 3), dish.x, 0, dish.z));
    parts.dishLight = add(kit.cube(1.2, PALETTE.r));
    parts.dishLight.position.set(dish.x + 2.5, 10.5, dish.z + 2);
  }
  const flag = letterCentre(map, 'f');
  if (flag) parts.flag = add(kit.block(extrude(FLAG_A, 1), flag.x, 0, flag.z));
  const lander = letterCentre(map, 'L');
  if (lander) {
    add(kit.block(extrude(LANDER, 12), lander.x, 0, lander.z));
    parts.landerLight = add(kit.cube(1.2, PALETTE.L));
    parts.landerLight.position.set(lander.x, 5.5, lander.z + 6.4);
  }
  const crates = letterCentre(map, 'c');
  if (crates) add(kit.block(extrude(CRATES, 9), crates.x, 0, crates.z));

  // BLIP, the base robot, rolls back and forth along the bottom of the base
  const blipRow = gridToWorld(map, 0, map.height - 1);
  parts.blip = add(kit.block(extrude(BLIP_BOT_A, 6), blipRow.x, 0, blipRow.z));
  parts.blipFrom = drawingToWorld(map, 6, 0).x;

  // Pebbles (only on open ground), and the power cable from the solar panel to the dome
  for (const [x, y, light] of PEBBLES) {
    const letter = map.rows[Math.floor(y / TILE3)]?.[Math.floor(x / TILE3)];
    if (letter !== '.' && letter !== ',') continue;
    const spot = drawingToWorld(map, x, y);
    const size = light ? 1.2 : 1.8;
    const pebble = add(new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.7, size), new THREE.MeshLambertMaterial({ color: light ? look.light : look.dark })));
    pebble.position.set(spot.x, size * 0.35, spot.z);
    pebble.receiveShadow = true;
  }
  if (panel && parts.dome) {
    const z = parts.dome.z + 11;
    const from = panel.x + 6;
    const to = parts.dome.x - Math.sqrt(Math.max(0, 144 - 121)) - 0.5;
    if (to > from) {
      const cable = add(new THREE.Mesh(new THREE.BoxGeometry(to - from, 0.5, 0.8), new THREE.MeshLambertMaterial({ color: PALETTE.K })));
      cable.position.set((from + to) / 2, 0.25, z);
      parts.cableLight = add(kit.cube(0.9, PALETTE.Y));
      parts.cableLight.position.set(from + 6, 0.7, z);
    }
  }

  // The sky: the Sun (always the same: it never shows the storm), Earth, and a satellite going by
  const sun = add(new THREE.Mesh(new THREE.IcosahedronGeometry(34, 1), kit.flat(PALETTE.Y)));
  sun.position.copy(SUN_AT);
  const halo = add(new THREE.Mesh(new THREE.IcosahedronGeometry(52, 1), kit.flat(PALETTE.O, { transparent: true, opacity: 0.25 })));
  halo.position.copy(SUN_AT);
  if (world === 'mars') {
    // From Mars, Earth is a tiny blue dot
    const dot = add(kit.cube(4, PALETTE.b));
    dot.position.set(-170, -20, -430);
  } else {
    const earth = add(kit.block(ball(PIECES.earth, 16), -170, -40, -430, 2.6));
    earth.castShadow = false;
    earth.receiveShadow = false;
  }
  parts.satellite = add(kit.block(extrude(SATELLITE, 2), -380, -5, -360, 3));
  parts.satellite.castShadow = false;

  // Mars: a little whirlwind of dust drifting near the horizon
  if (world === 'mars') {
    parts.whirl = add(new THREE.Group());
    for (let i = 0; i < 6; i += 1) {
      const size = 2.4 - i * 0.25;
      const puff = new THREE.Mesh(new THREE.BoxGeometry(size, 1.4, size), kit.flat(look.light, { transparent: true, opacity: 0.75 - i * 0.1 }));
      puff.position.set(Math.cos(i * 1.7) * i * 0.5, 0.7 + i * 1.6, Math.sin(i * 1.7) * i * 0.5);
      parts.whirl.add(puff);
    }
    const start = drawingToWorld(map, 16, 18);
    parts.whirl.position.set(start.x, 0, start.z);
    parts.whirlFrom = start.x;
  }

  // The shield: a glowing bubble over the whole base
  parts.bubble = add(new THREE.Mesh(
    new THREE.IcosahedronGeometry(SHIELD_RADIUS, 2),
    new THREE.MeshLambertMaterial({ color: PALETTE.C, transparent: true, opacity: 0.2, flatShading: true, depthWrite: false, side: THREE.DoubleSide })
  ));
  parts.bubble.scale.setScalar(0.001);
  parts.bubble.visible = false;

  // A radiation hit: little cubes stream in from the Sun's side (after the move, never before)
  const count = 300;
  const storm = new THREE.InstancedMesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), kit.flat(0xffffff), count);
  storm.frustumCulled = false;
  const tints = [PALETTE.O, PALETTE.p, PALETTE.Y, PALETTE.r].map((c) => new THREE.Color(c));
  const nothing = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < count; i += 1) {
    storm.setMatrixAt(i, nothing);
    storm.setColorAt(i, tints[i % tints.length]);
  }
  add(storm);
  const across = new THREE.Vector3().crossVectors(STORM_FROM, new THREE.Vector3(0, 1, 0)).normalize();
  const upward = new THREE.Vector3().crossVectors(across, STORM_FROM).normalize();
  const rad = { mesh: storm, p: new Float32Array(count * 3), v: new Float32Array(count * 3), life: new Float32Array(count), next: 0, until: 0, rate: 0, carry: 0 };
  const spot = new THREE.Vector3();
  const matrix = new THREE.Matrix4();

  function stormStep(dt, t, shielded) {
    if (t < rad.until) {
      rad.carry += rad.rate * dt;
      while (rad.carry >= 1) {
        rad.carry -= 1;
        const i = rad.next;
        rad.next = (rad.next + 1) % count;
        spot.copy(STORM_FROM).multiplyScalar(260)
          .addScaledVector(across, (Math.random() - 0.5) * 220)
          .addScaledVector(upward, (Math.random() - 0.35) * 120);
        rad.p.set([spot.x, spot.y, spot.z], i * 3);
        const speed = 190 + Math.random() * 70;
        rad.v.set([-STORM_FROM.x * speed, -STORM_FROM.y * speed, -STORM_FROM.z * speed], i * 3);
        rad.life[i] = 3.4;
      }
    }
    const radius = SHIELD_RADIUS * parts.bubble.scale.x;
    let changed = false;
    for (let i = 0; i < count; i += 1) {
      if (rad.life[i] <= 0) continue;
      changed = true;
      rad.life[i] -= dt;
      const j = i * 3;
      rad.p[j] += rad.v[j] * dt;
      rad.p[j + 1] += rad.v[j + 1] * dt;
      rad.p[j + 2] += rad.v[j + 2] * dt;
      const x = rad.p[j];
      const y = rad.p[j + 1];
      const z = rad.p[j + 2];
      if (y < 0 || (shielded && Math.hypot(x, y, z) < radius)) rad.life[i] = 0; // the shield stops it
      storm.setMatrixAt(i, rad.life[i] > 0 ? matrix.makeTranslation(x, y, z) : nothing);
    }
    if (changed) storm.instanceMatrix.needsUpdate = true;
  }

  const blink = (t, perSecond, phase = 0) => reducedMotion || Math.floor((t + phase) * perSecond * 2) % 2 === 0;
  let lastHit = null;

  return {
    lookHeight: 4,
    update(sc, dt, t) {
      const bubble = parts.bubble;
      const goal = sc.shielded ? 1 : 0.001;
      const size = reducedMotion ? goal : bubble.scale.x + (goal - bubble.scale.x) * Math.min(1, dt * 4);
      bubble.scale.setScalar(size);
      bubble.visible = size > 0.01;

      if (parts.windows) {
        const lightsOn = !sc.saving && !(sc.lowPower && !reducedMotion && Math.floor(t * 6) % 3 === 0);
        parts.windows.forEach(({ pane, lit }) => {
          pane.visible = lit ? lightsOn : !lightsOn;
        });
      }
      if (parts.doorLight) parts.doorLight.visible = Boolean(sc.sheltering) && blink(t, 0.8);
      parts.panelSparks?.forEach((spark, i) => {
        spark.visible = Boolean(sc.saving) && (reducedMotion || Math.floor(t * 5 + i) % 3 === 0);
      });
      parts.roverSparks?.forEach((spark) => {
        const k = reducedMotion ? 0.5 : (t * 0.9 + spark.userData.phase) % 1;
        spark.visible = Boolean(sc.science);
        spark.position.set(spark.userData.x, 7 + k * 16, spark.userData.z);
      });
      if (parts.beacon) parts.beacon.visible = blink(t, sc.shielded ? 3 : 0.75);
      if (parts.dishLight) parts.dishLight.visible = blink(t, 1.5);
      if (parts.landerLight) parts.landerLight.visible = blink(t, 0.6, 0.3);
      if (parts.cableLight) parts.cableLight.visible = blink(t, 0.6);

      if (!reducedMotion) {
        if (parts.flag) parts.flag.rotation.y = Math.sin(t * 2.2) * 0.18;
        const k = (Math.sin(t * 0.6) + 1) / 2;
        parts.blip.position.x = parts.blipFrom + k * 40;
        parts.blip.position.y = Math.floor(t * 6) % 2 ? 0.5 : 0;
        parts.blip.rotation.y = Math.cos(t * 0.6) > 0 ? PI / 2 : -PI / 2;
        parts.satellite.position.x = -380 + ((t * 24) % 760);
        if (parts.whirl) {
          parts.whirl.rotation.y = t * 3;
          parts.whirl.position.x = parts.whirlFrom + (Math.sin(t * 0.3) + 1) * 20;
        }
      }

      const hitKey = sc.hit > 0 ? `${sc.turn}:${sc.hit}` : null;
      if (hitKey && hitKey !== lastHit && !reducedMotion) {
        rad.until = t + 1.3;
        rad.rate = sc.bigHit ? 230 : 110;
        rad.carry = 0;
      }
      lastHit = hitKey;
      stormStep(dt, t, Boolean(sc.shielded));
    }
  };
}

// The wall of the control room, drawn like the 2D wall: the big screen with the Sun and Earth,
// a clock, a Moon poster, a Mars poster and status lights. One pixel = one unit of the wall.
function makeWallArt(width, height, reducedMotion) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  const rect = (x, y, w, h, color) => {
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
  };
  const disk = (cx, cy, r, color) => {
    for (let y = -r; y <= r; y += 1) for (let x = -r; x <= r; x += 1) if (x * x + y * y <= r * r + r * 0.8) rect(cx + x, cy + y, 1, 1, color);
  };
  const mid = Math.round(width / 2);
  const draw = (t) => {
    if (!g) return;
    const tick = reducedMotion ? 0 : Math.floor(t * 2);
    rect(0, 0, width, height, PALETTE.k);
    rect(0, 0, width, 3, PALETTE.D);
    rect(0, 3, width, 1, PALETTE.g);
    rect(0, height - 5, width, 5, PALETTE.D);
    rect(0, height - 5, width, 1, PALETTE.g);
    // The big screen: the Sun, the way to Earth, and Earth
    rect(mid - 32, 7, 64, 27, PALETTE.K);
    rect(mid - 32, 7, 64, 1, PALETTE.b);
    rect(mid - 32, 33, 64, 1, PALETTE.b);
    disk(mid - 20, 20, 6, PALETTE.O);
    disk(mid - 20, 20, 5, PALETTE.Y);
    for (let x = mid - 9; x <= mid + 15; x += 4) rect(x, 20, 1, 1, PALETTE.g);
    rect(mid + 19, 18, 5, 5, tick % 2 ? PALETTE.C : PALETTE.b);
    // A clock: its hand ticks
    disk(mid - 48, 20, 7, PALETTE.W);
    if (tick % 2) rect(mid - 48, 14, 1, 6, PALETTE.K);
    else rect(mid - 48, 20, 6, 1, PALETTE.K);
    rect(mid - 48, 20, 1, 1, PALETTE.r);
    // Posters: the Moon and Mars
    rect(mid + 38, 11, 12, 16, PALETTE.K);
    disk(mid + 44, 19, 4, PALETTE.G);
    rect(mid + 42, 18, 1, 1, PALETTE.g);
    rect(mid + 52, 11, 12, 16, PALETTE.K);
    disk(mid + 58, 19, 4, PALETTE.O);
    rect(mid + 57, 21, 2, 1, '#b0553a');
    // Status lights
    [[mid - 56, PALETTE.L, 0], [mid - 52, PALETTE.L, 1], [mid + 50, PALETTE.C, 0], [mid + 54, PALETTE.C, 1]].forEach(([x, color, phase]) => {
      if (reducedMotion || (tick + phase) % 2 === 0) rect(x, height - 8, 3, 1, color);
    });
    texture.needsUpdate = true;
  };
  draw(0);
  return { texture, draw, next: 0 };
}

// ---------- The control room on Earth (Mission Control's map) ----------
function buildRoom({ scene, map, kit, register, reducedMotion, small }) {
  const look = LOOK_3D.room;
  const add = (object) => {
    scene.add(object);
    return object;
  };
  const placeAt = (id) => {
    const place = map.places.find((p) => p.id === id);
    return place ? placeCentre(map, place) : null;
  };

  scene.background = new THREE.Color(look.background);
  add(new THREE.HemisphereLight(look.sky, look.low, 0.9 * PI));
  keyLight(ROOM_LIGHT_DIR, 0.55 * PI, small).forEach(add);
  add(kit.block(island(map.rows, look, { depthMax: 3, rocks: false })));

  // The back wall (row 0 of the map), with its picture, and a low wall on the left
  const halfWidth = (map.width * TILE3) / 2 + RIM;
  const wallFront = gridToWorld(map, 0, 1).z - TILE3 / 2;
  const wallHeight = 45;
  const wall = add(new THREE.Mesh(new THREE.BoxGeometry(halfWidth * 2, wallHeight, RIM), new THREE.MeshLambertMaterial({ color: PALETTE.k })));
  wall.position.set(0, wallHeight / 2, wallFront - RIM / 2);
  wall.receiveShadow = true;
  const art = makeWallArt(halfWidth * 2, wallHeight, reducedMotion);
  const picture = add(new THREE.Mesh(new THREE.PlaneGeometry(halfWidth * 2, wallHeight), new THREE.MeshLambertMaterial({ map: art.texture })));
  picture.position.set(0, wallHeight / 2, wallFront + 0.05);
  picture.receiveShadow = true;
  const sideDepth = (map.height - 1) * TILE3 + RIM * 2;
  const side = add(new THREE.Mesh(new THREE.BoxGeometry(RIM, 27, sideDepth), new THREE.MeshLambertMaterial({ color: PALETTE.k })));
  side.position.set(-halfWidth + RIM / 2, 13.5, 0);
  side.castShadow = true;
  side.receiveShadow = true;

  const parts = {};

  // The water cooler, the computer rack (its lights blink), the plants
  const cooler = letterCentre(map, 'c');
  if (cooler) add(kit.block(extrude(COOLER, 6), cooler.x, 0, cooler.z - 2));
  const rack = letterCentre(map, 'S');
  if (rack) {
    add(kit.block(extrude(SERVER, 8), rack.x, 0, rack.z));
    parts.rackLights = [1, 3, 5, 7, 9, 11].map((row, i) => {
      const light = add(kit.cube(0.9, i % 2 ? PALETTE.L : PALETTE.C));
      light.position.set(rack.x + 2 + (i % 3) * 2 - 5 + 0.5, SERVER.length - 1 - row + 0.5, rack.z + 4.2);
      return light;
    });
  }
  for (const spot of letterSpots(map, 'p')) add(kit.block(lathe(PLANT), spot.x, 0, spot.z, 1.1));

  // The flight engineer at the desk (typing), with the back of their screen
  const desk = letterCentre(map, 'E');
  if (desk) {
    add(kit.block(extrude(DESK, 10), desk.x, 0, desk.z));
    parts.engineer = add(kit.block(extrude(ENGINEER, 6), desk.x + 5, 5, desk.z - 7));
    add(kit.block(extrude(SCREEN_BACK, 1), desk.x - 6, DESK.length, desk.z + 1));
  }

  // The places Commander Sola uses: telescope, crew monitor, radio desk (with a rug under it)
  const telescope = placeAt('telescope');
  if (telescope) register('telescope', add(kit.block(extrude(TELESCOPE, 5), telescope.x, 0, telescope.z, 1.2)));
  const monitor = placeAt('monitor');
  if (monitor) {
    register('monitor', add(kit.block(extrude(MONITOR, 5), monitor.x, 0, monitor.z, 1.2)));
    parts.monitorLight = add(kit.cube(0.9, PALETTE.L));
    parts.monitorLight.position.set(monitor.x - 4.2, 9, monitor.z + 3.2);
  }
  const radio = placeAt('radio');
  if (radio) {
    const rug = add(new THREE.Mesh(new THREE.PlaneGeometry(32, 16), new THREE.MeshLambertMaterial({ color: PALETTE.P, transparent: true, opacity: 0.6 })));
    rug.rotation.x = -PI / 2;
    rug.position.set(radio.x, 0.06, radio.z + 3);
    rug.receiveShadow = true;
    register('radio', add(kit.block(extrude(RADIO_DESK, 10), radio.x, 0, radio.z)));
    parts.radioLight = add(new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), kit.flat(PALETTE.g)));
    parts.radioLight.position.set(radio.x + 2.5, RADIO_DESK.length + 0.2, radio.z);
  }

  const blink = (t, perSecond, phase = 0) => reducedMotion || Math.floor((t + phase) * perSecond * 2) % 2 === 0;

  return {
    lookHeight: 12,
    update(sc, dt, t) {
      if (parts.engineer) parts.engineer.position.y = 5 + (!reducedMotion && Math.sin(t * 14) > 0.3 ? 0.35 : 0);
      if (parts.radioLight) {
        // Red in the Mars signal blackout, cyan once a warning is sent this wave, grey otherwise
        const color = sc.radio === 'blackout' ? PALETTE.r : sc.radio === 'sent' ? PALETTE.C : PALETTE.g;
        parts.radioLight.material.color.set(color);
        parts.radioLight.visible = sc.radio === 'blackout' || sc.radio === 'sent' ? blink(t, 3) : true;
      }
      if (parts.monitorLight) parts.monitorLight.visible = blink(t, 0.6);
      parts.rackLights?.forEach((light, i) => {
        light.visible = blink(t, [3, 1.2, 0.6][i % 3], i * 0.21);
      });
      if (t >= art.next) {
        art.draw(t);
        art.next = t + 0.25;
      }
    }
  };
}

export function createWorld({ canvas, kind, map, hero, world = 'moon', reducedMotion = false }) {
  const small = Math.min(window.innerWidth || 1024, window.innerHeight || 768) < 520;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 1, 4000);
  const kit = makeKit(new THREE.MeshLambertMaterial({ vertexColors: true }));

  // Each place remembers where its top is, for the "you can use this" arrow and the sparkles
  const places = {};
  const register = (id, mesh, above = 3) => {
    const box = mesh.geometry.boundingBox;
    places[id] = { x: mesh.position.x, z: mesh.position.z, top: mesh.position.y + box.max.y * mesh.scale.y + above };
  };
  const context = { scene, map, world, kit, places, register, reducedMotion, small };
  const content = kind === 'room' ? buildRoom(context) : buildBase(context);

  const character = makeHero(hero.sprites, kit);
  scene.add(character.group);

  // Not lit by the scene, so it stays bright yellow like the 2D arrow
  const arrow = new THREE.Mesh(geometryOf(extrude(DOWN_ARROW, 2)), new THREE.MeshBasicMaterial({ vertexColors: true }));
  arrow.scale.setScalar(1.2);
  arrow.visible = false;
  scene.add(arrow);

  const sparkles = [PALETTE.Y, PALETTE.W, PALETTE.C, PALETTE.W, PALETTE.C, PALETTE.Y].map((color) => {
    const cube = kit.cube(1.2, color);
    cube.visible = false;
    scene.add(cube);
    return cube;
  });
  const SPARKLE_WAYS = [[0, 1.4], [-1, 0.6], [1, 0.6], [-0.7, 1.1], [0.7, 1.1], [0, 0.4]];

  const puffMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
  const puffs = [-4, -2, 2, 4].map(() => {
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), puffMaterial);
    cube.visible = false;
    scene.add(cube);
    return cube;
  });

  let aspect = 1;
  let firstFrame = true;
  const lookAt = new THREE.Vector3();
  const wanted = new THREE.Vector3();
  let lastSteps = null;
  let stepAt = -10;
  let landed = true;
  let lastUse = null;
  let useAt = -10;
  let usedSpot = null;
  let puffAt = -10;
  let puffTime = 0.35;
  let puffFloats = false;
  const puffSpot = { x: 0, z: 0 };

  // Dust kicked up by a step (on Earth) or a landing (Moon and Mars, where it settles slowly)
  function kickDust(t, spot, color, feel) {
    if (!color) return;
    puffAt = t;
    puffTime = feel.dustTime;
    puffFloats = feel.hopTime > 0;
    puffSpot.x = spot.x;
    puffSpot.z = spot.z;
    puffMaterial.color.set(color);
  }

  function frame(state, dt, t) {
    const {
      position, steps = 0, hidden = false, used = { count: 0, place: null }, near = null,
      scene: sc = {}, puff = null, stepMs, celebrate = true
    } = state;
    // Low gravity on the Moon and Mars: slow, floaty hops. Earth: a quick walk.
    const feel = walkFeel({ stepMs, world: sc.world });

    // The character slides to its square, turns the way it faces, and steps while it walks
    const goal = gridToWorld(map, position.x, position.y);
    if (!character.placed) {
      character.x = goal.x;
      character.z = goal.z;
      character.angle = FACING_ANGLE[position.facing] ?? 0;
      character.placed = true;
    }
    const moved = moveToward(character, goal, feel.speed * dt);
    character.x = moved.x;
    character.z = moved.z;
    if (lastSteps !== null && steps !== lastSteps) {
      stepAt = t;
      landed = false;
      if (!feel.hopTime && !hidden) kickDust(t, goal, puff, feel); // Earth: dust as the step starts
    }
    lastSteps = steps;
    const hopK = feel.hopTime ? (t - stepAt) / feel.hopTime : 1;
    const inAir = hopK >= 0 && hopK < 1;
    if (feel.hopTime && !inAir && !landed) {
      landed = true;
      if (!hidden) kickDust(t, character, puff, feel); // Moon and Mars: dust when Nova lands
    }
    const walking = inAir || moved.distance > 0.3 || t - stepAt < 0.2;
    character.angle = turnToward(character.angle, FACING_ANGLE[position.facing] ?? 0, dt * 14);
    character.group.position.set(character.x, 0, character.z);
    character.group.rotation.y = character.angle;
    character.group.visible = !hidden;
    const odd = steps % 2 === 1;
    character.frames.stand.visible = !walking;
    character.frames.a.visible = walking && odd;
    character.frames.b.visible = walking && !odd;

    // Using a place: a hop, and sparkles over the place (only where the map celebrates)
    if (lastUse !== null && used.count !== lastUse && used.count > 0) {
      useAt = t;
      usedSpot = celebrate && used.place ? places[used.place.id] ?? null : null;
    }
    lastUse = used.count;
    const useK = (t - useAt) / 0.32;
    const useHop = celebrate && !reducedMotion && useK >= 0 && useK < 1 ? Math.sin(useK * PI) * 3 : 0;
    const stepHop = feel.hopTime && inAir && !reducedMotion ? Math.sin(hopK * PI) * feel.hopHeight : 0;
    const bob = !feel.hopTime && walking && !reducedMotion && odd ? 0.6 : 0;
    character.body.position.y = useHop + stepHop + bob;

    const sparkleK = (t - useAt) / 0.6;
    sparkles.forEach((cube, i) => {
      const show = Boolean(usedSpot) && sparkleK >= 0 && sparkleK < 1 && !reducedMotion;
      cube.visible = show;
      if (show) {
        const [dx, dy] = SPARKLE_WAYS[i];
        cube.position.set(usedSpot.x + dx * sparkleK * 7, usedSpot.top - 2 + dy * sparkleK * 7, usedSpot.z + 2);
      }
    });

    // The dust: on Earth a quick puff; in low gravity it floats up and drifts down slowly
    const puffK = (t - puffAt) / puffTime;
    const puffing = puffK >= 0 && puffK < 1 && !reducedMotion;
    puffMaterial.opacity = puffing ? 0.8 * (1 - puffK) : 0;
    const rise = puffFloats ? (puffK < 0.25 ? puffK / 0.25 : 1 - (puffK - 0.25) / 0.75) * 1.8 : puffK * 1.2;
    puffs.forEach((cube, i) => {
      cube.visible = puffing;
      if (puffing) {
        cube.position.set(puffSpot.x + [-4, -2, 2, 4][i] * (1 + puffK), 0.6 + rise, puffSpot.z + (i % 2 ? 1.5 : -1.5));
        cube.scale.setScalar(1 + puffK);
      }
    });

    // "You can use this": a bouncing arrow over the place next to the character
    const target = near && !hidden ? places[near.id] : null;
    arrow.visible = Boolean(target);
    if (target) arrow.position.set(target.x, target.top + (reducedMotion ? 0 : Math.floor(t * 3) % 2), target.z);

    content.update(sc, dt, t);

    // The camera glides after the character (it starts in place, with no glide)
    const view = frameCamera({ aspect, map, hero: { x: character.x, z: character.z }, lookHeight: content.lookHeight });
    const k = firstFrame ? 1 : Math.min(1, dt * 3);
    camera.position.lerp(wanted.set(view.position.x, view.position.y, view.position.z), k);
    lookAt.lerp(wanted.set(view.target.x, view.target.y, view.target.z), k);
    camera.lookAt(lookAt);
    firstFrame = false;

    renderer.render(scene, camera);
  }

  function resize(width, height) {
    if (!(width > 1 && height > 1)) return;
    renderer.setSize(width, height, false);
    aspect = width / height;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }

  function dispose() {
    scene.traverse((object) => {
      object.geometry?.dispose();
      const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
      materials.forEach((material) => {
        material.map?.dispose();
        material.dispose();
      });
    });
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return { frame, resize, dispose };
}
