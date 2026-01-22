// Y-position of the floor (ground level)
let floorY;

// Environment elements
let clouds = []; // Array to store cloud positions
let cloudSpeed = 0.3; // Base drift speed for clouds
let cloudDamping = 0.95; // Damping factor for cloud velocity (gradual slowdown)

// Sparkle particles
let sparkles = []; // Array to store active sparkles

// Object representing our player character ("blob")
let blob2 = {
  // Position
  x: 260,
  y: 0,

  // Visual properties
  r: 26, // Base radius of the blob
  points: 48, // Number of points used to draw the blob shape
  wobble: 7, // How much the blob's edge can deform
  wobbleFreq: 0.9, // Controls how smooth or noisy the wobble is

  // Time values for animation
  t: 0, // Time offset for noise animation
  tSpeed: 0.01, // How fast the blob "breathes"

  // Velocity (speed)
  vx: 0, // Horizontal velocity
  vy: 0, // Vertical velocity

  // Movement tuning
  accel: 0.5, // How quickly the blob accelerates left/right
  maxRun: 4.0, // Maximum horizontal speed
  gravity: 0.35, // Constant downward force (reduced for lighter, floatier feel)
  jumpV: -12.5, // Initial upward velocity when jumping (increased for higher jumps)
  
  // Joyful movement additions
  bobOffset: 0, // For gentle vertical bob animation
  bobSpeed: 0.08, // Speed of the bob animation
  
  // Landing animation variables
  landingSquash: 1.0, // Vertical squash on landing (1.0 = neutral, <1.0 = squashed)
  landingStretch: 1.0, // Horizontal stretch on landing (1.0 = neutral, >1.0 = stretched)
  landingEaseSpeed: 0.12, // How quickly landing animation eases back to neutral

  // State flags
  onGround: false, // Tracks whether the blob is touching the floor
  wasOnGround: false, // Previous frame's ground state (to detect landing)
  prevVy: 0, // Previous frame's vertical velocity (to detect jump peak)

  // Friction values
  frictionAir: 0.995, // Less friction while in the air
  frictionGround: 0.88, // More friction while on the ground
};

function setup() {
  createCanvas(520, 320);

  // Position the floor near the bottom of the canvas
  floorY = height - 40;

  noStroke();
  textFont("sans-serif");
  textSize(14);

  // Start the blob resting on the floor
  blob2.y = floorY - blob2.r - 1;
  
  // Initialize clouds at random positions with velocity
  for (let i = 0; i < 4; i++) {
    clouds.push({
      x: random(width),
      y: random(40, floorY - 80),
      size: random(40, 70),
      vx: -cloudSpeed, // Start with base drift velocity
      vy: 0 // No initial vertical velocity
    });
  }
}

