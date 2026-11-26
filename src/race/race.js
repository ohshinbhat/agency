import * as THREE from 'three';
import { makeAscii, makeSoftwareRenderer } from './ascii.js';
import { makeRunners, poseRunner } from './runner.js';

const LANES = 6;
const laneWidth = 1.2;
const straight = 24;
const radius = 20;
const finish = 60;
const distances = [3.5, 12, 25, 46, 67];
const laneCenter = (lane) => (lane - (LANES - 1) / 2) * laneWidth;
const mix = THREE.MathUtils.lerp;
const clamp = THREE.MathUtils.clamp;
const smooth = (p) => p * p * (3 - 2 * p);
const upAxis = new THREE.Vector3(0, 1, 0);

function trackAt(distance, lane = 0) {
  const turn = Math.max(0, (distance - straight) / radius);
  const sin = Math.sin(turn);
  const cos = Math.cos(turn);
  return {
    x: radius * (1 - cos) + lane * cos,
    z: -Math.min(distance, straight) - (radius - lane) * sin,
    fx: sin,
    fz: -cos,
    rx: cos,
    rz: sin,
  };
}

function strip(scene, left, right, start, end, height, color) {
  const points = [];
  const uv = [];
  const indices = [];
  const sections = Math.ceil(end - start);
  for (let i = 0; i <= sections; i++) {
    const distance = mix(start, end, i / sections);
    const a = trackAt(distance, left);
    const b = trackAt(distance, right);
    points.push(a.x, height, a.z, b.x, height, b.z);
    uv.push(a.x / 3.2, -a.z / 3.2, b.x / 3.2, -b.z / 3.2);
    const v = i * 2;
    if (i < sections) indices.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color }));
  mesh.renderOrder = Math.round((height + .03) * 100);
  scene.add(mesh);
  return mesh.material;
}

function createTrack(scene) {
  const edge = laneWidth * LANES / 2;
  strip(scene, -edge - .39, edge + .39, -28, 85, -.03, '#65180e');
  const tones = ['#7e2113', '#842313', '#882514', '#842313', '#882514', '#7e2113'];
  const surface = tones.map((color, lane) => {
    const left = -edge + lane * laneWidth;
    return strip(scene, left, left + laneWidth, -28, 85, 0, color);
  });
  for (let index = 0; index <= LANES; index++) {
    const lane = -edge + index * laneWidth;
    strip(scene, lane - .039, lane + .039, -28, 85, .005, '#ffffff');
  }
  strip(scene, -edge - .35, -edge - .30, -28, 85, .007, '#bb6457');
  strip(scene, edge + .30, edge + .35, -28, 85, .007, '#bb6457');

  // Staggered starting marks and a checker finish across all lanes.
  for (let lane = 0; lane < LANES; lane++) {
    const left = laneCenter(lane) - laneWidth / 2 + .07;
    const start = lane * .38 - 1.9;
    strip(scene, left, left + laneWidth - .14, start, start + .085, .009, '#ffffff');
    // Short painted relay marks punctuate the long lanes and identify each curve.
    for (const marker of [18, 37, 50]) {
      const offset = marker + lane * .26;
      strip(scene, left + .06, left + .29, offset, offset + .05, .009, '#e1d7d2');
      strip(scene, left + .06, left + .14, offset + .05, offset + .25, .009, '#e1d7d2');
    }
  }
  strip(scene, -edge, edge, finish, finish + .11, .01, '#ffffff');
  strip(scene, -edge, edge, finish + .65, finish + .76, .01, '#ffffff');
  for (let lane = 0; lane < LANES * 4; lane++) {
    const left = -edge + lane * laneWidth / 4;
    const z = finish + .11 + lane % 2 * .27;
    strip(scene, left, left + laneWidth / 4, z, z + .27, .01, '#f4f1ec');
  }

  const tickMat = new THREE.MeshBasicMaterial({ color: '#9d5a51' });
  const tickGeometry = new THREE.PlaneGeometry(.28, .06);
  tickGeometry.rotateX(-Math.PI / 2);
  const ticks = new THREE.InstancedMesh(tickGeometry, tickMat, 72);
  const matrix = new THREE.Object3D();
  for (let i = 0; i < ticks.count; i++) {
    const distance = -20 + Math.floor(i / 2) * 2.85;
    const p = trackAt(distance, (i % 2 ? 1 : -1) * (edge + .67));
    matrix.position.set(p.x, .01, p.z);
    matrix.rotation.y = -Math.atan2(p.rz, p.rx);
    matrix.updateMatrix();
    ticks.setMatrixAt(i, matrix.matrix);
  }
  ticks.renderOrder = 4;
  scene.add(ticks);
  return surface;
}

