const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let width = window.innerWidth;
let height = window.innerHeight;
canvas.width = width;
canvas.height = height;

const keys = {};
const mouse = { x: 0, y: 0, down: false };

let hp = 100;
let ammo = 30;
let kills = 0;
let gameOver = false;

const player = { x: width / 2, y: height / 2, r: 16, speed: 200 };
let enemies = [];
let bullets = [];
let walls = [];
let lastShot = 0;

// Spawn enemies
function spawnEnemies() {
  for (let i = 0; i < 5; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 150 + Math.random() * 200;
    enemies.push({
      x: player.x + Math.cos(angle) * dist,
      y: player.y + Math.sin(angle) * dist,
      r: 12,
      hp: 30,
      lastAttack: 0
    });
  }
}

spawnEnemies();

// Input
window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === 'q') buildWall();
});

window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

canvas.addEventListener('mousedown', () => (mouse.down = true));
window.addEventListener('mouseup', () => (mouse.down = false));

function shoot() {
  if (ammo <= 0 || Date.now() - lastShot < 100) return;
  lastShot = Date.now();
  ammo--;

  const dx = mouse.x - player.x;
  const dy = mouse.y - player.y;
  const dist = Math.hypot(dx, dy);

  bullets.push({
    x: player.x + (dx / dist) * 20,
    y: player.y + (dy / dist) * 20,
    vx: (dx / dist) * 500,
    vy: (dy / dist) * 500,
    life: 4
  });

  updateUI();
}

function buildWall() {
  const dx = mouse.x - player.x;
  const dy = mouse.y - player.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return;

  walls.push({
    x: player.x + (dx / dist) * 80,
    y: player.y + (dy / dist) * 80,
    w: 60,
    h: 15
  });
}

function updateUI() {
  document.getElementById('hp').textContent = Math.max(0, Math.round(hp));
  document.getElementById('ammo').textContent = ammo;
  document.getElementById('kills').textContent = kills;
}

function gameOverScreen() {
  gameOver = true;
  document.getElementById('stats').textContent = `Kills: ${kills}`;
  document.getElementById('over').style.display = 'flex';
}

function update(dt) {
  if (gameOver) return;

  // Player movement
  let dx = 0;
  let dy = 0;
  if (keys['w']) dy -= 1;
  if (keys['s']) dy += 1;
  if (keys['a']) dx -= 1;
  if (keys['d']) dx += 1;

  const len = Math.hypot(dx, dy);
  if (len > 0) {
    player.x += (dx / len) * player.speed * dt;
    player.y += (dy / len) * player.speed * dt;
  }

  // Keep player in bounds
  player.x = Math.max(player.r, Math.min(width - player.r, player.x));
  player.y = Math.max(player.r, Math.min(height - player.r, player.y));

  // Shooting
  if (mouse.down) shoot();

  // Update bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;

    if (b.life <= 0) {
      bullets.splice(i, 1);
      continue;
    }

    // Check collision with enemies
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (Math.hypot(b.x - e.x, b.y - e.y) < e.r + 5) {
        e.hp -= 15;
        bullets.splice(i, 1);

        if (e.hp <= 0) {
          enemies.splice(j, 1);
          kills++;
          updateUI();
        }
        break;
      }
    }
  }

  // Update enemies
  for (const e of enemies) {
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 30) {
      e.x += (dx / dist) * 60 * dt;
      e.y += (dy / dist) * 60 * dt;
    }

    if (dist < 35 && Date.now() - e.lastAttack > 800) {
      hp -= 7;
      e.lastAttack = Date.now();
      updateUI();
    }
  }

  if (hp <= 0) gameOverScreen();
}

function draw() {
  ctx.fillStyle = '#1a3d2a';
  ctx.fillRect(0, 0, width, height);

  // Draw grid
  ctx.strokeStyle = '#2d5a40';
  ctx.lineWidth = 1;
  for (let i = 0; i < width; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, height);
    ctx.stroke();
  }
  for (let i = 0; i < height; i += 50) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(width, i);
    ctx.stroke();
  }

  // Draw walls
  ctx.fillStyle = '#8b6914';
  for (const w of walls) {
    ctx.fillRect(w.x - w.w / 2, w.y - w.h / 2, w.w, w.h);
  }

  // Draw enemies
  ctx.fillStyle = '#c41e3a';
  for (const e of enemies) {
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw bullets
  ctx.fillStyle = '#ffff00';
  for (const b of bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw player
  ctx.fillStyle = '#1e90ff';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fill();

  // Draw crosshair
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(mouse.x - 10, mouse.y);
  ctx.lineTo(mouse.x + 10, mouse.y);
  ctx.moveTo(mouse.x, mouse.y - 10);
  ctx.lineTo(mouse.x, mouse.y + 10);
  ctx.stroke();
}

let lastTime = Date.now();
function gameLoop() {
  const now = Date.now();
  const dt = Math.min((now - lastTime) / 1000, 0.016);
  lastTime = now;

  update(dt);
  draw();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('resize', () => {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
});

updateUI();
gameLoop();
