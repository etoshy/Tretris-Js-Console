// Limpa a página
document.body.innerHTML = '';
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#111';
document.body.style.display = 'flex';
document.body.style.justifyContent = 'center';
document.body.style.alignItems = 'center';
document.body.style.height = '100vh';

// Cria canvas principal
const canvas = document.createElement('canvas');
canvas.width = 450;
canvas.height = 600;
document.body.appendChild(canvas);

const ctx = canvas.getContext('2d');

// Variáveis de configuração
const blockSize = 30;
const cols = 10;
const rows = 20;
const smallBlockSize = 20; // Tamanho reduzido para a próxima peça

// Variáveis do jogo
let gameActive = true;
let level = 1;
let startTime = null;
let playTime = 0;
let playerNickname = "Jogador";
let dropCounter = 0;
let dropInterval = 800; // Intervalo inicial será substituído pela dificuldade
let lastTime = 0;
let initialChoiceTime = 15; // 15 segundos para escolher dificuldade
let choiceTimeRemaining = initialChoiceTime;
let difficultyChosen = false;
let countdownInterval = null;
let difficulty = 'Difícil'; // Dificuldade padrão alterada para Difícil

// Configurações de dificuldade - Ajustadas para começar com velocidades mais altas
const difficulties = {
  'Fácil': { baseInterval: 700, levelStep: 50 },
  'Médio': { baseInterval: 550, levelStep: 60 },
  'Difícil': { baseInterval: 400, levelStep: 70 }, // Velocidade inicial mais alta
  'Hard': { baseInterval: 300, levelStep: 80 },
  'Extremo': { baseInterval: 200, levelStep: 90 },
  'Maluquice': { baseInterval: 100, levelStep: 100 }
};

// Cores
const colors = [
  null,
  '#00f0f0', // I - cyan
  '#0000f0', // J - blue
  '#f0a000', // L - orange
  '#f0f000', // O - yellow
  '#00f000', // S - green
  '#a000f0', // T - purple
  '#f00000'  // Z - red
];

// Contexto de áudio para sons e música
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Som simples
function beep(freq = 600, duration = 0.1, volume = 0.05) {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
}

// Som para quando sobe de nível
function levelUpSound() {
    beep(880, 0.1, 0.1);
    setTimeout(() => beep(1100, 0.1, 0.1), 100);
    setTimeout(() => beep(1320, 0.2, 0.1), 200);
}

// Música de fundo do Tetris usando Web Audio API
let musicPlaying = false;
let musicPosition = 0;
let musicTimeout = null;
const musicGain = audioCtx.createGain();
musicGain.gain.value = 0.2; // Volume da música
musicGain.connect(audioCtx.destination);

// Notas e durações exatas da música do Tetris
const tetrisTheme = {
  frequency: [
    659.25511, 493.8833, 523.25113, 587.32954, 523.25113, 493.8833, 440.0, 440.0, 
    523.25113, 659.25511, 587.32954, 523.25113, 493.8833, 523.25113, 587.32954, 
    659.25511, 523.25113, 440.0, 440.0, 440.0, 493.8833, 523.25113, 587.32954, 
    698.45646, 880.0, 783.99087, 698.45646, 659.25511, 523.25113, 659.25511, 
    587.32954, 523.25113, 493.8833, 493.8833, 523.25113, 587.32954, 659.25511, 
    523.25113, 440.0, 440.0
  ],
  duration: [
    406.250, 203.125, 203.125, 406.250, 203.125, 203.125, 406.250, 203.125, 
    203.125, 406.250, 203.125, 203.125, 609.375, 203.125, 406.250, 406.250, 
    406.250, 406.250, 203.125, 203.125, 203.125, 203.125, 609.375, 203.125, 
    406.250, 203.125, 203.125, 609.375, 203.125, 406.250, 203.125, 203.125, 
    406.250, 203.125, 203.125, 406.250, 406.250, 406.250, 406.250, 406.250
  ]
};

