// constants
const MAP_CONTAINER = document.getElementById("map-container")
const GAME_CONTAINER = document.getElementById("game-container")
const PLAYER = document.getElementById("player")
const CANVAS = document.getElementById("rays")
const VIEW_CANVAS = document.getElementById("viewCanvas")
const TILESIZE = 40
const MAX_VIEW_DISTANCE = 800
const MAP = [
    "##########",
    "#........#",
    "#.....####",
    "#........A", // Portal A
    "#.....####",
    "#........#",
    "####.....#",
    "#........#", 
    "####.....#",
    "#........B", // Portal B
    "#.....####",
    "#........#",
    "#.....####",
    "#..#.....#",
    "#..#.....C", // Portal C
    "##########"
]
const PLAYER_SPEED = 1
const FOV = Math.PI / 3
const RAYS_COUNT = 80
const STEP_ANGLE = FOV / (RAYS_COUNT - 1)
const KEYS = {
    w: false,
    a: false,
    s: false,
    d: false
}
const INDICATIONLINE = 40
const CEILING_COLOR = '#0079ce'
const FLOOR_COLOR = '#2e9500'

// variables
let wallBaseColor = { r: 170, g: 103, b: 0 };

// --- PORTALS CONFIGURATION ---
const PORTALS_CONFIG = {
    'A': {
        color: { r: 204, g: 0, b: 11 },     // Red
        url: "https://github.com/jansevounek/Learner",
        label: "Portal A",
        description: "My Learner application (my biggest project to date)."
    },
    'B': {
        color: { r: 0, g: 150, b: 255 },    // Light Blue
        url: "https://github.com/jansevounek",
        label: "Portal B",
        description: "My github :]."
    },
    'C': {
        color: { r: 155, g: 48, b: 255 },   // Purple
        url: "https://github.com/jansevounek/Raycaster-engine",
        label: "Portal C",
        description: "Repository of this very abomination \\ (^_^) /."
    }
};

let hasRedirected = false;                  
let player_top = 50
let player_left = 50
let player_angle = 0
let obstacle_list = []
let rayAngle = 0

async function setup() {
    generateMap()
    resizeCanvas()
    setupGame()
    createLegend() // Creates the visual legend overlay on setup
}

window.addEventListener('resize', resizeCanvas);
document.addEventListener('keydown', (event) => {
    if (event.key in KEYS) {
        KEYS[event.key] = true;
    }
});

document.addEventListener('keyup', (event) => {
    if (event.key in KEYS) {
        KEYS[event.key] = false;
    }
});

function generateMap(){
    for(let x = 0; x < MAP.length; x++){
        let row = document.createElement("div")
        row.className = "row"
        row.id = "row-" + x
        MAP_CONTAINER.appendChild(row)
        for(let y = 0; y < MAP[x].length; y++){
            let tile = document.createElement("div")
            let char = MAP[x].charAt(y);
            
            if (char === "#" || PORTALS_CONFIG[char]) {
                tile.dataset.type = char; 
                
                if (char === "#") {
                    tile.className = "map-tile";
                    tile.style.backgroundColor = `rgb(${wallBaseColor.r}, ${wallBaseColor.g}, ${wallBaseColor.b})`; 
                } else {
                    tile.className = "map-tile";
                    const pColor = PORTALS_CONFIG[char].color;
                    tile.style.backgroundColor = `rgb(${pColor.r}, ${pColor.g}, ${pColor.b})`; 
                    tile.innerText = char; 
                    tile.style.color = "#fff";
                    tile.style.textAlign = "center";
                    tile.style.fontSize = "12px";
                    tile.style.lineHeight = "20px"; 
                }
                
                tile.id = "block-" + x + "-" + y
                obstacle_list.push(tile)
            } else {
                tile.className = "map-tile bg-white"
                tile.id = "ground-" + x + "-" + y
            }
            row.appendChild(tile)
        }
    }
}

// --- REFINED: Appends safely to body to avoid blocking your game canvases ---
function createLegend() {
    let legendContainer = document.getElementById("portal-legend");
    if (!legendContainer) {
        legendContainer = document.createElement("div");
        legendContainer.id = "portal-legend";
        legendContainer.style.position = "absolute";
        legendContainer.style.bottom = "10px";
        legendContainer.style.left = "10px";
        legendContainer.style.padding = "15px";
        legendContainer.style.fontFamily = "sans-serif";
        legendContainer.style.background = "rgba(34, 34, 34, 0.9)";
        legendContainer.style.color = "#fff";
        legendContainer.style.borderRadius = "8px";
        legendContainer.style.zIndex = "100"; // Ensures it sits cleanly on top of backgrounds
        legendContainer.style.boxShadow = "0 4px 6px rgba(0,0,0,0.3)";
        document.body.appendChild(legendContainer); // Safely append directly to the body
    }

    legendContainer.innerHTML = "<h3 style='margin-top:0; margin-bottom:10px; font-size:16px; border-bottom:1px solid #444; padding-bottom:5px;'>Portal Destinations</h3>";
    
    for (let key in PORTALS_CONFIG) {
        const portal = PORTALS_CONFIG[key];
        const pColor = portal.color;

        const entry = document.createElement("div");
        entry.style.display = "flex";
        entry.style.alignItems = "center";
        entry.style.marginBottom = "8px";

        entry.innerHTML = `
            <div style="width: 22px; height: 22px; background-color: rgb(${pColor.r}, ${pColor.g}, ${pColor.b}); border-radius: 4px; margin-right: 12px; display: inline-block; text-align: center; color: white; font-weight: bold; font-size: 13px; line-height: 22px;">${key}</div>
            <div style="font-size: 14px;"><strong>${portal.label}</strong>: ${portal.description}</div>
        `;
        legendContainer.appendChild(entry);
    }
}

