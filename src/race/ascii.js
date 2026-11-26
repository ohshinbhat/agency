import { Color, Matrix4, Vector3 } from 'three';

const glyphs = ' .,:-+=*#%@';
const inkColors = [
  '#4b474c', '#726d70', '#99929a', '#c0babe', '#e1dedb', '#f4f2ef', '#ffffff',
  '#6c2623', '#95312d', '#b7443d', '#d45a52', '#ec8178', '#f6b1ab', '#fce9e5',
];
const limit = (n) => Math.max(0, Math.min(1, n));

export function makeAscii(canvas) {
  const art = canvas.getContext('2d');
  const sample = document.createElement('canvas');
  const read = sample.getContext('2d', { willReadFrequently: true });
  const atlas = document.createElement('canvas');
  const ink = atlas.getContext('2d');
  let cellWidth, cellHeight, columns, rows, tileW, tileH;

  function size() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(canvas.clientWidth * ratio);
    const height = Math.round(canvas.clientHeight * ratio);
    if (width < 1 || height < 1) return false;
    if (columns && canvas.width === width && canvas.height === height) return true;
    canvas.width = width;
    canvas.height = height;

    const step = canvas.clientWidth < 620 ? 3.9 : 5.2;
    columns = Math.ceil(canvas.clientWidth / step);
    rows = Math.ceil(canvas.clientHeight / (step * 1.24));
    cellWidth = width / columns;
    cellHeight = height / rows;
    sample.width = columns;
    sample.height = rows;

    tileW = Math.ceil(cellWidth);
    tileH = Math.ceil(cellHeight);
    atlas.width = tileW * glyphs.length;
    atlas.height = tileH * inkColors.length;
    ink.font = '600 ' + Math.floor(tileW * 1.45) + 'px monospace';
    ink.textBaseline = 'middle';
    ink.textAlign = 'center';
    inkColors.forEach((color, tone) => {
      ink.fillStyle = color;
      for (let i = 1; i < glyphs.length; i++) {
        ink.fillText(glyphs[i], (i + .5) * tileW, (tone + .54) * tileH);
      }
    });
    return true;
  }

  function ground(source) {
    art.imageSmoothingEnabled = true;
    art.drawImage(source, 0, 0, canvas.width, canvas.height);
  }

  function runners(source) {
    // Knock the lane paint back inside each silhouette before laying down the ink.
    art.globalCompositeOperation = 'destination-out';
    art.globalAlpha = .78;
    art.drawImage(source, 0, 0, canvas.width, canvas.height);
    art.globalCompositeOperation = 'source-over';
    art.globalAlpha = .18;
    art.drawImage(source, 0, 0, canvas.width, canvas.height);
    art.globalAlpha = 1;
    read.clearRect(0, 0, columns, rows);
    read.drawImage(source, 0, 0, columns, rows);
    const data = read.getImageData(0, 0, columns, rows).data;
    art.imageSmoothingEnabled = false;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < columns; x++) {
        const i = (y * columns + x) * 4;
        const cover = data[i + 3] / 255;
        if (cover < .09) continue;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const luma = r * .25 + g * .63 + b * .12;
        const grain = ((x * 37 + y * 53 + x * y * 7) % 19 - 9) / 120;
        const jersey = r - g > 47 && g - b < 28;
        const density = limit((.29 + luma / 326 + grain + (jersey ? .085 : 0)) * Math.sqrt(cover));
        const glyph = Math.round(density * (glyphs.length - 1));
        const shade = luma / 226 + grain - .17 * (1 - cover) + (jersey ? .19 : 0);
        const tone = (jersey ? 7 : 0) + Math.round(limit(shade) * 6);
        art.drawImage(atlas, glyph * tileW, tone * tileH, tileW, tileH,
          Math.round(x * cellWidth), Math.round(y * cellHeight), tileW, tileH);
      }
    }
  }

  return { size, ground, runners, invalidate: () => { columns = 0; } };
}