// Função para tocar a música
function playTetrisTheme() {
  if (musicPlaying) return;
  
  musicPlaying = true;
  
  function playNote(index) {
    if (!musicPlaying) return;
    
    if (index >= tetrisTheme.frequency.length) {
      // Recomeça do início quando terminar todas as notas
      musicPosition = 0;
      playNote(0);
      return;
    }
    
    const note = tetrisTheme.frequency[index];
    const duration = tetrisTheme.duration[index] / 1000; // Converte ms para segundos
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = 'square';
    oscillator.frequency.value = note;
    
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration * 0.9);
    
    oscillator.connect(gainNode);
    gainNode.connect(musicGain);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);
    
    // Armazena a posição atual na música
    musicPosition = index;
    
    // Agenda a próxima nota
    if (musicPlaying) {
      musicTimeout = setTimeout(() => {
        playNote(index + 1);
      }, duration * 1000);
    }
  }
  
  // Começa a tocar a partir da posição atual
  playNote(musicPosition);
}

function stopMusic() {
  musicPlaying = false;
  if (musicTimeout) {
    clearTimeout(musicTimeout);
    musicTimeout = null;
  }
  // Não resetamos musicPosition para continuar de onde parou
}

function toggleMusic() {
  if (musicPlaying) {
    stopMusic();
  } else {
    playTetrisTheme();
  }
}

// Matriz
function createMatrix(w, h) {
  const matrix = [];
  while (h--) matrix.push(new Array(w).fill(0));
  return matrix;
}

// Peças
const pieces = 'TJLOSZI';
function createPiece(type) {
  if (type === 'T') return [[0,0,0],[1,1,1],[0,1,0]];
  if (type === 'O') return [[2,2],[2,2]];
  if (type === 'L') return [[0,3,0],[0,3,0],[0,3,3]];
  if (type === 'J') return [[0,4,0],[0,4,0],[4,4,0]];
  if (type === 'I') return [[0,5,0,0],[0,5,0,0],[0,5,0,0],[0,5,0,0]];
  if (type === 'S') return [[0,6,6],[6,6,0],[0,0,0]];
  if (type === 'Z') return [[7,7,0],[0,7,7],[0,0,0]];
}

// Arena e jogador
const arena = createMatrix(cols, rows);
let player = {
  pos: {x: 0, y: 0},
  matrix: null,
  next: createPiece(pieces[Math.floor(Math.random() * pieces.length)]),
  score: 0,
  linesCleared: 0
};

// Lógica do jogo
// Função de atualização de nível modificada
function updateLevel() {
  // O nível já é calculado com base no número de linhas removidas
  // Mantemos a lógica, já que seu código original já faz isso:
  const newLevel = Math.floor(player.linesCleared / 10) + 1;
  
  if (newLevel > level) {
    level = newLevel;
    // Aumentamos a velocidade mais agressivamente quando o nível sobe
    const diffSettings = difficulties[difficulty];
    // Reduzimos o dropInterval mais rapidamente
    dropInterval = Math.max(50, diffSettings.baseInterval - (level - 1) * diffSettings.levelStep * 1.5);
    levelUpSound();
    updateUIInfo();
  }
}

// Modificação na função arenaSweep para implementar o sistema de pontuação clássico
function arenaSweep() {
  let rowCount = 0;
  outer: for (let y = arena.length - 1; y >= 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) continue outer;
    }
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    rowCount++;
    player.linesCleared++;
    ++y;
  }
  
  // Sistema de pontuação clássico do Tetris
  if (rowCount > 0) {
    // Pontuação baseada no número de linhas limpas de uma vez
    let points = 0;
    switch (rowCount) {
      case 1:
        points = 40 * (level + 1); // 1 linha
        break;
      case 2:
        points = 100 * (level + 1); // 2 linhas
        break;
      case 3:
        points = 300 * (level + 1); // 3 linhas
        break;
      case 4:
        points = 1200 * (level + 1); // Tetris (4 linhas)
        // Som especial para Tetris
        beep(880, 0.1, 0.2);
        setTimeout(() => beep(1320, 0.2, 0.2), 100);
        break;
    }
    
    player.score += points;
    beep();
    updateLevel();
  }
}

