import * as THREE from 'three';
import {
  BALL_RADIUS,
  GOAL_DEPTH,
  GOAL_HALF_WIDTH,
  GOAL_HEIGHT,
  POST_RADIUS,
} from './physics';
import {
  createAdBoardTexture,
  createAuraRingTexture,
  createBallTextures,
  createContactShadowTexture,
  createFabricBumpTexture,
  createGoalWearDecalTexture,
  createJerseyWrapTexture,
  createNetTexture,
  createPitchDetailMaps,
  createPitchPerimeterTexture,
  createPitchTexture,
  createPlayerFaceTexture,
  createSkyDomeTexture,
  createSnowPerimeterTexture,
  createSnowPitchTexture,
  createSpeedAuraTexture,
  createStadiumJumbotronTexture,
  createWinterSkyDomeTexture,
} from './textures';
import {
  HairStyle,
  KitPattern,
  PITCH_HALF_L,
  PITCH_HALF_W,
  PITCH_LENGTH,
  RUNNING_AURAS,
  RunningAuraId,
} from './types';

export interface ArticulatedPlayer {
  group: THREE.Group;
  bodyPivot: THREE.Group;
  torso: THREE.Mesh;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftElbowPivot?: THREE.Group;
  rightElbowPivot?: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKneePivot?: THREE.Group;
  rightKneePivot?: THREE.Group;
  setAuraState: (
    speedRatio: number,
    isSprinting: boolean,
    skillActive: boolean,
    runningAuraId?: RunningAuraId,
    elapsedSec?: number,
  ) => void;
  dispose: () => void;
}

export interface DeformableNet {
  group: THREE.Group;
  triggerRipple: (worldX: number, worldY: number, strength: number) => void;
  update: (dt: number) => void;
  dispose: () => void;
}

export interface StadiumBundle {
  group: THREE.Group;
  net: DeformableNet;
  netSouth: DeformableNet;
  crowdMesh: THREE.InstancedMesh;
  crowdHeadsMesh: THREE.InstancedMesh;
  crowdArmsMesh: THREE.InstancedMesh;
  crowdFlashMesh: THREE.InstancedMesh;
  crowdBaseMatrices: THREE.Matrix4[];
  crowdPositions: Float32Array;
  crowdScales: Float32Array;
  crowdPhases: Float32Array;
  crowdWaveAngles: Float32Array;
  crowdFlashPositions: Float32Array;
  flagCloths: THREE.Mesh[];
  mudPuddlesGroup: THREE.Group;
  pitchMat: THREE.MeshPhysicalMaterial;
  setSnowSurface: (enabled: boolean) => void;
  updateGrass: (elapsedSec: number) => void;
  dispose: () => void;
}

function addLineBox(
  parent: THREE.Group,
  w: number,
  d: number,
  x: number,
  z: number,
  mat: THREE.Material,
  geometries: THREE.BufferGeometry[],
): void {
  const geo = new THREE.PlaneGeometry(w, d);
  geo.rotateX(-Math.PI / 2);
  geometries.push(geo);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, 0.015, z);
  mesh.receiveShadow = true;
  parent.add(mesh);
}

