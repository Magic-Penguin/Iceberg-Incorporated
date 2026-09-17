"use strict";

const canvas = document.getElementById("renderCanvas");
const statusText = document.getElementById("scene-status");
const resetButton = document.getElementById("reset-view");
let engine;

const V3 = BABYLON.Vector3;
const C3 = BABYLON.Color3;

function mat(scene, name, color, alpha = 1, emissive = null) {
  const m = new BABYLON.StandardMaterial(name, scene);
  m.diffuseColor = C3.FromHexString(color);
  m.specularColor = new C3(0.8, 0.9, 0.95);
  m.specularPower = 90;
  m.alpha = alpha;
  if (emissive) m.emissiveColor = C3.FromHexString(emissive);
  if (alpha < 1) {
    m.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    m.needDepthPrePass = true;
  }
  return m;
}

function createRingMesh(scene, name, rings, material) {
  const sides = 12;
  const positions = [];
  const indices = [];

  rings.forEach((r, ri) => {
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const wobble = 1 + 0.07 * Math.sin(i * 2.31 + ri * 1.7);
      positions.push(
        r.ox + Math.cos(a) * r.rx * wobble,
        r.y,
        r.oz + Math.sin(a) * r.rz * wobble
      );
    }
  });

  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < sides; i++) {
      const a = r * sides + i;
      const b = r * sides + ((i + 1) % sides);
      const c = (r + 1) * sides + ((i + 1) % sides);
      const d = (r + 1) * sides + i;
      indices.push(a, b, d, b, c, d);
    }
  }

  const bottom = positions.length / 3;
  positions.push(0, rings[0].y, 0);
  const top = positions.length / 3;
  const last = rings[rings.length - 1];
  positions.push(last.ox, last.y + 0.35, last.oz);

  for (let i = 0; i < sides; i++) {
    indices.push(bottom, (i + 1) % sides, i);
    const a = (rings.length - 1) * sides + i;
    const b = (rings.length - 1) * sides + ((i + 1) % sides);
    indices.push(a, b, top);
  }

  const mesh = new BABYLON.Mesh(name, scene);
  const vd = new BABYLON.VertexData();
  vd.positions = positions;
  vd.indices = indices;
  BABYLON.VertexData.ComputeNormals(positions, indices, vd.normals = []);
  vd.applyToMesh(mesh);
  mesh.material = material;
  return mesh;
}

function createIceberg(scene) {
  const snow = mat(scene, "snowIce", "#edfaff", 1, "#b8eaf2");
  const blue = mat(scene, "blueIce", "#8bcbd8", 1, "#2f7f91");
  const shadow = mat(scene, "shadowIce", "#3d8193", 1, "#164b5b");
  const deep = mat(scene, "deepIce", "#1f6378", 0.72, "#092f3d");
  const crackMat = mat(scene, "crackIce", "#baf6ff", 0.55, "#54cddd");
  const foamMat = mat(scene, "waterlineFoam", "#d8fbff", 0.62, "#73d9e7");

  const above = createRingMesh(scene, "mainIceberg", [
    { y: 0.15, rx: 3.9, rz: 3.0, ox: 0.0, oz: 0.0 },
    { y: 0.8, rx: 3.45, rz: 2.7, ox: -0.18, oz: 0.12 },
    { y: 1.65, rx: 2.95, rz: 2.35, ox: 0.12, oz: -0.12 },
    { y: 2.65, rx: 2.2, rz: 1.78, ox: -0.22, oz: 0.06 },
    { y: 3.65, rx: 1.5, rz: 1.22, ox: 0.14, oz: -0.08 },
    { y: 4.55, rx: 0.9, rz: 0.72, ox: -0.08, oz: 0.05 },
    { y: 5.35, rx: 0.38, rz: 0.3, ox: 0.05, oz: -0.02 },
    { y: 5.95, rx: 0.06, rz: 0.06, ox: 0, oz: 0 }
  ], snow);

  const facetData = [
    [1.0, 0.7, 0.0, 1.25, 1.9, 1.05],
    [-1.15, 0.2, 0.15, 1.1, 1.65, 1.0],
    [0.85, -0.9, 0.35, 1.0, 1.35, 0.8],
    [-0.35, 1.05, -0.25, 0.9, 1.2, 0.75],
    [0.05, -0.2, 1.0, 0.8, 1.0, 0.62]
  ];
  facetData.forEach((f, i) => {
    const facet = BABYLON.MeshBuilder.CreatePolyhedron("iceFacet" + i, { type: 1, size: 1 }, scene);
    facet.scaling = new V3(f[3], f[4], f[5]);
    facet.position = new V3(f[0], f[1] + 0.15, f[2]);
    facet.rotation = new V3(0.15 * i, 0.55 * i, -0.18 * i);
    facet.material = i % 2 ? blue : shadow;
  });

  const underwater = createRingMesh(scene, "submergedIceberg", [
    { y: 0.0, rx: 4.0, rz: 3.05, ox: 0, oz: 0 },
    { y: -1.8, rx: 4.65, rz: 3.65, ox: 0.25, oz: -0.12 },
    { y: -4.1, rx: 4.4, rz: 3.45, ox: -0.18, oz: 0.18 },
    { y: -6.5, rx: 3.65, rz: 2.85, ox: 0.15, oz: 0.05 },
    { y: -8.7, rx: 2.45, rz: 2.0, ox: -0.15, oz: -0.08 },
    { y: -10.2, rx: 1.15, rz: 0.9, ox: 0.05, oz: 0 }
  ], deep);
  underwater.material = deep;

  const underwaterFacet = BABYLON.MeshBuilder.CreatePolyhedron("underwaterFacet", { type: 1, size: 1 }, scene);
  underwaterFacet.scaling = new V3(3.0, 4.8, 2.0);
  underwaterFacet.position = new V3(-1.0, -4.3, 0.4);
  underwaterFacet.rotation = new V3(0.2, 0.7, 0.1);
  underwaterFacet.material = shadow;

  for (let i = 0; i < 8; i++) {
    const crack = BABYLON.MeshBuilder.CreateLines("iceCrack" + i, {
      points: [
        new V3(-0.4 + i * 0.12, 1.0 + i * 0.35, 2.65 - i * 0.18),
        new V3(0.05 + i * 0.08, 1.32 + i * 0.35, 2.82 - i * 0.16),
        new V3(0.32 + i * 0.06, 1.62 + i * 0.35, 2.66 - i * 0.14)
      ]
    }, scene);
    crack.color = new C3(0.55, 0.9, 0.95);
    crack.alpha = 0.48;
    crack.material = crackMat;
  }

  const foam = BABYLON.MeshBuilder.CreateTorus("waterlineFoam", {
    diameter: 7.3,
    thickness: 0.12,
    tessellation: 96
  }, scene);
  foam.position.y = 0.08;
  foam.scaling.y = 0.7;
  foam.material = foamMat;

  const shelf = BABYLON.MeshBuilder.CreateDisc("iceShelf", { radius: 4.05, tessellation: 64 }, scene);
  shelf.position.y = 0.05;
  shelf.scaling = new V3(1, 1, 0.78);
  shelf.material = foamMat;

  return { above, underwater, foam };
}

