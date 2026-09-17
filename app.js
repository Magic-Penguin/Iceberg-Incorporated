"use strict";

const canvas = document.getElementById("renderCanvas");
const statusText = document.getElementById("scene-status");
const resetButton = document.getElementById("reset-view");
let engine;

function material(scene, name, diffuse, alpha = 1, emissive = null) {
  const mat = new BABYLON.StandardMaterial(name, scene);
  mat.diffuseColor = BABYLON.Color3.FromHexString(diffuse);
  mat.alpha = alpha;
  mat.specularColor = new BABYLON.Color3(0.9, 0.95, 1);
  mat.specularPower = 96;
  if (emissive) mat.emissiveColor = BABYLON.Color3.FromHexString(emissive);
  if (alpha < 1) {
    mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    mat.needDepthPrePass = true;
  }
  return mat;
}

function createIceberg(scene) {
  const ice = material(scene, "ice", "#e9fbff", 1, "#a7e8f4");
  const iceBlue = material(scene, "deepIce", "#9bddea", 1, "#4db8ca");
  const iceShadow = material(scene, "iceShadow", "#5eb6ca", 1, "#276f83");

  // Layered, asymmetrical facets make the iceberg read as one large natural formation.
  const peaks = [
    { pos:[0,3.9,.1], scale:[2.25,5.8,2.15], rot:[0,.18,0], mat:ice },
    { pos:[-1.75,2.25,.25], scale:[1.8,3.35,1.75], rot:[.04,-.38,.08], mat:iceBlue },
    { pos:[1.8,2.05,-.2], scale:[1.65,3.05,1.55], rot:[-.03,.42,-.08], mat:ice },
    { pos:[.15,1.75,-1.75], scale:[1.9,2.55,1.25], rot:[.12,.1,.1], mat:iceBlue },
    { pos:[-2.15,1.0,-1.0], scale:[1.25,1.8,1.5], rot:[.18,-.15,.16], mat:iceShadow },
    { pos:[2.25,.95,.9], scale:[1.25,1.65,1.35], rot:[-.08,.5,-.12], mat:iceBlue }
  ];

  peaks.forEach((p, i) => {
    const mesh = BABYLON.MeshBuilder.CreatePolyhedron("icePeak" + i, { type:0, size:2 }, scene);
    mesh.position = new BABYLON.Vector3(...p.pos);
    mesh.scaling = new BABYLON.Vector3(...p.scale);
    mesh.rotation = new BABYLON.Vector3(...p.rot);
    mesh.material = p.mat;
  });

  // The submerged mass is intentionally much larger than the visible portion.
  const submerged = BABYLON.MeshBuilder.CreatePolyhedron("submergedIce", { type:1, size:2 }, scene);
  submerged.position = new BABYLON.Vector3(.1, -4.35, .15);
  submerged.scaling = new BABYLON.Vector3(6.2, 7.9, 5.0);
  submerged.rotation = new BABYLON.Vector3(.08, -.18, .04);
  submerged.material = material(scene, "underwaterIce", "#2f8ea8", .58, "#0d4052");

  const shelf = BABYLON.MeshBuilder.CreatePolyhedron("iceShelf", { type:0, size:2 }, scene);
  shelf.position = new BABYLON.Vector3(-1.65, -1.25, -1.55);
  shelf.scaling = new BABYLON.Vector3(3.35, 1.2, 2.25);
  shelf.rotation = new BABYLON.Vector3(.18,.22,-.12);
  shelf.material = iceBlue;

  // Thin luminous shards add detail to the submerged silhouette.
  for (let i = 0; i < 7; i++) {
    const shard = BABYLON.MeshBuilder.CreatePolyhedron("iceShard" + i, { type:0, size:2 }, scene);
    const a = (i / 7) * Math.PI * 2;
    const radius = 2.6 + (i % 3) * .55;
    shard.position = new BABYLON.Vector3(Math.cos(a) * radius, -2.1 - (i % 4) * 1.6, Math.sin(a) * radius);
    shard.scaling = new BABYLON.Vector3(.45 + (i % 2) * .18, 1.5 + (i % 3) * .45, .5);
    shard.rotation = new BABYLON.Vector3(.2, a, -.15);
    shard.material = material(scene, "shardMat" + i, "#69c9dc", .42, "#1b7388");
  }
}

function createWater(scene) {
  const water = BABYLON.MeshBuilder.CreateGround("water", { width:80, height:80, subdivisions:64 }, scene);
  water.position.y = 0;
  water.material = material(scene, "waterMaterial", "#0b637d", .72, "#063d50");

  // Gentle vertex animation gives the water surface movement without extra libraries.
  const positions = water.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  const base = positions.slice();
  water.registerBeforeRender(() => {
    const t = performance.now() * 0.0007;
    for (let i = 0; i < positions.length; i += 3) {
      const x = base[i];
      const z = base[i + 2];
      positions[i + 1] = Math.sin(x * .11 + t) * .035 + Math.cos(z * .13 + t * 1.2) * .035;
    }
    water.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
  });
  return water;
}

