const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('game-container');

// UI Elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreDisplay = document.getElementById('score-display');
const finalScoreDisplay = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const title = document.getElementById('title');

// Game State
let gameState = 'start'; // start, playing, gameover
let score = 0;
let frameCounter = 0;
let animationId;

// Resize canvas to match container
function resize() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}
window.addEventListener('resize', resize);
resize();

// --- Game Objects ---

// Plane
const plane = {
    x: 50,
    y: canvas.height / 2,
    width: 40,
    height: 30,
    velocity: 0,
    gravity: 0.5,
    jumpForce: -8,
    rotation: 0,
    
    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        
        // Tilt plane based on velocity
        this.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.1)));
        ctx.rotate(this.rotation);
        
        // Draw Plane (Fuselage)
        ctx.fillStyle = '#f8fafc'; // White body
        ctx.beginPath();
        // Nose
        ctx.arc(15, 0, 10, -Math.PI/2, Math.PI/2);
        // Body tail
        ctx.lineTo(-20, 10);
        ctx.lineTo(-20, -10);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Window
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(10, -2, 4, 0, Math.PI * 2);
        ctx.fill();

        // Main Wing
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.lineTo(5, -15);
        ctx.lineTo(10, 0);
        ctx.fill();
        ctx.stroke();
        
        // Tail Wing
        ctx.beginPath();
        ctx.moveTo(-20, -10);
        ctx.lineTo(-15, -20);
        ctx.lineTo(-10, -10);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    },
    
    update() {
        this.velocity += this.gravity;
        this.y += this.velocity;
        
        // Floor collision
        if (this.y + this.height > canvas.height) {
            this.y = canvas.height - this.height;
            gameOver();
        }
        
        // Ceiling collision (optional, makes it harder)
        if (this.y < 0) {
            this.y = 0;
            this.velocity = 0;
        }
    },
    
    jump() {
        this.velocity = this.jumpForce;
        createParticles(this.x, this.y + this.height/2);
    },
    
    reset() {
        this.y = canvas.height / 2;
        this.velocity = 0;
        this.rotation = 0;
    }
};

// Buildings (Pipes)
const buildings = [];
const buildingWidth = 60;
const gapSize = 180;
let buildingSpeed = 3.5;

function createBuilding() {
    const minHeight = 50;
    const maxHeight = canvas.height - gapSize - minHeight;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight);
    
    buildings.push({
        x: canvas.width,
        topHeight: topHeight,
        bottomY: topHeight + gapSize,
        passed: false,
        hitTop: false, // Flag to check if top building was hit
        hitBottom: false, // Flag to check if bottom building was hit
        // Visual randomly properties
        color: Math.random() > 0.5 ? '#1e293b' : '#334155', // Dark slate colors
        windows: []
    });
    
    // Generate windows for the new building
    const b = buildings[buildings.length - 1];
    
    // Windows for top building
    for(let wY = 20; wY < b.topHeight - 20; wY += 25) {
        if(Math.random() > 0.3) {
            b.windows.push({x: 10, y: wY, top: true});
        }
        if(Math.random() > 0.3) {
             b.windows.push({x: 35, y: wY, top: true});
        }
    }
    
    // Windows for bottom building
    for(let wY = b.bottomY + 20; wY < canvas.height; wY += 25) {
         if(Math.random() > 0.3) {
            b.windows.push({x: 10, y: wY, top: false});
        }
        if(Math.random() > 0.3) {
             b.windows.push({x: 35, y: wY, top: false});
        }
    }
}

function drawBuildings() {
    buildings.forEach(b => {
        // Top Building
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, 0, buildingWidth, b.topHeight);
        // Highlight edge
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(b.x, 0, 5, b.topHeight);
        
        // Bottom Building
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.bottomY, buildingWidth, canvas.height - b.bottomY);
        // Highlight edge
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(b.x, b.bottomY, 5, canvas.height - b.bottomY);
        
        // Draw Fire if hit
        if (b.hitTop) drawBuildingFire(b.x, b.topHeight, true);
        if (b.hitBottom) drawBuildingFire(b.x, b.bottomY, false);
        
        // Draw Windows
        ctx.fillStyle = '#fef08a'; // Yellow light
        b.windows.forEach(w => {
            if (w.top && w.y < b.topHeight) {
                ctx.fillRect(b.x + w.x, w.y, 15, 15);
            } else if (!w.top) {
                ctx.fillRect(b.x + w.x, w.y, 15, 15);
            }
        });
    });
}

