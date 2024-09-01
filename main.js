import { c, canvas } from "./utils/canvas.js";
import Player from "./classes/Player.js";
import Projectile from "./classes/Projectile.js";
import Enemy from "./classes/Enemy.js";
import Particle from "./classes/Particle.js";
import Turret from "./classes/Turret.js";
import {
  handlePlayerRotation,
  handlePlayerVelocity,
  handleShipExFireAnimation,
  handleTrail,
  resolveCollision,
} from "./utils/input.js";
import Sprite from "./utils/sprite.js";
import { assets } from "./utils/assets.js";
import Vector2 from "./classes/Vector2.js";
import Camera from "./classes/Camera.js";
import MiniMap from "./classes/MiniMap.js";
import TileMap from "./classes/TileMap.js";
import GameState from "./classes/GameState.js";
import HealthBar from "./classes/HealthBar.js";
import Collectable from "./classes/Collectable.js";

const scoreEl = document.querySelector("#score");
const startGameBtn = document.querySelector("#startGame");
const modal = document.querySelector(".modal-container");
const endScore = document.querySelector("#endScore");

export const friction = 0.98;

// Instantiation
const x = canvas.width / 2;
const y = canvas.height / 2;
let gameState;
export let player;
export let turret;
export let shipExFire;
let turretAngle = 0;
let mouseX = 0;
let mouseY = 0;

export let tileMap;
export let map;
export let camera;
let miniMap;

let live;
let coinUI;
let gemUI;
let coins = [];
let gems = [];

let projectiles = [];
export let enemies = [];
let particles = [];
export let trails = [];

function init() {
  gameState = new GameState();
  delta = 0;
  oldTimeStamp = 0;
  if (assets.images.spaceBg1.isLoaded) {
    map = new TileMap(assets.getSpaceBgImages(), 2048, 2048, 5, 3);
    camera = new Camera(canvas.width, canvas.height, map);
    player = new Player(x, y, 10, "blue", { x: 0, y: 0 }, map);
  }
  turret = new Turret(player.x, player.y, turretAngle, {
    asset: assets.images.turret,
    frameSize: new Vector2(64, 64),
    hFrames: 8,
    vFrames: 1,
    frame: 0,
  });
  shipExFire = new Sprite({
    asset: assets.images.shipExhaustFire,
    frameSize: new Vector2(48, 48),
    hFrames: 4,
    vFrames: 2,
    frame: 0,
  });
  miniMap = new MiniMap(canvas.width, canvas.height);
  live = new HealthBar(5, 25, {
    asset: assets.images.live,
    frameSize: new Vector2(176, 44),
    hFrames: 16,
    vFrames: 1,
    frame: 0,
  });
  coinUI = projectiles = [];
  enemies = [];
  particles = [];
  trails = [];
  coins = [];
  gems = [];
  scoreEl.innerHTML = gameState.score;
  endScore.innerHTML = gameState.score;
}

let enemyTimeOutId;
function spawnEnemies() {
  const randomTime = Math.floor(Math.random() * (60000 - 10000 + 1)) + 10000;
  const radius = 23;

  let x = 500;
  let y = 500;
  // let x = Math.random() * map.tileWidth * map.tilesCountX;
  // let y = Math.random() * map.tileHeight * map.tilesCountY;
  const color = "#ab47bc";

  enemies.push(
    new Enemy(
      x,
      y,
      radius,
      color,
      { x: 0, y: 0 },
      {
        asset: assets.images.purpleBlob,
        frameSize: new Vector2(64, 64),
        hFrames: 8,
        vFrames: 1,
        frame: 0,
      }
    )
  );

  if (enemies.length > 50) {
    const enemyIdx = enemies.findIndex((enemy) => !enemy.visible);
    enemies.splice(enemyIdx, 1);
  }

  // enemyTimeOutId = setTimeout(spawnEnemies, randomTime);
}

// main game loop
let animationId;
let delta = 0;
let oldTimeStamp = 0;