function createScene() {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.008, 0.055, 0.08, 1);
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.012;
  scene.fogColor = new BABYLON.Color3(0.015, 0.12, 0.16);

  const camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(11, 6.5, -16), scene);
  camera.setTarget(new BABYLON.Vector3(0, -1, 0));
  camera.attachControl(canvas, true);
  camera.speed = 0.34;
  camera.angularSensibility = 2800;
  camera.minZ = 0.1;
  camera.maxZ = 140;

  const sky = BABYLON.MeshBuilder.CreateSphere("sky", { diameter:150, segments:32, sideOrientation:BABYLON.Mesh.BACKSIDE }, scene);
  sky.material = material(scene, "skyMaterial", "#0a3445", 1, "#061b25");

  createWater(scene);

  const seabed = BABYLON.MeshBuilder.CreateGround("seabed", { width:60, height:60, subdivisions:24 }, scene);
  seabed.position.y = -12;
  seabed.material = material(scene, "seabedMaterial", "#031a24", 1, "#020b10");

  createIceberg(scene);

  const moon = new BABYLON.HemisphericLight("moonLight", new BABYLON.Vector3(0,1,0), scene);
  moon.intensity = 0.72;
  moon.diffuse = BABYLON.Color3.FromHexString("#dff8ff");
  moon.groundColor = BABYLON.Color3.FromHexString("#063343");

  const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-.35,-1,.25), scene);
  sun.position = new BABYLON.Vector3(12,22,-14);
  sun.intensity = 1.65;
  sun.diffuse = BABYLON.Color3.FromHexString("#d5f7ff");

  const rim = new BABYLON.PointLight("rimLight", new BABYLON.Vector3(-7,5,-5), scene);
  rim.intensity = 18;
  rim.range = 28;
  rim.diffuse = BABYLON.Color3.FromHexString("#55d9ee");

  // Depth rings make the hidden scale of the iceberg easier to perceive.
  for (let i = 0; i < 6; i++) {
    const ring = BABYLON.MeshBuilder.CreateTorus("depthRing" + i, {
      diameter:19 - i * 2.55,
      thickness:.035,
      tessellation:72
    }, scene);
    ring.position.y = -1.25 - i * 1.8;
    ring.rotation.x = Math.PI / 2;
    ring.material = material(scene, "ringMat" + i, "#73e1f0", .18, "#207e91");
  }

  // Small bubbles provide depth and make the underwater section feel alive.
  const bubbleMaterial = material(scene, "bubbleMaterial", "#b9f5ff", .22, "#4bc5da");
  for (let i = 0; i < 45; i++) {
    const bubble = BABYLON.MeshBuilder.CreateSphere("bubble" + i, { diameter:.045 + (i % 4) * .025, segments:8 }, scene);
    bubble.position = new BABYLON.Vector3(
      -9 + (i * 3.71) % 18,
      -10 + (i * 1.83) % 9,
      -7 + (i * 2.91) % 14
    );
    bubble.material = bubbleMaterial;
    bubble.metadata = { startY: bubble.position.y, phase: i * .7 };
  }

  scene.registerBeforeRender(() => {
    const t = performance.now() * 0.001;
    for (const mesh of scene.meshes) {
      if (mesh.name.startsWith("bubble")) {
        mesh.position.y = mesh.metadata.startY + ((t * .35 + mesh.metadata.phase) % 9);
        if (mesh.position.y > -1.0) mesh.position.y -= 9;
      }
    }
  });

  resetButton.addEventListener("click", () => {
    camera.position.set(11, 6.5, -16);
    camera.setTarget(new BABYLON.Vector3(0, -1, 0));
    statusText.textContent = "Camera reset to the starting view.";
    canvas.focus();
  });

  return scene;
}

try {
  if (!window.BABYLON || !BABYLON.Engine.isSupported()) throw new Error("The Babylon.js engine or WebGL is unavailable.");
  engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer:true, stencil:true, antialias:true });
  const scene = createScene();
  engine.runRenderLoop(() => scene.render());
  window.addEventListener("resize", () => engine.resize());
  resetButton.disabled = false;
  statusText.textContent = "Scene ready: explore the iceberg above and below the waterline.";
} catch (error) {
  if (engine) engine.dispose();
  canvas.hidden = true;
  statusText.textContent = "The 3D view could not start. Reload and check the browser console for details.";
  console.error("Scene startup:", error);
}