function updateBuildings() {
    if (frameCounter % Math.floor(120 / (buildingSpeed/2)) === 0) {
        createBuilding();
    }
    
    buildings.forEach(b => {
        b.x -= buildingSpeed;
        
        // Score logic
        if (b.x + buildingWidth < plane.x && !b.passed) {
            score++;
            scoreDisplay.innerText = score;
            b.passed = true;
            
            // Increase speed slightly
            if(score % 5 === 0) buildingSpeed += 0.2;
        }
        
        // Collision logic
        // Plane bounding box (simplified to a smaller square inside the drawing for better feel)
        const pLeft = plane.x - 10;
        const pRight = plane.x + 15;
        const pTop = plane.y - 10;
        const pBottom = plane.y + 10;
        
        if (
            pRight > b.x && 
            pLeft < b.x + buildingWidth && 
            (pTop < b.topHeight || pBottom > b.bottomY)
        ) {
            if (pTop < b.topHeight) b.hitTop = true;
            if (pBottom > b.bottomY) b.hitBottom = true;
            createExplosion(plane.x, plane.y);
            gameOver();
        }
    });
    
    // Remove off-screen buildings
    if (buildings.length > 0 && buildings[0].x < -buildingWidth) {
        buildings.shift();
    }
}

// Background Clouds
const clouds = [];
function createCloud() {
    clouds.push({
        x: canvas.width + 50,
        y: Math.random() * (canvas.height / 2),
        width: Math.random() * 60 + 40,
        speed: Math.random() * 0.5 + 0.2,
        opacity: Math.random() * 0.4 + 0.1
    });
}