export function createStadium(maxAnisotropy: number): StadiumBundle {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  // 0. Atmospheric Stadium Night Sky Dome (encloses monumental 105x68m arena)
  const skyTex = createSkyDomeTexture();
  const winterSkyTex = createWinterSkyDomeTexture();
  textures.push(skyTex, winterSkyTex);
  const skyGeo = new THREE.SphereGeometry(245, 28, 18);
  geometries.push(skyGeo);
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTex,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  materials.push(skyMat);
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  skyDome.position.set(0, 12, PITCH_HALF_L);
  group.add(skyDome);

  // 1. Main Turf Pitch (68m x 105m FIFA full regulation + generous perimeter apron)
  const pitchTex = createPitchTexture(maxAnisotropy);
  const snowPitchTex = createSnowPitchTexture(maxAnisotropy);
  const { bumpMap: pitchBump, roughnessMap: pitchRough } =
    createPitchDetailMaps(maxAnisotropy);
  pitchTex.repeat.set(4, 6);
  snowPitchTex.repeat.set(4, 6);
  pitchBump.repeat.set(4, 6);
  pitchRough.repeat.set(4, 6);
  textures.push(pitchTex, snowPitchTex, pitchBump, pitchRough);

  const pitchGeo = new THREE.PlaneGeometry(PITCH_HALF_W * 2 + 8, PITCH_LENGTH + 11);
  pitchGeo.rotateX(-Math.PI / 2);
  geometries.push(pitchGeo);

  const pitchMat = new THREE.MeshPhysicalMaterial({
    map: pitchTex,
    bumpMap: pitchBump,
    bumpScale: 0.055,
    roughnessMap: pitchRough,
    roughness: 0.92,
    metalness: 0.0,
    clearcoat: 0.0,
    clearcoatRoughness: 0.65,
    sheen: 0.12,
    sheenRoughness: 0.92,
    sheenColor: new THREE.Color(0x2d6a4f),
    envMapIntensity: 0.28,
  });
  materials.push(pitchMat);

  const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
  pitchMesh.position.set(0, 0, PITCH_HALF_L);
  pitchMesh.receiveShadow = true;
  group.add(pitchMesh);

  // Synthetic deep-emerald stadium apron around playable field (toggled to snow apron in snow weather)
  const apronTex = createPitchPerimeterTexture(maxAnisotropy);
  const snowApronTex = createSnowPerimeterTexture(maxAnisotropy);
  apronTex.repeat.set(16, 20);
  snowApronTex.repeat.set(16, 20);
  textures.push(apronTex, snowApronTex);
  const apronGeo = new THREE.PlaneGeometry(148, 172);
  apronGeo.rotateX(-Math.PI / 2);
  geometries.push(apronGeo);
  const apronMat = new THREE.MeshStandardMaterial({
    map: apronTex,
    roughness: 0.88,
    metalness: 0.04,
  });
  materials.push(apronMat);
  const apronMesh = new THREE.Mesh(apronGeo, apronMat);
  apronMesh.position.set(0, -0.01, PITCH_HALF_L);
  apronMesh.receiveShadow = true;
  group.add(apronMesh);

  // Goal-mouth, Penalty Spot & Center Circle turf wear decals for stadium match realism
  const wearTex = createGoalWearDecalTexture();
  textures.push(wearTex);
  const wearMat = new THREE.MeshBasicMaterial({
    map: wearTex,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  materials.push(wearMat);
  const wearGeo = new THREE.PlaneGeometry(1, 1);
  wearGeo.rotateX(-Math.PI / 2);
  geometries.push(wearGeo);
  [
    { x: 0, z: 1.8, sx: 8.6, sz: 4.4 },
    { x: 0, z: PITCH_LENGTH - 1.8, sx: 8.6, sz: 4.4 },
    { x: 0, z: 11.0, sx: 2.3, sz: 2.3 },
    { x: 0, z: PITCH_LENGTH - 11.0, sx: 2.3, sz: 2.3 },
    { x: 0, z: PITCH_HALF_L, sx: 3.1, sz: 3.1 },
  ].forEach((w) => {
    const wm = new THREE.Mesh(wearGeo, wearMat);
    wm.position.set(w.x, 0.006, w.z);
    wm.scale.set(w.sx, 1, w.sz);
    group.add(wm);
  });

  // 1b. Instanced 3D Grass Blade Tufts across playable field (1 draw call + GPU wind sway)
  const tuftPositions: number[] = [];
  const tuftNormals: number[] = [];
  const tuftUvs: number[] = [];
  const addBlade = (
    bx: number,
    bz: number,
    angY: number,
    tiltX: number,
    w: number,
    h: number,
  ) => {
    const c = Math.cos(angY);
    const s = Math.sin(angY);
    const lx0 = -w * 0.5;
    const lx1 = w * 0.5;
    const tipZ = tiltX;
    const x0 = bx + lx0 * c;
    const z0 = bz - lx0 * s;
    const x1 = bx + lx1 * c;
    const z1 = bz - lx1 * s;
    const xt = bx - tipZ * s;
    const zt = bz + tipZ * c;

    tuftPositions.push(x0, 0, z0, x1, 0, z1, xt, h, zt);
    tuftNormals.push(0, 0.9, 0.4, 0, 0.9, 0.4, 0, 0.96, 0.25);
    tuftUvs.push(0, 0, 1, 0, 0.5, 1);
  };
  addBlade(0, 0, 0.1, 0.018, 0.022, 0.048);
  addBlade(-0.012, 0.008, 1.8, 0.021, 0.02, 0.041);
  addBlade(0.013, -0.007, 3.6, 0.019, 0.021, 0.045);
  addBlade(-0.006, -0.012, 5.1, 0.017, 0.019, 0.038);

  const tuftGeo = new THREE.BufferGeometry();
  tuftGeo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(tuftPositions, 3),
  );
  tuftGeo.setAttribute(
    'normal',
    new THREE.Float32BufferAttribute(tuftNormals, 3),
  );
  tuftGeo.setAttribute('uv', new THREE.Float32BufferAttribute(tuftUvs, 2));
  geometries.push(tuftGeo);

  const grassWindUniform = { value: 0 };
  const tuftMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.90,
    metalness: 0.0,
    envMapIntensity: 0.25,
    side: THREE.DoubleSide,
  });
  tuftMat.onBeforeCompile = (shader) => {
    shader.uniforms.uGrassTime = grassWindUniform;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>\nuniform float uGrassTime;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          float gust = sin(uGrassTime * 2.2 + wp.x * 0.42 + wp.z * 0.32) * 0.28 + cos(uGrassTime * 1.4 - wp.z * 0.18) * 0.12;
          transformed.x += gust * max(0.0, transformed.y - 0.004);
          transformed.z += gust * 0.48 * max(0.0, transformed.y - 0.004);
        #endif`,
      );
  };
  materials.push(tuftMat);

  const nearChalkLine = (px: number, pz: number): boolean => {
    if (
      Math.abs(pz) < 0.25 ||
      Math.abs(pz - PITCH_LENGTH) < 0.25 ||
      Math.abs(pz - PITCH_HALF_L) < 0.25
    )
      return true;
    if (Math.abs(px - -PITCH_HALF_W) < 0.25 || Math.abs(px - PITCH_HALF_W) < 0.25)
      return true;
    if (
      Math.abs(px) < 20.4 &&
      (Math.abs(pz - 16.5) < 0.25 || Math.abs(pz - (PITCH_LENGTH - 16.5)) < 0.25)
    )
      return true;
    if (
      (Math.abs(px - -20.16) < 0.25 || Math.abs(px - 20.16) < 0.25) &&
      (pz < 16.75 || pz > PITCH_LENGTH - 16.75)
    )
      return true;
    if (
      Math.abs(px) < 9.4 &&
      (Math.abs(pz - 5.5) < 0.25 || Math.abs(pz - (PITCH_LENGTH - 5.5)) < 0.25)
    )
      return true;
    if (Math.abs(Math.hypot(px, pz - PITCH_HALF_L) - 9.15) < 0.25) return true;
    return false;
  };

  const grassCoords: Array<{ x: number; z: number; s: number; ry: number }> = [];
  for (let i = 0; i < 9000; i++) {
    const h1 = ((i * 2654435761) >>> 0) / 4294967296;
    const h2 = (((i + 1013) * 2246822519) >>> 0) / 4294967296;
    const h3 = (((i + 4099) * 3266489917) >>> 0) / 4294967296;
    let gx: number;
    let gz: number;
    if (i < 3200) {
      gx = (h1 - 0.5) * 54;
      gz = 0.6 + h2 * 30;
    } else if (i < 5200) {
      gx = (h1 - 0.5) * 54;
      gz = PITCH_LENGTH - 30.6 + h2 * 30.0;
    } else {
      gx = (h1 - 0.5) * 82;
      gz = 0.8 + h2 * (PITCH_LENGTH - 1.6);
    }
    if (nearChalkLine(gx, gz)) continue;
    grassCoords.push({
      x: gx,
      z: gz,
      s: 0.84 + h3 * 0.42,
      ry: h1 * Math.PI * 2,
    });
  }

  const grassMesh = new THREE.InstancedMesh(
    tuftGeo,
    tuftMat,
    grassCoords.length,
  );
  const grassDummy = new THREE.Object3D();
  const stripeLight = new THREE.Color(0x2d8743);
  const stripeDark = new THREE.Color(0x185c29);
  const bladeColor = new THREE.Color();
  const pitchHeightSpan = PITCH_LENGTH + 11;
  grassCoords.forEach((gc, idx) => {
    grassDummy.position.set(gc.x, 0, gc.z);
    grassDummy.rotation.set(0, gc.ry, 0);
    grassDummy.scale.set(gc.s, gc.s * (0.9 + (idx % 3) * 0.12), gc.s);
    grassDummy.updateMatrix();
    grassMesh.setMatrixAt(idx, grassDummy.matrix);

    const vCoord = (gc.z - (PITCH_HALF_L - pitchHeightSpan / 2)) / (pitchHeightSpan / 6);
    const bandIdx = Math.floor(vCoord * 18);
    bladeColor.copy(bandIdx % 2 === 0 ? stripeLight : stripeDark);
    bladeColor.offsetHSL(((idx % 7) - 3) * 0.004, 0.03, ((idx % 4) - 1.5) * 0.02);
    grassMesh.setColorAt(idx, bladeColor);
  });
  grassMesh.instanceMatrix.needsUpdate = true;
  if (grassMesh.instanceColor) grassMesh.instanceColor.needsUpdate = true;
  grassMesh.computeBoundingSphere();
  grassMesh.receiveShadow = true;
  group.add(grassMesh);

  // Outer stadium concrete/athletic track surround
  const trackGeo = new THREE.PlaneGeometry(340, 340);
  trackGeo.rotateX(-Math.PI / 2);
  geometries.push(trackGeo);
  const trackMat = new THREE.MeshStandardMaterial({
    color: 0x101c2d,
    roughness: 0.88,
    metalness: 0.08,
  });
  materials.push(trackMat);
  const trackMesh = new THREE.Mesh(trackGeo, trackMat);
  trackMesh.position.set(0, -0.024, PITCH_HALF_L);
  trackMesh.receiveShadow = true;
  group.add(trackMesh);

  // Rain/Storm Mud Puddles scattered naturally across pitch (toggled visible in rain/storm)
  const mudPuddlesGroup = new THREE.Group();
  mudPuddlesGroup.visible = false;
  const mudCoreGeo = new THREE.CircleGeometry(1, 18);
  mudCoreGeo.rotateX(-Math.PI / 2);
  const mudRimGeo = new THREE.CircleGeometry(1, 20);
  mudRimGeo.rotateX(-Math.PI / 2);
  geometries.push(mudCoreGeo, mudRimGeo);

  const mudCoreMat = new THREE.MeshStandardMaterial({
    color: 0x422b18,
    roughness: 0.24,
    metalness: 0.08,
    transparent: true,
    opacity: 0.84,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const mudWaterRimMat = new THREE.MeshStandardMaterial({
    color: 0x2a241b,
    roughness: 0.05,
    metalness: 0.28,
    transparent: true,
    opacity: 0.62,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  materials.push(mudCoreMat, mudWaterRimMat);

  const puddleSpecs = [
    { x: -1.6, z: 3.1, rx: 1.55, rz: 1.05, rot: 0.2 },
    { x: 2.3, z: 4.3, rx: 1.35, rz: 0.9, rot: -0.35 },
    { x: -7.8, z: 12.6, rx: 2.1, rz: 1.35, rot: 0.48 },
    { x: 8.6, z: 14.8, rx: 1.85, rz: 1.25, rot: -0.25 },
    { x: -3.4, z: 21.8, rx: 2.25, rz: 1.4, rot: 0.14 },
    { x: 5.4, z: 25.4, rx: 1.7, rz: 1.15, rot: -0.6 },
    { x: -19.5, z: 19.2, rx: 2.6, rz: 1.6, rot: 0.35 },
    { x: 21.0, z: 32.5, rx: 2.4, rz: 1.45, rot: -0.4 },
    { x: -12.5, z: 44.0, rx: 2.7, rz: 1.75, rot: 0.28 },
    { x: 9.2, z: 58.5, rx: 2.5, rz: 1.55, rot: -0.18 },
    { x: -24.0, z: 72.0, rx: 2.35, rz: 1.5, rot: 0.55 },
    { x: 14.0, z: 85.0, rx: 2.2, rz: 1.35, rot: -0.3 },
    { x: 0.8, z: 100.8, rx: 1.65, rz: 1.05, rot: 0.12 },
  ];

  puddleSpecs.forEach((pd, idx) => {
    const rim = new THREE.Mesh(mudRimGeo, mudWaterRimMat);
    rim.position.set(pd.x, 0.011, pd.z);
    rim.rotation.y = pd.rot;
    rim.scale.set(pd.rx * 1.24, 1, pd.rz * 1.22);
    rim.receiveShadow = true;
    mudPuddlesGroup.add(rim);

    const core = new THREE.Mesh(mudCoreGeo, mudCoreMat);
    core.position.set(pd.x + (idx % 2 === 0 ? 0.14 : -0.12), 0.0125, pd.z + 0.08);
    core.rotation.y = pd.rot + 0.35;
    core.scale.set(pd.rx * 0.82, 1, pd.rz * 0.8);
    core.receiveShadow = true;
    mudPuddlesGroup.add(core);

    const lobe = new THREE.Mesh(mudCoreGeo, mudCoreMat);
    lobe.position.set(
      pd.x + Math.cos(idx * 1.7) * pd.rx * 0.42,
      0.012,
      pd.z + Math.sin(idx * 1.7) * pd.rz * 0.38,
    );
    lobe.rotation.y = -pd.rot;
    lobe.scale.set(pd.rx * 0.56, 1, pd.rz * 0.54);
    lobe.receiveShadow = true;
    mudPuddlesGroup.add(lobe);
  });
  group.add(mudPuddlesGroup);

  // 2. Crisp Chalk Pitch Markings (y = 0.015, polygonOffset prevents z-fighting)
  const lineMat = new THREE.MeshStandardMaterial({
    color: 0xdbe2ea,
    roughness: 0.94,
    metalness: 0.0,
    envMapIntensity: 0.18,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  materials.push(lineMat);

  const lw = 0.13;
  // Goal lines & Touchlines (z = 0 to z = PITCH_LENGTH = 105)
  addLineBox(group, PITCH_HALF_W * 2, lw, 0, 0, lineMat, geometries);
  addLineBox(group, PITCH_HALF_W * 2, lw, 0, PITCH_LENGTH, lineMat, geometries);
  addLineBox(group, lw, PITCH_LENGTH, -PITCH_HALF_W, PITCH_HALF_L, lineMat, geometries);
  addLineBox(group, lw, PITCH_LENGTH, PITCH_HALF_W, PITCH_HALF_L, lineMat, geometries);
  // Halfway line
  addLineBox(group, PITCH_HALF_W * 2, lw, 0, PITCH_HALF_L, lineMat, geometries);

  // North Penalty Box (z = 0..16.5) & 6-yard Goal Area
  addLineBox(group, 40.32, lw, 0, 16.5, lineMat, geometries);
  addLineBox(group, lw, 16.5, -20.16, 8.25, lineMat, geometries);
  addLineBox(group, lw, 16.5, 20.16, 8.25, lineMat, geometries);
  addLineBox(group, 18.32, lw, 0, 5.5, lineMat, geometries);
  addLineBox(group, lw, 5.5, -9.16, 2.75, lineMat, geometries);
  addLineBox(group, lw, 5.5, 9.16, 2.75, lineMat, geometries);

  // South Penalty Box (z = PITCH_LENGTH - 16.5 .. PITCH_LENGTH) & 6-yard Goal Area
  addLineBox(group, 40.32, lw, 0, PITCH_LENGTH - 16.5, lineMat, geometries);
  addLineBox(group, lw, 16.5, -20.16, PITCH_LENGTH - 8.25, lineMat, geometries);
  addLineBox(group, lw, 16.5, 20.16, PITCH_LENGTH - 8.25, lineMat, geometries);
  addLineBox(group, 18.32, lw, 0, PITCH_LENGTH - 5.5, lineMat, geometries);
  addLineBox(group, lw, 5.5, -9.16, PITCH_LENGTH - 2.75, lineMat, geometries);
  addLineBox(group, lw, 5.5, 9.16, PITCH_LENGTH - 2.75, lineMat, geometries);

  // Penalty Spots (z = 11.0m & z = PITCH_LENGTH - 11.0m)
  const spotGeo = new THREE.CircleGeometry(0.16, 20);
  spotGeo.rotateX(-Math.PI / 2);
  geometries.push(spotGeo);
  const spotMesh = new THREE.Mesh(spotGeo, lineMat);
  spotMesh.position.set(0, 0.016, 11.0);
  group.add(spotMesh);
  const spotSouthMesh = new THREE.Mesh(spotGeo, lineMat);
  spotSouthMesh.position.set(0, 0.016, PITCH_LENGTH - 11.0);
  group.add(spotSouthMesh);

  // Penalty Arcs
  const arcAngle = Math.acos((16.5 - 11.0) / 9.15);
  const arcGeo = new THREE.RingGeometry(
    9.15 - lw / 2,
    9.15 + lw / 2,
    48,
    1,
    Math.PI / 2 - arcAngle,
    arcAngle * 2,
  );
  arcGeo.rotateX(-Math.PI / 2);
  geometries.push(arcGeo);
  const arcMesh = new THREE.Mesh(arcGeo, lineMat);
  arcMesh.position.set(0, 0.016, 11.0);
  group.add(arcMesh);
  const arcSouthMesh = new THREE.Mesh(arcGeo, lineMat);
  arcSouthMesh.position.set(0, 0.016, PITCH_LENGTH - 11.0);
  arcSouthMesh.rotation.y = Math.PI;
  group.add(arcSouthMesh);

  // Center circle & center spot (z = PITCH_HALF_L)
  const centerCircleGeo = new THREE.RingGeometry(
    9.15 - lw / 2,
    9.15 + lw / 2,
    64,
  );
  centerCircleGeo.rotateX(-Math.PI / 2);
  geometries.push(centerCircleGeo);
  const centerCircle = new THREE.Mesh(centerCircleGeo, lineMat);
  centerCircle.position.set(0, 0.016, PITCH_HALF_L);
  group.add(centerCircle);

  const centerSpotGeo = new THREE.CircleGeometry(0.22, 20);
  centerSpotGeo.rotateX(-Math.PI / 2);
  geometries.push(centerSpotGeo);
  const centerSpot = new THREE.Mesh(centerSpotGeo, lineMat);
  centerSpot.position.set(0, 0.017, PITCH_HALF_L);
  group.add(centerSpot);

  // 4 Chalk Corner Arcs (1.0m radius)
  const cornerArcGeo = new THREE.RingGeometry(
    1.0 - lw / 2,
    1.0 + lw / 2,
    16,
    1,
    0,
    Math.PI / 2,
  );
  cornerArcGeo.rotateX(-Math.PI / 2);
  geometries.push(cornerArcGeo);
  [
    { x: -PITCH_HALF_W, z: 0, rot: -Math.PI / 2 },
    { x: PITCH_HALF_W, z: 0, rot: Math.PI },
    { x: -PITCH_HALF_W, z: PITCH_LENGTH, rot: 0 },
    { x: PITCH_HALF_W, z: PITCH_LENGTH, rot: Math.PI / 2 },
  ].forEach(({ x, z, rot }) => {
    const ca = new THREE.Mesh(cornerArcGeo, lineMat);
    ca.position.set(x, 0.016, z);
    ca.rotation.y = rot;
    group.add(ca);
  });

  // 3. Regulation 3D Goal Frames (North at z=0, South at z=90) with brushed clearcoat
  const postMat = new THREE.MeshPhysicalMaterial({
    color: 0xf8fafc,
    roughness: 0.2,
    metalness: 0.72,
    clearcoat: 0.65,
    clearcoatRoughness: 0.14,
  });
  materials.push(postMat);

  const postGeo = new THREE.CylinderGeometry(
    POST_RADIUS,
    POST_RADIUS,
    GOAL_HEIGHT,
    18,
  );
  geometries.push(postGeo);

  const crossbarGeo = new THREE.CylinderGeometry(
    POST_RADIUS,
    POST_RADIUS,
    GOAL_HALF_WIDTH * 2 + POST_RADIUS * 2,
    18,
  );
  crossbarGeo.rotateZ(Math.PI / 2);
  geometries.push(crossbarGeo);

  const supportMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.35,
    metalness: 0.65,
  });
  materials.push(supportMat);

  const sideGroundGeo = new THREE.CylinderGeometry(
    0.035,
    0.035,
    GOAL_DEPTH,
    12,
  );
  sideGroundGeo.rotateX(Math.PI / 2);
  geometries.push(sideGroundGeo);

  const backBottomGeo = new THREE.CylinderGeometry(
    0.035,
    0.035,
    GOAL_HALF_WIDTH * 2,
    12,
  );
  backBottomGeo.rotateZ(Math.PI / 2);
  geometries.push(backBottomGeo);

  const postBaseMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.6,
    metalness: 0.25,
  });
  materials.push(postBaseMat);
  const postBaseGeo = new THREE.CylinderGeometry(
    POST_RADIUS * 1.45,
    POST_RADIUS * 1.6,
    0.16,
    16,
  );
  geometries.push(postBaseGeo);

  const buildGoalFrame = (): THREE.Group => {
    const g = new THREE.Group();
    const lp = new THREE.Mesh(postGeo, postMat);
    lp.position.set(-GOAL_HALF_WIDTH, GOAL_HEIGHT / 2, 0);
    lp.castShadow = true;
    g.add(lp);

    const lBase = new THREE.Mesh(postBaseGeo, postBaseMat);
    lBase.position.set(-GOAL_HALF_WIDTH, 0.08, 0);
    g.add(lBase);

    const rp = new THREE.Mesh(postGeo, postMat);
    rp.position.set(GOAL_HALF_WIDTH, GOAL_HEIGHT / 2, 0);
    rp.castShadow = true;
    g.add(rp);

    const rBase = new THREE.Mesh(postBaseGeo, postBaseMat);
    rBase.position.set(GOAL_HALF_WIDTH, 0.08, 0);
    g.add(rBase);

    const cb = new THREE.Mesh(crossbarGeo, postMat);
    cb.position.set(0, GOAL_HEIGHT, 0);
    cb.castShadow = true;
    g.add(cb);

    [-GOAL_HALF_WIDTH, GOAL_HALF_WIDTH].forEach((xPos) => {
      const gBar = new THREE.Mesh(sideGroundGeo, supportMat);
      gBar.position.set(xPos, 0.035, -GOAL_DEPTH / 2);
      g.add(gBar);

      const topBar = new THREE.Mesh(sideGroundGeo, supportMat);
      topBar.position.set(xPos, GOAL_HEIGHT, -GOAL_DEPTH / 2);
      g.add(topBar);

      const backPost = new THREE.Mesh(postGeo, supportMat);
      backPost.scale.set(0.6, 1, 0.6);
      backPost.position.set(xPos, GOAL_HEIGHT / 2, -GOAL_DEPTH);
      g.add(backPost);
    });

    const backBottom = new THREE.Mesh(backBottomGeo, supportMat);
    backBottom.position.set(0, 0.035, -GOAL_DEPTH);
    g.add(backBottom);

    const backTop = new THREE.Mesh(backBottomGeo, supportMat);
    backTop.position.set(0, GOAL_HEIGHT, -GOAL_DEPTH);
    g.add(backTop);
    return g;
  };

  group.add(buildGoalFrame());

  const southGoalGroup = buildGoalFrame();
  southGoalGroup.position.set(0, 0, PITCH_LENGTH);
  southGoalGroup.rotation.y = Math.PI;
  group.add(southGoalGroup);

  // 4. Deformable Goal Nets (North & South)
  const net = createDeformableNet(maxAnisotropy);
  group.add(net.group);

  const netSouth = createDeformableNet(maxAnisotropy);
  netSouth.group.position.set(0, 0, PITCH_LENGTH);
  netSouth.group.rotation.y = Math.PI;
  group.add(netSouth.group);

  // 5. Corner Flags (North & South, animated in wind)
  const flagCloths: THREE.Mesh[] = [];
  const flagPoleGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.5, 8);
  geometries.push(flagPoleGeo);
  const flagClothGeo = new THREE.PlaneGeometry(0.45, 0.3);
  flagClothGeo.translate(0.225, 0, 0);
  geometries.push(flagClothGeo);
  const flagMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0x78350f,
    emissiveIntensity: 0.22,
    roughness: 0.65,
    side: THREE.DoubleSide,
  });
  materials.push(flagMat);
  [
    [-PITCH_HALF_W, 0],
    [PITCH_HALF_W, 0],
    [-PITCH_HALF_W, PITCH_LENGTH],
    [PITCH_HALF_W, PITCH_LENGTH],
  ].forEach(([cx, cz]) => {
    const pole = new THREE.Mesh(flagPoleGeo, postMat);
    pole.position.set(cx, 0.75, cz);
    group.add(pole);
    const cloth = new THREE.Mesh(flagClothGeo, flagMat);
    cloth.position.set(cx, 1.32, cz);
    cloth.rotation.y = cx < 0 ? 0 : Math.PI;
    group.add(cloth);
    flagCloths.push(cloth);
  });

  // 6. Perimeter LED Ad Boards around full 105x68m pitch
  const adTex = createAdBoardTexture(maxAnisotropy);
  adTex.repeat.set(6, 1);
  textures.push(adTex);
  const adMat = new THREE.MeshStandardMaterial({
    map: adTex,
    emissive: 0xffffff,
    emissiveMap: adTex,
    emissiveIntensity: 0.22,
    roughness: 0.58,
  });
  materials.push(adMat);

  const backAdGeo = new THREE.BoxGeometry(90, 1.08, 0.32);
  const sideAdGeo = new THREE.BoxGeometry(0.32, 1.08, PITCH_LENGTH + 8);
  geometries.push(backAdGeo, sideAdGeo);

  const backAd = new THREE.Mesh(backAdGeo, adMat);
  backAd.position.set(0, 0.54, -5.5);
  group.add(backAd);

  const southAd = new THREE.Mesh(backAdGeo, adMat);
  southAd.position.set(0, 0.54, PITCH_LENGTH + 5.5);
  group.add(southAd);

  const leftAd = new THREE.Mesh(sideAdGeo, adMat);
  leftAd.position.set(-45.8, 0.54, PITCH_HALF_L);
  group.add(leftAd);

  const rightAd = new THREE.Mesh(sideAdGeo, adMat);
  rightAd.position.set(45.8, 0.54, PITCH_HALF_L);
  group.add(rightAd);

  // 7. Monumental 4-Sided Double-Tier Stadium Bowl, Roof Canopy, LED Fascia & Dual Jumbotrons
  const standMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.85,
    metalness: 0.1,
  });
  const upperStandMat = new THREE.MeshStandardMaterial({
    color: 0x162032,
    roughness: 0.82,
    metalness: 0.12,
  });
  const neonRibbonMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x10b981,
    emissiveIntensity: 0.44,
    roughness: 0.45,
  });
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.58,
    metalness: 0.44,
  });
  materials.push(standMat, upperStandMat, neonRibbonMat, canopyMat);

  const endStepGeo = new THREE.BoxGeometry(108, 1.45, 2.7);
  const upperEndStepGeo = new THREE.BoxGeometry(118, 1.6, 2.9);
  const sideStepGeo = new THREE.BoxGeometry(2.7, 1.45, 134);
  const upperSideStepGeo = new THREE.BoxGeometry(2.9, 1.6, 148);
  geometries.push(endStepGeo, upperEndStepGeo, sideStepGeo, upperSideStepGeo);

  // North Stand & South Stand (Lower 6 tiers + Upper 4 tiers)
  for (let tier = 0; tier < 6; tier++) {
    const northStep = new THREE.Mesh(endStepGeo, standMat);
    northStep.position.set(0, 1.0 + tier * 1.4, -9.6 - tier * 2.6);
    northStep.receiveShadow = true;
    group.add(northStep);

    const southStep = new THREE.Mesh(endStepGeo, standMat);
    southStep.position.set(0, 1.0 + tier * 1.4, PITCH_LENGTH + 9.6 + tier * 2.6);
    southStep.receiveShadow = true;
    group.add(southStep);
  }
  for (let ut = 0; ut < 4; ut++) {
    const northUpper = new THREE.Mesh(upperEndStepGeo, upperStandMat);
    northUpper.position.set(0, 10.6 + ut * 1.55, -26.4 - ut * 2.8);
    group.add(northUpper);

    const southUpper = new THREE.Mesh(upperEndStepGeo, upperStandMat);
    southUpper.position.set(0, 10.6 + ut * 1.55, PITCH_LENGTH + 26.4 + ut * 2.8);
    group.add(southUpper);
  }

  // Left & Right Mega Side Stands (Lower 6 tiers + Upper 4 tiers spanning full 105m field)
  for (let tier = 0; tier < 6; tier++) {
    const leftTier = new THREE.Mesh(sideStepGeo, standMat);
    leftTier.position.set(-48.8 - tier * 2.6, 1.0 + tier * 1.38, PITCH_HALF_L);
    group.add(leftTier);

    const rightTier = new THREE.Mesh(sideStepGeo, standMat);
    rightTier.position.set(48.8 + tier * 2.6, 1.0 + tier * 1.38, PITCH_HALF_L);
    group.add(rightTier);
  }
  for (let ut = 0; ut < 4; ut++) {
    const leftUpper = new THREE.Mesh(upperSideStepGeo, upperStandMat);
    leftUpper.position.set(-65.6 - ut * 2.8, 10.4 + ut * 1.55, PITCH_HALF_L);
    group.add(leftUpper);

    const rightUpper = new THREE.Mesh(upperSideStepGeo, upperStandMat);
    rightUpper.position.set(65.6 + ut * 2.8, 10.4 + ut * 1.55, PITCH_HALF_L);
    group.add(rightUpper);
  }

  // Sweeping Emerald LED Fascia Trim Rings around all 4 upper & lower decks
  const endFasciaGeo = new THREE.BoxGeometry(122, 0.28, 0.32);
  const sideFasciaGeo = new THREE.BoxGeometry(0.32, 0.28, 146);
  const endCanopyGeo = new THREE.BoxGeometry(130, 0.75, 22);
  const sideCanopyGeo = new THREE.BoxGeometry(22, 0.75, 162);
  geometries.push(endFasciaGeo, sideFasciaGeo, endCanopyGeo, sideCanopyGeo);

  const northFascia = new THREE.Mesh(endFasciaGeo, neonRibbonMat);
  northFascia.position.set(0, 9.6, -24.5);
  group.add(northFascia);

  const southFascia = new THREE.Mesh(endFasciaGeo, neonRibbonMat);
  southFascia.position.set(0, 9.6, PITCH_LENGTH + 24.5);
  group.add(southFascia);

  [-49.5, 49.5].forEach((fx) => {
    const sf = new THREE.Mesh(sideFasciaGeo, neonRibbonMat);
    sf.position.set(fx, 4.5, PITCH_HALF_L);
    group.add(sf);

    const uf = new THREE.Mesh(sideFasciaGeo, neonRibbonMat);
    uf.position.set(fx + (fx < 0 ? -14.2 : 14.2), 9.6, PITCH_HALF_L);
    group.add(uf);
  });

  const northCanopy = new THREE.Mesh(endCanopyGeo, canopyMat);
  northCanopy.position.set(0, 19.8, -28);
  northCanopy.rotation.x = 0.14;
  group.add(northCanopy);

  const southCanopy = new THREE.Mesh(endCanopyGeo, canopyMat);
  southCanopy.position.set(0, 19.8, PITCH_LENGTH + 28);
  southCanopy.rotation.x = -0.14;
  group.add(southCanopy);

  const leftCanopy = new THREE.Mesh(sideCanopyGeo, canopyMat);
  leftCanopy.position.set(-67, 19.8, PITCH_HALF_L);
  leftCanopy.rotation.z = -0.14;
  group.add(leftCanopy);

  const rightCanopy = new THREE.Mesh(sideCanopyGeo, canopyMat);
  rightCanopy.position.set(67, 19.8, PITCH_HALF_L);
  rightCanopy.rotation.z = 0.14;
  group.add(rightCanopy);

  // Dual Giant Championship Jumbotrons (North + South)
  const jumboTex = createStadiumJumbotronTexture(maxAnisotropy);
  textures.push(jumboTex);
  const jumboFrameGeo = new THREE.BoxGeometry(27.5, 7.2, 1.0);
  const jumboScreenGeo = new THREE.PlaneGeometry(26.0, 6.2);
  geometries.push(jumboFrameGeo, jumboScreenGeo);
  const jumboScreenMat = new THREE.MeshStandardMaterial({
    map: jumboTex,
    emissive: 0xffffff,
    emissiveMap: jumboTex,
    emissiveIntensity: 0.38,
    roughness: 0.42,
  });
  materials.push(jumboScreenMat);

  const jumboFrameNorth = new THREE.Mesh(jumboFrameGeo, canopyMat);
  jumboFrameNorth.position.set(0, 22.8, -32.5);
  jumboFrameNorth.rotation.x = 0.12;
  group.add(jumboFrameNorth);

  const jumboScreenNorth = new THREE.Mesh(jumboScreenGeo, jumboScreenMat);
  jumboScreenNorth.position.set(0, 0, 0.52);
  jumboFrameNorth.add(jumboScreenNorth);

  const jumboFrameSouth = new THREE.Mesh(jumboFrameGeo, canopyMat);
  jumboFrameSouth.position.set(0, 22.8, PITCH_LENGTH + 32.5);
  jumboFrameSouth.rotation.y = Math.PI;
  jumboFrameSouth.rotation.x = -0.12;
  group.add(jumboFrameSouth);

  const jumboScreenSouth = new THREE.Mesh(jumboScreenGeo, jumboScreenMat);
  jumboScreenSouth.position.set(0, 0, 0.52);
  jumboFrameSouth.add(jumboScreenSouth);

  // Instanced Multi-Part Crowd Spectators across all 4 mega stands (~1,450+ fans)
  const specGeo = new THREE.CapsuleGeometry(0.22, 0.44, 4, 8);
  const headGeo = new THREE.SphereGeometry(0.145, 8, 8);
  const armsGeo = new THREE.BoxGeometry(0.76, 0.13, 0.13);
  const flashGeo = new THREE.PlaneGeometry(0.45, 0.45);
  geometries.push(specGeo, headGeo, armsGeo, flashGeo);

  const specMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.78,
    metalness: 0.05,
  });
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.72,
    metalness: 0.04,
  });
  const armsMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.76,
    metalness: 0.05,
  });
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xfffbeb,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  materials.push(specMat, headMat, armsMat, flashMat);

  const crowdList: Array<{ x: number; y: number; z: number }> = [];
  // North & South Lower Tiers
  for (let tier = 0; tier < 6; tier++) {
    const y = 2.15 + tier * 1.4;
    const zN = -9.5 - tier * 2.6;
    const zS = PITCH_LENGTH + 9.5 + tier * 2.6;
    for (let x = -48; x <= 48; x += 1.45) {
      if (Math.random() > 0.12) {
        crowdList.push({
          x: x + (Math.random() - 0.5) * 0.35,
          y,
          z: zN + (Math.random() - 0.5) * 0.2,
        });
      }
      if (Math.random() > 0.18) {
        crowdList.push({
          x: x + (Math.random() - 0.5) * 0.35,
          y,
          z: zS + (Math.random() - 0.5) * 0.2,
        });
      }
    }
  }
  // North & South Upper Tiers
  for (let ut = 0; ut < 4; ut++) {
    const y = 11.8 + ut * 1.55;
    const zN = -26.3 - ut * 2.8;
    const zS = PITCH_LENGTH + 26.3 + ut * 2.8;
    for (let x = -53; x <= 53; x += 2.1) {
      if (Math.random() > 0.18) crowdList.push({ x, y, z: zN });
      if (Math.random() > 0.22) crowdList.push({ x, y, z: zS });
    }
  }
  // Side Stands (Left & Right Lower + Upper)
  for (let tier = 0; tier < 6; tier++) {
    const y = 2.1 + tier * 1.38;
    for (let z = -4; z <= PITCH_LENGTH + 4; z += 2.2) {
      if (Math.random() > 0.18) crowdList.push({ x: -48.7 - tier * 2.6, y, z });
      if (Math.random() > 0.18) crowdList.push({ x: 48.7 + tier * 2.6, y, z });
    }
  }
  for (let ut = 0; ut < 4; ut++) {
    const y = 11.6 + ut * 1.55;
    for (let z = -10; z <= PITCH_LENGTH + 10; z += 3.1) {
      if (Math.random() > 0.2) crowdList.push({ x: -65.5 - ut * 2.8, y, z });
      if (Math.random() > 0.2) crowdList.push({ x: 65.5 + ut * 2.8, y, z });
    }
  }

  const crowdCount = crowdList.length;
  const crowdMesh = new THREE.InstancedMesh(specGeo, specMat, crowdCount);
  const crowdHeadsMesh = new THREE.InstancedMesh(headGeo, headMat, crowdCount);
  const crowdArmsMesh = new THREE.InstancedMesh(armsGeo, armsMat, crowdCount);
  crowdMesh.frustumCulled = false;
  crowdHeadsMesh.frustumCulled = false;
  crowdArmsMesh.frustumCulled = false;

  const crowdBaseMatrices: THREE.Matrix4[] = [];
  const crowdPositions = new Float32Array(crowdCount * 3);
  const crowdScales = new Float32Array(crowdCount);
  const crowdPhases = new Float32Array(crowdCount);
  const crowdWaveAngles = new Float32Array(crowdCount);

  const palette = [
    new THREE.Color('#ef4444'),
    new THREE.Color('#f8fafc'),
    new THREE.Color('#10b981'),
    new THREE.Color('#3b82f6'),
    new THREE.Color('#f59e0b'),
    new THREE.Color('#1e293b'),
  ];
  const skinTones = [
    new THREE.Color('#f3cbb1'),
    new THREE.Color('#e0ac8b'),
    new THREE.Color('#c6865c'),
    new THREE.Color('#8d5524'),
  ];
  const dummy = new THREE.Object3D();

  crowdList.forEach((p, idx) => {
    const s = 0.88 + Math.random() * 0.26;
    const yawToPitch = Math.atan2(-p.x, PITCH_HALF_L * 0.45 - p.z);
    crowdPositions[idx * 3] = p.x;
    crowdPositions[idx * 3 + 1] = p.y;
    crowdPositions[idx * 3 + 2] = p.z;
    crowdScales[idx] = s;
    crowdPhases[idx] = Math.random() * Math.PI * 2;
    crowdWaveAngles[idx] = Math.atan2(p.x, p.z - PITCH_HALF_L);

    dummy.position.set(p.x, p.y, p.z);
    dummy.scale.set(s, s, s);
    dummy.rotation.set(0, yawToPitch, 0);
    dummy.updateMatrix();
    crowdMesh.setMatrixAt(idx, dummy.matrix);
    crowdBaseMatrices.push(dummy.matrix.clone());

    dummy.position.set(p.x, p.y + 0.56 * s, p.z);
    dummy.scale.set(s, s, s);
    dummy.rotation.set(0, yawToPitch, 0);
    dummy.updateMatrix();
    crowdHeadsMesh.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(p.x, p.y + 0.14 * s, p.z);
    dummy.scale.set(0.75 * s, s, s);
    dummy.rotation.set(0, yawToPitch, 0);
    dummy.updateMatrix();
    crowdArmsMesh.setMatrixAt(idx, dummy.matrix);

    const jerseyColor = palette[idx % palette.length];
    crowdMesh.setColorAt(idx, jerseyColor);
    crowdArmsMesh.setColorAt(idx, jerseyColor);
    crowdHeadsMesh.setColorAt(idx, skinTones[idx % skinTones.length]);
  });
  crowdMesh.instanceMatrix.needsUpdate = true;
  crowdHeadsMesh.instanceMatrix.needsUpdate = true;
  crowdArmsMesh.instanceMatrix.needsUpdate = true;
  if (crowdMesh.instanceColor) crowdMesh.instanceColor.needsUpdate = true;
  if (crowdHeadsMesh.instanceColor) crowdHeadsMesh.instanceColor.needsUpdate = true;
  if (crowdArmsMesh.instanceColor) crowdArmsMesh.instanceColor.needsUpdate = true;
  crowdMesh.computeBoundingSphere();
  crowdHeadsMesh.computeBoundingSphere();
  crowdArmsMesh.computeBoundingSphere();
  group.add(crowdMesh, crowdHeadsMesh, crowdArmsMesh);

  // Camera Flashes & Celebration Sparkles in the Stands
  const flashCount = 140;
  const crowdFlashMesh = new THREE.InstancedMesh(flashGeo, flashMat, flashCount);
  crowdFlashMesh.frustumCulled = false;
  crowdFlashMesh.visible = false;
  const crowdFlashPositions = new Float32Array(flashCount * 3);
  for (let i = 0; i < flashCount; i++) {
    const srcIdx = Math.floor((i / flashCount) * crowdCount);
    const fx = crowdPositions[srcIdx * 3];
    const fy = crowdPositions[srcIdx * 3 + 1] + 0.72;
    const fz = crowdPositions[srcIdx * 3 + 2];
    crowdFlashPositions[i * 3] = fx;
    crowdFlashPositions[i * 3 + 1] = fy;
    crowdFlashPositions[i * 3 + 2] = fz;
    dummy.position.set(fx, fy, fz);
    dummy.scale.set(0, 0, 0);
    dummy.rotation.set(0, Math.atan2(-fx, PITCH_HALF_L * 0.45 - fz), 0);
    dummy.updateMatrix();
    crowdFlashMesh.setMatrixAt(i, dummy.matrix);
  }
  crowdFlashMesh.instanceMatrix.needsUpdate = true;
  group.add(crowdFlashMesh);

  // 8. 4 Towering Monumental Floodlight Pylons with Volumetric Light Beams
  const towerMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.45,
    metalness: 0.7,
  });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xfde68a,
    emissiveIntensity: 1.65,
    roughness: 0.25,
  });
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfef3c7,
    transparent: true,
    opacity: 0.026,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  materials.push(towerMat, bulbMat, beamMat);

  const pylonGeo = new THREE.CylinderGeometry(0.55, 0.95, 38, 10);
  const rackGeo = new THREE.BoxGeometry(6.8, 3.1, 0.9);
  const beamGeo = new THREE.CylinderGeometry(2.0, 16.5, 64, 16, 1, true);
  beamGeo.translate(0, -32, 0);
  beamGeo.rotateX(Math.PI / 2);
  geometries.push(pylonGeo, rackGeo, beamGeo);

  [
    [-63, -29],
    [63, -29],
    [-63, PITCH_LENGTH + 29],
    [63, PITCH_LENGTH + 29],
  ].forEach(([tx, tz]) => {
    const towerGroup = new THREE.Group();
    towerGroup.position.set(tx, 0, tz);

    const pylon = new THREE.Mesh(pylonGeo, towerMat);
    pylon.position.y = 19;
    towerGroup.add(pylon);

    const rack = new THREE.Mesh(rackGeo, towerMat);
    rack.position.set(0, 38, 0);
    rack.lookAt(0, 0, PITCH_HALF_L);
    towerGroup.add(rack);

    const panelGeo = new THREE.PlaneGeometry(5.8, 2.3);
    geometries.push(panelGeo);
    const panel = new THREE.Mesh(panelGeo, bulbMat);
    panel.position.set(0, 0, 0.48);
    rack.add(panel);

    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, 0, 0.65);
    rack.add(beam);

    group.add(towerGroup);
  });

  // 9. Team Dugouts / Technical Benches along touchline
  const dugoutFrameMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.45,
    metalness: 0.65,
  });
  const dugoutGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0xbae6fd,
    roughness: 0.15,
    metalness: 0.05,
    transparent: true,
    opacity: 0.32,
  });
  const dugoutBaseGeo = new THREE.BoxGeometry(1.5, 0.55, 7.6);
  const dugoutBackGeo = new THREE.BoxGeometry(0.12, 2.05, 7.6);
  const dugoutRoofGeo = new THREE.BoxGeometry(1.7, 0.1, 7.8);
  geometries.push(dugoutBaseGeo, dugoutBackGeo, dugoutRoofGeo);
  materials.push(dugoutFrameMat, dugoutGlassMat);

  [PITCH_HALF_L - 12, PITCH_HALF_L + 12].forEach((dz) => {
    const bench = new THREE.Group();
    bench.position.set(-47.6, 0, dz);
    const seat = new THREE.Mesh(dugoutBaseGeo, dugoutFrameMat);
    seat.position.y = 0.28;
    bench.add(seat);
    const glassBack = new THREE.Mesh(dugoutBackGeo, dugoutGlassMat);
    glassBack.position.set(-0.7, 1.05, 0);
    bench.add(glassBack);
    const roof = new THREE.Mesh(dugoutRoofGeo, dugoutGlassMat);
    roof.position.set(0.05, 2.08, 0);
    roof.rotation.z = -0.08;
    bench.add(roof);
    group.add(bench);
  });

  return {
    group,
    net,
    netSouth,
    crowdMesh,
    crowdHeadsMesh,
    crowdArmsMesh,
    crowdFlashMesh,
    crowdBaseMatrices,
    crowdPositions,
    crowdScales,
    crowdPhases,
    crowdWaveAngles,
    crowdFlashPositions,
    flagCloths,
    mudPuddlesGroup,
    pitchMat,
    setSnowSurface: (enabled: boolean) => {
      pitchMat.map = enabled ? snowPitchTex : pitchTex;
      pitchMat.bumpScale = enabled ? 0.095 : 0.055;
      pitchMat.sheen = enabled ? 0.0 : 0.12;
      pitchMat.sheenColor.setHex(enabled ? 0xdbeafe : 0x2d6a4f);
      pitchMat.needsUpdate = true;

      apronMat.map = enabled ? snowApronTex : apronTex;
      apronMat.needsUpdate = true;

      lineMat.color.setHex(enabled ? 0xf97316 : 0xdbe2ea);
      tuftMat.color.setHex(enabled ? 0xdbeafe : 0xffffff);
      grassMesh.visible = !enabled;
      wearMat.opacity = enabled ? 0.16 : 0.72;
      trackMat.color.setHex(enabled ? 0xcbd5e1 : 0x101c2d);

      skyMat.map = enabled ? winterSkyTex : skyTex;
      skyMat.color.setHex(0xffffff);
      skyMat.needsUpdate = true;
    },
    updateGrass: (elapsedSec: number) => {
      grassWindUniform.value = elapsedSec;
    },
    dispose: () => {
      net.dispose();
      netSouth.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}

function createDeformableNet(maxAnisotropy: number): DeformableNet {
  const group = new THREE.Group();
  const netTex = createNetTexture(maxAnisotropy);
  const geometries: THREE.BufferGeometry[] = [];

  const backGeo = new THREE.PlaneGeometry(
    GOAL_HALF_WIDTH * 2,
    GOAL_HEIGHT,
    28,
    14,
  );
  const sideGeo = new THREE.PlaneGeometry(GOAL_DEPTH, GOAL_HEIGHT, 12, 14);
  const topGeo = new THREE.PlaneGeometry(
    GOAL_HALF_WIDTH * 2,
    GOAL_DEPTH,
    28,
    12,
  );
  geometries.push(backGeo, sideGeo, topGeo);

  const backTex = netTex.clone();
  backTex.repeat.set(22, 8);
  backTex.needsUpdate = true;

  const sideTex = netTex.clone();
  sideTex.repeat.set(7, 8);
  sideTex.needsUpdate = true;

  const topTex = netTex.clone();
  topTex.repeat.set(22, 7);
  topTex.needsUpdate = true;

  const makeNetMat = (tex: THREE.Texture) =>
    new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      opacity: 0.94,
      roughness: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

  const backMat = makeNetMat(backTex);
  const sideMat = makeNetMat(sideTex);
  const topMat = makeNetMat(topTex);

  const backMesh = new THREE.Mesh(backGeo, backMat);
  backMesh.position.set(0, GOAL_HEIGHT / 2, -GOAL_DEPTH);
  group.add(backMesh);

  const leftMesh = new THREE.Mesh(sideGeo, sideMat);
  leftMesh.rotation.y = Math.PI / 2;
  leftMesh.position.set(-GOAL_HALF_WIDTH, GOAL_HEIGHT / 2, -GOAL_DEPTH / 2);
  group.add(leftMesh);

  const rightMesh = new THREE.Mesh(sideGeo, sideMat);
  rightMesh.rotation.y = -Math.PI / 2;
  rightMesh.position.set(GOAL_HALF_WIDTH, GOAL_HEIGHT / 2, -GOAL_DEPTH / 2);
  group.add(rightMesh);

  const topMesh = new THREE.Mesh(topGeo, topMat);
  topMesh.rotation.x = Math.PI / 2;
  topMesh.position.set(0, GOAL_HEIGHT, -GOAL_DEPTH / 2);
  group.add(topMesh);

  // Store rest positions for back & top net ripple deformation
  const posAttr = backGeo.attributes.position as THREE.BufferAttribute;
  const restPos = new Float32Array(posAttr.array.length);
  restPos.set(posAttr.array);

  const topPosAttr = topGeo.attributes.position as THREE.BufferAttribute;
  const topRestPos = new Float32Array(topPosAttr.array.length);
  topRestPos.set(topPosAttr.array);

  let rippleTime = 99;
  let rippleX = 0;
  let rippleY = 1.2;
  let rippleStrength = 0;

  return {
    group,
    triggerRipple: (worldX: number, worldY: number, strength: number) => {
      rippleTime = 0;
      rippleX = THREE.MathUtils.clamp(worldX, -GOAL_HALF_WIDTH, GOAL_HALF_WIDTH);
      rippleY = THREE.MathUtils.clamp(
        worldY - GOAL_HEIGHT / 2,
        -GOAL_HEIGHT / 2,
        GOAL_HEIGHT / 2,
      );
      rippleStrength = THREE.MathUtils.clamp(strength, 0.45, 1.45);
    },
    update: (dt: number) => {
      if (rippleTime > 2.8) return;
      rippleTime += dt;
      const decay = Math.exp(-1.55 * rippleTime);
      const snap = Math.sin(rippleTime * 21) * 0.34 + 0.82;

      for (let i = 0; i < posAttr.count; i++) {
        const vx = restPos[i * 3];
        const vy = restPos[i * 3 + 1];
        const vz = restPos[i * 3 + 2];

        const dist = Math.hypot(vx - rippleX, vy - rippleY);
        const falloff = Math.exp(-dist * 0.42);
        const travelingWave =
          Math.sin(dist * 2.5 - rippleTime * 23) * 0.24 + 0.85;
        // Pin corners & bottom/top frames cleanly while letting center pocket billow
        const edgePin =
          (1 - Math.pow(Math.abs(vx) / GOAL_HALF_WIDTH, 4)) *
          (1 - Math.pow(Math.abs(vy) / (GOAL_HEIGHT / 2), 4));

        const disp =
          -rippleStrength *
          falloff *
          decay *
          snap *
          travelingWave *
          Math.max(0, edgePin);
        posAttr.setZ(i, vz + disp);
      }
      posAttr.needsUpdate = true;

      // Top net subtle upward lift & snap when ball slams into upper/back net
      const highBias = THREE.MathUtils.clamp(
        (rippleY + GOAL_HEIGHT / 2) / GOAL_HEIGHT,
        0.2,
        1.0,
      );
      for (let i = 0; i < topPosAttr.count; i++) {
        const tx = topRestPos[i * 3];
        const ty = topRestPos[i * 3 + 1];
        const tz = topRestPos[i * 3 + 2];
        const distX = Math.abs(tx - rippleX);
        const backBias = THREE.MathUtils.clamp(
          (GOAL_DEPTH / 2 - ty) / GOAL_DEPTH,
          0,
          1,
        );
        const xPin = 1 - Math.pow(Math.abs(tx) / GOAL_HALF_WIDTH, 4);
        const lift =
          rippleStrength *
          0.32 *
          highBias *
          Math.exp(-distX * 0.48) *
          Math.sin(backBias * Math.PI) *
          decay *
          snap *
          Math.max(0, xPin);
        // topMesh is rotated +PI/2 around X, so local -Z maps to world +Y (upward)
        topPosAttr.setZ(i, tz - lift);
      }
      topPosAttr.needsUpdate = true;
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      backMat.dispose();
      sideMat.dispose();
      topMat.dispose();
      netTex.dispose();
      backTex.dispose();
      sideTex.dispose();
      topTex.dispose();
    },
  };
}

export function createSoccerBall(maxAnisotropy: number): {
  mesh: THREE.Mesh;
  shadowMesh: THREE.Mesh;
  dispose: () => void;
} {
  const { map, bumpMap } = createBallTextures(maxAnisotropy);
  const geo = new THREE.SphereGeometry(BALL_RADIUS, 36, 28);
  const mat = new THREE.MeshPhysicalMaterial({
    map,
    bumpMap,
    bumpScale: 0.008,
    roughness: 0.36,
    metalness: 0.04,
    clearcoat: 0.45,
    clearcoatRoughness: 0.22,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const shadowTex = createContactShadowTexture();
  const shadowGeo = new THREE.PlaneGeometry(0.46, 0.46);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.position.y = 0.018;

  return {
    mesh,
    shadowMesh,
    dispose: () => {
      geo.dispose();
      mat.dispose();
      map.dispose();
      bumpMap.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      shadowTex.dispose();
    },
  };
}

/**
 * Composite multi-part articulated 3D football player with sculpted athletic anatomy,
 * LatheGeometry V-tapered torso & calves, articulated hands/gloves, 512px face texture,
 * layered 3D hairstyles, and studded aerodynamic football cleats.
 * Grounded bottom-center pivot at y = 0 with soft contact shadow.
 */
export function createArticulatedPlayer(options: {
  jerseyColor: string;
  accentColor?: string;
  shortsColor: number;
  gloveColor?: number;
  bootColor?: number;
  hairColor?: number;
  skinColor?: number;
  hasBeard?: boolean;
  isStar?: boolean;
  kitPattern?: KitPattern;
  hairStyle?: HairStyle;
  hasHeadband?: boolean;
  auraColor?: string;
  numberStr: string;
  scale?: number;
}): ArticulatedPlayer {
  const {
    jerseyColor,
    accentColor = '#ffffff',
    shortsColor,
    gloveColor,
    bootColor = 0x111827,
    hairColor = 0x1f1916,
    skinColor = 0xd99b72,
    hasBeard = false,
    isStar = false,
    kitPattern = 'striped',
    hairStyle = 'quiff',
    hasHeadband = false,
    auraColor,
    numberStr,
    scale = 1.0,
  } = options;

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const jerseyWrapTex = createJerseyWrapTexture(
    numberStr,
    jerseyColor,
    accentColor,
    isStar,
    kitPattern,
    4,
  );
  const fabricBumpTex = createFabricBumpTexture(4);
  const faceTex = createPlayerFaceTexture(skinColor, hairColor, hasBeard, 4);
  const shadowTex = createContactShadowTexture();
  textures.push(jerseyWrapTex, fabricBumpTex, faceTex, shadowTex);

  const isIridescentKit =
    kitPattern === 'toty_prism' ||
    kitPattern === 'aurora_wave' ||
    kitPattern === 'dragon_scale' ||
    kitPattern === 'thunder_bolt' ||
    kitPattern === 'galaxy' ||
    kitPattern === 'cyber' ||
    kitPattern === 'sakura_gold';
  const isGlowingAccent =
    kitPattern === 'cyber' ||
    kitPattern === 'flame' ||
    kitPattern === 'aurora_wave' ||
    kitPattern === 'thunder_bolt' ||
    kitPattern === 'toty_prism';

  const jerseyWrapMat = new THREE.MeshPhysicalMaterial({
    map: jerseyWrapTex,
    bumpMap: fabricBumpTex,
    bumpScale: 0.0052,
    roughness: isIridescentKit ? 0.52 : 0.68,
    metalness: isIridescentKit ? 0.14 : 0.04,
    sheen: 0.56,
    sheenRoughness: 0.58,
    sheenColor: new THREE.Color(accentColor),
    iridescence: isIridescentKit ? 0.68 : 0.0,
    iridescenceIOR: 1.42,
    clearcoat: isIridescentKit ? 0.25 : 0.0,
    clearcoatRoughness: 0.35,
  });
  const solidJerseyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(jerseyColor),
    bumpMap: fabricBumpTex,
    bumpScale: 0.0045,
    roughness: isIridescentKit ? 0.54 : 0.7,
    metalness: isIridescentKit ? 0.12 : 0.04,
    sheen: 0.5,
    sheenRoughness: 0.62,
    sheenColor: new THREE.Color(accentColor),
    iridescence: isIridescentKit ? 0.52 : 0.0,
  });
  const accentMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(accentColor),
    emissive: isGlowingAccent ? new THREE.Color(accentColor) : 0x000000,
    emissiveIntensity:
      kitPattern === 'cyber' || kitPattern === 'thunder_bolt'
        ? 0.48
        : kitPattern === 'aurora_wave' || kitPattern === 'toty_prism'
        ? 0.32
        : kitPattern === 'flame'
        ? 0.25
        : 0,
    roughness: 0.28,
    metalness: 0.48,
    clearcoat: 0.62,
    clearcoatRoughness: 0.18,
  });
  const captainBandMat = new THREE.MeshStandardMaterial({
    color: isStar ? 0xfbbf24 : new THREE.Color(accentColor),
    emissive: isStar ? 0x78350f : 0x000000,
    emissiveIntensity: isStar ? 0.32 : 0,
    roughness: 0.38,
    metalness: 0.32,
  });
  const shortsMat = new THREE.MeshPhysicalMaterial({
    color: shortsColor,
    bumpMap: fabricBumpTex,
    bumpScale: 0.003,
    roughness: 0.72,
    metalness: 0.04,
    sheen: 0.32,
    sheenRoughness: 0.72,
  });
  const faceMat = new THREE.MeshStandardMaterial({
    map: faceTex,
    roughness: 0.46,
    metalness: 0.02,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: skinColor,
    roughness: 0.5,
    metalness: 0.02,
  });
  const bootMat = new THREE.MeshPhysicalMaterial({
    color: bootColor,
    roughness: 0.18,
    metalness: 0.4,
    clearcoat: 0.88,
    clearcoatRoughness: 0.12,
    iridescence: 0.42,
  });
  const soleMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.28,
    metalness: 0.65,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: hairColor,
    roughness: 0.78,
    metalness: 0.06,
  });
  const handMat = gloveColor
    ? new THREE.MeshPhysicalMaterial({
        color: gloveColor,
        roughness: 0.28,
        metalness: 0.08,
        clearcoat: 0.48,
      })
    : skinMat;
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.46,
    depthWrite: false,
  });

  materials.push(
    jerseyWrapMat,
    solidJerseyMat,
    accentMat,
    captainBandMat,
    shortsMat,
    faceMat,
    skinMat,
    bootMat,
    soleMat,
    hairMat,
    handMat,
    shadowMat,
  );

  const group = new THREE.Group();
  group.scale.setScalar(scale);

  // Soft contact grounding shadow under cleats
  const shadowGeo = new THREE.PlaneGeometry(0.84, 0.84);
  shadowGeo.rotateX(-Math.PI / 2);
  geometries.push(shadowGeo);
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.position.y = 0.014;
  group.add(contactShadow);

  // Optional glowing Star/Skin Aura Ring on pitch
  if (auraColor) {
    const auraTex = createAuraRingTexture(auraColor);
    textures.push(auraTex);
    const auraGeo = new THREE.PlaneGeometry(1.16, 1.16);
    auraGeo.rotateX(-Math.PI / 2);
    const auraMat = new THREE.MeshBasicMaterial({
      map: auraTex,
      transparent: true,
      opacity: 0.68,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    geometries.push(auraGeo);
    materials.push(auraMat);
    const auraMesh = new THREE.Mesh(auraGeo, auraMat);
    auraMesh.position.y = 0.022;
    group.add(auraMesh);
  }

  // Dynamic Running & Sprint Aura (vortex disc + dual tilted energy halos + twin wind blades + swept wings + cleat speed rings)
  const runningAuraTex = createSpeedAuraTexture('#10b981', '#a7f3d0');
  textures.push(runningAuraTex);
  const runAuraGroup = new THREE.Group();
  runAuraGroup.visible = false;
  group.add(runAuraGroup);

  const runDiscGeo = new THREE.PlaneGeometry(1.78, 1.78);
  runDiscGeo.rotateX(-Math.PI / 2);
  const runRingGeo = new THREE.TorusGeometry(0.5, 0.026, 8, 36);
  runRingGeo.rotateX(Math.PI / 2);
  const runRing2Geo = new THREE.TorusGeometry(0.68, 0.018, 8, 36);
  runRing2Geo.rotateX(Math.PI / 2 - 0.36);
  const runBladeGeo = new THREE.PlaneGeometry(0.24, 1.18);
  runBladeGeo.rotateX(-Math.PI / 2);
  const runWingGeo = new THREE.PlaneGeometry(0.32, 1.45);
  runWingGeo.rotateX(-Math.PI / 2);
  const runPillarGeo = new THREE.PlaneGeometry(0.16, 1.18);
  const runBootRingGeo = new THREE.TorusGeometry(0.16, 0.016, 6, 20);
  runBootRingGeo.rotateX(Math.PI / 2);
  geometries.push(
    runDiscGeo,
    runRingGeo,
    runRing2Geo,
    runBladeGeo,
    runWingGeo,
    runPillarGeo,
    runBootRingGeo,
  );

  const runDiscMat = new THREE.MeshBasicMaterial({
    map: runningAuraTex,
    color: 0x10b981,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const runRingMat = new THREE.MeshBasicMaterial({
    color: 0x6ee7b7,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const runRing2Mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const runBladeMat = new THREE.MeshBasicMaterial({
    map: runningAuraTex,
    color: 0x6ee7b7,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const runPillarMat = new THREE.MeshBasicMaterial({
    color: 0x6ee7b7,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  materials.push(runDiscMat, runRingMat, runRing2Mat, runBladeMat, runPillarMat);

  const runDiscMesh = new THREE.Mesh(runDiscGeo, runDiscMat);
  runDiscMesh.position.y = 0.032;
  runAuraGroup.add(runDiscMesh);

  const runHaloMesh = new THREE.Mesh(runRingGeo, runRingMat);
  runHaloMesh.position.y = 0.16;
  runAuraGroup.add(runHaloMesh);

  const runHalo2Mesh = new THREE.Mesh(runRing2Geo, runRing2Mat);
  runHalo2Mesh.position.y = 0.44;
  runAuraGroup.add(runHalo2Mesh);

  const runBladeL = new THREE.Mesh(runBladeGeo, runBladeMat);
  runBladeL.position.set(-0.26, 0.09, -0.58);
  runAuraGroup.add(runBladeL);

  const runBladeR = new THREE.Mesh(runBladeGeo, runBladeMat);
  runBladeR.position.set(0.26, 0.09, -0.58);
  runAuraGroup.add(runBladeR);

  const runWingL = new THREE.Mesh(runWingGeo, runBladeMat);
  runWingL.position.set(-0.46, 0.14, -0.68);
  runWingL.rotation.z = 0.34;
  runAuraGroup.add(runWingL);

  const runWingR = new THREE.Mesh(runWingGeo, runBladeMat);
  runWingR.position.set(0.46, 0.14, -0.68);
  runWingR.rotation.z = -0.34;
  runAuraGroup.add(runWingR);

  const runPillarL = new THREE.Mesh(runPillarGeo, runPillarMat);
  runPillarL.position.set(-0.34, 0.68, -0.2);
  runPillarL.rotation.set(-0.38, 0.42, 0.16);
  runAuraGroup.add(runPillarL);

  const runPillarR = new THREE.Mesh(runPillarGeo, runPillarMat);
  runPillarR.position.set(0.34, 0.68, -0.2);
  runPillarR.rotation.set(-0.38, -0.42, -0.16);
  runAuraGroup.add(runPillarR);

  const runBootRingL = new THREE.Mesh(runBootRingGeo, runRingMat);
  runBootRingL.position.set(-0.15, 0.06, -0.05);
  runAuraGroup.add(runBootRingL);

  const runBootRingR = new THREE.Mesh(runBootRingGeo, runRingMat);
  runBootRingR.position.set(0.15, 0.06, -0.05);
  runAuraGroup.add(runBootRingR);

  // Body pivot at hip center (y = 0.92m) so diving rotates cleanly around center of mass
  const bodyPivot = new THREE.Group();
  bodyPivot.position.set(0, 0.92, 0);
  group.add(bodyPivot);

  // Sculpted Anatomical V-Taper Torso via LatheGeometry
  // phiStart = Math.PI/2 => u=0.25 is BACK (-Z), u=0.75 is FRONT (+Z)
  const torsoProfile = [
    new THREE.Vector2(0.162, 0.0),
    new THREE.Vector2(0.156, 0.14), // Tapered athletic waist
    new THREE.Vector2(0.184, 0.28), // Mid-ribcage flare
    new THREE.Vector2(0.222, 0.42), // Broad chest & lats
    new THREE.Vector2(0.210, 0.51), // Upper shoulder slope
    new THREE.Vector2(0.114, 0.56), // Collarbone base
  ];
  const torsoGeo = new THREE.LatheGeometry(
    torsoProfile,
    26,
    Math.PI / 2,
    Math.PI * 2,
  );
  torsoGeo.scale(1.14, 1.0, 0.65);
  torsoGeo.computeVertexNormals();
  geometries.push(torsoGeo);

  const torso = new THREE.Mesh(torsoGeo, jerseyWrapMat);
  torso.position.set(0, 0.01, 0);
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyPivot.add(torso);

  // Sculpted Deltoid Shoulder Caps + Trapezius Neck Slopes + Athletic Collar Ring & V-Neck Chest Trim
  const shoulderCapGeo = new THREE.SphereGeometry(0.088, 16, 12);
  const trapSlopeGeo = new THREE.CapsuleGeometry(0.044, 0.145, 6, 12);
  const collarRingGeo = new THREE.TorusGeometry(0.086, 0.018, 10, 22);
  collarRingGeo.rotateX(Math.PI / 2);
  const vNeckBarGeo = new THREE.BoxGeometry(0.016, 0.068, 0.014);
  geometries.push(shoulderCapGeo, trapSlopeGeo, collarRingGeo, vNeckBarGeo);

  [-0.232, 0.232].forEach((sx) => {
    const cap = new THREE.Mesh(shoulderCapGeo, solidJerseyMat);
    cap.position.set(sx, 0.505, 0);
    cap.scale.set(0.98, 0.94, 1.06);
    cap.castShadow = true;
    bodyPivot.add(cap);

    const sideSign = sx < 0 ? -1 : 1;
    const trap = new THREE.Mesh(trapSlopeGeo, solidJerseyMat);
    trap.position.set(sideSign * 0.125, 0.548, -0.005);
    trap.rotation.z = sideSign * 1.18;
    trap.scale.set(0.86, 1.0, 0.78);
    bodyPivot.add(trap);
  });

  const collarRing = new THREE.Mesh(collarRingGeo, accentMat);
  collarRing.position.set(0, 0.565, 0.006);
  bodyPivot.add(collarRing);

  [-1, 1].forEach((side) => {
    const vBar = new THREE.Mesh(vNeckBarGeo, accentMat);
    vBar.position.set(side * 0.022, 0.535, 0.085);
    vBar.rotation.z = side * 0.42;
    vBar.rotation.x = -0.22;
    bodyPivot.add(vBar);
  });

  // Sculpted Athletic Pelvis / Shorts Waist + Belt Trim
  const waistGeo = new THREE.CylinderGeometry(0.168, 0.194, 0.175, 22);
  waistGeo.scale(1.14, 1.0, 0.66);
  const beltTrimGeo = new THREE.CylinderGeometry(0.173, 0.173, 0.032, 22);
  beltTrimGeo.scale(1.14, 1.0, 0.67);
  geometries.push(waistGeo, beltTrimGeo);

  const waist = new THREE.Mesh(waistGeo, shortsMat);
  waist.position.set(0, -0.06, 0);
  waist.castShadow = true;
  bodyPivot.add(waist);

  const beltTrim = new THREE.Mesh(beltTrimGeo, accentMat);
  beltTrim.position.set(0, 0.02, 0);
  bodyPivot.add(beltTrim);

  // Expressive Sculpted Head + Neck + 3D Nose + Ears + Multi-Style Layered Hair
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.615, 0);
  bodyPivot.add(headGroup);

  const neckGeo = new THREE.CylinderGeometry(0.056, 0.076, 0.135, 16);
  const headGeo = new THREE.SphereGeometry(
    0.126,
    26,
    22,
    -Math.PI / 2,
    Math.PI * 2,
  );
  const jawGeo = new THREE.CylinderGeometry(0.088, 0.068, 0.078, 16);
  const chinGeo = new THREE.SphereGeometry(0.052, 14, 12);
  const noseGeo = new THREE.ConeGeometry(0.017, 0.052, 8);
  const earGeo = new THREE.SphereGeometry(0.024, 10, 8);
  const hairCrownGeo = new THREE.SphereGeometry(
    0.132,
    22,
    16,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.58,
  );
  const hairSideFadeGeo = new THREE.CylinderGeometry(
    0.127,
    0.118,
    0.074,
    20,
    1,
    false,
    Math.PI * 0.42,
    Math.PI * 1.16,
  );
  const sideburnGeo = new THREE.BoxGeometry(0.014, 0.056, 0.032);
  const browRidgeGeo = new THREE.CapsuleGeometry(0.013, 0.068, 4, 8);
  browRidgeGeo.rotateZ(Math.PI / 2);
  geometries.push(
    neckGeo,
    headGeo,
    jawGeo,
    chinGeo,
    noseGeo,
    earGeo,
    hairCrownGeo,
    hairSideFadeGeo,
    sideburnGeo,
    browRidgeGeo,
  );

  const neck = new THREE.Mesh(neckGeo, skinMat);
  neck.position.y = 0.022;
  neck.castShadow = true;
  headGroup.add(neck);

  const head = new THREE.Mesh(headGeo, faceMat);
  head.position.y = 0.168;
  head.scale.set(0.91, 1.07, 0.97);
  head.castShadow = true;
  headGroup.add(head);

  // Subtle sculpted athletic brow ridge
  const browRidge = new THREE.Mesh(browRidgeGeo, skinMat);
  browRidge.position.set(0, 0.194, 0.102);
  browRidge.scale.set(1.0, 0.72, 0.72);
  headGroup.add(browRidge);

  // Sculpted athletic jawline + defined chin to frame the face crisply
  const jaw = new THREE.Mesh(jawGeo, hasBeard ? hairMat : skinMat);
  jaw.position.set(0, 0.106, 0.018);
  jaw.scale.set(0.96, 1.0, 0.96);
  headGroup.add(jaw);

  const chin = new THREE.Mesh(chinGeo, hasBeard ? hairMat : skinMat);
  chin.position.set(0, 0.086, 0.058);
  chin.scale.set(0.92, 0.85, 0.95);
  headGroup.add(chin);

  // 3D Sculpted Nose Bridge
  const nose = new THREE.Mesh(noseGeo, skinMat);
  nose.position.set(0, 0.158, 0.119);
  nose.rotation.x = 0.44;
  nose.scale.set(0.78, 1.02, 0.88);
  headGroup.add(nose);

  [-0.114, 0.114].forEach((ex) => {
    const ear = new THREE.Mesh(earGeo, skinMat);
    ear.position.set(ex, 0.162, -0.006);
    ear.scale.set(0.44, 1.14, 0.72);
    headGroup.add(ear);

    const sideburn = new THREE.Mesh(sideburnGeo, hairMat);
    sideburn.position.set(ex * 0.94, 0.175, 0.028);
    headGroup.add(sideburn);
  });

  if (hairStyle === 'mohawk') {
    const finGeo = new THREE.CapsuleGeometry(0.03, 0.078, 5, 10);
    geometries.push(finGeo);
    for (let f = 0; f < 5; f++) {
      const fin = new THREE.Mesh(finGeo, hairMat);
      fin.position.set(0, 0.29 - f * 0.01, 0.07 - f * 0.042);
      fin.rotation.x = -0.32 + f * 0.22;
      headGroup.add(fin);
    }
    const mohawkBase = new THREE.Mesh(hairCrownGeo, hairMat);
    mohawkBase.position.set(0, 0.18, -0.01);
    mohawkBase.scale.set(0.74, 0.98, 0.94);
    headGroup.add(mohawkBase);
  } else if (hairStyle === 'afro_braids') {
    const puffGeo = new THREE.SphereGeometry(0.144, 18, 14);
    const braidGeo = new THREE.CapsuleGeometry(0.021, 0.11, 5, 8);
    geometries.push(puffGeo, braidGeo);
    const puff = new THREE.Mesh(puffGeo, hairMat);
    puff.position.set(0, 0.214, -0.02);
    puff.scale.set(1.02, 0.92, 1.02);
    headGroup.add(puff);
    [-0.082, -0.041, 0, 0.041, 0.082].forEach((bx, bi) => {
      const braid = new THREE.Mesh(braidGeo, hairMat);
      braid.position.set(bx, 0.152 - (bi % 2) * 0.012, -0.115);
      braid.rotation.x = 0.36;
      headGroup.add(braid);
    });
  } else if (hairStyle === 'long_flow') {
    const topFlow = new THREE.Mesh(hairCrownGeo, hairMat);
    topFlow.position.set(0, 0.184, -0.01);
    topFlow.rotation.x = -0.22;
    topFlow.scale.set(0.98, 1.05, 1.02);
    headGroup.add(topFlow);

    const strandGeo = new THREE.CapsuleGeometry(0.042, 0.14, 6, 10);
    geometries.push(strandGeo);
    [-0.058, 0, 0.058].forEach((sx, si) => {
      const strand = new THREE.Mesh(strandGeo, hairMat);
      strand.position.set(sx, 0.106, -0.095 - (si === 1 ? 0.012 : 0));
      strand.rotation.x = 0.36;
      strand.rotation.z = sx * 1.45;
      headGroup.add(strand);
    });
  } else if (hairStyle === 'buzz') {
    const buzzCap = new THREE.Mesh(hairCrownGeo, hairMat);
    buzzCap.position.set(0, 0.175, -0.008);
    buzzCap.rotation.x = -0.22;
    buzzCap.scale.set(0.92, 1.03, 0.97);
    headGroup.add(buzzCap);
  } else {
    // Layered sculpted 'quiff' with dual swept side waves
    const hairCrown = new THREE.Mesh(hairCrownGeo, hairMat);
    hairCrown.position.set(0, 0.184, -0.01);
    hairCrown.rotation.x = -0.24;
    hairCrown.scale.set(0.95, 1.06, 1.0);
    headGroup.add(hairCrown);

    const waveGeo = new THREE.CapsuleGeometry(0.042, 0.105, 6, 12);
    geometries.push(waveGeo);
    const wave = new THREE.Mesh(waveGeo, hairMat);
    wave.position.set(0, 0.282, 0.046);
    wave.rotation.z = Math.PI / 2 + (isStar ? -0.16 : 0.06);
    wave.rotation.y = 0.2;
    wave.scale.set(0.86, 1.06, 1.28);
    headGroup.add(wave);

    const sideWave = new THREE.Mesh(waveGeo, hairMat);
    sideWave.position.set(isStar ? -0.035 : 0.035, 0.262, 0.035);
    sideWave.rotation.z = Math.PI / 2 + (isStar ? 0.18 : -0.18);
    sideWave.scale.set(0.72, 0.85, 1.05);
    headGroup.add(sideWave);
  }

  // Back & side hairline fade taper
  const backFade = new THREE.Mesh(hairSideFadeGeo, hairMat);
  backFade.position.set(0, 0.168, -0.008);
  backFade.rotation.y = Math.PI / 2;
  headGroup.add(backFade);

  // Optional Athletic Headband
  if (hasHeadband) {
    const bandGeo = new THREE.TorusGeometry(0.123, 0.016, 10, 24);
    bandGeo.rotateX(Math.PI / 2 + 0.18);
    geometries.push(bandGeo);
    const headband = new THREE.Mesh(bandGeo, accentMat);
    headband.position.set(0, 0.228, 0.006);
    headGroup.add(headband);
  }

  // Arms: Pro sleeve -> sculpted muscular bicep/forearm -> articulated hand or padded GK glove
  const isGk = Boolean(gloveColor);
  const sleeveGeo = new THREE.CylinderGeometry(0.064, 0.053, 0.205, 16);
  const cuffGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.026, 16);
  const bicepGeo = new THREE.CapsuleGeometry(0.044, 0.072, 6, 12);
  const forearmGeo = new THREE.CylinderGeometry(0.047, 0.034, 0.22, 14);
  const elbowGeo = new THREE.SphereGeometry(0.044, 10, 10);
  const armbandGeo = new THREE.CylinderGeometry(0.066, 0.064, 0.045, 16);
  const palmGeo = isGk
    ? new THREE.CapsuleGeometry(0.048, 0.068, 6, 12)
    : new THREE.CapsuleGeometry(0.028, 0.048, 6, 10);
  const thumbGeo = new THREE.CapsuleGeometry(0.016, 0.032, 4, 8);
  const glovePadGeo = new THREE.BoxGeometry(0.108, 0.125, 0.022);
  const gloveBackGeo = new THREE.BoxGeometry(0.092, 0.105, 0.016);
  const wristStrapGeo = new THREE.CylinderGeometry(0.046, 0.044, 0.052, 14);
  geometries.push(
    sleeveGeo,
    cuffGeo,
    bicepGeo,
    forearmGeo,
    elbowGeo,
    armbandGeo,
    palmGeo,
    thumbGeo,
    glovePadGeo,
    gloveBackGeo,
    wristStrapGeo,
  );

  const makeArm = (side: -1 | 1) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(side * 0.282, 0.505, 0);

    const sleeve = new THREE.Mesh(sleeveGeo, solidJerseyMat);
    sleeve.position.y = -0.102;
    sleeve.castShadow = true;
    armPivot.add(sleeve);

    const cuff = new THREE.Mesh(cuffGeo, accentMat);
    cuff.position.y = -0.202;
    armPivot.add(cuff);

    const bicep = new THREE.Mesh(bicepGeo, isGk ? solidJerseyMat : skinMat);
    bicep.position.set(0, -0.18, 0.006);
    bicep.scale.set(0.95, 1.0, 1.05);
    armPivot.add(bicep);

    if (side === -1 && isStar && !isGk) {
      const band = new THREE.Mesh(armbandGeo, captainBandMat);
      band.position.y = -0.135;
      armPivot.add(band);
    }

    const elbowPivot = new THREE.Group();
    elbowPivot.position.set(0, -0.215, 0);
    elbowPivot.rotation.x = -0.18; // Natural athletic elbow bend
    armPivot.add(elbowPivot);

    const elbow = new THREE.Mesh(elbowGeo, isGk ? solidJerseyMat : skinMat);
    elbow.position.y = 0;
    elbowPivot.add(elbow);

    const forearm = new THREE.Mesh(
      forearmGeo,
      isGk ? solidJerseyMat : skinMat,
    );
    forearm.position.set(0, -0.1, 0);
    forearm.castShadow = true;
    elbowPivot.add(forearm);

    if (isGk) {
      const gCuff = new THREE.Mesh(wristStrapGeo, accentMat);
      gCuff.position.set(0, -0.19, 0.002);
      elbowPivot.add(gCuff);
    } else {
      const wristTape = new THREE.Mesh(wristStrapGeo, accentMat);
      wristTape.scale.set(0.84, 0.62, 0.84);
      wristTape.position.set(0, -0.186, 0.002);
      elbowPivot.add(wristTape);
    }

    const hand = new THREE.Mesh(palmGeo, handMat);
    hand.position.set(0, -0.256, 0.005);
    hand.scale.set(isGk ? 1.18 : 0.95, 1.0, 0.72);
    hand.castShadow = true;
    elbowPivot.add(hand);

    const thumb = new THREE.Mesh(thumbGeo, handMat);
    thumb.position.set(-side * 0.036, -0.236, 0.018);
    thumb.rotation.z = side * 0.55;
    elbowPivot.add(thumb);

    if (isGk) {
      const palm = new THREE.Mesh(glovePadGeo, accentMat);
      palm.position.set(0, -0.256, 0.034);
      elbowPivot.add(palm);

      const backhand = new THREE.Mesh(gloveBackGeo, solidJerseyMat);
      backhand.position.set(0, -0.256, -0.02);
      elbowPivot.add(backhand);
    }

    bodyPivot.add(armPivot);
    return { armPivot, elbowPivot };
  };

  const leftArmBuild = makeArm(-1);
  const rightArmBuild = makeArm(1);
  const leftArm = leftArmBuild.armPivot;
  const rightArm = rightArmBuild.armPivot;
  const leftElbowPivot = leftArmBuild.elbowPivot;
  const rightElbowPivot = rightArmBuild.elbowPivot;

  // Legs: Muscular Thigh -> Knee -> LatheGeometry Sculpted Calf Sock & Shin Guard -> 6-Stud Pro Football Cleat
  const thighProfile = [
    new THREE.Vector2(0.074, 0.0),
    new THREE.Vector2(0.088, 0.14),
    new THREE.Vector2(0.102, 0.28),
    new THREE.Vector2(0.098, 0.305),
  ];
  const thighGeo = new THREE.LatheGeometry(thighProfile, 16);
  const shortsHemGeo = new THREE.CylinderGeometry(0.084, 0.086, 0.024, 16);
  const shortsStripeGeo = new THREE.BoxGeometry(0.014, 0.255, 0.026);
  const kneeGeo = new THREE.SphereGeometry(0.06, 12, 10);

  // Sculpted athletic calf + shin-guard contour in high football sock
  const calfProfile = [
    new THREE.Vector2(0.043, 0.0), // Ankle
    new THREE.Vector2(0.054, 0.12), // Achilles
    new THREE.Vector2(0.071, 0.25), // Muscular calf peak
    new THREE.Vector2(0.066, 0.36), // Upper shin
    new THREE.Vector2(0.067, 0.4), // Sock fold rim
  ];
  const sockGeo = new THREE.LatheGeometry(calfProfile, 18);
  const sockBandGeo = new THREE.CylinderGeometry(0.07, 0.068, 0.042, 18);
  const shinGuardGeo = new THREE.CylinderGeometry(0.05, 0.042, 0.18, 12);

  // Sleek tapered aerodynamic cleat + heel collar + tongue + soleplate + 6 studs
  const bootUpperGeo = new THREE.CapsuleGeometry(0.047, 0.138, 6, 14);
  bootUpperGeo.rotateX(Math.PI / 2);
  const bootHeelGeo = new THREE.CylinderGeometry(0.047, 0.051, 0.078, 14);
  const bootCollarGeo = new THREE.TorusGeometry(0.044, 0.011, 8, 16);
  bootCollarGeo.rotateX(Math.PI / 2);
  const soleGeo = new THREE.BoxGeometry(0.094, 0.017, 0.24);
  const studGeo = new THREE.CylinderGeometry(0.008, 0.006, 0.016, 6);
  geometries.push(
    thighGeo,
    shortsHemGeo,
    shortsStripeGeo,
    kneeGeo,
    sockGeo,
    sockBandGeo,
    shinGuardGeo,
    bootUpperGeo,
    bootHeelGeo,
    bootCollarGeo,
    soleGeo,
    studGeo,
  );

  const makeLeg = (side: -1 | 1) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(side * 0.128, -0.115, 0);

    const thigh = new THREE.Mesh(thighGeo, shortsMat);
    thigh.position.y = -0.305;
    thigh.castShadow = true;
    legPivot.add(thigh);

    const shortsStripe = new THREE.Mesh(shortsStripeGeo, accentMat);
    shortsStripe.position.set(side * 0.092, -0.165, 0);
    legPivot.add(shortsStripe);

    const shortsHem = new THREE.Mesh(shortsHemGeo, accentMat);
    shortsHem.position.y = -0.296;
    legPivot.add(shortsHem);

    const kneePivot = new THREE.Group();
    kneePivot.position.set(0, -0.342, 0);
    legPivot.add(kneePivot);

    const knee = new THREE.Mesh(kneeGeo, skinMat);
    knee.position.y = 0;
    knee.castShadow = true;
    kneePivot.add(knee);

    const sock = new THREE.Mesh(sockGeo, solidJerseyMat);
    sock.position.y = -0.418;
    sock.castShadow = true;
    kneePivot.add(sock);

    const shinGuard = new THREE.Mesh(shinGuardGeo, accentMat);
    shinGuard.position.set(0, -0.198, 0.024);
    shinGuard.scale.set(0.84, 1.0, 0.65);
    kneePivot.add(shinGuard);

    const sockBand = new THREE.Mesh(sockBandGeo, accentMat);
    sockBand.position.y = -0.042;
    kneePivot.add(sockBand);

    const sockBand2 = new THREE.Mesh(sockBandGeo, accentMat);
    sockBand2.position.y = -0.095;
    sockBand2.scale.set(0.98, 0.55, 0.98);
    kneePivot.add(sockBand2);

    // Aerodynamic football boot with heel cup, ankle collar, accent stripe, soleplate & 6 studs
    const bootGroup = new THREE.Group();
    bootGroup.position.set(0, -0.418, 0.042);

    const bootUpper = new THREE.Mesh(bootUpperGeo, bootMat);
    bootUpper.position.set(0, 0.004, 0.032);
    bootUpper.scale.set(1.04, 0.72, 1.02);
    bootUpper.castShadow = true;
    bootGroup.add(bootUpper);

    const bootHeel = new THREE.Mesh(bootHeelGeo, bootMat);
    bootHeel.position.set(0, 0.022, -0.052);
    bootHeel.castShadow = true;
    bootGroup.add(bootHeel);

    const bootCollar = new THREE.Mesh(bootCollarGeo, accentMat);
    bootCollar.position.set(0, 0.056, -0.05);
    bootGroup.add(bootCollar);

    const bootStripe = new THREE.Mesh(soleGeo, accentMat);
    bootStripe.position.set(0, 0.015, 0.015);
    bootStripe.scale.set(1.06, 0.68, 0.56);
    bootGroup.add(bootStripe);

    const bootTongue = new THREE.Mesh(soleGeo, accentMat);
    bootTongue.position.set(0, 0.036, 0.012);
    bootTongue.rotation.x = -0.28;
    bootTongue.scale.set(0.62, 0.52, 0.42);
    bootGroup.add(bootTongue);

    const sole = new THREE.Mesh(soleGeo, soleMat);
    sole.position.set(0, -0.026, 0.015);
    bootGroup.add(sole);

    [
      [-0.032, -0.068],
      [0.032, -0.068],
      [-0.032, 0.04],
      [0.032, 0.04],
      [-0.028, 0.1],
      [0.028, 0.1],
    ].forEach(([stx, stz]) => {
      const stud = new THREE.Mesh(studGeo, soleMat);
      stud.position.set(stx, -0.039, stz);
      bootGroup.add(stud);
    });

    kneePivot.add(bootGroup);

    bodyPivot.add(legPivot);
    return { legPivot, kneePivot };
  };

  const leftLegBuild = makeLeg(-1);
  const rightLegBuild = makeLeg(1);
  const leftLeg = leftLegBuild.legPivot;
  const rightLeg = rightLegBuild.legPivot;
  const leftKneePivot = leftLegBuild.kneePivot;
  const rightKneePivot = rightLegBuild.kneePivot;

  return {
    group,
    bodyPivot,
    torso,
    headGroup,
    leftArm,
    rightArm,
    leftElbowPivot,
    rightElbowPivot,
    leftLeg,
    rightLeg,
    leftKneePivot,
    rightKneePivot,
    setAuraState: (
      speedRatio: number,
      isSprinting: boolean,
      skillActive: boolean,
      runningAuraId: RunningAuraId = 'emerald_wind',
      elapsedSec = 0,
    ) => {
      if (runningAuraId === 'none' || (speedRatio < 0.16 && !skillActive)) {
        runAuraGroup.visible = false;
        return;
      }
      const profile = RUNNING_AURAS[runningAuraId] ?? RUNNING_AURAS.emerald_wind;
      runAuraGroup.visible = true;

      if (runningAuraId === 'rainbow_prism') {
        const h1 = (elapsedSec * 0.48) % 1;
        const h2 = (h1 + 0.35) % 1;
        runDiscMat.color.setHSL(h1, 0.94, 0.58);
        runRingMat.color.setHSL(h2, 0.96, 0.64);
        runRing2Mat.color.setHSL((h1 + 0.68) % 1, 0.96, 0.66);
        runBladeMat.color.setHSL(h2, 0.96, 0.64);
        runPillarMat.color.setHSL((h1 + 0.22) % 1, 0.96, 0.68);
      } else {
        runDiscMat.color.setHex(profile.primaryColor);
        runRingMat.color.setHex(profile.secondaryColor);
        runRing2Mat.color.setHex(profile.primaryColor);
        runBladeMat.color.setHex(profile.secondaryColor);
        runPillarMat.color.setHex(profile.secondaryColor);
      }

      const intensity = THREE.MathUtils.clamp(
        speedRatio * (isSprinting ? 1.42 : 0.92) + (skillActive ? 0.68 : 0),
        0,
        1.65,
      );
      runDiscMat.opacity = Math.min(0.92, intensity * 0.68);
      runRingMat.opacity = Math.min(0.94, intensity * 0.68);
      runRing2Mat.opacity = Math.min(0.88, Math.max(0, intensity - 0.12) * 0.64);
      runBladeMat.opacity = Math.min(0.84, Math.max(0, intensity - 0.22) * 0.78);
      runPillarMat.opacity = Math.min(0.74, Math.max(0, intensity - 0.32) * 0.7);

      const pulse = 1 + Math.sin(elapsedSec * 14) * 0.1 * intensity;
      const discScale = (0.9 + intensity * 0.44) * pulse;
      runDiscMesh.scale.set(discScale, discScale, 1);
      runDiscMesh.rotation.z = elapsedSec * (isSprinting ? 6.4 : 3.2);

      runHaloMesh.position.y = 0.15 + Math.sin(elapsedSec * 10) * 0.065;
      runHaloMesh.scale.setScalar(0.92 + intensity * 0.38);

      runHalo2Mesh.position.y = 0.44 + Math.cos(elapsedSec * 8.5) * 0.075;
      runHalo2Mesh.rotation.y = -elapsedSec * 5.2;
      runHalo2Mesh.rotation.z = Math.sin(elapsedSec * 4.2) * 0.34;
      runHalo2Mesh.scale.setScalar(0.88 + intensity * 0.36);

      const bladeLen = 0.8 + intensity * 1.05;
      runBladeL.scale.set(1 + intensity * 0.25, bladeLen, 1);
      runBladeR.scale.set(1 + intensity * 0.25, bladeLen, 1);

      const wingActive = isSprinting || skillActive || intensity > 0.68;
      runWingL.visible = wingActive;
      runWingR.visible = wingActive;
      if (wingActive) {
        const wingSweep = 0.9 + intensity * 0.95;
        const wingFlutter = Math.sin(elapsedSec * 18) * 0.09;
        runWingL.scale.set(1.0 + intensity * 0.28, wingSweep, 1);
        runWingR.scale.set(1.0 + intensity * 0.28, wingSweep, 1);
        runWingL.rotation.z = 0.34 + wingFlutter;
        runWingR.rotation.z = -0.34 - wingFlutter;
      }

      const pillarH = 0.72 + intensity * 0.84;
      runPillarL.scale.set(1, pillarH, 1);
      runPillarR.scale.set(1, pillarH, 1);

      // Animated stride-synced speed rings around player cleats
      const strideWave = Math.sin(elapsedSec * (isSprinting ? 18 : 12));
      runBootRingL.position.set(-0.14, 0.07 + Math.max(0, strideWave) * 0.16, strideWave * 0.28);
      runBootRingR.position.set(0.14, 0.07 + Math.max(0, -strideWave) * 0.16, -strideWave * 0.28);
      const bootRingScale = 0.75 + intensity * 0.52;
      runBootRingL.scale.setScalar(bootRingScale);
      runBootRingR.scale.setScalar(bootRingScale);
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
