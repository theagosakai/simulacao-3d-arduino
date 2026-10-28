import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

document.querySelector('#app').innerHTML = `
  <header class="topbar">
    <div class="brand"><span class="brand-mark">A</span><span>Arduino <b>3D Lab</b></span></div>
    <div class="file-name"><span class="status-dot"></span> arduino_uno_simulator</div>
    <div class="top-actions">
      <button title="Salvar">↧</button><button title="Configurações">⚙</button>
      <button class="run-button" id="runButton"><span>▶</span> Executar</button>
    </div>
  </header>

  <aside class="rail">
    <button class="rail-button active" data-tool="select" title="Selecionar">↖</button>
    <button class="rail-button" data-tool="wire" title="Adicionar fio">⌁</button>
    <button class="rail-button" data-tool="component" title="Componentes">▣</button>
    <button class="rail-button" data-tool="measure" title="Medir">⌗</button>
    <div class="rail-spacer"></div>
    <button class="rail-button" id="resetView" title="Centralizar">⌂</button>
  </aside>

  <aside class="layers">
    <h2>Objetos</h2>
    <label><input type="checkbox" checked data-layer="components"> <span>Componentes</span></label>
    <label><input type="checkbox" checked data-layer="tracks"> <span>Pistas F.Cu</span></label>
    <label><input type="checkbox" checked data-layer="pins"> <span>Conectores</span></label>
    <label><input type="checkbox" checked data-layer="pcb"> <span>PCB</span></label>
    <div class="component-list">
      <h3>Biblioteca</h3>
      <button data-add="led">● LED vermelho</button>
      <button data-add="button">▣ Push button</button>
      <button data-add="resistor">▭ Resistor</button>
    </div>
  </aside>

  <main id="viewport">
    <canvas id="scene"></canvas>
    <div class="view-toolbar">
      <button id="zoomIn" title="Aumentar zoom">＋</button>
      <button id="zoomOut" title="Reduzir zoom">−</button>
      <button id="homeView" title="Vista padrão">⌂</button>
    </div>
    <div class="axis-gizmo"><span class="axis-x">X</span><span class="axis-y">Y</span><span class="axis-z">Z</span></div>
  </main>

  <aside class="inspector">
    <div class="tabs"><button class="active">Propriedades</button><button>Biblioteca</button></div>
    <div class="inspector-body">
      <div class="selected-card">
        <div class="chip-icon">µ</div>
        <div><strong id="selectedName">ATmega328P</strong><small id="selectedRef">U1 · Microcontrolador</small></div>
      </div>
      <label>Posição</label>
      <div class="field-grid"><div><span>X</span><input id="posX" value="12,70" /></div><div><span>Y</span><input id="posY" value="28,40" /></div></div>
      <label>Rotação</label>
      <div class="range-row"><input id="rotation" type="range" min="-180" max="180" value="0"><output id="rotationOut">0°</output></div>
      <label>Camada</label>
      <select id="layerSelect"><option>F.Cu</option><option>B.Cu</option><option>Silkscreen</option></select>
      <label>Dados do componente</label>
      <div class="spec"><span>Fabricante</span><b>Microchip</b></div>
      <div class="spec"><span>Pacote</span><b>DIP-28</b></div>
      <div class="spec"><span>Tensão</span><b>1.8–5.5 V</b></div>
    </div>
  </aside>

  <footer class="statusbar">
    <span>● Pronto</span><span>X <b id="mouseX">0.00</b></span><span>Y <b id="mouseY">0.00</b></span>
    <span class="status-right">Vista 3D · mm</span>
  </footer>
`;

const canvas = document.querySelector('#scene');
const viewport = document.querySelector('#viewport');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101417);
scene.fog = new THREE.Fog(0x101417, 42, 82);

const camera = new THREE.PerspectiveCamera(38, viewport.clientWidth / viewport.clientHeight, 0.1, 500);
camera.position.set(38, 32, 38);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, 0, 0);
controls.minDistance = 18;
controls.maxDistance = 90;
controls.maxPolarAngle = Math.PI / 2.05;