function drawClouds() {
    if (Math.random() < 0.01) createCloud();
    
    clouds.forEach(c => {
        c.x -= c.speed;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${c.opacity})`;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.width/3, 0, Math.PI * 2);
        ctx.arc(c.x + c.width/3, c.y - c.width/6, c.width/2.5, 0, Math.PI * 2);
        ctx.arc(c.x + c.width/1.5, c.y, c.width/4, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Remove off-screen
    if (clouds.length > 0 && clouds[0].x < -100) clouds.shift();
}

// Particles effect
const particles = [];
function createParticles(x, y) {
    for(let i=0; i<5; i++) {
        particles.push({
            x: x - 15,
            y: y,
            vx: -Math.random() * 2,
            vy: (Math.random() - 0.5) * 2,
            life: 1,
            size: Math.random() * 4 + 2
        });
    }
}

function createExplosion(x, y) {
    for(let i=0; i<30; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 1,
            size: Math.random() * 6 + 2,
            isExplosion: true
        });
    }
}

function drawAndUpateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        
        if (p.isExplosion) {
            // Fire colors
            const colors = ['#ef4444', '#f97316', '#eab308'];
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        } else {
            // Smoke colors
            ctx.fillStyle = `rgba(200, 200, 200, ${p.life})`;
        }
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Building Fire effect
const buildingFires = [];
// This will be called continually during Game Over to spawn fire on hit buildings
function drawBuildingFire(x, y, isTop) {
    // Add new fire particles
    if (Math.random() > 0.5) {
        buildingFires.push({
            x: x + Math.random() * buildingWidth,
            y: isTop ? y - 10 + Math.random() * 20 : y + 10 - Math.random() * 20,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (isTop ? -1 : -2) - Math.random() * 2,
            life: 1,
            size: Math.random() * 10 + 5,
            isSmoke: Math.random() > 0.6
        });
    }

    // Draw and update them
    for (let i = buildingFires.length - 1; i >= 0; i--) {
        const f = buildingFires[i];
        f.x += f.vx;
        f.y += f.vy;
        f.life -= 0.03;
        
        if (f.life <= 0) {
            buildingFires.splice(i, 1);
            continue;
        }

        if (f.isSmoke) {
            ctx.fillStyle = `rgba(50, 50, 50, ${f.life * 0.5})`;
            f.size += 0.2; // Smoke expands
        } else {
            const colors = ['#ef4444', '#f97316', '#facc15']; // Red, Orange, Yellow
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            ctx.globalAlpha = f.life;
        }
        
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}


// --- Main Loop ---

function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawClouds();
    
    if (gameState === 'playing') {
        updateBuildings();
        plane.update();
        frameCounter++;
    }
    
    drawBuildings();
    drawAndUpateParticles();
    
    if (gameState !== 'gameover' || particles.length > 0) { // Draw plane until it explodes
        if(gameState !== 'gameover') {
             plane.draw();
        }
    }
    
    // Always request the next frame to keep background (clouds, fire) animated
    animationId = requestAnimationFrame(gameLoop);
}

function startGame() {
    startMusic();
    gameState = 'playing';
    score = 0;
    frameCounter = 0;
    buildingSpeed = 3.5;
    buildings.length = 0;
    particles.length = 0;
    buildingFires.length = 0;
    plane.reset();
    
    scoreDisplay.innerText = score;
    scoreDisplay.style.opacity = 1;
    title.style.opacity = 0;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    
    // Ensure loop is only started once
    cancelAnimationFrame(animationId);
    gameLoop();
}

function gameOver() {
    if (gameState === 'gameover') return;
    gameState = 'gameover';
    
    // Play the new game over mp3
    gameOverSnd.currentTime = 0;
    gameOverSnd.play().catch(e => console.log('Game over audio play error'));
    
    stopMusic();
    
    finalScoreDisplay.innerText = score;
    scoreDisplay.style.opacity = 0;
    gameOverScreen.classList.remove('hidden');
    
    // Shake effect
    container.style.animation = 'shake 0.5s';
    setTimeout(() => { container.style.animation = ''; }, 500);
}

// Add CSS keyframes dynamically for shake
const style = document.createElement('style');
style.innerHTML = `
@keyframes shake {
  0% { transform: translate(1px, 1px) rotate(0deg); }
  10% { transform: translate(-1px, -2px) rotate(-1deg); }
  20% { transform: translate(-3px, 0px) rotate(1deg); }
  30% { transform: translate(3px, 2px) rotate(0deg); }
  40% { transform: translate(1px, -1px) rotate(1deg); }
  50% { transform: translate(-1px, 2px) rotate(-1deg); }
  60% { transform: translate(-3px, 1px) rotate(0deg); }
  70% { transform: translate(3px, 1px) rotate(-1deg); }
  80% { transform: translate(-1px, -1px) rotate(1deg); }
  90% { transform: translate(1px, 2px) rotate(0deg); }
  100% { transform: translate(1px, -2px) rotate(-1deg); }
}
`;
document.head.appendChild(style);

// Input Handling
function input() {
    if (gameState === 'playing') {
        plane.jump();
    } else if (gameState === 'start' || gameState === 'gameover') {
        // small delay to prevent double jump right after starting/restarting
        setTimeout(() => {}, 100);
    }
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        
        if (gameState === 'playing') {
            plane.jump();
        } else if (gameState === 'start') {
            startGame();
        } else if (gameState === 'gameover') {
            startGame();
        }
    }
});

canvas.addEventListener('mousedown', () => {
    if (gameState === 'playing') {
        plane.jump();
    }
});
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState === 'playing') {
        plane.jump();
    }
});

startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    startGame();
});

restartBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    startGame();
});

// Initial draw before play
gameLoop();

// --- Audio System (HTML5 Audio) ---

// HTML5 Audio for background music
const bgMusic = new Audio('bgm.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.5;

// HTML5 Audio for Game Over
const gameOverSnd = new Audio('gameover.mp3');
gameOverSnd.volume = 0.8;

function startMusic() {
    bgMusic.play().catch(e => console.log('Audio autoplay prevented by browser'));
}

function stopMusic() {
    bgMusic.pause();
    bgMusic.currentTime = 0; // Restart for next play
}