// Configurações de dificuldade - Velocidades iniciais mais rápidas
const difficulties = {
  'Fácil': { baseInterval: 600, levelStep: 60 },     // Mais rápido que o original
  'Médio': { baseInterval: 450, levelStep: 70 },     // Mais rápido que o original
  'Difícil': { baseInterval: 300, levelStep: 80 },   // Mais rápido que o original
  'Hard': { baseInterval: 200, levelStep: 90 },      // Mais rápido que o original
  'Extremo': { baseInterval: 150, levelStep: 100 },  // Mais rápido que o original
  'Maluquice': { baseInterval: 80, levelStep: 110 }  // Mais rápido que o original
}

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Formatar a hora atual do sistema
function getCurrentTime() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function collide(arena, player) {
  const [m, o] = [player.matrix, player.pos];
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 &&
         (arena[y + o.y] &&
          arena[y + o.y][x + o.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
}

function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (dir > 0) matrix.forEach(row => row.reverse());
  else matrix.reverse();
}

function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    beep();
    playerReset();
    arenaSweep();
    updateScore();
  }
  dropCounter = 0;
}

function playerMove(dir) {
  player.pos.x += dir;
  if (collide(arena, player)) {
    player.pos.x -= dir;
  }
}

function playerRotate(dir) {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix, dir);
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
}

function arenaSweep() {
  let rowCount = 0;
  outer: for (let y = arena.length - 1; y >= 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) continue outer;
    }
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    player.score += 10 * level; // Pontuação baseada no nível
    player.linesCleared++;
    rowCount++;
    ++y;
  }
  
  if (rowCount > 0) {
    beep();
    updateLevel();
  }
}

function playerReset() {
  player.matrix = player.next;
  player.next = createPiece(pieces[Math.floor(Math.random() * pieces.length)]);
  player.pos.y = 0;
  player.pos.x = Math.floor(cols/2) - Math.floor(player.matrix[0].length/2);
  
  if (collide(arena, player)) {
    gameOver();
  }
}

function updateScore() {
  document.title = `Tetris AeC - Pontuação: ${player.score} - Nível: ${level}`;
  updateUIInfo();
}

function updateUIInfo() {
  // Atualiza as informações de nível e tempo na UI
  if (levelElement) levelElement.textContent = `Nível: ${level}`;
  if (timeElement) timeElement.textContent = `Tempo: ${formatTime(playTime)}`;
  if (scoreElement) scoreElement.textContent = `Pontuação: ${player.score}`;
  if (clockElement) clockElement.textContent = `Hora: ${getCurrentTime()}`;
  if (difficultyElement) difficultyElement.textContent = `Dificuldade: ${difficulty}`;
}

// Desenho
function drawMatrix(matrix, offset, size = blockSize) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        ctx.fillStyle = colors[value];
        ctx.fillRect((x + offset.x) * size, (y + offset.y) * size, size, size);
        ctx.strokeStyle = '#000';
        ctx.strokeRect((x + offset.x) * size, (y + offset.y) * size, size, size);
      }
    });
  });
}

// Desenha o título do jogo no início da tela
function drawGameTitle() {
  const titleContainer = document.createElement('div');
  titleContainer.style.position = 'absolute';
  titleContainer.style.top = '10px';
  titleContainer.style.width = '100%';
  titleContainer.style.textAlign = 'center';
  titleContainer.style.color = 'white';
  titleContainer.style.fontFamily = 'Arial, sans-serif';
  
  // Título principal
  const title = document.createElement('h1');
  title.textContent = 'Tetris AeC';
  title.style.fontSize = '36px';
  title.style.margin = '0 0 5px 0';
  title.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
  titleContainer.appendChild(title);
  
  // Slogan
  const slogan = document.createElement('div');
  slogan.textContent = 'Divirta-se um Pouco também, amigo';
  slogan.style.fontSize = '16px';
  slogan.style.marginBottom = '3px';
  titleContainer.appendChild(slogan);
  
  // Nome do criador
  const creator = document.createElement('div');
  creator.textContent = 'Criado por Rivan';
  creator.style.fontSize = '12px';
  creator.style.color = '#888';
  creator.style.marginTop = '5px';
  titleContainer.appendChild(creator);
  
  document.body.appendChild(titleContainer);
}