scene.add(new THREE.HemisphereLight(0xe7f7ff, 0x111716, 1.35));
const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
keyLight.position.set(-18, 30, 12);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
scene.add(keyLight);
const rimLight = new THREE.PointLight(0x67cce7, 20, 60);
rimLight.position.set(22, 18, -10);
scene.add(rimLight);

const boardGroup = new THREE.Group();
scene.add(boardGroup);
const componentsGroup = new THREE.Group();
const tracksGroup = new THREE.Group();
const pinsGroup = new THREE.Group();
componentsGroup.name = 'components';
tracksGroup.name = 'tracks';
pinsGroup.name = 'pins';
boardGroup.add(componentsGroup, tracksGroup, pinsGroup);

function roundedBox(width, height, depth, radius = 0.5) {
  const shape = new THREE.Shape();
  const x = -width / 2, y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 3 });
}

const materials = {
  pcb: new THREE.MeshStandardMaterial({ color: 0x087d73, roughness: 0.42, metalness: 0.08 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x171b1c, roughness: 0.42 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xc8d2d5, roughness: 0.2, metalness: 0.82 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd0a23c, roughness: 0.24, metalness: 0.78 }),
  silver: new THREE.MeshStandardMaterial({ color: 0xa9b5b7, roughness: 0.18, metalness: 0.9 }),
  white: new THREE.MeshStandardMaterial({ color: 0xe8eeee, roughness: 0.4 }),
  red: new THREE.MeshStandardMaterial({ color: 0xe84d52, roughness: 0.38 }),
  copper: new THREE.MeshStandardMaterial({ color: 0xb77b43, roughness: 0.28, metalness: 0.55 }),
};

const boardGeom = roundedBox(34, 24, 0.18, 1);
boardGeom.rotateX(-Math.PI / 2);
const board = new THREE.Mesh(boardGeom, materials.pcb);
board.position.y = 0;
board.receiveShadow = true;
board.castShadow = true;
board.name = 'PCB';
boardGroup.add(board);

for (const [x, z] of [[-14.8,-10],[-14.8,10],[14.8,-10],[14.8,10]]) {
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.24, 24), new THREE.MeshStandardMaterial({ color: 0x111816 }));
  hole.position.set(x, 0.02, z);
  hole.castShadow = true;
  boardGroup.add(hole);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 1.05, 24), materials.gold);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.135, z);
  boardGroup.add(ring);
}

function box(w, h, d, material, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addChip() {
  const chip = new THREE.Group();
  chip.add(box(7.8, 1.45, 7.8, materials.dark, 0, 0.72, 0));
  for (let i = -3; i <= 3; i++) {
    chip.add(box(0.22, 0.75, 0.45, materials.silver, i * 1.0, 0.6, -4.25));
    chip.add(box(0.22, 0.75, 0.45, materials.silver, i * 1.0, 0.6, 4.25));
  }
  chip.add(box(4, 0.04, 0.25, materials.white, 0, 1.46, 3.1));
  chip.name = 'ATmega328P';
  chip.userData = { ref: 'U1 · Microcontrolador', layer: 'components' };
  componentsGroup.add(chip);
  chip.position.set(0, 0, 3);
}
addChip();

function addUsb() {
  const usb = new THREE.Group();
  usb.add(box(7.5, 2.5, 5.5, materials.silver, 0, 1.25, 0));
  usb.add(box(4.8, 1.4, 3, materials.dark, 0, 2.15, 0));
  usb.add(box(3.3, 0.08, 2.1, new THREE.MeshStandardMaterial({ color: 0x89979a }), 0, 2.24, 0));
  usb.position.set(-14.5, 0, 4);
  usb.rotation.y = 0;
  usb.name = 'USB Connector';
  usb.userData = { ref: 'J1 · USB-B', layer: 'components' };
  componentsGroup.add(usb);
}
addUsb();

function addPowerJack() {
  const jack = new THREE.Group();
  jack.add(box(4.8, 4.5, 6.2, materials.dark, 0, 2.25, 0));
  jack.add(new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.18, 24), materials.metal));
  const hole = jack.children[1];
  hole.rotation.x = Math.PI / 2;
  hole.position.set(0, 4.5, 0);
  jack.position.set(-14.2, 0, -7);
  jack.name = 'Power Jack';
  jack.userData = { ref: 'J2 · Alimentação', layer: 'components' };
  componentsGroup.add(jack);
}
addPowerJack();

