"use strict";

const canvas = document.getElementById("renderCanvas");
const statusText = document.getElementById("scene-status");
const resetButton = document.getElementById("reset-view");
let engine;

const V3 = BABYLON.Vector3;

function mat(scene, name, color, alpha = 1, emissive = null) {
  const m = new BABYLON.StandardMaterial(name, scene);
  m.diffuseColor = BABYLON.Color3.FromHexString(color);
  m.specularColor = new BABYLON.Color3(0.95, 0.98, 1);
  m.specularPower = 110;
  m.alpha = alpha;
  if (emissive) m.emissiveColor = BABYLON.Color3.FromHexString(emissive);
  if (alpha < 1) {
    m.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
    m.needDepthPrePass = true;
  }
  return m;
}

function createIceberg(scene) {
  const snow = mat(scene, "snowIce", "#f4fdff", 1, "#bceff7");
  const blue = mat(scene, "blueIce", "#8ed9e8", 1, "#45afc3");
  const shadow = mat(scene, "shadowIce", "#3b91a7", 1, "#174f62");
  const deep = mat(scene, "deepIce", "#226f88", .63, "#0b3548");
  const crack = mat(scene, "iceCracks", "#b9f7ff", .72, "#5ed8e8");

  // Custom faceted above-water body. Each ring is slightly offset and rotated,
  // producing a natural cliff-like silhouette instead of stacked primitives.
  const rings = [
    { y:0.05, rx:4.0, rz:3.1, ox:0.0, oz:0.0, n:10 },
    { y:1.0, rx:3.25, rz:2.55, ox:-.15, oz:.12, n:9 },
    { y:2.35, rx:2.35, rz:1.85, ox:.15, oz:-.05, n:8 },
    { y:3.8, rx:1.45, rz:1.25, ox:-.2, oz:.05, n:7 },
    { y:5.35, rx:.72, rz:.62, ox:.12, oz:-.08, n:6 },
    { y:6.35, rx:.12, rz:.12, ox:0, oz:0, n:5 }
  ];
  const positions = [], indices = [], normals = [], uvs = [];
  let offset = 0;
  rings.forEach((r, ri) => {
    for (let i = 0; i < r.n; i++) {
      const a = (i / r.n) * Math.PI * 2 + ri * .23;
      const wobble = 1 + Math.sin(i * 2.7 + ri) * .055;
      positions.push(r.ox + Math.cos(a) * r.rx * wobble);
      positions.push(r.y);
      positions.push(r.oz + Math.sin(a) * r.rz * wobble);
      uvs.push(i / r.n, ri / (rings.length - 1));
    }
    if (ri > 0) {
      const prev = offset - rings[ri - 1].n;
      const curr = offset;
      const pn = rings[ri - 1].n, cn = r.n;
      const steps = Math.max(pn, cn);
      for (let s = 0; s < steps; s++) {
        const a = prev + Math.floor((s / steps) * pn) % pn;
        const b = prev + Math.floor(((s + 1) / steps) * pn) % pn;
        const c = curr + Math.floor((s / steps) * cn) % cn;
        const d = curr + Math.floor(((s + 1) / steps) * cn) % cn;
        indices.push(a, b, c, b, d, c);
      }
    }
    offset += r.n;
  });
  BABYLON.VertexData.ComputeNormals(positions, indices, normals);
  const iceberg = new BABYLON.Mesh("icebergBody", scene);
  const vd = new BABYLON.VertexData();
  vd.positions = positions; vd.indices = indices; vd.normals = normals; vd.uvs = uvs;
  vd.applyToMesh(iceberg);
  iceberg.material = snow;

  // Large secondary facets break up the silhouette and add blue glacier faces.
  const facets = [
    [-2.0,1.2,-1.65, 1.3,2.2,.65,.22],
    [1.8,1.45,-1.2, 1.1,2.7,.7,-.28],
    [-1.25,2.65,.95, .9,2.5,.65,.42],
    [1.0,3.25,.8, .75,2.4,.58,-.35],
    [.1,4.6,-.72,.55,2.25,.45,.08]
  ];
  facets.forEach((f, i) => {
    const p = BABYLON.MeshBuilder.CreatePolyhedron("iceFacet" + i, { type:0, size:2 }, scene);
    p.position = new V3(f[0],f[1],f[2]);
    p.scaling = new V3(f[3],f[4],f[5]);
    p.rotation.y = f[6];
    p.material = i % 2 ? blue : shadow;
  });

  // The underwater body is deliberately broad and tapers toward the seabed.
  const underwaterRings = [
    { y:-.15, rx:4.0, rz:3.1 },
    { y:-2.5, rx:5.0, rz:4.0 },
    { y:-5.5, rx:4.7, rz:3.6 },
    { y:-8.7, rx:3.0, rz:2.4 },
    { y:-10.8, rx:1.35, rz:1.1 }
  ];
  const up = [], ui = [], un = [];
  const seg = 12;
  underwaterRings.forEach((r, ri) => {
    for (let i=0;i<seg;i++) {
      const a = i/seg*Math.PI*2 + ri*.17;
      const wobble = 1 + Math.sin(i*1.9+ri)*.06;
      up.push(Math.cos(a)*r.rx*wobble, r.y, Math.sin(a)*r.rz*wobble);
    }
  });
  for (let r=0;r<underwaterRings.length-1;r++) for(let i=0;i<seg;i++) {
    const a=r*seg+i,b=r*seg+(i+1)%seg,c=(r+1)*seg+i,d=(r+1)*seg+(i+1)%seg;
    ui.push(a,b,c,b,d,c);
  }
  BABYLON.VertexData.ComputeNormals(up,ui,un);
  const hidden = new BABYLON.Mesh("submergedIce",scene);
  const hv = new BABYLON.VertexData(); hv.positions=up;hv.indices=ui;hv.normals=un;hv.applyToMesh(hidden);
  hidden.material = deep;

  // Glacier cracks / light shafts.
  for (let i=0;i<9;i++) {
    const line = BABYLON.MeshBuilder.CreateLines("iceCrack"+i, {
      points:[
        new V3(-2.8+(i*.71),-.05,-2.4+(i%3)*.4),
        new V3(-2.1+(i*.52),-2.2,-1.8+(i%4)*.55),
        new V3(-1.5+(i*.43),-4.3,-1.25+(i%2)*.8)
      ], updatable:false
    },scene);
    line.color = BABYLON.Color3.FromHexString("#9ceef6");
    line.alpha = .25;
  }

  // A broken ice shelf sits at the waterline.
  const shelf = BABYLON.MeshBuilder.CreateDisc("iceShelf", { radius:4.4, tessellation:11 }, scene);
  shelf.scaling = new V3(1,.12,.72);
  shelf.position = new V3(.1,.02,.05);
  shelf.material = blue;

  return iceberg;
}

