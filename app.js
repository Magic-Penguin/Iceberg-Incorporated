"use strict";

const canvas = document.getElementById("renderCanvas");
const statusText = document.getElementById("scene-status");
const resetButton = document.getElementById("reset-view");
let engine;

function material(scene, name, diffuse, alpha = 1) {
  const mat = new BABYLON.StandardMaterial(name, scene);
  mat.diffuseColor = BABYLON.Color3.FromHexString(diffuse);
  mat.alpha = alpha;
  mat.specularColor = new BABYLON.Color3(0.7, 0.9, 1);
  if (alpha < 1) mat.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
  return mat;
}

function createIceberg(scene) {
  const ice = material(scene, "ice", "#dff8ff");
  const iceBlue = material(scene, "deepIce", "#8ddff2");

  // Irregular above-water peak built from overlapping low-poly ice forms.
  const peaks = [
    { name:"main peak", pos:[0,3.5,0], scale:[2.6,5.2,2.4], rot:[0,.2,0] },
    { name:"left ridge", pos:[-2.0,2.3,.4], scale:[1.7,3.2,1.8], rot:[0,-.35,.1] },
    { name:"right ridge", pos:[2.0,2.0,-.2], scale:[1.6,2.8,1.5], rot:[0,.45,-.08] },
    { name:"front ridge", pos:[.2,1.7,-1.8], scale:[1.8,2.4,1.3], rot:[.1,.1,.12] }
  ];
  peaks.forEach((p, i) => {
    const mesh = BABYLON.MeshBuilder.CreatePolyhedron("icePeak" + i, { type:0, size:2 }, scene);
    mesh.position = new BABYLON.Vector3(...p.pos);
    mesh.scaling = new BABYLON.Vector3(...p.scale);
    mesh.rotation = new BABYLON.Vector3(...p.rot);
    mesh.material = i === 0 ? ice : iceBlue;
  });

  // Submerged mass: deliberately much larger than the visible section.
  const submerged = BABYLON.MeshBuilder.CreatePolyhedron("submergedIce", { type:1, size:2 }, scene);
  submerged.position = new BABYLON.Vector3(0, -4.2, .1);
  submerged.scaling = new BABYLON.Vector3(5.8, 7.5, 4.8);
  submerged.rotation = new BABYLON.Vector3(.08, -.15, .05);
  submerged.material = material(scene, "underwaterIce", "#4eabc0", .72);

  const shelf = BABYLON.MeshBuilder.CreatePolyhedron("iceShelf", { type:0, size:2 }, scene);
  shelf.position = new BABYLON.Vector3(-1.5, -1.4, -1.4);
  shelf.scaling = new BABYLON.Vector3(3.2, 1.1, 2.1);
  shelf.rotation = new BABYLON.Vector3(.2,.2,-.1);
  shelf.material = iceBlue;
}

function createScene() {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.015, 0.10, 0.14, 1);

  const camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(11, 7, -16), scene);
  camera.setTarget(new BABYLON.Vector3(0, 0, 0));
  camera.attachControl(canvas, true);
  camera.speed = 0.32;
  camera.angularSensibility = 3500;

  const sky = BABYLON.MeshBuilder.CreateSphere("sky", { diameter:150, segments:16, sideOrientation:BABYLON.Mesh.BACKSIDE }, scene);
  sky.material = material(scene, "skyMaterial", "#092d3b");

  const water = BABYLON.MeshBuilder.CreateGround("water", { width:80, height:80, subdivisions:32 }, scene);
  water.position.y = 0;
  water.material = material(scene, "waterMaterial", "#0c6078", .78);

  const seabed = BABYLON.MeshBuilder.CreateGround("seabed", { width:60, height:60 }, scene);
  seabed.position.y = -12;
  seabed.material = material(scene, "seabedMaterial", "#06202a");

  createIceberg(scene);

  const light = new BABYLON.HemisphericLight("moonLight", new BABYLON.Vector3(0,1,0), scene);
  light.intensity = 1.0;
  light.diffuse = BABYLON.Color3.FromHexString("#dff8ff");
  const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-.4,-1,.3), scene);
  sun.position = new BABYLON.Vector3(10,20,-10);
  sun.intensity = 1.4;
  sun.diffuse = BABYLON.Color3.FromHexString("#bfeeff");

  // A faint ring of underwater markers reinforces the depth of the scene.
  for (let i = 0; i < 5; i++) {
    const ring = BABYLON.MeshBuilder.CreateTorus("depthRing" + i, { diameter:18 - i*2.6, thickness:.025, tessellation:64 }, scene);
    ring.position.y = -1.2 - i*2.0;
    ring.rotation.x = Math.PI / 2;
    ring.material = material(scene, "ringMat" + i, "#70d7e8", .14);
  }

  resetButton.addEventListener("click", () => {
    camera.position.set(11, 7, -16);
    camera.setTarget(new BABYLON.Vector3(0, 0, 0));
    statusText.textContent = "Camera reset to the starting view.";
  });
  return scene;
}

try {
  if (!window.BABYLON || !BABYLON.Engine.isSupported()) throw new Error("The Babylon.js engine or WebGL is unavailable.");
  engine = new BABYLON.Engine(canvas, true);
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