function createWater(scene) {
  const water = BABYLON.MeshBuilder.CreateGround("water", {
    width: 100,
    height: 100,
    subdivisions: 90,
    updatable: true
  }, scene);
  const material = mat(scene, "waterMaterial", "#075b72", 0.62, "#032735");
  material.specularColor = new C3(0.55, 0.82, 0.9);
  material.specularPower = 140;
  water.material = material;

  const base = water.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  const original = base.slice();
  scene.registerBeforeRender(() => {
    const t = performance.now() * 0.00045;
    for (let i = 0; i < base.length; i += 3) {
      const x = original[i];
      const z = original[i + 2];
      base[i + 1] = original[i + 1]
        + Math.sin(x * 0.18 + t) * 0.07
        + Math.cos(z * 0.21 - t * 1.15) * 0.045;
    }
    water.updateVerticesData(BABYLON.VertexBuffer.PositionKind, base, false, false);
  });

  for (let i = 0; i < 6; i++) {
    const ring = BABYLON.MeshBuilder.CreateTorus("waveCrest" + i, {
      diameter: 8.0 + i * 2.7,
      thickness: 0.025 + i * 0.006,
      tessellation: 96
    }, scene);
    ring.position.y = 0.11 + i * 0.002;
    ring.scaling.y = 0.72;
    ring.material = mat(scene, "waveMat" + i, "#45aabd", 0.22 - i * 0.018, "#174e60");
    ring.isPickable = false;
  }
}

