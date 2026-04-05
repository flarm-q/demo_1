const boardSize = 20;
const scorePerFood = 10;
const bestScoreKey = 'demo_1_neon_snake_best_score';
const modes = {
  easy: {
    label: '简单',
    speed: 220,
    speedText: '低速',
    intro: '适合上手，先熟悉霓虹棋盘节奏。'
  },
  hard: {
    label: '困难',
    speed: 140,
    speedText: '高速',
    intro: '节奏明显加快，需要更快的方向判断。'
  },
  hell: {
    label: '地狱',
    speed: 90,
    speedText: '超高速',
    intro: '极限压迫模式，失误几乎没有挽回空间。'
  }
};

const board = document.getElementById('board');
const scoreEl = document.getElementById('score');
const bestScoreEl = document.getElementById('bestScore');
const currentModeEl = document.getElementById('currentMode');
const messageEl = document.getElementById('message');
const speedTagEl = document.getElementById('speedTag');
const stateBadgeEl = document.getElementById('stateBadge');
const overlayEl = document.getElementById('boardOverlay');
const overlayModeEl = document.getElementById('overlayMode');
const overlayTitleEl = document.getElementById('overlayTitle');
const overlayTextEl = document.getElementById('overlayText');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');
const modeButtons = document.querySelectorAll('.mode-btn');

const cells = [];
let snake = [];
let food = null;
let direction = 'right';
let nextDirection = 'right';
let score = 0;
let bestScore = getStoredBestScore();
let timer = null;
let gameStarted = false;
let gameOver = false;
let isPaused = false;
let currentMode = 'easy';

function getStoredBestScore() {
  const stored = window.localStorage.getItem(bestScoreKey);
  const parsed = Number(stored);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function saveBestScore() {
  window.localStorage.setItem(bestScoreKey, String(bestScore));
}

function createBoard() {
  board.innerHTML = '';
  cells.length = 0;

  for (let row = 0; row < boardSize; row += 1) {
    for (let col = 0; col < boardSize; col += 1) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      board.appendChild(cell);
      cells.push(cell);
    }
  }
}

function getIndex(position) {
  return position.y * boardSize + position.x;
}

function draw() {
  cells.forEach((cell) => {
    cell.className = 'cell';
  });

  if (food) {
    cells[getIndex(food)].classList.add('food');
  }

  snake.forEach((segment, index) => {
    const cell = cells[getIndex(segment)];
    cell.classList.add('snake');

    if (index === 0) {
      cell.classList.add('head');
    }
  });
}

function updateScore() {
  scoreEl.textContent = String(score);

  if (score > bestScore) {
    bestScore = score;
    saveBestScore();
  }

  bestScoreEl.textContent = String(bestScore);
}

function setMessage(text) {
  messageEl.textContent = text;
}

function setStateBadge(text) {
  stateBadgeEl.textContent = text;
}

function showOverlay(title, text) {
  overlayModeEl.textContent = `${modes[currentMode].label}模式`;
  overlayTitleEl.textContent = title;
  overlayTextEl.textContent = text;
  overlayEl.classList.remove('hidden');
}

function hideOverlay() {
  overlayEl.classList.add('hidden');
}

function getRandomFoodPosition() {
  const emptyPositions = [];

  for (let y = 0; y < boardSize; y += 1) {
    for (let x = 0; x < boardSize; x += 1) {
      const occupied = snake.some((segment) => segment.x === x && segment.y === y);
      if (!occupied) {
        emptyPositions.push({ x, y });
      }
    }
  }

  if (emptyPositions.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * emptyPositions.length);
  return emptyPositions[randomIndex];
}

function spawnFood() {
  food = getRandomFoodPosition();
}

function updateModeUI() {
  const mode = modes[currentMode];
  currentModeEl.textContent = mode.label;
  speedTagEl.textContent = mode.speedText;
  document.body.className = `mode-${currentMode}`;

  modeButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.mode === currentMode);
  });
}

function resetGame() {
  snake = [
    { x: 3, y: 10 },
    { x: 2, y: 10 },
    { x: 1, y: 10 }
  ];
  direction = 'right';
  nextDirection = 'right';
  score = 0;
  gameOver = false;
  isPaused = false;
  updateScore();
  spawnFood();
  draw();
  updateModeUI();
  setStateBadge('待命中');
  pauseBtn.textContent = '暂停游戏';
  setMessage(`当前为${modes[currentMode].label}模式，点击“开始游戏”开始`);
  showOverlay('准备开始', modes[currentMode].intro);
}