// Área separada para próxima peça
function drawNextPieceArea() {
  // Desenha a área da próxima peça - posicionada na lateral direita do tabuleiro
  const nextAreaX = blockSize * cols + 10;
  const nextAreaY = 150; // Ajustado para ficar abaixo do título
  const nextAreaWidth = 120;
  const nextAreaHeight = 120;
  
  // Fundo da área
  ctx.fillStyle = '#222';
  ctx.fillRect(nextAreaX, nextAreaY, nextAreaWidth, nextAreaHeight);
  ctx.strokeStyle = '#444';
  ctx.strokeRect(nextAreaX, nextAreaY, nextAreaWidth, nextAreaHeight);
  
  // Título
  ctx.fillStyle = 'white';
  ctx.font = '16px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Próxima Peça:', nextAreaX, nextAreaY - 10);
  
  // Desenha a peça
  const matrix = player.next;
  
  // Determina as dimensões da peça
  const matrixWidth = matrix[0].length;
  const matrixHeight = matrix.length;
  
  // Calcula o centro da área de visualização em blocos
  const areaWidthInBlocks = nextAreaWidth / smallBlockSize;
  const areaHeightInBlocks = nextAreaHeight / smallBlockSize;
  
  // Calcula o offset para centralizar a peça
  const offsetX = nextAreaX / smallBlockSize + (areaWidthInBlocks - matrixWidth) / 2;
  const offsetY = nextAreaY / smallBlockSize + (areaHeightInBlocks - matrixHeight) / 2;
  
  // Desenha cada bloco da próxima peça
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        ctx.fillStyle = colors[value];
        ctx.fillRect((x + offsetX) * smallBlockSize, (y + offsetY) * smallBlockSize, smallBlockSize, smallBlockSize);
        ctx.strokeStyle = '#000';
        ctx.strokeRect((x + offsetX) * smallBlockSize, (y + offsetY) * smallBlockSize, smallBlockSize, smallBlockSize);
      }
    });
  });
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  for (let x = 0; x <= cols; ++x) {
    ctx.beginPath();
    ctx.moveTo(x * blockSize, 0);
    ctx.lineTo(x * blockSize, rows * blockSize);
    ctx.stroke();
  }
  for (let y = 0; y <= rows; ++y) {
    ctx.beginPath();
    ctx.moveTo(0, y * blockSize);
    ctx.lineTo(cols * blockSize, y * blockSize);
    ctx.stroke();
  }
}

// UI Elements
let nicknameInput;
let musicButton;
let levelElement;
let timeElement;
let scoreElement;
let clockElement;
let difficultyElement;
let difficultySelector;
let countdownElement;
let infoContainer;

