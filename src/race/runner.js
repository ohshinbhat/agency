import * as THREE from 'three';
import { joints, strides } from './strides.js';

const { clamp, lerp: mix } = THREE.MathUtils;
const up = new THREE.Vector3(0, 1, 0);
const axis = new THREE.Vector3();
const rounded = new THREE.SphereGeometry(1, 14, 10);
const soleShape = new THREE.SphereGeometry(1, 10, 6);
const flat = new THREE.BoxGeometry(1, 1, 1);
const ground = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);

function profile(points) {
  return new THREE.LatheGeometry(points.map(([radius, height]) => new THREE.Vector2(radius, height)), 12);
}

const singlet = profile([[0,-.32],[.65,-.31],[.73,-.22],[.79,-.04],[.99,.13],[1,.2],[.81,.25],[.45,.28],[0,.28]]);
const leg = profile([[0,-.5],[.77,-.5],[.88,-.38],[1,-.16],[.83,.1],[.63,.4],[.58,.5],[0,.5]]);
const arm = profile([[0,-.5],[.70,-.5],[.91,-.25],[1,.03],[.89,.24],[.74,.5],[0,.5]]);
const shortsLeg = profile([[0,-.5],[.86,-.5],[.98,-.43],[1,.12],[.82,.46],[0,.5]]);
const kit = (color) => new THREE.MeshLambertMaterial({ color, emissive:color, emissiveIntensity:.16 });

const shoeUpper = kit('#f4f3ed');
const outsoleMaterial = kit('#212126');
const sock = kit('#e0dfda');
const bibInk = kit('#212022');
const bibPaper = kit('#f2efea');

function mesh(parent, geometry, material, position, scale) {
  const part = new THREE.Mesh(geometry, material);
  part.position.set(...position);
  part.scale.set(...scale);
  parent.add(part);
  return part;
}

function connect(part, from, to, width, depth = width) {
  axis.subVectors(to, from);
  const length = axis.length();
  part.position.copy(from).addScaledVector(axis, .5);
  part.quaternion.setFromUnitVectors(up, axis.divideScalar(length));
  part.scale.set(width, length, depth);
}

function createShadowMaterial() {
  const image = document.createElement('canvas');
  image.width = image.height = 64;
  const ctx = image.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 5, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(0,0,0,.8)');
  gradient.addColorStop(.55, 'rgba(0,0,0,.46)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.MeshBasicMaterial({
    color:'#110b0b', map:new THREE.CanvasTexture(image), transparent:true, opacity:.82, depthWrite:false,
  });
}

const profiles = [
  { scale:1.032, clip:2, phase:.12, uniform:['#f4f1ec','#222128','#bf8c7c','#272225'] },
  { scale:.991, clip:1, phase:.71, uniform:['#ab302b','#e7dcd3','#936154','#212022'] },
  { scale:1.060, clip:0, phase:.46, uniform:['#dedbd4','#411b24','#c59783','#3e2926'] },
  { scale:.971, clip:2, phase:.57, uniform:['#bf4038','#2d2930','#a8796c','#2c2324'] },
];

export function makeRunners(scene) {
  const shadowMaterial = createShadowMaterial();
  return profiles.map((profile, index) => makeRunner(scene, shadowMaterial, profile, index));
}

