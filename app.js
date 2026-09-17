"use strict";

const canvas = document.getElementById("renderCanvas");
const statusText = document.getElementById("scene-status");
const resetButton = document.getElementById("reset-view");
let engine;

const V3 = BABYLON.Vector3;
const C3 = BABYLON.Color3;

function material(scene, name, hex, alpha = 1, emissive = null) {
  const m = new BABYLON.StandardMaterial(name, scene);
  m.diffuseColor = C3.FromHexString(hex);
  m.specularColor = new C3(0.72, 0.86, 0.9);
  m.specularPower = 110;
  m.alpha = alpha;
  if (emissive) m.emissiveColor = C3.FromHexString(emissive);
  if (alpha < 1) {
    m.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    m.needDepthPrePass = true;
  }
  return m;
}

function createRingMesh(scene, name, rings, material, sides = 14) {
  const positions = [];
  const indices = [];
  rings.forEach((ring, ri) => {
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const variation = 1 + 0.045 * Math.sin(i * 2.7 + ri * 1.9);
      positions.push(ring.ox + Math.cos(angle) * ring.rx * variation, ring.y, ring.oz + Math.sin(angle) * ring.rz * variation);
    }
  });
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < sides; i++) {
      const a = r * sides + i, b = r * sides + ((i + 1) % sides), c = (r + 1) * sides + ((i + 1) % sides), d = (r + 1) * sides + i;
      indices.push(a, b, d, b, c, d);
    }
  }
  const bottom = positions.length / 3;
  positions.push(0, rings[0].y, 0);
  const top = positions.length / 3;
  const last = rings[rings.length - 1];
  positions.push(last.ox, last.y + 0.2, last.oz);
  for (let i = 0; i < sides; i++) {
    indices.push(bottom, (i + 1) % sides, i);
    const a = (rings.length - 1) * sides + i, b = (rings.length - 1) * sides + ((i + 1) % sides);
    indices.push(a, b, top);
  }
  const mesh = new BABYLON.Mesh(name, scene);
  const data = new BABYLON.VertexData();
  data.positions = positions;
  data.indices = indices;
  data.normals = [];
  BABYLON.VertexData.ComputeNormals(positions, indices, data.normals);
  data.applyToMesh(mesh);
  mesh.material = material;
  return mesh;
}

function createIceberg(scene) {
  const ice = material(scene, "ice", "#eaf7f8", 1, "#9fcfd5");
  const iceHighlight = material(scene, "iceHighlight", "#c9e9eb", 1, "#5b9da7");
  const iceShadow = material(scene, "iceShadow", "#568895", 1, "#1a4a58");
  const underwater = material(scene, "underwaterIce", "#24758a", 0.56, "#0a3442");
  const underwaterShadow = material(scene, "underwaterShadow", "#18546a", 0.48, "#061f2b");
  const foam = material(scene, "foam", "#d6f4f4", 0.5, "#61b7c0");
  const crack = material(scene, "crack", "#a9dfe3", 0.28, "#398d99");

  const above = createRingMesh(scene, "icebergAboveWater", [
    { y: 0.16, rx: 3.65, rz: 2.82, ox: 0, oz: 0 },
    { y: 0.62, rx: 3.42, rz: 2.65, ox: -0.15, oz: 0.08 },
    { y: 1.35, rx: 2.95, rz: 2.28, ox: 0.13, oz: -0.08 },
    { y: 2.2, rx: 2.35, rz: 1.82, ox: -0.16, oz: 0.06 },
    { y: 3.1, rx: 1.72, rz: 1.35, ox: 0.1, oz: -0.04 },
    { y: 4.0, rx: 1.12, rz: 0.88, ox: -0.08, oz: 0.03 },
    { y: 4.82, rx: 0.62, rz: 0.5, ox: 0.05, oz: -0.02 },
    { y: 5.48, rx: 0.18, rz: 0.16, ox: 0, oz: 0 }
  ], ice);

  [
    [-1.05, 1.0, 1.45, 1.25, 1.55, 0.9, 0.35],
    [1.15, 0.75, 0.95, 1.18, 1.42, 0.82, -0.5],
    [-1.0, 0.5, -0.95, 1.05, 1.2, 0.72, 0.75],
    [0.85, 1.35, -0.7, 0.95, 1.35, 0.75, -0.25],
    [0.25, 2.15, 0.9, 0.72, 1.0, 0.55, 0.4]
  ].forEach((s, i) => {
    const facet = BABYLON.MeshBuilder.CreatePolyhedron("iceFacet" + i, { type: 1, size: 1 }, scene);
    facet.position = new V3(s[0], s[1], s[2]);
    facet.scaling = new V3(s[3], s[4], s[5]);
    facet.rotation = new V3(0.12 * i, s[6], -0.08 * i);
    facet.material = i === 0 || i === 3 ? iceHighlight : iceShadow;
  });

  const submerged = createRingMesh(scene, "icebergBelowWater", [
    { y: 0.04, rx: 3.72, rz: 2.88, ox: 0, oz: 0 },
    { y: -1.35, rx: 4.45, rz: 3.45, ox: 0.2, oz: -0.08 },
    { y: -3.2, rx: 4.55, rz: 3.55, ox: -0.16, oz: 0.14 },
    { y: -5.2, rx: 4.0, rz: 3.12, ox: 0.12, oz: 0.04 },
    { y: -7.1, rx: 3.15, rz: 2.48, ox: -0.12, oz: -0.06 },
    { y: -8.8, rx: 2.2, rz: 1.72, ox: 0.06, oz: 0 },
    { y: -10.0, rx: 1.05, rz: 0.82, ox: 0, oz: 0 }
  ], underwater);

  const lowerFacet = BABYLON.MeshBuilder.CreatePolyhedron("lowerIceFacet", { type: 1, size: 1 }, scene);
  lowerFacet.position = new V3(-1.0, -3.8, 0.35);
  lowerFacet.scaling = new V3(2.7, 3.5, 1.85);
  lowerFacet.rotation = new V3(0.15, 0.65, 0.08);
  lowerFacet.material = underwaterShadow;

  for (let i = 0; i < 5; i++) {
    const line = BABYLON.MeshBuilder.CreateLines("iceCrack" + i, {
      points: [
        new V3(-0.55 + i * 0.2, 0.82 + i * 0.43, 2.55),
        new V3(-0.1 + i * 0.14, 1.05 + i * 0.43, 2.69),
        new V3(0.25 + i * 0.1, 1.32 + i * 0.43, 2.53)
      ]
    }, scene);
    line.color = new C3(0.62, 0.88, 0.9);
    line.alpha = 0.28;
    line.material = crack;
  }

  const waterline = BABYLON.MeshBuilder.CreateTorus("waterline", { diameter: 7.15, thickness: 0.1, tessellation: 96 }, scene);
  waterline.position.y = 0.08;
  waterline.scaling.y = 0.68;
  waterline.material = foam;

  return { above, submerged, waterline };
}