// Criar a UI
function createUI() {
  // Desenha o título do jogo
  drawGameTitle();
  
  // Criar um container para fixar o jogo e a UI na tela
  const gameContainer = document.createElement('div');
  gameContainer.style.position = 'relative';
  gameContainer.style.display = 'flex';
  gameContainer.style.flexDirection = 'row';
  gameContainer.style.alignItems = 'flex-start';
  gameContainer.style.gap = '10px';
  document.body.appendChild(gameContainer);
  
  // Mover o canvas para dentro do container
  document.body.removeChild(canvas);
  gameContainer.appendChild(canvas);
  
  // Container para informações do jogador - Fixado à direita do tabuleiro
  infoContainer = document.createElement('div');
  infoContainer.style.position = 'relative';
  infoContainer.style.width = '130px';
  infoContainer.style.marginTop = '150px'; // Posicionado alinhado com o início das peças
  infoContainer.style.color = 'white';
  infoContainer.style.fontFamily = 'Arial, sans-serif';
  gameContainer.appendChild(infoContainer);
  
  // Input para nickname
  const nickLabel = document.createElement('div');
  nickLabel.textContent = 'Nickname:';
  nickLabel.style.marginBottom = '5px';
  infoContainer.appendChild(nickLabel);
  
  nicknameInput = document.createElement('input');
  nicknameInput.type = 'text';
  nicknameInput.value = playerNickname;
  nicknameInput.style.padding = '5px';
  nicknameInput.style.width = '120px';
  nicknameInput.style.marginBottom = '15px';
  nicknameInput.style.background = '#333';
  nicknameInput.style.border = '1px solid #555';
  nicknameInput.style.color = 'white';
  nicknameInput.addEventListener('input', (e) => {
    playerNickname = e.target.value || "Jogador";
  });
  infoContainer.appendChild(nicknameInput);
  
  // Score display
  scoreElement = document.createElement('div');
  scoreElement.textContent = `Pontuação: ${player.score}`;
  scoreElement.style.marginBottom = '10px';
  infoContainer.appendChild(scoreElement);
  
  // Level display
  levelElement = document.createElement('div');
  levelElement.textContent = `Nível: ${level}`;
  levelElement.style.marginBottom = '10px';
  infoContainer.appendChild(levelElement);
  
  // Time display
  timeElement = document.createElement('div');
  timeElement.textContent = 'Tempo: 00:00';
  timeElement.style.marginBottom = '10px';
  infoContainer.appendChild(timeElement);
  
  // Clock display
  clockElement = document.createElement('div');
  clockElement.textContent = `Hora: ${getCurrentTime()}`;
  clockElement.style.marginBottom = '15px';
  infoContainer.appendChild(clockElement);
  
  // Dificuldade display
  difficultyElement = document.createElement('div');
  difficultyElement.textContent = `Dificuldade: ${difficulty}`;
  difficultyElement.style.marginBottom = '10px';
  infoContainer.appendChild(difficultyElement);
  
  // Seletor de dificuldade
  const diffLabel = document.createElement('div');
  diffLabel.textContent = 'Escolha a dificuldade:';
  diffLabel.style.marginBottom = '5px';
  infoContainer.appendChild(diffLabel);
  
  difficultySelector = document.createElement('select');
  difficultySelector.style.padding = '5px';
  difficultySelector.style.width = '120px';
  difficultySelector.style.marginBottom = '10px';
  difficultySelector.style.background = '#333';
  difficultySelector.style.border = '1px solid #555';
  difficultySelector.style.color = 'white';
  
  // Adiciona as opções de dificuldade
  Object.keys(difficulties).forEach(diff => {
    const option = document.createElement('option');
    option.value = diff;
    option.textContent = diff;
    if (diff === difficulty) {
      option.selected = true;
    }
    difficultySelector.appendChild(option);
  });
  
  difficultySelector.addEventListener('change', (e) => {
    if (!difficultyChosen) {
      difficulty = e.target.value;
      difficultyElement.textContent = `Dificuldade: ${difficulty}`;
      
      // Atualiza o dropInterval baseado na dificuldade escolhida
      const diffSettings = difficulties[difficulty];
      dropInterval = diffSettings.baseInterval;
    }
  });
  
  infoContainer.appendChild(difficultySelector);
  
  // Contador regressivo
  countdownElement = document.createElement('div');
  countdownElement.textContent = `Tempo para escolher: ${initialChoiceTime}s`;
  countdownElement.style.color = '#ff9900';
  countdownElement.style.marginBottom = '15px';
  infoContainer.appendChild(countdownElement);
  
  // Atualizar o relógio a cada segundo
  setInterval(() => {
    clockElement.textContent = `Hora: ${getCurrentTime()}`;
  }, 1000);
  
  // Iniciar contagem regressiva
  startCountdown();
  
  // Música
  musicButton = createMusicButton();
  
  // Definir o intervalo inicial da dificuldade difícil
  dropInterval = difficulties[difficulty].baseInterval;
}

// Função de contagem regressiva
function startCountdown() {
  countdownInterval = setInterval(() => {
    choiceTimeRemaining--;
    countdownElement.textContent = `Tempo para escolher: ${choiceTimeRemaining}s`;
    
    if (choiceTimeRemaining <= 0) {
      clearInterval(countdownInterval);
      difficultyChosen = true;
      
      // Desabilita o seletor de dificuldade
      difficultySelector.disabled = true;
      countdownElement.textContent = 'Dificuldade fixada!';
      countdownElement.style.color = '#00ff00';
      
      // Depois de 3 segundos, remove o elemento de contagem
      setTimeout(() => {
        countdownElement.style.display = 'none';
      }, 3000);
    }
  }, 1000);
}

