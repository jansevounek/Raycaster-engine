console.log("hello")

// constants
const CONTAINER = document.getElementById("container")
const PLAYER = document.getElementById("player")
const CANVAS = document.getElementById("rays")
const TILESIZE = 40
const MAP = [
    "#############",
    "#.......#...#",
    "#.#.....#...#",
    "#...........#",
    "#.....#######",
    "#...........#",
    "#############"
]
const PLAYER_SPEED = 2
const FOV = Math.PI / 3
const RAYS_COUNT = 30
const STEP_ANGLE = FOV / (RAYS_COUNT - 1)
const KEYS = {
    w: false,
    a: false,
    s: false,
    d: false
}
const INDICATIONLINE = 40

// variables
let player_top = 50
let player_left = 50
let player_angle = 0
let obstacle_list = []
let rayAngle = 0

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


function setup() {
    generateMap()
    resizeCanvas()
}

function generateMap(){
    for(x = 0; x < MAP.length; x++){
        let row = document.createElement("div")
        row.className = "row"
        row.id = "row-" + x
        CONTAINER.appendChild(row)
        for(y = 0; y < MAP[x].length; y++){
            let tile = document.createElement("div")
            if (MAP[x].charAt(y) == "#"){
                tile.className = "map-tile bg-blue-600"
                tile.id = "block-" + x + "-" + y
                obstacle_list.push(tile)
            } else {
                tile.className = "map-tile bg-white"
                tile.id = "ground-" + x + "-" + y
            }
            row.appendChild(tile)
        }
    }
    CANVAS.style.height = CONTAINER.style.height
    CANVAS.style.width = CONTAINER.style.width
}

function movePlayer() {
    new_player_top = player_top
    new_player_left = player_left
    if (KEYS.w) {
        new_player_left += Math.sin(player_angle) * PLAYER_SPEED
        new_player_top += Math.cos(player_angle) * PLAYER_SPEED
    }
    if (KEYS.a) {
        player_angle += 0.05
    }
    if (KEYS.d) {
        player_angle -= 0.05
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

    for(let i = 0; i < RAYS_COUNT; i++){
        ctx.moveTo(playerCenterX, playerCenterY)
        rayAngle = player_angle - FOV / 2 + i * STEP_ANGLE;

        const closestIntersection = findClosestIntersection(playerCenterX, playerCenterY);

        if (closestIntersection) {
            ctx.lineTo(closestIntersection.x, closestIntersection.y);
        } else {
            const rayEndX = playerCenterX + 1000 * Math.cos(rayAngle);
            const rayEndY = playerCenterY + 1000 * Math.sin(rayAngle);
            ctx.lineTo(rayEndX, rayEndY);
        }
        ctx.stroke()
    }
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
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;
}

requestAnimationFrame(movePlayer);
setup()