function getNextHead() {
  const head = snake[0];

  if (direction === 'up') {
    return { x: head.x, y: head.y - 1 };
  }

  if (direction === 'down') {
    return { x: head.x, y: head.y + 1 };
  }

  if (direction === 'left') {
    return { x: head.x - 1, y: head.y };
  }

  return { x: head.x + 1, y: head.y };
}

function isOutOfBounds(position) {
  return (
    position.x < 0 ||
    position.x >= boardSize ||
    position.y < 0 ||
    position.y >= boardSize
  );
}

function stopGame(endMessage) {
  clearInterval(timer);
  timer = null;
  gameOver = true;
  gameStarted = false;
  isPaused = false;
  pauseBtn.textContent = '暂停游戏';
  setStateBadge('已结束');
  setMessage(endMessage);
  showOverlay('挑战结束', endMessage);
}

function moveSnake() {
  direction = nextDirection;
  const nextHead = getNextHead();
  const willEatFood = food && nextHead.x === food.x && nextHead.y === food.y;
  const nextSnake = [nextHead, ...snake];

  if (!willEatFood) {
    nextSnake.pop();
  }

  if (isOutOfBounds(nextHead)) {
    stopGame('游戏结束：撞墙了，点击“重新开始”再挑战一次');
    return;
  }

  const hitSelf = nextSnake.slice(1).some((segment) => segment.x === nextHead.x && segment.y === nextHead.y);
  if (hitSelf) {
    stopGame('游戏结束：撞到自己了，点击“重新开始”再挑战一次');
    return;
  }

  snake = nextSnake;

  if (willEatFood) {
    score += scorePerFood;
    updateScore();
    spawnFood();
    setMessage(`已吞噬目标，当前分数 ${score}`);

    if (!food) {
      draw();
      stopGame('恭喜你，已经征服整个棋盘');
      return;
    }
  }

  draw();
}

function startGame() {
  if (gameStarted || gameOver) {
    return;
  }

  gameStarted = true;
  isPaused = false;
  pauseBtn.textContent = '暂停游戏';
  setStateBadge('进行中');
  setMessage(`${modes[currentMode].label}模式进行中`);
  hideOverlay();
  timer = setInterval(moveSnake, modes[currentMode].speed);
}

function pauseGame() {
  if (!gameStarted || gameOver || isPaused) {
    return;
  }

  clearInterval(timer);
  timer = null;
  isPaused = true;
  pauseBtn.textContent = '继续游戏';
  setStateBadge('已暂停');
  setMessage('游戏已暂停，按空格或点击按钮继续');
  showOverlay('已暂停', '按空格键或点击“继续游戏”返回战场。');
}

function resumeGame() {
  if (!gameStarted || gameOver || !isPaused) {
    return;
  }

  isPaused = false;
  pauseBtn.textContent = '暂停游戏';
  setStateBadge('进行中');
  setMessage(`${modes[currentMode].label}模式继续中`);
  hideOverlay();
  timer = setInterval(moveSnake, modes[currentMode].speed);
}

function togglePause() {
  if (!gameStarted || gameOver) {
    return;
  }

  if (isPaused) {
    resumeGame();
    return;
  }

  pauseGame();
}

function restartGame() {
  clearInterval(timer);
  timer = null;
  gameStarted = false;
  resetGame();
}

function setMode(mode) {
  if (!modes[mode] || gameStarted) {
    return;
  }

  currentMode = mode;
  restartGame();
}

function isOppositeDirection(current, next) {
  return (
    (current === 'up' && next === 'down') ||
    (current === 'down' && next === 'up') ||
    (current === 'left' && next === 'right') ||
    (current === 'right' && next === 'left')
  );
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    togglePause();
    return;
  }

  const keyToDirection = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right'
  };

  const chosenDirection = keyToDirection[event.key];
  if (!chosenDirection) {
    return;
  }

  event.preventDefault();

  if (!gameStarted && !gameOver) {
    startGame();
  }

  if (isPaused || isOppositeDirection(direction, chosenDirection)) {
    return;
  }

  nextDirection = chosenDirection;
});

modeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setMode(button.dataset.mode);
  });
});

startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
restartBtn.addEventListener('click', restartGame);

createBoard();
updateScore();
resetGame();