function createWater(scene) {
  const water = BABYLON.MeshBuilder.CreateGround("water", { width:90, height:90, subdivisions:70 }, scene);
  const m = mat(scene,"waterMaterial","#075d76",.62,"#032b3a");
  m.backFaceCulling = false;
  water.material = m;
  const positions = water.getVerticesData(BABYLON.VertexBuffer.PositionKind);
  const base = positions.slice();
  water.registerBeforeRender(() => {
    const t = performance.now() * .00045;
    for(let i=0;i<positions.length;i+=3) {
      const x=base[i],z=base[i+2];
      positions[i+1] = Math.sin(x*.075+t)*.07 + Math.cos(z*.09+t*1.35)*.055 + Math.sin((x+z)*.035+t*.7)*.035;
    }
    water.updateVerticesData(BABYLON.VertexBuffer.PositionKind,positions,false,false);
  });

  // Concentric wave crests around the iceberg.
  const foam = mat(scene,"foam","#d8fbff",.38,"#a7eff6");
  for(let i=0;i<5;i++) {
    const ring = BABYLON.MeshBuilder.CreateTorus("wave"+i,{diameter:9+i*2.25,thickness:.035,tessellation:96},scene);
    ring.position.y=.075+i*.012;
    ring.scaling.z=.72;
    ring.material=foam;
    ring.metadata={phase:i*.9};
  }
  return water;
}

function createEnvironment(scene) {
  const sky = BABYLON.MeshBuilder.CreateSphere("sky",{diameter:180,segments:32,sideOrientation:BABYLON.Mesh.BACKSIDE},scene);
  sky.material=mat(scene,"skyMaterial","#082c3c",1,"#04151e");

  const seabed = BABYLON.MeshBuilder.CreateGround("seabed",{width:70,height:70,subdivisions:28},scene);
  seabed.position.y=-12;
  seabed.material=mat(scene,"seabedMaterial","#02151e",1,"#01080d");

  // Subtle underwater light columns.
  for(let i=0;i<7;i++) {
    const beam=BABYLON.MeshBuilder.CreateCylinder("lightBeam"+i,{height:11,diameterTop:.05,diameterBottom:2.5,tessellation:20},scene);
    beam.position=new V3(-9+i*3,-5,5+Math.sin(i)*4);
    beam.material=mat(scene,"beamMat"+i,"#41c9df",.035,"#209bb2");
  }
}