function addHeaders() {
  const makeHeader = (x, startZ, count, vertical = false) => {
    for (let i = 0; i < count; i++) {
      const z = vertical ? startZ + i * 1.55 : startZ;
      const px = vertical ? x : x + i * 1.55;
      const pz = vertical ? z : startZ;
      const pin = box(vertical ? 1.55 : 0.35, 2.4, vertical ? 0.35 : 1.55, materials.gold, px, 1.2, pz);
      pinsGroup.add(pin);
      const socket = box(1.2, 0.7, 1.2, materials.dark, px, 0.35, pz);
      pinsGroup.add(socket);
    }
  };
  makeHeader(11.5, -9.5, 8, true);
  makeHeader(8, 9.5, 9, false);
  makeHeader(-8.5, 9.5, 8, false);
}
addHeaders();

function addCrystal() {
  const crystal = new THREE.Group();
  crystal.add(box(5, 1.2, 2.2, materials.silver, 0, 0.7, 0));
  crystal.add(box(0.2, 0.12, 1.5, materials.metal, -2.55, 0.65, 0));
  crystal.add(box(0.2, 0.12, 1.5, materials.metal, 2.55, 0.65, 0));
  crystal.position.set(-7.5, 0, -0.5);
  crystal.name = 'Cristal 16 MHz';
  crystal.userData = { ref: 'Y1 · Oscilador', layer: 'components' };
  componentsGroup.add(crystal);
}
addCrystal();

function addLed(x, z, color = 0xf04a4a) {
  const led = new THREE.Group();
  led.add(new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.55, 24), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.5 })));
  led.children[0].position.y = 0.38;
  led.add(box(0.18, 1.15, 0.18, materials.silver, -0.28, 0.55, 0));
  led.add(box(0.18, 1.15, 0.18, materials.silver, 0.28, 0.55, 0));
  led.position.set(x, 0, z);
  led.name = 'LED';
  led.userData = { ref: 'D1 · LED vermelho', layer: 'components' };
  componentsGroup.add(led);
  return led;
}
const onboardLed = addLed(3.5, -8.5);

function addButton() {
  const button = new THREE.Group();
  button.add(box(3.2, 0.5, 3.2, materials.dark, 0, 0.25, 0));
  button.add(box(1.9, 0.55, 1.9, materials.dark, 0, 0.8, 0));
  button.position.set(7, -4, 0);
  button.name = 'Reset Button';
  button.userData = { ref: 'S1 · Reset', layer: 'components' };
  componentsGroup.add(button);
}
addButton();

const resistorGroup = new THREE.Group();
for (let i = 0; i < 10; i++) {
  const body = box(1.25, 0.55, 0.55, materials.white, 0, 0.28, 0);
  body.position.z = i * 0.05;
  resistorGroup.add(body);
}
resistorGroup.position.set(-3, 0, -8);
componentsGroup.add(resistorGroup);

function track(points, width = 0.12) {
  const curvePoints = points.map(p => new THREE.Vector3(p[0], 0.17, p[1]));
  const curve = new THREE.CatmullRomCurve3(curvePoints);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(16, points.length * 4), width, 8, false), materials.copper);
  tracksGroup.add(mesh);
}
track([[-9, -8], [-7, -8], [-7, -5], [-2, -5], [-2, -1]]);
track([[-2, 2], [-4, 4], [-8, 4], [-10, 7]]);
track([[2, 4], [5, 6], [8, 6], [9, 8]]);
track([[4, 0], [7, -2], [10, -2]]);
track([[1, -5], [1, -7], [3.5, -8.5]]);

