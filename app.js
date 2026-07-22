// Configuration
const WHATSAPP_NUMBER = "17655439608"; // WhatsApp number configured by user
const WHATSAPP_MESSAGE = "Hey I want to talk to you";

// Game Weapons Database
const WEAPONS = {
    pillow: {
        id: "pillow",
        emoji: "🧸",
        name: "Pillow",
        description: "🧸 Pillow (Gently bonks)",
        angerReduction: 5,
        floatingTexts: ["Bonk! 🧸", "Soft! 😊", "Pillow fight! ☁️", "Comfy? 🥺"],
        sound: "pillow"
    },
    tomato: {
        id: "tomato",
        emoji: "🍅",
        name: "Tomato",
        description: "🍅 Tomato (Splats messily)",
        angerReduction: 10,
        floatingTexts: ["Splat! 🍅", "Messy! 😜", "Red-faced! 😡", "Take that! 🍅"],
        sound: "tomato"
    },
    hammer: {
        id: "hammer",
        emoji: "🔨",
        name: "Squeaky Hammer",
        description: "🔨 Squeaky Hammer (Squeaks funnily)",
        angerReduction: 15,
        floatingTexts: ["Squeak! 🔨", "Bonk! 💥", "Dizzy! 💫", "Ouch! 🤕"],
        sound: "hammer"
    },
    pie: {
        id: "pie",
        emoji: "🥧",
        name: "Cream Pie",
        description: "🥧 Cream Pie (Cream splash!)",
        angerReduction: 20,
        floatingTexts: ["SPLAT! 🥧", "Creamy! 🤍", "Yum? 😋", "Sweet hit! 🍰"],
        sound: "pie"
    }
};

// Application State
let activeWeapon = WEAPONS.pillow;
let angerLevel = 100;
let soundContext = null;
let isLeafBlowingActive = true;

// DOM Elements
const body = document.body;
const leafCanvas = document.getElementById("leaf-canvas");
const leafCtx = leafCanvas.getContext("2d");
const customCursor = document.getElementById("custom-cursor");
const tutorialHint = document.getElementById("tutorial-hint");
const bgDecorations = document.getElementById("bg-decorations");

// Cards
const apologyCard = document.getElementById("apology-card");
const gameCard = document.getElementById("game-card");
const successCard = document.getElementById("success-card");

// Buttons
const btnForgive = document.getElementById("btn-forgive");
const btnAngry = document.getElementById("btn-angry");
const btnSuccessTalk = document.getElementById("btn-success-talk");

// Game HUD / Elements
const angerBar = document.getElementById("anger-bar");
const angerStatusText = document.getElementById("anger-status-text");
const boyfriendAvatar = document.getElementById("boyfriend-avatar");
const avatarWrapper = document.getElementById("avatar-wrapper");
const splatContainer = document.getElementById("splat-container");
const weaponInfoText = document.getElementById("weapon-info-text");

// Initialize Sound context on interaction
function initAudio() {
    if (!soundContext) {
        soundContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Custom Cursor Positioning
const mouse = { x: -100, y: -100, isDown: false, lastX: 0, lastY: 0, vx: 0, vy: 0 };

window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    
    // Calculate mouse velocity for leaf blowing physics
    mouse.vx = mouse.x - mouse.lastX;
    mouse.vy = mouse.y - mouse.lastY;
    mouse.lastX = mouse.x;
    mouse.lastY = mouse.y;

    if (customCursor.style.display !== "none") {
        customCursor.style.left = `${mouse.x}px`;
        customCursor.style.top = `${mouse.y}px`;
    }
});

window.addEventListener("mousedown", () => {
    mouse.isDown = true;
    customCursor.classList.add("blowing");
    initAudio();
});

window.addEventListener("mouseup", () => {
    mouse.isDown = false;
    customCursor.classList.remove("blowing");
});