function makeRunner(scene, shadowMaterial, profile, index) {
  const runner = new THREE.Group();
  runner.scale.setScalar(profile.scale);
  scene.add(runner);
  const body = new THREE.Group();
  runner.add(body);

  const [shirt, shorts, skin, hair] = profile.uniform.map(kit);
  const waist = mesh(body, rounded, shorts, [0,.94,.015], [.172,.126,.114]);
  const chest = new THREE.Group();
  body.add(chest);
  mesh(chest, singlet, shirt, [0,0,0], [.223,1,.134]);
  const stripe = kit(index % 2 ? '#ece5df' : '#842313');
  for (const side of [-1, 1]) {
    mesh(chest, rounded, stripe, [side * .145,-.065,.064], [.026,.206,.032]).rotation.z = side * -.15;
  }

  // Numbers are cut into the jersey as small raised strokes so they stay sharp in ASCII.
  mesh(chest, flat, bibPaper, [0,.044,.122], [.13,.102,.012]);
  const bars = ['bc', 'abged', 'abgcd', 'fgbc'][index];
  const segments = { a:[0,.032,1], g:[0,0,1], d:[0,-.032,1], b:[.019,.016,0], c:[.019,-.016,0], e:[-.019,-.016,0], f:[-.019,.016,0] };
  for (const bar of bars) {
    const [x,y,horizontal] = segments[bar];
    mesh(chest, flat, bibInk, [x,y + .044,.13], [horizontal ? .038 : .007, horizontal ? .008 : .031,.004]);
  }
  const neck = mesh(body, rounded, skin, [0,1.53,.19], [.068,.103,.072]);
  const head = new THREE.Group();
  body.add(head);
  mesh(head, rounded, skin, [0,0,0], [.097,.127,.102]);
  mesh(head, rounded, hair, [0,.054,-.021], [.099,.086,.096]);
  mesh(head, rounded, skin, [0,-.012,.086], [.035,.043,.029]);
  if (index === 1 || index === 3) {
    mesh(head, rounded, hair, [0,.036,-.103], [.057,.060,.086]);
  }
  for (const side of [-1,1]) {
    mesh(head, rounded, skin, [side * .087,-.012,-.003], [.020,.036,.029]);
  }

  const legs = [-1,1].map(side => {
    const shoe = new THREE.Group();
    body.add(shoe);
    mesh(shoe, rounded, shoeUpper, [0,.049,.049], [.068,.050,.147]);
    mesh(shoe, soleShape, outsoleMaterial, [0,.014,.051], [.069,.018,.149]);
    mesh(shoe, rounded, stripe, [0,.075,.045], [.048,.014,.044]);
    return {
      side, shoe,
      thigh:mesh(body, leg, skin, [0,0,0],[1,1,1]),
      cuff:mesh(body, shortsLeg, shorts, [0,0,0],[1,1,1]),
      shin:mesh(body, leg, skin, [0,0,0],[1,1,1]),
      knee:mesh(body, rounded, skin, [0,0,0],[.066,.079,.067]),
      sock:mesh(body, arm, sock, [0,0,0],[1,1,1]),
      upper:mesh(body, arm, skin, [0,0,0],[1,1,1]),
      forearm:mesh(body, arm, skin, [0,0,0],[1,1,1]),
      shoulder:mesh(body, rounded, shirt, [0,0,0],[.076,.082,.076]),
      elbow:mesh(body, rounded, skin, [0,0,0],[.044,.051,.043]),
      hand:mesh(body, rounded, skin, [0,0,0],[.039,.054,.040]),
    };
  });

  body.traverse(part => part.layers.set(1));
  const footprint = mesh(runner, ground, shadowMaterial, [0,.013,0], [.64,1,1.0]);
  footprint.renderOrder = 5;
  return { runner, waist, chest, neck, head, legs, footprint, profile };
}

const pose = Object.fromEntries(joints.map(name => [name, new THREE.Vector3()]));
const pelvis = new THREE.Vector3();
const shoulders = new THREE.Vector3();
const lateral = new THREE.Vector3();
const vertical = new THREE.Vector3();
const forward = new THREE.Vector3();
const basis = new THREE.Matrix4();
const cuff = new THREE.Vector3();
const sockTop = new THREE.Vector3();
const toeOffset = new THREE.Vector3();

function sampleStride(profile, traveled, corner) {
  const { stride, frames } = strides[profile.clip];
  const cycles = traveled / (stride * profile.scale) + profile.phase;
  const sample = (cycles - Math.floor(cycles)) * frames.length;
  const i = Math.floor(sample);
  const a = frames[i];
  const b = frames[(i + 1) % frames.length];
  const t = sample - i;
  joints.forEach((name, index) => {
    const offset = index * 3;
    const y = mix(a[offset + 1], b[offset + 1], t);
    pose[name].set(
      mix(a[offset], b[offset], t) - corner * y * .082,
      y,
      mix(a[offset + 2], b[offset + 2], t),
    );
  });
}