function setupGame() {
    let width = MAP_CONTAINER.getBoundingClientRect().width
    GAME_CONTAINER.style.left = width + "px"
    GAME_CONTAINER.style.width = window.innerWidth - width - 20 + "px"

    VIEW_CANVAS.width = GAME_CONTAINER.getBoundingClientRect().width - 3
    VIEW_CANVAS.height = GAME_CONTAINER.getBoundingClientRect().height
}

function movePlayer() {
    let new_player_top = player_top
    let new_player_left = player_left
    if (KEYS.w) {
        new_player_left += Math.sin(player_angle) * PLAYER_SPEED
        new_player_top += Math.cos(player_angle) * PLAYER_SPEED
    }
    if (KEYS.s) {
        new_player_left -= Math.sin(player_angle) * PLAYER_SPEED
        new_player_top -= Math.cos(player_angle) * PLAYER_SPEED
    }
    if (KEYS.a) {
        player_angle -= 0.02
    }
    if (KEYS.d) {
        player_angle += 0.02
    }

    const playerRect = {
        top: new_player_top,
        bottom: new_player_top + PLAYER.offsetHeight,
        left: new_player_left,
        right: new_player_left + PLAYER.offsetWidth
    }

    obstacle_list.forEach((obs) => {
        const obstacleRect = obs.getBoundingClientRect()

        if (
            playerRect.right > obstacleRect.left &&
            playerRect.left < obstacleRect.right &&
            playerRect.bottom > obstacleRect.top &&
            playerRect.top < obstacleRect.bottom
        ) {
            const overlapT = playerRect.bottom - obstacleRect.top;
            const overlapB = obstacleRect.bottom - playerRect.top;
            const overlapL = playerRect.right - obstacleRect.left;
            const overlapR = obstacleRect.right - playerRect.left
    
            const minOver = Math.min(overlapT, overlapB, overlapL, overlapR)
    
            if (minOver === overlapT) {
                new_player_top = obstacleRect.top - PLAYER.offsetHeight; 
            } else if (minOver === overlapB) {
                new_player_top = obstacleRect.bottom; 
            } else if (minOver === overlapL) {
                new_player_left = obstacleRect.left - PLAYER.offsetWidth; 
            } else if (minOver === overlapR) {
                new_player_left = obstacleRect.right; 
            }
        }
    })

    player_top = new_player_top
    player_left = new_player_left
    PLAYER.style.top = player_top + 'px';
    PLAYER.style.left = player_left + 'px';

    const ctx = CANVAS.getContext("2d")
    ctx.clearRect(0, 0, CANVAS.width, CANVAS.height)

    drawRays(player_top, player_left);

    // --- POPUP & REDIRECT LOGIC ---
    if (!hasRedirected) {
        obstacle_list.forEach((obs) => {
            const wallType = obs.dataset.type;
            
            if (PORTALS_CONFIG[wallType]) {
                const obsRect = obs.getBoundingClientRect();
                
                const playerCenterX = player_left + PLAYER.offsetWidth / 2;
                const playerCenterY = player_top + PLAYER.offsetHeight / 2;
                const obsCenterX = obsRect.left + obsRect.width / 2;
                const obsCenterY = obsRect.top + obsRect.height / 2;

                const distance = Math.sqrt(
                    Math.pow(playerCenterX - obsCenterX, 2) + 
                    Math.pow(playerCenterY - obsCenterY, 2)
                );

                if (distance < 50) {
                    hasRedirected = true; 
                    
                    const portal = PORTALS_CONFIG[wallType];
                    const userConfirmed = confirm(`Do you want to enter ${portal.label}?\nDestination: ${portal.description}`);
                    if (userConfirmed) {
                        window.location.href = portal.url;
                    } else {
                        setTimeout(() => { hasRedirected = false; }, 2000);
                    }
                }
            }
        });
    }

    requestAnimationFrame(movePlayer);
}