// Canvas Setup
function resizeCanvas() {
    leafCanvas.width = window.innerWidth;
    leafCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// --- Background floating decorations generator ---
function createFloatingHearts() {
    const heartEmojis = ["❤️", "💖", "💕", "🌸", "✨"];
    for (let i = 0; i < 20; i++) {
        setTimeout(() => {
            const heart = document.createElement("div");
            heart.className = "floating-heart";
            heart.innerText = heartEmojis[Math.floor(Math.random() * heartEmojis.length)];
            heart.style.left = `${Math.random() * 100}vw`;
            heart.style.animationDuration = `${6 + Math.random() * 8}s`;
            heart.style.animationDelay = `${Math.random() * 5}s`;
            heart.style.fontSize = `${16 + Math.random() * 20}px`;
            bgDecorations.appendChild(heart);
        }, i * 300);
    }
}
createFloatingHearts();

// --- Leaf Physics Simulation ---
class Leaf {
    constructor() {
        this.reset();
        // Distribute initial leaves across the viewport
        this.x = Math.random() * leafCanvas.width;
        this.y = Math.random() * leafCanvas.height;
    }

    reset() {
        this.x = Math.random() * leafCanvas.width;
        this.y = -50 - Math.random() * 200; // start slightly above screen if reset
        this.size = 14 + Math.random() * 18;
        this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = 1 + Math.random() * 2.5; // falling speed
        this.angle = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.05;
        
        // Warm autumn leaf color palette
        const colors = [
            "#e65100", // deep orange
            "#ef6c00", // warm orange
            "#f57c00", // orange
            "#ffb300", // amber
            "#d84315", // deep red-orange
            "#c62828", // red
            "#8d6e63", // brown
            "#afb42b"  // olive green-yellow
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        
        // Leaf shape types
        this.shapeType = Math.floor(Math.random() * 3);
        this.offScreen = false;
        this.isBlown = false; // Tracks if leaf has been affected by the wind blower
    }

    update() {
        // Apply wind force from cursor
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Larger wind radius to match the enlarged 150px wind blower cursor
        const windRadius = mouse.isDown ? 280 : 180;
        const windStrength = mouse.isDown ? 0.45 : 0.22;

        if (distance < windRadius && isLeafBlowingActive) {
            const force = (windRadius - distance) / windRadius;
            const forceAngle = Math.atan2(dy, dx);
            
            // Add blow direction and incorporate mouse speed
            const speedFactor = Math.min(Math.sqrt(mouse.vx * mouse.vx + mouse.vy * mouse.vy) * 0.1, 3);
            this.vx += Math.cos(forceAngle) * force * windStrength * (8 + speedFactor);
            this.vy += Math.sin(forceAngle) * force * windStrength * (8 + speedFactor);
            
            // Spin faster when blown
            this.rotationSpeed += (Math.random() - 0.5) * 0.25;
            this.isBlown = true; // Mark as blown, meaning it will clear permanently off-screen
        }

        // Apply friction and gravity
        this.vx *= 0.96;
        this.vy = this.vy * 0.96 + 0.08; // gravity

        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.rotationSpeed;
        this.rotationSpeed *= 0.98;

        // Leaf looping vs clearing logic
        if (this.y > leafCanvas.height + 50) {
            if (this.isBlown) {
                this.offScreen = true; // Clear permanently if it was blown away
            } else {
                this.reset(); // Loop back to top if it just fell naturally
            }
        }

        if (this.x < -100 || this.x > leafCanvas.width + 100) {
            this.offScreen = true; // Clear if blown off the sides
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        
        // Draw shadow
        ctx.shadowColor = "rgba(0, 0, 0, 0.08)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;

        ctx.beginPath();
        
        if (this.shapeType === 0) {
            // Simple Ellipse Leaf
            ctx.moveTo(0, -this.size);
            ctx.quadraticCurveTo(this.size * 0.6, -this.size * 0.3, 0, this.size);
            ctx.quadraticCurveTo(-this.size * 0.6, -this.size * 0.3, 0, -this.size);
        } else if (this.shapeType === 1) {
            // Maple-like Leaf (simplified jagged star shape)
            ctx.moveTo(0, -this.size);
            ctx.lineTo(this.size * 0.25, -this.size * 0.45);
            ctx.lineTo(this.size * 0.6, -this.size * 0.5);
            ctx.lineTo(this.size * 0.35, -this.size * 0.1);
            ctx.lineTo(this.size * 0.7, this.size * 0.1);
            ctx.lineTo(this.size * 0.2, this.size * 0.3);
            ctx.lineTo(0, this.size); // stem end
            ctx.lineTo(-this.size * 0.2, this.size * 0.3);
            ctx.lineTo(-this.size * 0.7, this.size * 0.1);
            ctx.lineTo(-this.size * 0.35, -this.size * 0.1);
            ctx.lineTo(-this.size * 0.6, -this.size * 0.5);
            ctx.lineTo(-this.size * 0.25, -this.size * 0.45);
        } else {
            // Pointy Heart-shaped Leaf
            ctx.moveTo(0, -this.size * 0.8);
            ctx.bezierCurveTo(this.size * 0.8, -this.size * 1.2, this.size * 1.2, 0, 0, this.size);
            ctx.bezierCurveTo(-this.size * 1.2, 0, -this.size * 0.8, -this.size * 1.2, 0, -this.size * 0.8);
        }

        ctx.fill();

        // Draw leaf vein line
        ctx.beginPath();
        ctx.moveTo(0, -this.size * 0.8);
        ctx.lineTo(0, this.size);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
    }
}

// Generate Leaves array
const leaves = [];
const TOTAL_LEAVES = 130;
for (let i = 0; i < TOTAL_LEAVES; i++) {
    leaves.push(new Leaf());
}

// Show wind blower cursor on leaf canvas
body.classList.add("custom-cursor-active");
customCursor.style.display = "block";

// Canvas Animation Loop
function animateLeaves() {
    leafCtx.clearRect(0, 0, leafCanvas.width, leafCanvas.height);
    
    let offscreenCount = 0;
    
    leaves.forEach(leaf => {
        leaf.update();
        leaf.draw(leafCtx);
        if (leaf.offScreen) {
            offscreenCount++;
        }
    });

    // Check clearing progress
    const clearPercent = offscreenCount / TOTAL_LEAVES;
    
    if (clearPercent > 0.85 && isLeafBlowingActive) {
        // Trigger completion transition
        isLeafBlowingActive = false;
        completeLeafBlowing();
    }

    if (isLeafBlowingActive) {
        requestAnimationFrame(animateLeaves);
    }
}
requestAnimationFrame(animateLeaves);

// Transition from Leaves to Apology Card
function completeLeafBlowing() {
    // Fade out canvas and tutorial overlay
    leafCanvas.style.transition = "opacity 1.5s ease";
    leafCanvas.style.opacity = "0";
    tutorialHint.style.transition = "opacity 1s ease";
    tutorialHint.style.opacity = "0";

    setTimeout(() => {
        leafCanvas.style.display = "none";
        tutorialHint.style.display = "none";
        
        // Remove blower cursor, switch back to standard browser cursor for apology card interaction
        body.classList.remove("custom-cursor-active");
        customCursor.style.display = "none";
        
        // Show Apology Card
        showCard(apologyCard);
    }, 1200);
}

// Helper to switch cards with fade animations
function showCard(cardElement) {
    // Hide all cards first
    apologyCard.classList.remove("active");
    gameCard.classList.remove("active");
    successCard.classList.remove("active");
    
    setTimeout(() => {
        apologyCard.style.display = "none";
        gameCard.style.display = "none";
        successCard.style.display = "none";
        
        cardElement.style.display = "block";
        setTimeout(() => {
            cardElement.classList.add("active");
        }, 50);
    }, 400);
}

// --- Card 1 Event Handlers ---
btnForgive.addEventListener("click", () => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
    window.open(url, "_blank");
});

btnAngry.addEventListener("click", () => {
    // Transition to Vent Anger Game
    showCard(gameCard);
    // Custom cursor will represent selected weapon in game!
    setupGameCursor();
});

// --- Sound Synthesizer via Web Audio API ---
function playSound(type) {
    if (!soundContext) return;
    
    // Resume context if suspended (browser security autoplays blocker)
    if (soundContext.state === "suspended") {
        soundContext.resume();
    }

    const osc = soundContext.createOscillator();
    const gainNode = soundContext.createGain();
    osc.connect(gainNode);
    gainNode.connect(soundContext.destination);

    const now = soundContext.currentTime;

    if (type === "pillow") {
        // Deep soft bonk
        osc.type = "sine";
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
        gainNode.gain.setValueAtTime(0.6, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
    } 
    else if (type === "tomato") {
        // Wet squish splat (Noise + sweep)
        osc.type = "triangle";
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
        
        // Add a bit of synthesized high-frequency splat noise
        const bufferSize = soundContext.sampleRate * 0.15; // 0.15s buffer
        const buffer = soundContext.createBuffer(1, bufferSize, soundContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noiseNode = soundContext.createBufferSource();
        noiseNode.buffer = buffer;
        
        const noiseFilter = soundContext.createBiquadFilter();
        noiseFilter.type = "bandpass";
        noiseFilter.frequency.setValueAtTime(1000, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(300, now + 0.15);
        
        const noiseGain = soundContext.createGain();
        noiseGain.gain.setValueAtTime(0.3, now);
        noiseGain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        
        noiseNode.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(soundContext.destination);
        
        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.25);
        
        osc.start(now);
        osc.stop(now + 0.25);
        noiseNode.start(now);
        noiseNode.stop(now + 0.15);
    } 
    else if (type === "hammer") {
        // High pitched toy squeak
        osc.type = "sine";
        osc.frequency.setValueAtTime(750, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.08);
        osc.frequency.linearRampToValueAtTime(650, now + 0.18);
        
        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.2);
        
        osc.start(now);
        osc.stop(now + 0.2);
    } 
    else if (type === "pie") {
        // Large wet slap sound
        const bufferSize = soundContext.sampleRate * 0.3;
        const buffer = soundContext.createBuffer(1, bufferSize, soundContext.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noiseNode = soundContext.createBufferSource();
        noiseNode.buffer = buffer;
        
        const noiseFilter = soundContext.createBiquadFilter();
        noiseFilter.type = "lowpass";
        noiseFilter.frequency.setValueAtTime(800, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(150, now + 0.25);
        
        const noiseGain = soundContext.createGain();
        noiseGain.gain.setValueAtTime(0.7, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        
        noiseNode.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(soundContext.destination);
        
        noiseNode.start(now);
        noiseNode.stop(now + 0.3);
    }
}

// --- Weapon Selection Logic ---
const weaponButtons = document.querySelectorAll(".weapon-slot");

weaponButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
        // Highlight active slot
        weaponButtons.forEach(b => b.classList.remove("active"));
        const slot = e.currentTarget;
        slot.classList.add("active");
        
        // Set state
        const weaponId = slot.id.replace("weapon-", "");
        activeWeapon = WEAPONS[weaponId];
        
        // Update helper UI
        weaponInfoText.innerText = activeWeapon.description;
        
        // Update Custom Cursor representation
        customCursor.innerHTML = `<span style="font-size: 80px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.15));">${activeWeapon.emoji}</span>`;
        
        // Play short sound check
        initAudio();
        playSound(activeWeapon.sound);
    });
});

// Setup weapon cursor in game card
function setupGameCursor() {
    body.classList.add("custom-cursor-active");
    customCursor.style.display = "flex";
    customCursor.style.justifyContent = "center";
    customCursor.style.alignEvents = "none";
    customCursor.innerHTML = `<span style="font-size: 80px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.15));">${activeWeapon.emoji}</span>`;
}

// --- Game Logic: Hitting the Avatar ---
avatarWrapper.addEventListener("mousedown", (e) => {
    if (angerLevel <= 0) return;
    
    // Trigger hit animation wrapper
    avatarWrapper.classList.remove("hit");
    void avatarWrapper.offsetWidth; // trigger reflow
    avatarWrapper.classList.add("hit");
    
    // Play hit sound effect
    playSound(activeWeapon.sound);
    
    // Spawn floating damage numbers/text
    createFloatingText(e.clientX, e.clientY);
    
    // Spawn tomato/cream splat overlays
    if (activeWeapon.id === "tomato") {
        createSplat(e.clientX, e.clientY, "tomato-splat");
    } else if (activeWeapon.id === "pie") {
        createSplat(e.clientX, e.clientY, "cream-splat");
    }
    
    // Reduce Anger Level
    angerLevel = Math.max(angerLevel - activeWeapon.angerReduction, 0);
    updateAngerMeter();
});

// Calculate HUD updates
function updateAngerMeter() {
    angerBar.style.width = `${angerLevel}%`;
    
    // Update expression labels
    if (angerLevel > 75) {
        angerStatusText.innerText = `Fuming (${angerLevel}%) 😤`;
        boyfriendAvatar.src = "assets/boyfriend_normal.png";
    } else if (angerLevel > 45) {
        angerStatusText.innerText = `Irritated (${angerLevel}%) 😠`;
        boyfriendAvatar.src = "assets/boyfriend_hit.png";
    } else if (angerLevel > 15) {
        angerStatusText.innerText = `Calming Down (${angerLevel}%) 🤕`;
        boyfriendAvatar.src = "assets/boyfriend_hit.png";
    } else if (angerLevel > 0) {
        angerStatusText.innerText = `Almost Cool (${angerLevel}%) 🥺`;
        boyfriendAvatar.src = "assets/boyfriend_normal.png";
    } else {
        angerStatusText.innerText = `Completely Calm (0%) ❤️`;
        // Game Win transition
        completeGame();
    }
}

// Win State Transition
function completeGame() {
    setTimeout(() => {
        // Disable game cursor
        body.classList.remove("custom-cursor-active");
        customCursor.style.display = "none";
        
        // Show Success card
        showCard(successCard);
        
        // Change image in success card too
        boyfriendAvatar.src = "assets/boyfriend_love.png";
    }, 800);
}

// Create Floating Text Effect
function createFloatingText(clientX, clientY) {
    const textNode = document.createElement("div");
    textNode.className = "floating-hit-text";
    
    // Random select floating text from active weapon list
    const texts = activeWeapon.floatingTexts;
    textNode.innerText = texts[Math.floor(Math.random() * texts.length)];
    
    // Position text directly relative to screen coordinates
    textNode.style.left = `${clientX}px`;
    textNode.style.top = `${clientY}px`;
    
    body.appendChild(textNode);
    
    // Remove text element after animation completes
    setTimeout(() => {
        textNode.remove();
    }, 1200);
}

// Splat Overlay Generation
function createSplat(clientX, clientY, className) {
    const splat = document.createElement("div");
    splat.className = className;
    
    // Get viewport relative bounding rectangle to place splat correctly in viewport container
    const rect = gameCard.getBoundingClientRect();
    const x = clientX - rect.left - 40; // centered offset
    const y = clientY - rect.top - 40;
    
    splat.style.left = `${x}px`;
    splat.style.top = `${y}px`;
    
    // Add random slight rotation
    const rotation = Math.random() * 360;
    splat.style.transform = `rotate(${rotation}deg)`;
    
    splatContainer.appendChild(splat);
    
    // Slowly fade out splat overlay and delete
    setTimeout(() => {
        splat.remove();
    }, 4000);
}

// --- Card 3 (Success) Handler ---
btnSuccessTalk.addEventListener("click", () => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
    window.open(url, "_blank");
});