function gameLoop(timeStamp) {
  animationId = requestAnimationFrame(gameLoop);
  // Calculate delta aka how many seconds has passed (milliseconds)
  delta = (timeStamp - oldTimeStamp) / 10;
  // delta = 1;
  oldTimeStamp = timeStamp;
  delta = Math.min(delta, 10);

  handlePlayerVelocity();
  handlePlayerRotation();
  handleShipExFireAnimation(delta);
  player.update(delta);
  handleTrail(delta);
  camera.update(player);

  c.clearRect(0, 0, canvas.width, canvas.height);
  map.draw(c, camera);

  c.save();
  c.translate(-camera.x, -camera.y);

  // update turret
  const adjustedMouseX = mouseX + camera.x;
  const adjustedMouseY = mouseY + camera.y;
  turretAngle = Math.atan2(
    adjustedMouseY - player.y,
    adjustedMouseX - player.x
  );
  turret.x = player.x;
  turret.y = player.y;
  turret.angle = turretAngle;
  turret.animate(delta);

  // projectile update
  projectiles.forEach((projectile, projIndex) => {
    projectile.update(delta);

    const distProj = Math.hypot(
      projectile.originalX - projectile.x,
      projectile.originalY - projectile.y
    );

    if (distProj > 300) {
      projectiles.splice(projIndex, 1);
    }
  });

  const enemiesToRemove = [];
  // enemy update and handle all collisions with enemy
  enemies.forEach((enemy, enemyIndex) => {
    enemy.update(delta);

    const distPlEn = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    // reduce hp if the enemy collides with player, end game if hp is 0
    if (distPlEn - enemy.radius - player.radius < -2) {
      gameState.takeDamage(1);
      live.startAnimation();
      camera.damageDuration = 10;

      resolveCollision(player, enemy);

      enemiesToRemove.push(enemyIndex);

      if (gameState.playerHealth === 0) {
        setTimeout(() => {
          cancelAnimationFrame(animationId);
          clearTimeout(enemyTimeOutId);
          endScore.innerHTML = gameState.score;
          modal.style.display = "flex";
        }, 300);
      }
    }

    projectiles.forEach((projectile, projectileIndex) => {
      const distEnPro = Math.hypot(
        projectile.x - enemy.x,
        projectile.y - enemy.y
      );

      // remove both if they touch, considering the radius
      if (distEnPro - enemy.radius - projectile.radius < -2) {
        enemy.health--;
        for (let i = 0; i < enemy.radius; i++) {
          particles.push(
            new Particle(
              projectile.x,
              projectile.y,
              Math.random() * 2,
              enemy.color,
              {
                x: (Math.random() - 0.5) * (Math.random() * 5),
                y: (Math.random() - 0.5) * (Math.random() * 5),
              }
            )
          );
        }

        if (enemy.health > 0) {
          gameState.score += 100;
          scoreEl.innerHTML = gameState.score;
          resolveCollision(projectile, enemy);
          enemy.hit = true;
          enemy.startAnimation();
          projectiles.splice(projectileIndex, 1);
        } else {
          gameState.score += 250;
          scoreEl.innerHTML = gameState.score;
          enemiesToRemove.push(enemyIndex);

          dropCoins(enemy);
          dropGem(enemy);

          projectiles.splice(projectileIndex, 1);
        }
      }
    });
  });
  enemiesToRemove
    .sort((a, b) => b - a)
    .forEach((index) => {
      enemies.splice(index, 1);
    });

  // particles update
  particles.forEach((particle, partIndex) => {
    if (particle.alpha <= 0) {
      particles.splice(partIndex, 1);
    } else {
      particle.update(delta);
    }
  });

  coins.forEach((coin, coinIndex) => {
    coin.isAnimating = true;
    coin.update(delta);
    const distCoinPlayer = Math.hypot(player.x - coin.x, player.y - coin.y);
    if (distCoinPlayer - player.radius - coin.radius < -2) {
      coins.splice(coinIndex, 1);
      gameState.coins++;
    }
  });
  gems.forEach((gem, gemIndex) => {
    gem.isAnimating = true;
    gem.update(delta);
    const distCoinPlayer = Math.hypot(player.x - gem.x, player.y - gem.y);
    if (distCoinPlayer - player.radius - gem.radius < -2) {
      gems.splice(gemIndex, 1);
      gameState.gems++;
    }
  });

  c.restore();
  trails.forEach((trail, trailIndex) => {
    if (trail.alpha <= 0) {
      trails.splice(trailIndex, 1);
    } else {
      trail.update();
    }
  });
  camera.showDamage(c);
  player.draw();
  turret.draw();
  // miniMap.draw();

  if (!live.isAnimating) {
    live.frame = live.healthMap[gameState.playerHealth];
  }
  live.update(delta);
}

function dropCoins(enemy) {
  const randomCoins = Math.floor(Math.random() * (5 - 1 + 1)) + 1;
  for (let i = 1; i <= randomCoins; i++) {
    const randomLocX =
      (Math.random() < 0.5 ? -1 : 1) *
        Math.floor(Math.random() * (30 - 10 + 1)) +
      10;
    const randomLocY =
      (Math.random() < 0.5 ? -1 : 1) *
        Math.floor(Math.random() * (30 - 10 + 1)) +
      10;

    coins.push(
      new Collectable(enemy.x + randomLocX, enemy.y + randomLocY, 8, "coin", {
        asset: assets.images.coin,
        frameSize: new Vector2(16, 16),
        hFrames: 24,
        vFrames: 1,
        frame: Math.floor(Math.random() * (24 - 1 + 1)) + 1,
      })
    );
  }
}

function dropGem(enemy) {
  gems.push(
    new Collectable(enemy.x, enemy.y, 8, "gem", {
      asset: assets.images.gem,
      frameSize: new Vector2(16, 16),
      hFrames: 15,
      vFrames: 1,
      frame: 0,
    })
  );
}

// add click eventlistener for projectile
addEventListener("click", (e) => {
  turret?.startAnimation();

  // calculate the triangele angle (in radiant) between the center (Player) to the clicked point
  const angle = Math.atan2(
    e.clientY + camera?.y - player?.y,
    e.clientX + camera?.x - player?.x
  );
  // calculate velocity through sin and cos
  const velocity = {
    x: Math.cos(angle) * 5,
    y: Math.sin(angle) * 5,
  };
  // Instantiate a Projectile and push it to the array
  projectiles.push(
    new Projectile(
      // adding velocity to create projectile distance from player
      player?.x + velocity.x * 4,
      player?.y + velocity.y * 4,
      5,
      "white",
      velocity,
      angle
    )
  );
});

canvas.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

startGameBtn.addEventListener("click", (e) => {
  init();
  gameLoop(0);
  spawnEnemies();
  spawnEnemies();
  modal.style.display = "none";
});