function textureTrack(materials, onReady) {
  const photo = new Image();
  photo.addEventListener('load', () => {
    const tile = document.createElement('canvas');
    tile.width = photo.naturalWidth;
    tile.height = photo.naturalHeight;
    const context = tile.getContext('2d', { willReadFrequently: true });
    context.drawImage(photo, 0, 0);
    const image = context.getImageData(0, 0, tile.width, tile.height);
    const pixels = image.data;
    let sum = 0;
    for (let i = 0; i < pixels.length; i += 4) sum += pixels[i] * .45 + pixels[i + 1] * .45 + pixels[i + 2] * .10;
    const mean = sum / (pixels.length / 4);
    for (let i = 0; i < pixels.length; i += 4) {
      const value = pixels[i] * .45 + pixels[i + 1] * .45 + pixels[i + 2] * .10;
      const brightness = clamp(1 + (value - mean) / 132, .64, 1.43);
      pixels[i] = 132 * brightness;
      pixels[i + 1] = 35 * brightness;
      pixels[i + 2] = 19 * brightness;
    }
    context.putImageData(image, 0, 0);
    const map = new THREE.CanvasTexture(tile);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.MirroredRepeatWrapping;
    map.anisotropy = 4;
    materials.forEach((material, index) => {
      material.userData.untexturedColor = material.color.clone();
      material.map = map;
      material.color.setHex(index === 0 || index === LANES - 1 ? 0xeee9e7 : 0xffffff);
      material.needsUpdate = true;
    });
    onReady();
  }, { once: true });
  photo.src = new URL('./track-rubber.jpg', import.meta.url).href;
}

const gapAtStart = [-.18, .55, -.36, .32];
const finishOrder = [1.55, -.32, .62, -1.35];

function updateRunners(runners, distance) {
  runners.forEach((model, index) => {
    const p = clamp(distance / finish, 0, 1);
    const lead = mix(gapAtStart[index], finishOrder[index], smooth(p));
    const s = distance + lead;
    const lane = laneCenter(index + 1);
    const position = trackAt(s, lane);
    const onBend = smooth(clamp((s - straight) / 4, 0, 1));
    // Inside lanes cover less ground on the bend. Match cadence to actual lane travel.
    const traveled = s - Math.max(0, s - straight) * lane / radius;
    model.runner.position.set(position.x, 0, position.z);
    model.runner.rotation.y = Math.atan2(position.fx, position.fz);
    poseRunner(model, traveled, onBend);
  });
}

const cameraTarget = new THREE.Vector3();