// Adiciona botão para música
function createMusicButton() {
  const button = document.createElement('button');
  button.textContent = '🎵 Música';
  button.style.position = 'absolute';
  button.style.top = '20px';
  button.style.right = '20px';
  button.style.padding = '8px 12px';
  button.style.background = '#333';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '4px';
  button.style.cursor = 'pointer';
  
  button.addEventListener('click', () => {
    toggleMusic();
    button.textContent = musicPlaying ? '🔇 Pausar' : '🎵 Música';
  });
  
  document.body.appendChild(button);
  return button;
}

// Tela de Game Over
function gameOver() {
  gameActive = false;
  stopMusic();
  
  // Limpa o intervalo de contagem regressiva se ainda estiver ativo
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  
  // Escurece o jogo
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Título Game Over
  ctx.fillStyle = '#f00';
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', canvas.width / 2, 150);
  
  // Informações do jogo
  ctx.fillStyle = '#fff';
  ctx.font = '20px Arial';
  ctx.fillText(`Jogador: ${playerNickname}`, canvas.width / 2, 200);
  ctx.fillText(`Pontuação: ${player.score}`, canvas.width / 2, 230);
  ctx.fillText(`Nível: ${level}`, canvas.width / 2, 260);
  ctx.fillText(`Dificuldade: ${difficulty}`, canvas.width / 2, 290);
  ctx.fillText(`Tempo: ${formatTime(playTime)}`, canvas.width / 2, 320);
  ctx.fillText(`Hora: ${getCurrentTime()}`, canvas.width / 2, 350);
  
  // Logo do jogo
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 32px Arial';
  ctx.fillText('Tetris AeC', canvas.width / 2, 410);
  ctx.font = '16px Arial';
  ctx.fillText('Divirta-se um Pouco também, amigo', canvas.width / 2, 440);
  ctx.font = '14px Arial';
  ctx.fillText('Criado por Rivan', canvas.width / 2, 470);
  
  // Botões
  createGameOverButtons();
}

function createGameOverButtons() {
  // Container para os botões
  const buttonContainer = document.createElement('div');
  buttonContainer.style.position = 'absolute';
  buttonContainer.style.top = '510px';
  buttonContainer.style.left = '0';
  buttonContainer.style.width = '100%';
  buttonContainer.style.display = 'flex';
  buttonContainer.style.justifyContent = 'center';
  buttonContainer.style.gap = '20px';
  document.body.appendChild(buttonContainer);
  
  // Botão de reiniciar - Cores menos vibrantes
  const restartBtn = document.createElement('button');
  restartBtn.textContent = '🔄 Reiniciar Jogo';
  restartBtn.style.padding = '10px 20px';
  restartBtn.style.background = '#2a662a'; // Verde mais escuro
  restartBtn.style.color = 'white';
  restartBtn.style.border = 'none';
  restartBtn.style.borderRadius = '4px';
  restartBtn.style.cursor = 'pointer';
  restartBtn.addEventListener('click', restartGame);
  buttonContainer.appendChild(restartBtn);
  
  // Botão para salvar screenshot - Cores menos vibrantes
  const saveBtn = document.createElement('button');
  saveBtn.textContent = '💾 Salvar Screenshot';
  saveBtn.style.padding = '10px 20px';
  saveBtn.style.background = '#2a5066'; // Azul mais escuro
  saveBtn.style.color = 'white';
  saveBtn.style.border = 'none';
  saveBtn.style.borderRadius = '4px';
  saveBtn.style.cursor = 'pointer';
  saveBtn.addEventListener('click', saveScreenshot);
  buttonContainer.appendChild(saveBtn);
  
  // Botão para copiar screenshot - Cores menos vibrantes
  const copyBtn = document.createElement('button');
  copyBtn.textContent = '📋 Copiar Screenshot';
  copyBtn.style.padding = '10px 20px';
  copyBtn.style.background = '#4b2a66'; // Roxo mais escuro
  copyBtn.style.color = 'white';
  copyBtn.style.border = 'none';
  copyBtn.style.borderRadius = '4px';
  copyBtn.style.cursor = 'pointer';
  copyBtn.addEventListener('click', copyScreenshot);
  buttonContainer.appendChild(copyBtn);
}

