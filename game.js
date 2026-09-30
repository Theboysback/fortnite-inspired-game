const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ec9ff);
scene.fog = new THREE.Fog(0x7ec9ff, 40, 180);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.HemisphereLight(0xffffff, 0x567d46, 1.2);
scene.add(ambientLight);

const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(25, 40, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(220, 220),
  new THREE.MeshStandardMaterial({ color: 0x4e8b3d })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const player = {
  position: new THREE.Vector3(0, 1.2, 0),
  velocity: new THREE.Vector3(0, 0, 0),
  radius: 0.8,
  speed: 11,
  jump: 11,
  health: 100
};

const playerMesh = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.65, 1.6, 8, 16),
  new THREE.MeshStandardMaterial({ color: 0x2288ff })
);
playerMesh.position.copy(player.position);
playerMesh.castShadow = true;
playerMesh.receiveShadow = true;
scene.add(playerMesh);

const keys = {};
const mouse = { down: false, locked: false };
let ammo = 30;
let kills = 0;
let lastShot = 0;
let gameOver = false;
let yaw = 0;
let pitch = 0;

const enemies = [];
const bullets = [];
const walls = [];

function updateUI() {
  document.getElementById('hp').textContent = Math.max(0, Math.round(player.health));
  document.getElementById('ammo').textContent = ammo;
  document.getElementById('kills').textContent = kills;
}

function spawnEnemies() {
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 25 + Math.random() * 60;
    const mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.55, 1.6, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xe53935 })
    );
    mesh.position.set(Math.cos(angle) * distance, 1.2, Math.sin(angle) * distance);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    enemies.push({
      mesh,
      position: mesh.position.clone(),
      hp: 30,
      speed: 3.4,
      lastAttack: 0
    });
  }
}

function shoot() {
  if (ammo <= 0 || performance.now() - lastShot < 140) return;
  lastShot = performance.now();
  ammo--;

  const direction = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xffef00 })
  );
  bullet.position.copy(camera.position).addScaledVector(direction, 1.5);
  scene.add(bullet);

  bullets.push({
    mesh: bullet,
    direction: direction.clone(),
    speed: 55,
    life: 2.2,
    position: bullet.position.clone()
  });

  updateUI();
}

function buildWall() {
  const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
  const pos = camera.position.clone().addScaledVector(dir, 4.5);
  pos.y = 1.5;

  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 3.2, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xa86d29 })
  );
  wall.position.copy(pos);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);

  walls.push({ mesh: wall, hp: 80, position: pos.clone() });
}

function gameOverScreen() {
  gameOver = true;
  document.getElementById('stats').textContent = `Kills: ${kills}`;
  document.getElementById('over').style.display = 'grid';
}

function update(dt) {
  if (gameOver) return;

  // movement
  const move = new THREE.Vector3();
  if (keys['w']) move.z -= 1;
  if (keys['s']) move.z += 1;
  if (keys['a']) move.x -= 1;
  if (keys['d']) move.x += 1;

  if (move.lengthSq() > 0) {
    move.normalize();
    const yawMatrix = new THREE.Matrix4().makeRotationY(yaw);
    move.applyMatrix4(yawMatrix);
    const nextX = player.position.x + move.x * player.speed * dt;
    const nextZ = player.position.z + move.z * player.speed * dt;
    if (Math.abs(nextX) < 96) player.position.x = nextX;
    if (Math.abs(nextZ) < 96) player.position.z = nextZ;
  }

  player.velocity.y += -24 * dt;
  player.position.y += player.velocity.y * dt;
  if (player.position.y <= 1.2) {
    player.position.y = 1.2;
    player.velocity.y = 0;
  }

  if (keys[' '] && player.position.y <= 1.3) {
    player.velocity.y = player.jump;
  }

  camera.position.set(player.position.x, player.position.y + 1.5, player.position.z);
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  if (mouse.down) shoot();

  // bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.position.addScaledVector(b.direction, b.speed * dt);
    b.mesh.position.copy(b.position);
    b.life -= dt;

    if (b.life <= 0) {
      scene.remove(b.mesh);
      bullets.splice(i, 1);
      continue;
    }

    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (b.position.distanceTo(e.position) < 1.4) {
        e.hp -= 15;
        scene.remove(b.mesh);
        bullets.splice(i, 1);

        if (e.hp <= 0) {
          scene.remove(e.mesh);
          enemies.splice(j, 1);
          kills++;
          updateUI();
        }
        break;
      }
    }
  }

  // enemies
  for (const e of enemies) {
    const toPlayer = player.position.clone().sub(e.position);
    const dist = toPlayer.length();
    if (dist > 0.1) {
      toPlayer.normalize();
      e.position.addScaledVector(toPlayer, e.speed * dt);
      e.mesh.position.copy(e.position);
    }

    if (dist < 1.8 && performance.now() - e.lastAttack > 800) {
      player.health -= 10;
      e.lastAttack = performance.now();
      updateUI();
    }
  }

  if (player.health <= 0) {
    gameOverScreen();
  }
}

function render() {
  renderer.render(scene, camera);
}

window.addEventListener('keydown', (event) => {
  keys[event.key.toLowerCase()] = true;
  if (event.key.toLowerCase() === 'q') buildWall();
  if (event.key === 'Escape') {
    document.exitPointerLock();
    mouse.locked = false;
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.key.toLowerCase()] = false;
});

renderer.domElement.addEventListener('click', () => {
  renderer.domElement.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  mouse.locked = document.pointerLockElement === renderer.domElement;
});

document.addEventListener('mousemove', (event) => {
  if (!mouse.locked) return;
  yaw -= event.movementX * 0.002;
  pitch -= event.movementY * 0.002;
  pitch = Math.max(-1.4, Math.min(1.4, pitch));
});

renderer.domElement.addEventListener('mousedown', () => {
  mouse.down = true;
});

window.addEventListener('mouseup', () => {
  mouse.down = false;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

spawnEnemies();
updateUI();

let lastTime = performance.now();
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;
  update(dt);
  render();
}
animate();