function createParticles(scene) {
  const bubbleMat=mat(scene,"bubbleMaterial","#bdf8ff",.25,"#69d8e7");
  for(let i=0;i<55;i++) {
    const b=BABYLON.MeshBuilder.CreateSphere("bubble"+i,{diameter:.035+(i%5)*.022,segments:8},scene);
    b.position=new V3(-9+(i*3.71)%18,-11+(i*1.77)%10,-8+(i*2.41)%16);
    b.material=bubbleMat;
    b.metadata={baseX:b.position.x,baseY:b.position.y,baseZ:b.position.z,phase:i*.73,speed:.22+(i%4)*.035};
  }
  scene.registerBeforeRender(()=>{
    const t=performance.now()*.001;
    scene.meshes.forEach(b=>{
      if(!b.name.startsWith("bubble")) return;
      b.position.y=b.metadata.baseY+((t*b.metadata.speed+b.metadata.phase)%10);
      b.position.x=b.metadata.baseX+Math.sin(t*.7+b.metadata.phase)*.08;
      if(b.position.y>-1) b.position.y-=10;
    });
  });
}

function createScene() {
  const scene=new BABYLON.Scene(engine);
  scene.clearColor=new BABYLON.Color4(.006,.035,.055,1);
  scene.fogMode=BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity=.009;
  scene.fogColor=new BABYLON.Color3(.01,.10,.14);

  const camera=new BABYLON.ArcRotateCamera("camera",-1.95,1.22,18,new V3(0,-1.0,0),scene);
  camera.attachControl(canvas,true);
  camera.lowerRadiusLimit=8;
  camera.upperRadiusLimit=34;
  camera.wheelPrecision=55;
  camera.panningSensibility=0;
  camera.inertia=.82;
  camera.angularSensibilityX=650;
  camera.angularSensibilityY=650;

  createEnvironment(scene);
  createWater(scene);
  createIceberg(scene);
  createParticles(scene);

  const hemi=new BABYLON.HemisphericLight("skyLight",new V3(0,1,0),scene);
  hemi.intensity=.82;
  hemi.diffuse=BABYLON.Color3.FromHexString("#dffaff");
  hemi.groundColor=BABYLON.Color3.FromHexString("#063847");

  const sun=new BABYLON.DirectionalLight("sun",new V3(-.35,-1,.25),scene);
  sun.position=new V3(12,24,-16);
  sun.intensity=2.0;
  sun.diffuse=BABYLON.Color3.FromHexString("#d7faff");

  const rim=new BABYLON.PointLight("rimLight",new V3(-7,7,-7),scene);
  rim.intensity=26;
  rim.range=32;
  rim.diffuse=BABYLON.Color3.FromHexString("#58e4f3");

  if(BABYLON.GlowLayer) {
    const glow=new BABYLON.GlowLayer("iceGlow",scene,{blurKernelSize:32});
    glow.intensity=.42;
  }

  // Slow ambient rotation keeps the experience alive when the user pauses.
  scene.registerBeforeRender(()=>{
    const t=performance.now()*.00012;
    const waves=scene.getMeshByName("wave0");
    if(waves) waves.rotation.y=t;
  });

  resetButton.addEventListener("click",()=>{
    camera.alpha=-1.95;
    camera.beta=1.22;
    camera.radius=18;
    camera.setTarget(new V3(0,-1,0));
    statusText.textContent="Camera reset to the starting view.";
    canvas.focus();
  });
  return scene;
}

try {
  if(!window.BABYLON||!BABYLON.Engine.isSupported()) throw new Error("Babylon.js or WebGL is unavailable.");
  engine=new BABYLON.Engine(canvas,true,{preserveDrawingBuffer:true,stencil:true,antialias:true});
  const scene=createScene();
  engine.runRenderLoop(()=>scene.render());
  window.addEventListener("resize",()=>engine.resize());
  resetButton.disabled=false;
  statusText.textContent="Scene ready: explore the iceberg above and below the waterline.";
} catch(error) {
  if(engine) engine.dispose();
  canvas.hidden=true;
  statusText.textContent="The 3D view could not start. Reload and check the browser console for details.";
  console.error("Scene startup:",error);
}
