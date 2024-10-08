// constants
const MAP_CONTAINER = document.getElementById("map-container")
const GAME_CONTAINER = document.getElementById("game-container")
const PLAYER = document.getElementById("player")
const CANVAS = document.getElementById("rays")
const VIEW_CANVAS = document.getElementById("viewCanvas")
const FORWARD_BUTTON = document.getElementById("forward")
const LEFT_BUTTON = document.getElementById("left")
const BACK_BUTTON = document.getElementById("back")
const RIGHT_BUTTON = document.getElementById("right")
const TILESIZE = 20
const MAX_VIEW_DISTANCE = 800
const MAP = [
    "##########",
    "#........#",
    "#.....####",
    "#........#",
    "#.....####",
    "#........#",
    "####.....#",
    "#........#",
    "####.....#",
    "#........#",
    "#.....####",
    "#........#",
    "#.....####",
    "#..#.....#",
    "#..#.....#",
    "##########"
]
const PLAYER_SPEED = 0.6
const FOV = Math.PI / 3
const RAYS_COUNT = 60
const STEP_ANGLE = FOV / (RAYS_COUNT - 1)
const CONTROLS = {
    rotateLeft: false,
    rotateRight: false,
    moveForward: false,
    moveBackward: false
};
const INDICATIONLINE = 40
const CEILING_COLOR = '#414288'
const FLOOR_COLOR = '#5FB49C'

// variables
let wallBaseColor = { r: 104, g: 45, b: 99 };
let player_top = 50
let player_left = 150
let player_angle = 0
let obstacle_list = []
let rayAngle = 0

async function setup() {
    generateMap()
    resizeCanvas()
    setupGame()
}

window.addEventListener('resize', resizeCanvas);

LEFT_BUTTON.addEventListener('touchstart', () => CONTROLS.rotateLeft = true);
RIGHT_BUTTON.addEventListener('touchstart', () => CONTROLS.rotateRight = true);
FORWARD_BUTTON.addEventListener('touchstart', () => CONTROLS.moveForward = true);
BACK_BUTTON.addEventListener('touchstart', () => CONTROLS.moveBackward = true);

LEFT_BUTTON.addEventListener('touchend', () => CONTROLS.rotateLeft = false);
RIGHT_BUTTON.addEventListener('touchend', () => CONTROLS.rotateRight = false);
FORWARD_BUTTON.addEventListener('touchend', () => CONTROLS.moveForward = false);
BACK_BUTTON.addEventListener('touchend', () => CONTROLS.moveBackward = false);


function generateMap(){
    for(x = 0; x < MAP.length; x++){
        let row = document.createElement("div")
        row.className = "row"
        row.id = "row-" + x
        MAP_CONTAINER.appendChild(row)
        for(y = 0; y < MAP[x].length; y++){
            let tile = document.createElement("div")
            if (MAP[x].charAt(y) == "#"){
                tile.className = "mobile-map-tile bg-blue-600"
                tile.id = "block-" + x + "-" + y
                obstacle_list.push(tile)
            } else {
                tile.className = "mobile-map-tile bg-white"
                tile.id = "ground-" + x + "-" + y
            }
            row.appendChild(tile)
        }
    }
}

function setupGame() {
    VIEW_CANVAS.width = GAME_CONTAINER.getBoundingClientRect().width - 3
    VIEW_CANVAS.height = GAME_CONTAINER.getBoundingClientRect().height
}

function movePlayer() {
    new_player_top = player_top
    new_player_left = player_left

    if (CONTROLS.moveForward) {
        new_player_left += Math.sin(player_angle) * PLAYER_SPEED
        new_player_top += Math.cos(player_angle) * PLAYER_SPEED
    }
    if (CONTROLS.moveBackward) {
        new_player_left -= Math.sin(player_angle) * PLAYER_SPEED
        new_player_top -= Math.cos(player_angle) * PLAYER_SPEED
    }
    if (CONTROLS.rotateLeft) {
        player_angle -= 0.02
    }
    if (CONTROLS.rotateRight) {
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
                new_player_top = obstacleRect.top - player.offsetHeight; 
            } else if (minOver === overlapB) {
                new_player_top = obstacleRect.bottom; 
            } else if (minOver === overlapL) {
                new_player_left = obstacleRect.left - player.offsetWidth; 
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
    ctx.clearRect(0, 0, CANVAS.width, CANVAS.width)

    drawRays(player_top, player_left);

    requestAnimationFrame(movePlayer);
}


function drawRays(player_top, player_left) {
    const playerCenterX = player_left + player.offsetWidth / 2;
    const playerCenterY = player_top + player.offsetHeight / 2;

    const ctx = CANVAS.getContext("2d")

    ctx.beginPath();

    ctx.strokeStyle = "red"
    ctx.lineWidth = 1

    drawOthers()

    for(let i = 0; i < RAYS_COUNT; i++){
        ctx.moveTo(playerCenterX, playerCenterY)
        rayAngle = player_angle - FOV / 2 + i * STEP_ANGLE;

        const closestIntersection = findClosestIntersection(playerCenterX, playerCenterY);

        if (closestIntersection) {
            drawToMap(closestIntersection, ctx);
            drawTo3d(closestIntersection, playerCenterX, playerCenterY, i)
        }
    }
}

function drawToMap(closestIntersection, ctx) {
    ctx.lineTo(closestIntersection.x, closestIntersection.y);
    ctx.stroke()
}

function drawTo3d(closestIntersection, playerCenterX, playerCenterY, i) {
    const distance = Math.sqrt(Math.pow(closestIntersection.x - playerCenterX, 2) + Math.pow(closestIntersection.y - playerCenterY, 2));

    ctx = VIEW_CANVAS.getContext("2d")

    const correctedDistance = distance * Math.cos(rayAngle - player_angle);

    const sliceHeight = Math.min((MAX_VIEW_DISTANCE * 20) / correctedDistance, MAX_VIEW_DISTANCE);

    const shade = Math.max(50, 255 - (correctedDistance / MAX_VIEW_DISTANCE) * 255);

    const wallColor = `rgb(${(wallBaseColor.r * shade) / 255}, ${(wallBaseColor.g * shade) / 255}, ${(wallBaseColor.b * shade) / 255})`;

    ctx.fillStyle = wallColor;
    ctx.fillRect(i * (VIEW_CANVAS.width / RAYS_COUNT), (VIEW_CANVAS.height - sliceHeight) / 2, VIEW_CANVAS.width / RAYS_COUNT, sliceHeight);
}

function drawOthers() {
    ctx = VIEW_CANVAS.getContext("2d")
    ctx.fillStyle = CEILING_COLOR
    ctx.fillRect(0, 0, VIEW_CANVAS.width, VIEW_CANVAS.height / 2)
    ctx.fillStyle = FLOOR_COLOR
    ctx.fillRect(0, VIEW_CANVAS.height / 2, VIEW_CANVAS.width, VIEW_CANVAS.height / 2)
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
                    closestIntersection = intersection;
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
    CANVAS.width = window.innerWidth
    CANVAS.height = GAME_CONTAINER.getBoundingClientRect().height;
}

requestAnimationFrame(movePlayer);
setup()