function draw() {
  // --- Draw joyful sky gradient ---
  drawSkyGradient();
  
  // --- Draw sun ---
  drawSun();
  
  // --- Draw rainbow ---
  drawRainbow();
  
  // --- Draw drifting clouds ---
  drawClouds();
  
  // --- Draw the floor (grass) ---
  fill(100, 180, 100); // Green grass color
  rect(0, floorY, width, height - floorY);

  // --- Handle horizontal input ---
  // move will be:
  // -1 for left, +1 for right, 0 for no input
  let move = 0;

  // A key or left arrow → move left
  if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) move -= 1;

  // D key or right arrow → move right
  if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) move += 1;

  // Apply acceleration based on input
  blob2.vx += blob2.accel * move;

  // --- Apply friction with smooth easing ---
  // Use stronger friction on the ground, weaker in the air
  // Smooth easing: lerp towards 0 for gradual deceleration
  if (move === 0) {
    blob2.vx = lerp(blob2.vx, 0, blob2.onGround ? 0.15 : 0.05);
  }
  blob2.vx *= blob2.onGround ? blob2.frictionGround : blob2.frictionAir;

  // --- Limit horizontal speed ---
  blob2.vx = constrain(blob2.vx, -blob2.maxRun, blob2.maxRun);

  // --- Gravity and movement ---
  // Gravity always increases downward velocity
  blob2.vy += blob2.gravity;

  // --- Detect jump peak and create sparkles ---
  // Peak occurs when vy transitions from negative/zero to positive (going up to going down)
  if (blob2.prevVy <= 0 && blob2.vy > 0 && !blob2.onGround) {
    // Blob reached the highest point! Create sparkles
    createSparkles(blob2.x, blob2.y);
  }
  blob2.prevVy = blob2.vy; // Remember vy for next frame

  // Update position using velocity
  blob2.x += blob2.vx;
  blob2.y += blob2.vy;

  // --- Cloud collision detection and interaction ---
  checkCloudCollisions();

  // --- Ground collision detection ---
  // Check if the blob has gone below the floor
  if (blob2.y + blob2.r >= floorY) {
    // Snap blob back to the floor
    blob2.y = floorY - blob2.r;

    // --- Soft, joyful landing animation ---
    // Detect landing (transition from air to ground)
    if (!blob2.wasOnGround && blob2.vy > 0) {
      // Trigger landing animation: squash vertically, stretch horizontally
      const landingIntensity = map(constrain(blob2.vy, 0, 10), 0, 10, 0.3, 0.6);
      blob2.landingSquash = 1.0 - landingIntensity; // Squash down (e.g., 0.7 = 30% squashed)
      blob2.landingStretch = 1.0 + landingIntensity * 0.4; // Stretch horizontally (e.g., 1.12 = 12% stretched)
      
      // Soft upward rebound for playful bounce
      blob2.vy = -blob2.vy * 0.2; // Gentle bounce: 20% of landing velocity upward
    } else {
      // Already on ground: smooth dampening
      blob2.vy *= 0.3;
      if (abs(blob2.vy) < 0.1) {
        blob2.vy = 0;
      }
    }

    // Blob is now grounded
    blob2.onGround = true;
  } else {
    blob2.onGround = false;
  }
  
  // --- Gradually ease landing animation back to neutral ---
  // Smoothly return squash and stretch to 1.0 over time
  blob2.landingSquash = lerp(blob2.landingSquash, 1.0, blob2.landingEaseSpeed);
  blob2.landingStretch = lerp(blob2.landingStretch, 1.0, blob2.landingEaseSpeed);
  
  // --- Additional smooth damping when on ground ---
  // Gradually settle any remaining vertical velocity when grounded
  if (blob2.onGround && abs(blob2.vy) > 0) {
    blob2.vy *= 0.5; // Smooth damping to settle on ground
    if (abs(blob2.vy) < 0.05) {
      blob2.vy = 0; // Stop tiny bounces
    }
  }
  
  // Remember ground state for next frame (to detect landing)
  blob2.wasOnGround = blob2.onGround;
  
  // --- Gentle vertical bob while moving or idle ---
  blob2.bobOffset += blob2.bobSpeed;
  const bobAmount = 1.5; // How much the blob bobs up and down
  const bobY = sin(blob2.bobOffset) * bobAmount;

  // --- Keep blob inside the screen horizontally ---
  blob2.x = constrain(blob2.x, blob2.r, width - blob2.r);

  // --- Animate the blob shape ---
  // Advance time for noise-based wobble
  blob2.t += blob2.tSpeed;

  // Draw the blob (with bob offset applied)
  drawBlob(blob2, bobY);
  
  // --- Update and draw sparkles ---
  updateSparkles();
  drawSparkles();

  // --- UI text ---
  fill(0);
  text("Move: A/D or ←/→  •  Jump: Space/W/↑", 10, 18);
}

// Draws a soft, organic blob using Perlin noise
function drawBlob(b, bobY = 0) {
  fill(255, 220, 100); // Joyful yellow color
  
  // --- Squash-and-stretch based on vertical velocity ---
  // Stretch when jumping up (negative vy), squash when falling (positive vy)
  const velocityStretch = map(constrain(b.vy, -15, 15), -15, 15, 1.15, 0.85);
  const velocitySquash = map(constrain(b.vy, -15, 15), -15, 15, 0.85, 1.15);
  
  // --- Combine velocity-based squash/stretch with landing animation ---
  // Landing animation takes priority when active, then blends with velocity effect
  const scaleY = b.landingSquash * velocityStretch; // Vertical: landing squash × velocity stretch
  const scaleX = b.landingStretch * velocitySquash; // Horizontal: landing stretch × velocity squash
  
  // --- Anchor bottom to floor when squashing (visual-only fix) ---
  // When squashed (scaleY < 1.0), offset vertically so bottom stays grounded
  // Offset = radius × (1 - scaleY) to keep bottom at same visual position
  const squashOffset = b.r * (1 - scaleY);
  // Only apply offset when on ground to keep bottom anchored
  const verticalOffset = b.onGround ? squashOffset : 0;
  
  push();
  translate(b.x, b.y + bobY + verticalOffset); // Apply bob offset + squash anchoring
  scale(scaleX, scaleY);
  
  beginShape();

  // Loop around a full circle
  for (let i = 0; i < b.points; i++) {
    // Angle around the circle
    const a = (i / b.points) * TAU;

    // Sample Perlin noise using the angle and time
    // This creates smooth, animated deformation
    const n = noise(
      cos(a) * b.wobbleFreq + 100,
      sin(a) * b.wobbleFreq + 100,
      b.t,
    );

    // Map noise value to a radius offset
    const r = b.r + map(n, 0, 1, -b.wobble, b.wobble);

    // Convert polar coordinates to screen space (relative to origin after translate)
    vertex(cos(a) * r, sin(a) * r);
  }

  endShape(CLOSE);
  pop();
}