// Reiniciar o jogo
function restartGame() {
  // Limpa a tela e remove os botões
  document.querySelectorAll('button').forEach(btn => {
    if (btn !== musicButton) {
      btn.remove();
    }
  });
  
  // Reseta variáveis
  arena.forEach(row => row.fill(0));
  player.score = 0;
  player.linesCleared = 0;
  level = 1;
  // Mantém a dificuldade atual mas reseta o intervalo
  const diffSettings = difficulties[difficulty];
  dropInterval = diffSettings.baseInterval;
  gameActive = true;
  startTime = Date.now();
  playTime = 0;
  
  // Reseta a contagem regressiva de escolha de dificuldade
  choiceTimeRemaining = initialChoiceTime;
  difficultyChosen = false;
  
  // Reativa o seletor de dificuldade e mostra o contador
  difficultySelector.disabled = false;
  countdownElement.style.display = 'block';
  countdownElement.style.color = '#ff9900';
  countdownElement.textContent = `Tempo para escolher: ${choiceTimeRemaining}s`;
  
  // Reinicia a contagem regressiva
  clearInterval(countdownInterval);
  startCountdown();
  
  // Reinicia o jogo
  playerReset();
  updateScore();
  update();
}

// Salvar screenshot
function saveScreenshot() {
  const link = document.createElement('a');
  link.download = `TetrisAeC_${playerNickname}_${player.score}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// Copiar screenshot - Versão com tratamento de erro
function copyScreenshot() {
  try {
    canvas.toBlob(blob => {
      // Verifica se ClipboardItem está disponível
      if (window.ClipboardItem) {
        const item = new ClipboardItem({ 'image/png': blob });
        navigator.clipboard.write([item]).then(() => {
          alert('Screenshot copiado para a área de transferência!');
        }).catch(err => {
          alert('Não foi possível copiar: ' + err.message);
          console.error('Erro ao copiar para clipboard:', err);
        });
      } else {
        // Fallback para navegadores sem suporte a ClipboardItem
        alert('Seu navegador não suporta cópia de imagens. Por favor, salve o screenshot.');
      }
    });
  } catch (err) {
    alert('Erro ao tentar copiar: ' + err.message);
    console.error('Erro ao criar blob ou acessar clipboard:', err);
  }
}

// Game loop
function update(time = 0) {
  if (!gameActive) return;
  
  if (startTime === null) {
    startTime = Date.now();
  }
  
  // Atualiza o tempo de jogo
  playTime = Date.now() - startTime;
  updateUIInfo();
  
  const deltaTime = time - lastTime;
  lastTime = time;
  
  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    playerDrop();
  }

  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Área principal
  ctx.strokeStyle = 'white';
  ctx.strokeRect(0, 0, blockSize*cols, blockSize*rows);

  drawGrid();
  drawMatrix(arena, {x:0, y:0});
  drawMatrix(player.matrix, player.pos);

  // Área próxima peça
  drawNextPieceArea();

  requestAnimationFrame(update);
}

// Controles
document.addEventListener('keydown', event => {
  if (!gameActive) return;
  
  if (event.key === 'ArrowLeft') {
    playerMove(-1);
  } else if (event.key === 'ArrowRight') {
    playerMove(1);
  } else if (event.key === 'ArrowDown') {
    playerDrop();
  } else if (event.key === 'ArrowUp') {
    playerRotate(1);
  } else if (event.key === 'p' || event.key === 'P') {
    toggleMusic();
    musicButton.textContent = musicPlaying ? '🔇 Pausar' : '🎵 Música';
  }
});

// Iniciar jogo
createUI();
playerReset();
updateScore();
startTime = Date.now();
update();