function drawRays(player_top, player_left) {
    const playerCenterX = player_left + PLAYER.offsetWidth / 2;
    const playerCenterY = player_top + PLAYER.offsetHeight / 2;

    const ctx = CANVAS.getContext("2d")

    ctx.beginPath();
    ctx.strokeStyle = "red"
    ctx.lineWidth = 1

    drawOthers(ctx)

    for(let i = 0; i < RAYS_COUNT; i++){
        ctx.moveTo(playerCenterX, playerCenterY)
        rayAngle = player_angle - FOV / 2 + i * STEP_ANGLE;

        const closestIntersection = findClosestIntersection(playerCenterX, playerCenterY);

        if (closestIntersection) {
            drawToMap(closestIntersection, ctx);
            drawTo3d(closestIntersection, playerCenterX, playerCenterY, ctx, i)
        }
    }
}

function drawToMap(closestIntersection, ctx) {
    ctx.lineTo(closestIntersection.x, closestIntersection.y);
    ctx.stroke()
}

function drawTo3d(closestIntersection, playerCenterX, playerCenterY, ctx, i) {
    const distance = Math.sqrt(Math.pow(closestIntersection.x - playerCenterX, 2) + Math.pow(closestIntersection.y - playerCenterY, 2));
    const correctedDistance = distance * Math.cos(rayAngle - player_angle);
    const sliceHeight = Math.min((MAX_VIEW_DISTANCE * 75) / correctedDistance, MAX_VIEW_DISTANCE);
    const shade = Math.max(50, 255 - (correctedDistance / MAX_VIEW_DISTANCE) * 255);

    let baseColor = wallBaseColor;
    if (PORTALS_CONFIG[closestIntersection.type]) {
        baseColor = PORTALS_CONFIG[closestIntersection.type].color;
    }

    const wallColor = `rgb(${(baseColor.r * shade) / 255}, ${(baseColor.g * shade) / 255}, ${(baseColor.b * shade) / 255})`;

    ctx.fillStyle = wallColor;
    ctx.fillRect(i * (VIEW_CANVAS.width / RAYS_COUNT) + MAP_CONTAINER.getBoundingClientRect().width, (VIEW_CANVAS.height - sliceHeight) / 2, VIEW_CANVAS.width / RAYS_COUNT, sliceHeight);
}

function drawOthers(ctx) {
    ctx.fillStyle = CEILING_COLOR
    ctx.fillRect(MAP_CONTAINER.getBoundingClientRect().width, 0, VIEW_CANVAS.width, VIEW_CANVAS.height / 2)
    
    ctx.fillStyle = FLOOR_COLOR
    ctx.fillRect(MAP_CONTAINER.getBoundingClientRect().width, VIEW_CANVAS.height / 2, VIEW_CANVAS.width, VIEW_CANVAS.height / 2)
}

function findClosestIntersection(playerX, playerY) {
    let closestIntersection = null;
    let minDistance = Infinity;

    obstacle_list.forEach(obstacle => {
        const obstacleRect = obstacle.getBoundingClientRect();
        const obstacleSides = [
            { x1: obstacleRect.left, y1: obstacleRect.top, x2: obstacleRect.right, y2: obstacleRect.top },
            { x1: obstacleRect.left, y1: obstacleRect.top, x2: obstacleRect.left, y2: obstacleRect.bottom },
            { x1: obstacleRect.right, y1: obstacleRect.top, x2: obstacleRect.right, y2: obstacleRect.bottom },
            { x1: obstacleRect.left, y1: obstacleRect.bottom, x2: obstacleRect.right, y2: obstacleRect.bottom }
        ];

        obstacleSides.forEach(side => {
            const intersection = getIntersection(
                playerX, playerY,
                playerX + Math.sin(rayAngle) * 1000, playerY + Math.cos(rayAngle) * 1000,
                side.x1, side.y1, side.x2, side.y2
            );

            if (intersection) {
                const distance = Math.sqrt(Math.pow(intersection.x - playerX, 2) + Math.pow(intersection.y - playerY, 2));
                if (distance < minDistance) {
                    minDistance = distance;
                    closestIntersection = {
                        x: intersection.x,
                        y: intersection.y,
                        type: obstacle.dataset.type 
                    };
                }
            }
        });
    });

    return closestIntersection;
}

function getIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denominator === 0) return null;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

    if (t >= 0 && u >= 0 && u <= 1) {
        const intersectionX = x1 + t * (x2 - x1);
        const intersectionY = y1 + t * (y2 - y1);
        return { x: intersectionX, y: intersectionY };
    }

    return null;
}

function resizeCanvas() {
    CANVAS.width = window.innerWidth - 60;
    CANVAS.height = window.innerHeight - 60;

    VIEW_CANVAS.width = GAME_CONTAINER.getBoundingClientRect().width - 3
    VIEW_CANVAS.height = GAME_CONTAINER.getBoundingClientRect().height
}

requestAnimationFrame(movePlayer);
setup();