// Draws a soft sky gradient from light blue at top to lighter blue at bottom
function drawSkyGradient() {
  // Top color: light sky blue
  const topR = 135;
  const topG = 206;
  const topB = 250;
  
  // Bottom color: lighter, warmer blue
  const bottomR = 173;
  const bottomG = 216;
  const bottomB = 230;
  
  // Draw gradient by drawing horizontal lines with interpolated colors
  for (let y = 0; y < floorY; y++) {
    const inter = map(y, 0, floorY, 0, 1);
    const r = lerp(topR, bottomR, inter);
    const g = lerp(topG, bottomG, inter);
    const b = lerp(topB, bottomB, inter);
    stroke(r, g, b);
    line(0, y, width, y);
  }
  noStroke();
}

// Draws a simple, joyful sun in the top-right corner
function drawSun() {
  fill(255, 220, 100); // Warm yellow
  const sunX = width - 60;
  const sunY = 50;
  const baseSunSize = 45;
  
  // Animate sun size with sine wave for gentle pulsing
  const pulseAmount = 3; // How much the size varies
  const pulseSpeed = 0.05; // Speed of the pulse
  const sunSize = baseSunSize + sin(frameCount * pulseSpeed) * pulseAmount;
  
  // Draw sun as a circle
  circle(sunX, sunY, sunSize);
  
  // Add simple rays around the sun (rays scale with sun size)
  stroke(255, 220, 100);
  strokeWeight(3);
  const rayLength = 15;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * TAU;
    const startX = sunX + cos(angle) * (sunSize / 2);
    const startY = sunY + sin(angle) * (sunSize / 2);
    const endX = sunX + cos(angle) * (sunSize / 2 + rayLength);
    const endY = sunY + sin(angle) * (sunSize / 2 + rayLength);
    line(startX, startY, endX, endY);
  }
  noStroke();
}

// Draws a simple rainbow arc in the background
function drawRainbow() {
  const rainbowX = width / 2;
  // Anchor bottom of rainbow to floor: arc center is at floorY - height/2
  const rainbowY = floorY; // Position so bottom of outer arc touches floorY
  const rainbowWidth = 400; // Doubled from 200
  const rainbowHeight = 160; // Doubled from 80
  
  // Draw rainbow as semi-transparent arcs
  // Colors from outer to inner: red, orange, yellow, green, blue
  const colors = [
    [255, 50, 50, 180],   // Red
    [255, 165, 0, 180],   // Orange
    [255, 255, 0, 180],   // Yellow
    [50, 205, 50, 180],   // Green
    [30, 144, 255, 180]   // Blue
  ];
  
  for (let i = 0; i < colors.length; i++) {
    fill(colors[i][0], colors[i][1], colors[i][2], colors[i][3]);
    const arcWidth = rainbowWidth - (i * 30); // Doubled spacing from 15 to 30
    const arcHeight = rainbowHeight - (i * 24); // Doubled spacing from 12 to 24
    arc(rainbowX, rainbowY, arcWidth, arcHeight, PI, 0);
  }
}

// Checks for collisions between blob and clouds, applies gentle forces
function checkCloudCollisions() {
  for (let cloud of clouds) {
    // Simple distance-based collision detection
    const dx = blob2.x - cloud.x;
    const dy = blob2.y - cloud.y;
    const distance = sqrt(dx * dx + dy * dy);
    const minDistance = blob2.r + cloud.size * 0.5; // Approximate cloud radius
    
    // If blob overlaps with cloud
    if (distance < minDistance && distance > 0) {
      // Calculate gentle push force based on blob's movement direction
      const pushStrength = 0.15; // Gentle, floaty force
      
      // Push cloud in direction of blob's movement
      // Use blob's velocity to determine push direction
      const pushX = blob2.vx * pushStrength;
      const pushY = blob2.vy * pushStrength;
      
      // Also add slight separation force to prevent sticking
      const separationForce = 0.05;
      const normalizedDx = dx / distance;
      const normalizedDy = dy / distance;
      
      // Apply gentle forces to cloud
      cloud.vx += pushX + normalizedDx * separationForce;
      cloud.vy += pushY + normalizedDy * separationForce;
    }
  }
}

