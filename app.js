"use strict";

// Structure: 3d.html. Appearance: css/styles.css. Scene logic: this file.
const canvas = document.getElementById("renderCanvas");
const statusText = document.getElementById("scene-status");
const resetButton = document.getElementById("reset-view");
let engine;

function createScene() {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.08, 0.14, 0.17, 1);

  const camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 5, -10), scene);
  camera.setTarget(BABYLON.Vector3.Zero());
  camera.attachControl(canvas, true);
  camera.speed = 0.25;

  const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
  light.intensity = 0.7;

  // EXPERIMENT HERE. Change one value, predict the result, save, and reload.
  const sphere = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 5, segments: 3
   }, scene);
  sphere.position.y = 7;
  const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 10, height: 5
   }, scene);

  // Optional extension: add a differently named object and give it its own position.
  // Keep one scene creation, one render loop, and one resize listener.
  // Supplied camera recovery. A new custom button is not required for Week 4.
  resetButton.addEventListener("click", () => {
    camera.position.set(0, 5, -10);
    camera.setTarget(BABYLON.Vector3.Zero());
    statusText.textContent = "Camera reset to the starting view.";
  });
  return scene;
}

try {
  if (!window.BABYLON || !BABYLON.Engine.isSupported()) {
    throw new Error("The Babylon.js engine or WebGL is unavailable.");
  }
  engine = new BABYLON.Engine(canvas, true);
  const scene = createScene();
  engine.runRenderLoop(() => scene.render());
  window.addEventListener("resize", () => engine.resize());
  resetButton.disabled = false;

  // INTRO PRACTICE: replace these messages with your own accurate context.
  console.log("Week 4: sphere and ground scene loaded.");
  statusText.textContent = "Scene ready: a sphere on a ground plane.";
} catch (error) {
  if (engine) engine.dispose();
  canvas.hidden = true;
  statusText.textContent = "The 3D view could not start. Keep the whole week4 folder together, reload, and check the browser console. If this device cannot run WebGL, ask your instructor for the supported lab route.";
  console.error("Scene startup:", error);
}