function placeCamera(camera, shot, phase, distance, width, height) {
  const narrow = width / height < 1;
  const anchor = trackAt(distance);
  let across, forward, elevation, ahead, fov, xOffset, yOffset;
  let aimHeight = .82;

  camera.up.copy(upAxis);
  if (shot === 0) {
    across = mix(-1.1, 1.4, phase);
    forward = mix(-2.85, -1.55, phase);
    elevation = mix(9.2, 10.1, phase);
    ahead = .15;
    aimHeight = .14;
    fov = narrow ? 67 : 44;
    xOffset = narrow ? .015 : .19;
    yOffset = narrow ? .15 : .05;
    camera.up.set(.4, 0, -.92);
  } else if (shot === 1) {
    across = mix(6.4, 6.8, phase);
    forward = mix(7.8, 5.8, phase);
    elevation = mix(.75, 1.04, phase);
    ahead = -.35;
    aimHeight = 1.02;
    fov = narrow ? 62 : 37;
    xOffset = narrow ? .008 : .21;
    yOffset = narrow ? .11 : .025;
  } else if (shot === 2) {
    across = mix(3.7, 5.6, phase);
    forward = mix(-6.2, -7.4, phase);
    elevation = mix(5.1, 6.9, phase);
    ahead = 1;
    fov = narrow ? 71 : 40;
    xOffset = narrow ? .018 : .18;
    yOffset = narrow ? .15 : .07;
  } else {
    const rise = smooth(clamp((phase - .36) / .64, 0, 1));
    across = mix(-5.1, -11.8, rise);
    forward = mix(7.2, 13.4, rise);
    elevation = mix(3.2, 17.5, rise);
    ahead = mix(.2, -4.4, rise);
    fov = narrow ? 70 : 42;
    xOffset = narrow ? .016 : .18;
    yOffset = narrow ? .23 : .045;
  }

  camera.position.set(
    anchor.x + anchor.rx * across + anchor.fx * forward,
    elevation,
    anchor.z + anchor.rz * across + anchor.fz * forward
  );
  cameraTarget.set(anchor.x + anchor.fx * ahead, aimHeight, anchor.z + anchor.fz * ahead);
  camera.lookAt(cameraTarget);
  camera.fov = fov;
  // Shift the optical center to make room for the editorial copy.
  camera.setViewOffset(width, height, -width * xOffset, height * yOffset, width, height);
}

export function createRace(canvas) {
  const scene = new THREE.Scene();
  const backdrop = new THREE.Color('#0d0d0f');
  const light = new THREE.DirectionalLight('#f8f6f4', 2.5);
  light.position.set(5, 8, 4);
  const fill = new THREE.HemisphereLight('#fffcfa', '#777382', 1.7);
  light.layers.enable(1);
  fill.layers.enable(1);
  scene.add(light, fill);
  const surface = createTrack(scene);
  const runners = makeRunners(scene);
  const camera = new THREE.PerspectiveCamera(45, 1, .38, 85);
  const art = makeAscii(canvas);
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(1);
    renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      renderer = makeSoftwareRenderer();
      art.invalidate();
      draw(...previous);
    });
  } catch {
    renderer = makeSoftwareRenderer();
  }

  let previous = [0, 0];
  if (renderer.isWebGLRenderer) textureTrack(surface, () => draw(...previous));

  function draw(shot, phase) {
    previous = [shot, phase];
    if (!art.size()) return;
    const distance = mix(distances[shot], distances[shot + 1], phase);
    updateRunners(runners, distance);
    const resolution = renderer.isWebGLRenderer
      ? Math.min(1.25, 1500 / canvas.clientWidth, 1200 / canvas.clientHeight)
      : Math.min(1, 900 / canvas.clientWidth, 900 / canvas.clientHeight);
    const width = Math.round(canvas.clientWidth * resolution);
    const height = Math.round(canvas.clientHeight * resolution);
    if (renderer.domElement.width !== width || renderer.domElement.height !== height) {
      renderer.setSize(width, height, false);
    }
    placeCamera(camera, shot, phase, distance, canvas.clientWidth, canvas.clientHeight);
    scene.background = backdrop;
    camera.layers.set(0);
    renderer.render(scene, camera);
    art.ground(renderer.domElement);

    scene.background = null;
    camera.layers.set(1);
    renderer.render(scene, camera);
    art.runners(renderer.domElement);
  }
  return { draw };
}