// Draws and animates drifting clouds with velocity and damping
function drawClouds() {
  fill(255, 255, 255, 200); // White with slight transparency
  
  for (let i = 0; i < clouds.length; i++) {
    const cloud = clouds[i];
    
    // Draw cloud as overlapping circles for soft, puffy appearance
    circle(cloud.x, cloud.y, cloud.size);
    circle(cloud.x + cloud.size * 0.4, cloud.y, cloud.size * 0.8);
    circle(cloud.x - cloud.size * 0.4, cloud.y, cloud.size * 0.8);
    circle(cloud.x + cloud.size * 0.2, cloud.y - cloud.size * 0.3, cloud.size * 0.7);
    circle(cloud.x - cloud.size * 0.2, cloud.y - cloud.size * 0.3, cloud.size * 0.7);
    
    // Apply gentle base drift force (returns to calm drifting)
    const driftForce = 0.01; // Very gentle force
    cloud.vx = lerp(cloud.vx, -cloudSpeed, driftForce);
    cloud.vy = lerp(cloud.vy, 0, driftForce);
    
    // Apply damping to gradually slow down clouds
    cloud.vx *= cloudDamping;
    cloud.vy *= cloudDamping;
    
    // Update cloud position using velocity
    cloud.x += cloud.vx;
    cloud.y += cloud.vy;
    
    // Wrap clouds around when they go off screen
    if (cloud.x + cloud.size < 0) {
      cloud.x = width + cloud.size;
      cloud.y = random(40, floorY - 80); // Randomize height when wrapping
      cloud.vx = -cloudSpeed; // Reset to base drift
      cloud.vy = 0;
    }
    
    // Keep clouds within vertical bounds (soft constraint)
    if (cloud.y < 20) {
      cloud.y = 20;
      cloud.vy *= -0.3; // Gentle bounce
    }
    if (cloud.y > floorY - 60) {
      cloud.y = floorY - 60;
      cloud.vy *= -0.3; // Gentle bounce
    }
  }
}

// Creates sparkle particles at the given position (when blob reaches jump peak)
function createSparkles(x, y) {
  const numSparkles = 8; // Number of sparkles to create
  for (let i = 0; i < numSparkles; i++) {
    const angle = (i / numSparkles) * TAU; // Distribute sparkles in a circle
    const speed = random(1.5, 3); // Random speed for each sparkle
    sparkles.push({
      x: x,
      y: y,
      vx: cos(angle) * speed, // Horizontal velocity
      vy: sin(angle) * speed, // Vertical velocity
      size: random(3, 6), // Random size
      life: 1.0, // Lifetime (1.0 = full, 0.0 = faded out)
      fadeSpeed: random(0.02, 0.04) // How fast it fades
    });
  }
}

// Updates all sparkle particles (movement and fading)
function updateSparkles() {
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const sparkle = sparkles[i];
    
    // Update position
    sparkle.x += sparkle.vx;
    sparkle.y += sparkle.vy;
    
    // Apply slight gravity to sparkles
    sparkle.vy += 0.1;
    
    // Fade out over time
    sparkle.life -= sparkle.fadeSpeed;
    
    // Remove sparkles that have faded out
    if (sparkle.life <= 0) {
      sparkles.splice(i, 1);
    }
  }
}

// Draws all active sparkle particles
function drawSparkles() {
  for (let sparkle of sparkles) {
    // Sparkles fade as they age
    const alpha = sparkle.life * 255;
    
    // Draw sparkle as a bright, twinkling star
    fill(255, 255, 200, alpha); // Warm white/yellow
    noStroke();
    
    // Draw a small cross shape for sparkle effect
    const s = sparkle.size * sparkle.life; // Size also fades
    push();
    translate(sparkle.x, sparkle.y);
    // Draw cross shape
    rect(-s/2, -s/6, s, s/3);
    rect(-s/6, -s/2, s/3, s);
    pop();
  }
}

// Handle jump input (only triggers once per key press)
function keyPressed() {
  // Jump only if the blob is on the ground
  if (
    (key === " " || key === "W" || key === "w" || keyCode === UP_ARROW) &&
    blob2.onGround
  ) {
    // Apply an instant upward velocity
    blob2.vy = blob2.jumpV;

    // Blob is now airborne
    blob2.onGround = false;
  }
}

/* Quick tuning notes for students:
   Slippery floor → frictionGround = 0.95
   Higher jump    → jumpV = -12
   Heavier feel   → gravity = 0.8
*/
