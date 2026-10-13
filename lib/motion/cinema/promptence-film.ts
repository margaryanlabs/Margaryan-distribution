"use client";

import * as THREE from "three";

export const CINEMA_SECONDS = 10;
export const CINEMA_FPS = 30;
const GREEN = 0x4ee6a1;
const INK = 0x07100c;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, t: number) => a + (b - a) * ease(t);

export interface PromptenceFilm {
  canvas: HTMLCanvasElement;
  setTime: (seconds: number) => void;
  setScreen: (file: File) => Promise<void>;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}

/**
 * A deliberately source-honest, deterministic 3D cinematic shot.
 * The product plane stays unpopulated until a real, owner-approved screenshot is supplied.
 * No fictitious AI responses, brand rankings, clients, or numerical outcomes are generated.
 *
 * Renderer is invoked at exact timeline positions, never by cumulative delta-time,
 * so an offline frame at t=4.2 matches an interactive seek to t=4.2.
 */
export function createPromptenceFilm(width: number, height: number): PromptenceFilm {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-label", "Promptence cinematic 3D composition");
  const renderer = new THREE.WebGLRenderer({
    canvas, alpha: false, antialias: true, preserveDrawingBuffer: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.setClearColor(INK, 1);

  const world = new THREE.Scene();
  world.background = new THREE.Color(INK);
  world.fog = new THREE.FogExp2(INK, 0.026);
  const camera = new THREE.PerspectiveCamera(34, width / height, .1, 90);
  const stage = new THREE.Group();
  world.add(stage);

  const ambient = new THREE.HemisphereLight(0xd6e4e0, 0x030605, .65);
  world.add(ambient);
  const softbox = new THREE.DirectionalLight(0xf0f5f2, 4.1);
  softbox.position.set(-3.4, 5.2, 8.3);
  world.add(softbox);
  const edge = new THREE.PointLight(GREEN, 18, 12, 2);
  edge.position.set(4.2, 1.4, 2.1);
  world.add(edge);
  const fill = new THREE.PointLight(0x8c9eb4, 9, 14, 2);
  fill.position.set(-5.2, -2.1, 4);
  world.add(fill);

  // Hero object: an actual extruded graphite instrument panel, not CSS perspective.
  const frame = new THREE.Group();
  stage.add(frame);
  const graphite = new THREE.MeshPhysicalMaterial({
    color: 0x17231f, metalness: .82, roughness: .24, clearcoat: .72,
    clearcoatRoughness: .16
  });
  const shell = new THREE.Mesh(new THREE.BoxGeometry(6.34, 3.8, .19), graphite);
  frame.add(shell);
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x0b1412, metalness: .16, roughness: .09,
    clearcoat: 1, clearcoatRoughness: .05
  });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(6.04, 3.42), glassMaterial);
  glass.position.z = .101;
  frame.add(glass);
  const screenMaterial = new THREE.MeshBasicMaterial({ transparent: false, toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(5.98, 3.365), screenMaterial);
  screen.position.z = .104;
  screen.visible = false; // No mock product screenshots.
  frame.add(screen);
  const seam = new THREE.Mesh(
    new THREE.BoxGeometry(6.45, .012, .22),
    new THREE.MeshBasicMaterial({ color: 0x9ef3c7 })
  );
  seam.position.set(0, -1.92, 0);
  frame.add(seam);

  // Thin volumetric signal paths that make the data->decision transition legible.
  const traces: THREE.Mesh[] = [];
  const materials: THREE.MeshStandardMaterial[] = [];
  const points = [
    [-2.0, .95, 2.0], [-1.3, .15, 2.8], [-.45, 1.05, 3.2],
    [.5, -.75, 2.6], [1.6, .78, 2.1], [2.2, -.45, 2.75]
  ];
  for (let i = 0; i < points.length; i++) {
    const [x, y, z] = points[i];
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3((i - 2.5) * .55, .06, .20),
      new THREE.Vector3(x * .8, y * .7, 1.0),
      new THREE.Vector3(x, y, z)
    ]);
    const material = new THREE.MeshStandardMaterial({
      color: i === 2 ? GREEN : 0xa4b9b0, metalness: .44, roughness: .31,
      transparent: true, opacity: 0
    });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(path, 42, .009, 6, false), material);
    stage.add(tube); traces.push(tube); materials.push(material);
    const pin = new THREE.Mesh(
      new THREE.SphereGeometry(i === 2 ? .086 : .056, 20, 12),
      new THREE.MeshPhysicalMaterial({
        color: i === 2 ? GREEN : 0xc6d8d0,
        metalness: .32, roughness: .24, emissive: i === 2 ? 0x113e2a : 0x0a1c16
      })
    );
    pin.position.set(x, y, z);
    tube.add(pin);
  }

  const captions = ["QUESTION", "ANSWER", "SOURCE", "DIAGNOSIS", "ACTION", "REMEASURE"];
  const flags: THREE.Mesh[] = [];
  captions.forEach((label, i) => {
    const surface = document.createElement("canvas");
    surface.width = 512; surface.height = 100;
    const ctx = surface.getContext("2d");
    if (!ctx) throw new Error("Unable to create evidence label texture");
    ctx.clearRect(0, 0, 512, 100);
    ctx.fillStyle = "#101a17"; ctx.fillRect(0, 0, 512, 100);
    ctx.strokeStyle = i === 2 ? "#4ee6a1" : "#597066";
    ctx.lineWidth = 2; ctx.strokeRect(1, 1, 510, 98);
    ctx.fillStyle = i === 2 ? "#a4f8c9" : "#e0e9e3";
    ctx.font = "600 33px Arial, sans-serif";
    ctx.fillText(label, 28, 63);
    const texture = new THREE.CanvasTexture(surface);
    texture.colorSpace = THREE.SRGBColorSpace;
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(1.35, .265),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, side: THREE.DoubleSide })
    );
    const [x, y, z] = points[i];
    flag.position.set(x + .6, y + .14, z);
    flag.rotation.y = -.2;
    stage.add(flag);
    flags.push(flag);
  });

  // Actual world-space camera path; no forced 2D perspective on flat PNG layers.
  const cameraRoute = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-4.9, 2.2, 10.3),
    new THREE.Vector3(-2.45, .95, 8.0),
    new THREE.Vector3(.45, .1, 7.0),
    new THREE.Vector3(2.25, .65, 6.4),
    new THREE.Vector3(0, .1, 10.1)
  ], false, "centripetal");
  const targetRoute = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, .1, 0),
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(.4, .1, 1.2),
    new THREE.Vector3(.1, 0, 1.9),
    new THREE.Vector3(0, 0, 0)
  ], false, "centripetal");

  let texture: THREE.Texture | undefined;
  let disposed = false;

  function resize(w: number, h: number) {
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 360 || h < 200)
      throw new Error("Invalid cinema dimensions");
    renderer.setSize(Math.round(w), Math.round(h), false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function setTime(seconds: number) {
    if (disposed) throw new Error("Cinema scene already disposed");
    if (!Number.isFinite(seconds)) throw new Error("Time must be finite");
    const t = Math.max(0, Math.min(CINEMA_SECONDS, seconds));
    const routeT = ease(t / CINEMA_SECONDS);
    camera.position.copy(cameraRoute.getPoint(routeT));
    camera.lookAt(targetRoute.getPoint(routeT));
    frame.position.set(0, mix(-.6, .15, t / 2.7), 0);
    frame.rotation.y = mix(-.57, 0, t / 3.6);
    frame.rotation.x = mix(.13, 0, t / 3.6);
    const disperse = ease((t - 3.3) / 2.6);
    frame.scale.setScalar(mix(1, .72, disperse));
    frame.position.z = mix(0, -1.9, disperse);
    for (let i = 0; i < traces.length; i++) {
      materials[i].opacity = .95 * ease((t - 3.1 - i * .16) / .9) *
        (1 - ease((t - 7.5) / 1.2));
      traces[i].visible = materials[i].opacity > .003;
      const mat = flags[i].material as THREE.MeshBasicMaterial;
      mat.opacity = ease((t - 4 - i * .19) / .8) * (1 - ease((t - 7.3) / 1.1));
      flags[i].visible = mat.opacity > .003;
      flags[i].position.z = points[i][2] + .11 * Math.sin(t * .6 + i);
    }
    edge.intensity = mix(12, 27, ease((t - 4) / 3));
    stage.rotation.y = .018 * Math.sin(t * .6);
    renderer.render(world, camera);
  }

  async function setScreen(file: File) {
    if (disposed) throw new Error("Cinema scene already disposed");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 12_000_000)
      throw new Error("Provide a real PNG/JPEG/WebP product capture under 12 MB");
    const url = URL.createObjectURL(file);
    try {
      const picture = new Image();
      picture.src = url;
      await picture.decode();
      if (picture.naturalWidth < 720 || picture.naturalHeight < 400)
        throw new Error("Product capture must be at least 720x400");
      const surface = document.createElement("canvas");
      surface.width = 1600; surface.height = 900;
      const ctx = surface.getContext("2d");
      if (!ctx) throw new Error("Product texture unavailable");
      ctx.fillStyle = "#07100c"; ctx.fillRect(0, 0, 1600, 900);
      // Fit, never distort: black letterboxing preserves the actual UI content.
      const scale = Math.min(1600 / picture.naturalWidth, 900 / picture.naturalHeight);
      const w = picture.naturalWidth * scale, h = picture.naturalHeight * scale;
      ctx.drawImage(picture, (1600 - w) / 2, (900 - h) / 2, w, h);
      const next = new THREE.CanvasTexture(surface);
      next.colorSpace = THREE.SRGBColorSpace;
      const old = texture;
      texture = next;
      screenMaterial.map = next;
      screenMaterial.needsUpdate = true;
      screen.visible = true;
      old?.dispose();
    } finally { URL.revokeObjectURL(url); }
  }

  resize(width, height);
  setTime(0);
  return {
    canvas, setTime, setScreen, resize,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      texture?.dispose();
      world.traverse(node => {
        if (node instanceof THREE.Mesh || node instanceof THREE.Line || node instanceof THREE.Points) {
          node.geometry.dispose();
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          materials.forEach(m => {
            const map = (m as THREE.MeshBasicMaterial).map;
            if (map && map !== texture) map.dispose();
            m.dispose();
          });
        }
      });
      renderer.dispose();
    }
  };
}