function orient(part, right, left, upDirection) {
  lateral.subVectors(left, right).normalize();
  forward.crossVectors(lateral, upDirection).normalize();
  vertical.crossVectors(forward, lateral);
  part.quaternion.setFromRotationMatrix(basis.makeBasis(lateral, vertical, forward));
}

export function poseRunner(model, traveled, corner) {
  const { waist, chest, neck, head, legs, footprint, profile } = model;
  sampleStride(profile, traveled, corner);

  pelvis.copy(pose.rhipjoint).lerp(pose.lhipjoint, .5);
  shoulders.copy(pose.rclavicle).lerp(pose.lclavicle, .5);
  waist.position.copy(pelvis).lerp(pose.root, .35);
  orient(waist, pose.rhipjoint, pose.lhipjoint, up);
  chest.position.copy(pelvis).lerp(shoulders, .54);
  const torsoUp = shoulders.sub(pelvis).normalize();
  orient(chest, pose.rclavicle, pose.lclavicle, torsoUp);

  neck.position.copy(pose.lowerneck).lerp(pose.upperneck, .42);
  head.position.copy(pose.upperneck).lerp(pose.head, .64);
  head.position.z += .029;
  const neckPitch = Math.atan2(pose.head.z - pose.upperneck.z, pose.head.y - pose.upperneck.y);
  head.rotation.set(clamp(neckPitch, -.2, .25), chest.rotation.y * .24, -corner * .035);

  footprint.position.set(pose.root.x + .12, .014, -.24);
  const lift = Math.min(pose.lfoot.y, pose.rfoot.y);
  footprint.scale.set(.58 + lift * .8, 1, .87 + lift);

  for (const limb of legs) {
    const side = limb.side === 1 ? 'l' : 'r';
    const hip = pose[side + 'hipjoint'];
    const knee = pose[side + 'femur'];
    const ankle = pose[side + 'tibia'];
    const ball = pose[side + 'foot'];
    const toe = pose[side + 'toes'];
    limb.knee.position.copy(knee);
    connect(limb.thigh, hip, knee, .091, .104);
    cuff.copy(hip).lerp(knee, .67);
    connect(limb.cuff, hip, cuff, .109, .114);
    connect(limb.shin, knee, ankle, .077, .085);
    sockTop.copy(ankle).lerp(knee, .22);
    connect(limb.sock, ankle, sockTop, .057, .063);

    // Use the captured toe axis to roll the heel and plant the sole on the rubber.
    axis.subVectors(toe, ball);
    const pitch = Math.atan2(-axis.y, axis.z);
    const yaw = clamp(Math.atan2(toe.x - ankle.x, Math.abs(toe.z - ankle.z)), -.30, .30);
    limb.shoe.rotation.set(pitch, yaw, limb.side * -.025, 'YXZ');
    toeOffset.set(0, .027, .193).applyQuaternion(limb.shoe.quaternion);
    limb.shoe.position.copy(toe).sub(toeOffset);
    toeOffset.set(0, 0, -.078).applyQuaternion(limb.shoe.quaternion);
    const bottom = limb.shoe.position.y + Math.min(toeOffset.y, -Math.sin(pitch) * .183);
    limb.shoe.position.y += Math.max(0, .009 - bottom);

    const shoulder = pose[side + 'clavicle'];
    const elbow = pose[side + 'humerus'];
    const wrist = pose[side + 'radius'];
    limb.shoulder.position.copy(shoulder);
    limb.elbow.position.copy(elbow);
    limb.hand.position.copy(wrist).lerp(pose[side + 'wrist'], .57);
    connect(limb.upper, elbow, shoulder, .059, .063);
    connect(limb.forearm, wrist, elbow, .048, .053);
  }
}