// The same geometry also works in browsers where WebGL is unavailable.
export function makeSoftwareRenderer() {
  const domElement = document.createElement('canvas');
  const context = domElement.getContext('2d');
  const transform = new Matrix4();
  const projection = new Matrix4();
  const model = new Matrix4();
  const instance = new Matrix4();
  const ink = new Color();
  const light = new Vector3(.37, .83, .42).normalize();
  const normal = new Vector3();
  const cache = new WeakMap();

  function geometryData(geometry) {
    if (cache.has(geometry)) return cache.get(geometry);
    const vertices = geometry.attributes.position;
    const source = geometry.index?.array || Array.from({ length: vertices.count }, (_, i) => i);
    const faces = [];
    for (let i = 0; i < source.length; i += 3) {
      const a = source[i], b = source[i + 1], c = source[i + 2];
      const u = new Vector3().fromBufferAttribute(vertices, b).sub(new Vector3().fromBufferAttribute(vertices, a));
      const v = new Vector3().fromBufferAttribute(vertices, c).sub(new Vector3().fromBufferAttribute(vertices, a));
      faces.push({ a, b, c, normal: u.cross(v).normalize() });
    }
    const data = { vertices, faces, projected: new Float32Array(vertices.count * 3) };
    cache.set(geometry, data);
    return data;
  }

  function render(scene, camera) {
    const width = domElement.width;
    const height = domElement.height;
    context.clearRect(0, 0, width, height);
    if (scene.background) {
      context.fillStyle = scene.background.getStyle();
      context.fillRect(0, 0, width, height);
    }
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();
    projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const visible = [];

    function addMesh(mesh, matrix) {
      const { vertices, faces, projected } = geometryData(mesh.geometry);
      const p = transform.multiplyMatrices(projection, matrix).elements;
      for (let i = 0; i < vertices.count; i++) {
        const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
        const w = p[3] * x + p[7] * y + p[11] * z + p[15];
        projected[i * 3] = ((p[0] * x + p[4] * y + p[8] * z + p[12]) / w + 1) * width * .5;
        projected[i * 3 + 1] = (1 - (p[1] * x + p[5] * y + p[9] * z + p[13]) / w) * height * .5;
        projected[i * 3 + 2] = w;
      }

      const basic = mesh.material.isMeshBasicMaterial;
      const base = mesh.material.userData.untexturedColor || mesh.material.color;
      const flatColor = basic ? base.getStyle() : null;
      for (const face of faces) {
        const a = face.a * 3, b = face.b * 3, c = face.c * 3;
        const ax = projected[a], ay = projected[a + 1], az = projected[a + 2];
        const bx = projected[b], by = projected[b + 1], bz = projected[b + 2];
        const cx = projected[c], cy = projected[c + 1], cz = projected[c + 2];
        if (Math.min(az, bz, cz) <= camera.near) continue;
        if ((bx - ax) * (cy - ay) >= (by - ay) * (cx - ax)) continue;
        if (Math.max(ax, bx, cx) < 0 || Math.min(ax, bx, cx) > width ||
            Math.max(ay, by, cy) < 0 || Math.min(ay, by, cy) > height) continue;
        const shade = basic ? 1 : .76 + Math.max(0, normal.copy(face.normal).transformDirection(matrix).dot(light)) * .85;
        const color = flatColor || ink.copy(base).multiplyScalar(shade).getStyle();
        // Draw ribbons before runners so neighboring lane triangles cannot step over their feet.
        const depth = (az + bz + cz) / 3 + (basic ? 130 - mesh.renderOrder * 20 : 0);
        visible.push({ ax, ay, bx, by, cx, cy, depth, color, opacity: mesh.material.map && mesh.material.transparent ? .2 : 1 });
      }
    }

    scene.traverseVisible(mesh => {
      if (!mesh.isMesh || !mesh.layers.test(camera.layers)) return;
      if (!mesh.isInstancedMesh) {
        addMesh(mesh, mesh.matrixWorld);
        return;
      }
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, instance);
        addMesh(mesh, model.multiplyMatrices(mesh.matrixWorld, instance));
      }
    });
    visible.sort((a, b) => b.depth - a.depth);
    for (const face of visible) {
      context.globalAlpha = face.opacity;
      context.fillStyle = context.strokeStyle = face.color;
      context.beginPath();
      context.moveTo(face.ax, face.ay);
      context.lineTo(face.bx, face.by);
      context.lineTo(face.cx, face.cy);
      context.closePath();
      context.fill();
      context.lineWidth = .33;
      context.stroke();
    }
    context.globalAlpha = 1;
  }

  return { domElement, render, setSize(width, height) { domElement.width = width; domElement.height = height; } };
}