function createWater(scene) {
  const water = BABYLON.MeshBuilder.CreateGround("water", { width: 100, height: 100, subdivisions: 70, updatable: true }, scene);
  const waterMaterial = material(scene, "waterMaterial", "#06495d", 0.7, "#021b27");
  waterMaterial.specularColor = new C3(0.52, 0.75, 0.82);
  waterMaterial.specularPower = 135;
  water.material = waterMaterial;

  const positions = water.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  const original = positions.slice();
  scene.registerBeforeRender(() => {
    const t = performance.now() * 0.00035;
    for (let i = 0; i < positions.length; i += 3) {
      const x = original[i], z = original[i + 2];
      positions[i + 1] = Math.sin(x * 0.19 + t) * 0.045 + Math.cos(z * 0.17 - t * 1.15) * 0.035;
    }
    water.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions, false, false);
  });

  for (let i = 0; i < 4; i++) {
    const ring = BABYLON.MeshBuilder.CreateTorus("wave" + i, { diameter: 7.7 + i * 2.9, thickness: 0.018 + i * 0.005, tessellation: 96 }, scene);
    ring.position.y = 0.11 + i * 0.002;
    ring.scaling.y = 0.7;
    ring.material = material(scene, "waveMaterial" + i, "#64b7c0", 0.11 - i * 0.018, "#164650");
    ring.isPickable = false;
  }
}

function createEnvironment(scene) {
  const sky = BABYLON.MeshBuilder.CreateSphere("sky", { diameter: 180, segments: 24 }, scene);
  sky.material = material(scene, "skyMaterial", "#061722", 1, "#02090f");
  sky.isPickable = false;

  const seabed = BABYLON.MeshBuilder.CreateGround("seabed", { width: 90, height: 90 }, scene);
  seabed.position.y = -12;
  seabed.material = material(scene, "seabedMaterial", "#04242b", 1, "#020b10");

  for (let i = 0; i < 5; i++) {
    const beam = BABYLON.MeshBuilder.CreateCylinder("lightBeam" + i, { height: 10, diameterTop: 0.18, diameterBottom: 3.2, tessellation: 20 }, scene);
    beam.position = new V3(-7 + i * 3.5, -5.4, 5 + Math.sin(i * 1.4) * 2.5);
    beam.material = material(scene, "beamMaterial" + i, "#318c9d", 0.024, "#0a4a58");
    beam.isPickable = false;
  }

  const moon = BABYLON.MeshBuilder.CreateDisc("moon", { radius: 3.8, tessellation: 48 }, scene);
  moon.position = new V3(-23, 25, 34);
  moon.rotation = new V3(Math.PI / 2, 0, 0);
  moon.material = material(scene, "moonMaterial", "#b9dfe1", 0.72, "#5d9198");
  moon.isPickable = false;
}