function createEnvironment(scene) {
  const sky = BABYLON.MeshBuilder.CreateSphere("sky", { diameter: 180, segments: 24 }, scene);
  const skyMat = mat(scene, "skyMaterial", "#041a2a", 1, "#02101b");
  sky.material = skyMat;
  sky.isPickable = false;

  const seabed = BABYLON.MeshBuilder.CreateGround("seabed", { width: 90, height: 90 }, scene);
  seabed.position.y = -12;
  seabed.material = mat(scene, "seabedMaterial", "#05232b", 1, "#031015");

  for (let i = 0; i < 8; i++) {
    const beam = BABYLON.MeshBuilder.CreateCylinder("lightBeam" + i, {
      height: 11,
      diameterTop: 0.25,
      diameterBottom: 3.8,
      tessellation: 24
    }, scene);
    beam.position = new V3(-11 + i * 3.1, -5.4, 5 + Math.sin(i) * 3);
    beam.rotation.z = 0.04 * Math.sin(i);
    beam.material = mat(scene, "beamMat" + i, "#2a9ab0", 0.045, "#126275");
    beam.isPickable = false;
  }

  const moon = BABYLON.MeshBuilder.CreateDisc("moon", { radius: 5, tessellation: 64 }, scene);
  moon.position = new V3(-25, 30, 35);
  moon.rotation = new V3(Math.PI / 2, 0, 0);
  moon.material = mat(scene, "moonMat", "#bdeaf0", 0.9, "#78b9c5");

  for (let i = 0; i < 35; i++) {
    const star = BABYLON.MeshBuilder.CreateSphere("star" + i, { diameter: 0.07 + (i % 3) * 0.025 }, scene);
    const a = i * 2.399;
    star.position = new V3(Math.cos(a) * (28 + i % 7), 18 + (i % 9) * 1.8, 18 + Math.sin(a) * (25 + i % 6));
    star.material = mat(scene, "starMat" + i, "#bfeef5", 0.65, "#9bdce6");
    star.isPickable = false;
  }
}

function createParticles(scene) {
  for (let i = 0; i < 65; i++) {
    const bubble = BABYLON.MeshBuilder.CreateSphere("bubble" + i, {
      diameter: 0.035 + (i % 5) * 0.018,
      segments: 8
    }, scene);
    bubble.position = new V3(
      -5 + (i * 1.73) % 10,
      -9.5 + (i * 0.61) % 8,
      -4 + (i * 2.17) % 8
    );
    bubble.material = mat(scene, "bubbleMat" + i, "#79d8e8", 0.35, "#2b91a5");
    bubble.isPickable = false;

    const speed = 0.0012 + (i % 6) * 0.00028;
    scene.registerBeforeRender(() => {
      bubble.position.y += speed;
      bubble.position.x += Math.sin(performance.now() * 0.001 + i) * 0.0008;
      if (bubble.position.y > 0.2) bubble.position.y = -9.5;
    });
  }
}

function createScene() {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.004, 0.022, 0.038, 1);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.008;
  scene.fogColor = new C3(0.008, 0.075, 0.1);

  const camera = new BABYLON.ArcRotateCamera(
    "camera",
    -1.82,
    1.16,
    17.5,
    new V3(0, -1.0, 0),
    scene
  );
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 7;
  camera.upperRadiusLimit = 30;
  camera.wheelPrecision = 48;
  camera.panningSensibility = 0;
  camera.inertia = 0.86;
  camera.angularSensibilityX = 620;
  camera.angularSensibilityY = 620;
  camera.minZ = 0.1;

  createEnvironment(scene);
  createWater(scene);
  const iceberg = createIceberg(scene);
  createParticles(scene);

  const hemi = new BABYLON.HemisphericLight("ambient", new V3(0, 1, 0), scene);
  hemi.intensity = 0.62;
  hemi.diffuse = new C3(0.68, 0.86, 0.9);
  hemi.groundColor = new C3(0.02, 0.08, 0.11);

  const sun = new BABYLON.DirectionalLight("moonLight", new V3(-0.35, -0.8, -0.55), scene);
  sun.position = new V3(15, 24, 12);
  sun.intensity = 1.5;
  sun.diffuse = new C3(0.72, 0.9, 0.96);

  const rim = new BABYLON.PointLight("iceRim", new V3(-5, 5, 7), scene);
  rim.intensity = 22;
  rim.range = 24;
  rim.diffuse = new C3(0.28, 0.78, 0.88);

  const fill = new BABYLON.PointLight("underwaterFill", new V3(2, -4, 3), scene);
  fill.intensity = 11;
  fill.range = 18;
  fill.diffuse = new C3(0.05, 0.45, 0.58);

  if (BABYLON.GlowLayer) {
    const glow = new BABYLON.GlowLayer("iceGlow", scene);
    glow.intensity = 0.22;
    glow.addIncludedOnlyMesh(iceberg.above);
  }

  const baseAlpha = iceberg.above.alpha;
  scene.registerBeforeRender(() => {
    const t = performance.now() * 0.00055;
    iceberg.above.position.y = Math.sin(t) * 0.035;
    iceberg.underwater.position.y = Math.sin(t) * 0.018;
    iceberg.foam.scaling.x = 1 + Math.sin(t * 1.7) * 0.012;
    iceberg.above.visibility = baseAlpha;
  });

  resetButton.disabled = false;
  resetButton.addEventListener("click", () => {
    camera.alpha = -1.82;
    camera.beta = 1.16;
    camera.radius = 17.5;
    camera.setTarget(new V3(0, -1.0, 0));
    statusText.textContent = "View reset. Explore the iceberg from above and below the waterline.";
    canvas.focus();
  });

  return scene;
}

function start() {
  if (!canvas || !window.BABYLON) return;
  try {
    engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
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