const labels = [
  ['ARDUINO UNO', 0, 11.5, 0.75],
  ['DIGITAL (PWM~)', 13, 8.5, 0.7],
  ['ANALOG IN', -4, -11.2, 0.6],
];
function makeTextSprite(text, x, z, size = 0.7) {
  const canvasText = document.createElement('canvas');
  canvasText.width = 512; canvasText.height = 128;
  const ctx = canvasText.getContext('2d');
  ctx.fillStyle = '#e8e0bd';
  ctx.font = `bold 48px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);
  const texture = new THREE.CanvasTexture(canvasText);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.position.set(x, 0.24, z);
  sprite.scale.set(size * 7, size * 1.75, 1);
  boardGroup.add(sprite);
}
labels.forEach(l => makeTextSprite(l[0], l[1], l[2], l[3]));

const grid = new THREE.GridHelper(80, 80, 0x32424a, 0x263138);
grid.position.y = -0.12;
grid.material.opacity = 0.46;
grid.material.transparent = true;
scene.add(grid);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const selectable = [...componentsGroup.children, ...pinsGroup.children];

function resize() {
  const w = viewport.clientWidth;
  const h = viewport.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}
window.addEventListener('resize', resize);
resize();

function resetView() {
  camera.position.set(38, 32, 38);
  controls.target.set(0, 0, 0);
  controls.update();
}

function zoom(factor) {
  const offset = camera.position.clone().sub(controls.target);
  camera.position.copy(controls.target.clone().add(offset.multiplyScalar(factor)));
  controls.update();
}

document.querySelector('#resetView').addEventListener('click', resetView);
document.querySelector('#homeView').addEventListener('click', resetView);
document.querySelector('#zoomIn').addEventListener('click', () => zoom(0.82));
document.querySelector('#zoomOut').addEventListener('click', () => zoom(1.22));

canvas.addEventListener('pointermove', event => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  document.querySelector('#mouseX').textContent = (pointer.x * 24).toFixed(2);
  document.querySelector('#mouseY').textContent = (pointer.y * 24).toFixed(2);
});

canvas.addEventListener('click', event => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(selectable, true).find(item => item.object.isMesh);
  if (!hit) return;
  let object = hit.object;
  while (object.parent && !object.userData.ref && object.parent !== componentsGroup) object = object.parent;
  if (!object.userData.ref) return;
  document.querySelector('#selectedName').textContent = object.name || object.userData.ref.split('·')[0].trim();
  document.querySelector('#selectedRef').textContent = object.userData.ref;
});

document.querySelectorAll('.rail-button[data-tool]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.rail-button[data-tool]').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
  });
});

document.querySelectorAll('[data-layer]').forEach(input => {
  input.addEventListener('change', () => {
    const group = boardGroup.getObjectByName(input.dataset.layer);
    if (group) group.visible = input.checked;
    if (input.dataset.layer === 'pcb') board.visible = input.checked;
  });
});

const rotation = document.querySelector('#rotation');
rotation.addEventListener('input', () => {
  document.querySelector('#rotationOut').textContent = `${rotation.value}°`;
});

let running = false;
document.querySelector('#runButton').addEventListener('click', event => {
  running = !running;
  event.currentTarget.classList.toggle('active', running);
  event.currentTarget.innerHTML = running ? '<span>■</span> Parar' : '<span>▶</span> Executar';
});

function animate() {
  requestAnimationFrame(animate);
  const pulse = 0.8 + Math.sin(performance.now() * 0.004) * 0.2;
  if (running) onboardLed.children[0].material.emissiveIntensity = 2 + pulse * 3;
  else onboardLed.children[0].material.emissiveIntensity = 1.5;
  controls.update();
  renderer.render(scene, camera);
}
animate();