function createBubbles(scene) {
  const bubbleMaterial = material(scene, "bubbleMaterial", "#82cbd1", 0.24, "#1b626d");
  for (let i = 0; i < 38; i++) {
    const bubble = BABYLON.MeshBuilder.CreateSphere("bubble" + i, { diameter: 0.035 + (i % 4) * 0.016, segments: 7 }, scene);
    bubble.position = new V3(-4 + (i * 1.91) % 8, -9.4 + (i * 0.67) % 8.8, -3 + (i * 1.47) % 7);
    bubble.material = bubbleMaterial;
    bubble.isPickable = false;
    const startY = bubble.position.y;
    const speed = 0.00075 + (i % 5) * 0.0002;
    scene.registerBeforeRender(() => {
      bubble.position.y += speed;
      bubble.position.x += Math.sin(performance.now() * 0.001 + i) * 0.00045;
      if (bubble.position.y > 0.15) bubble.position.y = startY;
    });
  }
}

function createScene() {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.003, 0.014, 0.024, 1);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.007;
  scene.fogColor = new C3(0.006, 0.05, 0.068);

  const camera = new BABYLON.ArcRotateCamera("camera", -1.62, 1.06, 15.2, new V3(0, -0.65, 0), scene);
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 7;
  camera.upperRadiusLimit = 25;
  camera.lowerBetaLimit = 0.55;
  camera.upperBetaLimit = 1.5;
  camera.wheelPrecision = 42;
  camera.panningSensibility = 0;
  camera.inertia = 0.9;
  camera.angularSensibilityX = 560;
  camera.angularSensibilityY = 560;
  camera.minZ = 0.1;

  createEnvironment(scene);
  createWater(scene);
  const iceberg = createIceberg(scene);
  createBubbles(scene);

  const ambient = new BABYLON.HemisphericLight("ambient", new V3(0, 1, 0), scene);
  ambient.intensity = 0.72;
  ambient.diffuse = new C3(0.68, 0.82, 0.84);
  ambient.groundColor = new C3(0.015, 0.06, 0.075);

  const moonLight = new BABYLON.DirectionalLight("moonLight", new V3(-0.35, -0.8, -0.55), scene);
  moonLight.position = new V3(14, 22, 12);
  moonLight.intensity = 1.18;
  moonLight.diffuse = new C3(0.72, 0.86, 0.9);

  const rim = new BABYLON.PointLight("rimLight", new V3(-5, 4, 7), scene);
  rim.intensity = 13;
  rim.range = 22;
  rim.diffuse = new C3(0.22, 0.58, 0.66);

  const underwaterFill = new BABYLON.PointLight("underwaterFill", new V3(2, -4, 3), scene);
  underwaterFill.intensity = 6;
  underwaterFill.range = 17;
  underwaterFill.diffuse = new C3(0.035, 0.3, 0.4);

  if (BABYLON.GlowLayer) {
    const glow = new BABYLON.GlowLayer("iceGlow", scene);
    glow.intensity = 0.1;
    glow.addIncludedOnlyMesh(iceberg.above);
  }

  scene.registerBeforeRender(() => {
    const t = performance.now() * 0.00045;
    const bob = Math.sin(t) * 0.025;
    iceberg.above.position.y = bob;
    iceberg.submerged.position.y = bob * 0.45;
    iceberg.waterline.scaling.x = 1 + Math.sin(t * 1.8) * 0.008;
  });

  resetButton.disabled = false;
  resetButton.onclick = () => {
    camera.alpha = -1.62;
    camera.beta = 1.06;
    camera.radius = 15.2;
    camera.setTarget(new V3(0, -0.65, 0));
    statusText.textContent = "View reset. Drag to explore the iceberg.";
    canvas.focus();
  };

  return scene;
}

function start() {
  if (!canvas || !window.BABYLON) return;
  try {
    engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, antialias: true });
    const scene = createScene();
    statusText.textContent = "Iceberg loaded. Drag to explore, scroll to zoom.";
    engine.runRenderLoop(() => scene.render());
    window.addEventListener("resize", () => engine.resize());
  } catch (error) {
    console.error(error);
    statusText.textContent = "The 3D experience could not be loaded. Please refresh and try again.";
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
