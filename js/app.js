/* ============================================================
   ROYAL CHESS - Application Controller
   UI rendering, sound engine, online mode, and event handling
   ============================================================ */

// ============================================================
// SOUND ENGINE - Web Audio API synthesized sounds
// ============================================================
const SoundEngine = {
    initialized: false,
    audioContext: null,

    init() {
        if (this.initialized) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('Audio not available');
        }
    },

    play(type) {
        this.init();
        if (!this.audioContext) return;

        try {
            const ctx = this.audioContext;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            switch (type) {
                case 'move':
                    osc.frequency.setValueAtTime(600, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05);
                    gain.gain.setValueAtTime(0.08, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.1);
                    break;

                case 'capture':
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(300, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.15);
                    gain.gain.setValueAtTime(0.06, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.15);
                    break;

                case 'check':
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(500, ctx.currentTime);
                    osc.frequency.setValueAtTime(700, ctx.currentTime + 0.1);
                    osc.frequency.setValueAtTime(500, ctx.currentTime + 0.2);
                    gain.gain.setValueAtTime(0.05, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.3);
                    break;

                case 'gameOver':
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(400, ctx.currentTime);
                    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.5);
                    gain.gain.setValueAtTime(0.07, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.5);
                    break;

                case 'select':
                    osc.frequency.setValueAtTime(440, ctx.currentTime);
                    gain.gain.setValueAtTime(0.04, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.05);
                    break;

                default:
                    osc.frequency.setValueAtTime(500, ctx.currentTime);
                    gain.gain.setValueAtTime(0.05, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.08);
            }
        } catch (e) {
            // Silently fail - audio is not critical
        }
    }
};

// ============================================================
// PIECE SKIN MANAGER
// ============================================================
const PIECE_SKINS = {
    classic: {
        'wk': '♔', 'wq': '♕', 'wr': '♖', 'wb': '♗', 'wn': '♘', 'wp': '♙',
        'bk': '♚', 'bq': '♛', 'br': '♜', 'bb': '♝', 'bn': '♞', 'bp': '♟'
    },
    modern: {
        'wk': '♔', 'wq': '♕', 'wr': '♖', 'wb': '♗', 'wn': '♘', 'wp': '♙',
        'bk': '♚', 'bq': '♛', 'br': '♜', 'bb': '♝', 'bn': '♞', 'bp': '♟'
    },
    neon: {
        'wk': '♔', 'wq': '♕', 'wr': '♖', 'wb': '♗', 'wn': '♘', 'wp': '♙',
        'bk': '♚', 'bq': '♛', 'br': '♜', 'bb': '♝', 'bn': '♞', 'bp': '♟'
    },
    wood: {
        'wk': '♔', 'wq': '♕', 'wr': '♖', 'wb': '♗', 'wn': '♘', 'wp': '♙',
        'bk': '♚', 'bq': '♛', 'br': '♜', 'bb': '♝', 'bn': '♞', 'bp': '♟'
    }
};

let currentSkin = 'classic';

function getPieceUnicode(color, type) {
    return PIECE_SKINS[currentSkin][color + type] || '';
}

// ============================================================
// ONLINE MODE (localStorage-based for same-device simulation)
// ============================================================
let isOnlineMode = false;
let roomCode = null;
let playerColor = 'w';
let onlineInterval = null;

function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

function createRoom() {
    roomCode = generateRoomCode();
    playerColor = 'w';
    document.getElementById('roomCode').textContent = roomCode;
    document.getElementById('roomDisplay').style.display = 'block';
    document.querySelector('#onlineLobby .lobby-options').style.display = 'none';
    document.getElementById('lobbyBackBtn').style.display = 'none';

    localStorage.setItem('chess_room_' + roomCode, JSON.stringify({
        created: Date.now(),
        state: 'waiting',
        whitePlayer: 'host'
    }));

    onlineInterval = setInterval(() => {
        const data = localStorage.getItem('chess_room_' + roomCode);
        if (data) {
            const parsed = JSON.parse(data);
            if (parsed.state === 'joined') {
                clearInterval(onlineInterval);
                isOnlineMode = true;
                startGame();
            }
        }
    }, 1000);
}

function showJoinRoom() {
    document.querySelector('#onlineLobby .lobby-options').style.display = 'none';
    document.getElementById('joinDisplay').style.display = 'block';
    document.getElementById('lobbyBackBtn').style.display = 'none';
}

function joinRoom() {
    const code = document.getElementById('roomCodeInput').value.toUpperCase();
    if (code.length !== 4) return alert('Please enter a valid room code (4 letters)');

    const data = localStorage.getItem('chess_room_' + code);
    if (!data) return alert('Room not found. Check the code and try again.');

    const parsed = JSON.parse(data);
    if (parsed.state !== 'waiting') return alert('Room is already full.');

    playerColor = 'b';
    roomCode = code;
    localStorage.setItem('chess_room_' + code, JSON.stringify({
        ...parsed,
        state: 'joined',
        blackPlayer: 'guest',
        joinedAt: Date.now()
    }));

    isOnlineMode = true;
    startGame();
}

function cancelRoom() {
    if (roomCode) {
        localStorage.removeItem('chess_room_' + roomCode);
    }
    clearInterval(onlineInterval);
    roomCode = null;
    document.getElementById('roomDisplay').style.display = 'none';
    document.querySelector('#onlineLobby .lobby-options').style.display = 'flex';
    document.getElementById('lobbyBackBtn').style.display = 'block';
}

function cancelJoin() {
    document.getElementById('joinDisplay').style.display = 'none';
    document.querySelector('#onlineLobby .lobby-options').style.display = 'flex';
    document.getElementById('lobbyBackBtn').style.display = 'block';
    document.getElementById('roomCodeInput').value = '';
}

function showOnlineLobby() {
    document.getElementById('introScreen').classList.add('hidden');
    document.getElementById('onlineLobby').classList.add('active');
    document.getElementById('roomDisplay').style.display = 'none';
    document.getElementById('joinDisplay').style.display = 'none';
    document.querySelector('#onlineLobby .lobby-options').style.display = 'flex';
    document.getElementById('lobbyBackBtn').style.display = 'block';
}

function hideOnlineLobby() {
    cancelRoom();
    document.getElementById('onlineLobby').classList.remove('active');
    document.getElementById('introScreen').classList.remove('hidden');
}

function startLocalGame() {
    isOnlineMode = false;
    document.getElementById('introScreen').classList.add('hidden');
    document.getElementById('gameModeLabel').textContent = 'Local 1v1';
    startGame();
}

function startGame() {
    document.getElementById('onlineLobby').classList.remove('active');
    document.getElementById('introScreen').classList.add('hidden');
    document.getElementById('gameContainer').classList.add('active');
    document.getElementById('gameModeLabel').textContent = isOnlineMode ? 'Online Match' : 'Local 1v1';
    game.reset();
    selectedSquare = null;
    legalMoves = [];
    render();
}

function showIntroFromGame() {
    if (game.moveHistory.length > 0 && !confirm('Return to menu? Current game will be lost.')) return;
    document.getElementById('gameContainer').classList.remove('active');
    document.getElementById('introScreen').classList.remove('hidden');
    cancelRoom();
}

// ============================================================
// UI CONTROLLER
// ============================================================

const game = new ChessEngine();
let selectedSquare = null;
let legalMoves = [];
let isBoardFlipped = false;

// DOM References
const boardEl = document.getElementById('board');
const turnText = document.getElementById('turnText');
const turnDot = document.getElementById('turnDot');
const gameStatus = document.getElementById('gameStatus');
const moveList = document.getElementById('moveList');
const whiteCaptured = document.getElementById('whiteCaptured');
const blackCaptured = document.getElementById('blackCaptured');
const promotionOverlay = document.getElementById('promotionOverlay');
const promotionOptions = document.getElementById('promotionOptions');

const FILES = 'abcdefgh';
const RANKS = '87654321';

/**
 * Render the chess board and all UI elements
 */
function render() {
    boardEl.innerHTML = '';
    const rows = isBoardFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
    const cols = isBoardFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

    for (const row of rows) {
        for (const col of cols) {
            const square = document.createElement('div');
            const isLight = (row + col) % 2 === 0;
            square.className = `square ${isLight ? 'light' : 'dark'}`;
            square.dataset.row = row;
            square.dataset.col = col;

            // Rank labels (left side)
            if (isBoardFlipped ? col === 7 : col === 0) {
                const label = document.createElement('span');
                label.className = 'rank-label';
                label.textContent = RANKS[row];
                square.appendChild(label);
            }
            // File labels (bottom)
            if (isBoardFlipped ? row === 0 : row === 7) {
                const label = document.createElement('span');
                label.className = 'file-label';
                label.textContent = FILES[col];
                square.appendChild(label);
            }

            // Last move highlight
            if (game.lastMove) {
                if ((game.lastMove.from.row === row && game.lastMove.from.col === col) ||
                    (game.lastMove.to.row === row && game.lastMove.to.col === col)) {
                    square.classList.add('last-move');
                }
            }

            // Selected square highlight
            if (selectedSquare && selectedSquare.row === row && selectedSquare.col === col) {
                square.classList.add('selected');
            }

            // Valid move indicators
            if (legalMoves.some(m => m.row === row && m.col === col)) {
                const target = game.board[row][col];
                if (target) {
                    square.classList.add('valid-capture');
                } else {
                    square.classList.add('valid-move');
                }
            }

            // Check highlight on king
            if (game.inCheck) {
                const king = game.findKing(game.turn);
                if (king && king.row === row && king.col === col) {
                    square.classList.add('check');
                }
            }

            // Render piece
            const piece = game.board[row][col];
            if (piece) {
                const pieceEl = document.createElement('span');
                const skinClass = currentSkin === 'classic' ? '' : `skin-${currentSkin}`;
                pieceEl.className = `piece ${piece.color === 'w' ? 'white-piece' : 'black-piece'} ${skinClass}`;
                pieceEl.textContent = getPieceUnicode(piece.color, piece.type);
                square.appendChild(pieceEl);
            }

            square.addEventListener('click', () => handleSquareClick(row, col));
            boardEl.appendChild(square);
        }
    }

    updateUI();
}

/**
 * Update all UI elements (status, turn, captured, history)
 */
function updateUI() {
    // Turn indicator
    turnText.textContent = game.turn === 'w' ? "White's turn" : "Black's turn";
    turnDot.className = `turn-dot ${game.turn === 'w' ? 'white' : 'black'}`;

    // Game status
    gameStatus.className = 'game-status';
    if (game.gameOver) {
        if (game.gameResult && game.gameResult.includes('checkmate')) {
            gameStatus.classList.add('checkmate-status');
            gameStatus.innerHTML = `<span class="status-icon">👑</span><span>${game.gameResult}</span>`;
        } else if (game.gameResult && game.gameResult.includes('stalemate')) {
            gameStatus.classList.add('stalemate-status');
            gameStatus.innerHTML = `<span class="status-icon">🤝</span><span>${game.gameResult}</span>`;
        } else {
            gameStatus.innerHTML = `<span class="status-icon">🤝</span><span>${game.gameResult || 'Game Over'}</span>`;
        }
    } else if (game.inCheck) {
        gameStatus.classList.add('check-status');
        gameStatus.innerHTML = `<span class="status-icon">⚔️</span><span>${game.turn === 'w' ? 'White' : 'Black'} is in check!</span>`;
    } else {
        gameStatus.innerHTML = `<span class="status-icon">♟</span><span>Game in progress</span>`;
    }

    // Captured pieces
    const whiteCap = game.capturedWhite.map(p =>
        `<span class="captured-piece">${getPieceUnicode('w', p.type)}</span>`
    ).join('');
    const blackCap = game.capturedBlack.map(p =>
        `<span class="captured-piece">${getPieceUnicode('b', p.type)}</span>`
    ).join('');
    whiteCaptured.innerHTML = whiteCap || '<span style="color:rgba(255,255,255,0.2);font-size:12px;">None</span>';
    blackCaptured.innerHTML = blackCap || '<span style="color:rgba(255,255,255,0.2);font-size:12px;">None</span>';

    renderMoveHistory();
}

/**
 * Render the move history panel
 */
function renderMoveHistory() {
    moveList.innerHTML = '';
    const moves = game.moveLog;
    for (let i = 0; i < moves.length; i += 2) {
        const moveNum = Math.floor(i / 2) + 1;
        const row = document.createElement('div');
        row.className = 'move-list';

        const numEl = document.createElement('span');
        numEl.className = 'move-number';
        numEl.textContent = `${moveNum}.`;
        row.appendChild(numEl);

        const whiteEl = document.createElement('span');
        whiteEl.className = 'move-white';
        if (i === moves.length - 1 || (i === moves.length - 2 && moves.length % 2 === 0)) {
            whiteEl.classList.add('last-move-highlight');
        }
        whiteEl.textContent = moves[i] ? moves[i].notation : '';
        row.appendChild(whiteEl);

        const blackEl = document.createElement('span');
        blackEl.className = 'move-black';
        if (i + 1 < moves.length) {
            if (i + 1 === moves.length - 1) {
                blackEl.classList.add('last-move-highlight');
            }
            blackEl.textContent = moves[i + 1].notation;
        }
        row.appendChild(blackEl);

        moveList.appendChild(row);
    }

    const historyContainer = document.getElementById('moveHistory');
    historyContainer.scrollTop = historyContainer.scrollHeight;
}

/**
 * Handle square click events
 * @param {number} row
 * @param {number} col
 */
function handleSquareClick(row, col) {
    if (game.gameOver) return;
    if (game.promotionPending) return;

    // In online mode, restrict to player's own pieces
    if (isOnlineMode) {
        const piece = game.board[row][col];
        if (selectedSquare) {
            if (game.turn !== playerColor) return;
        } else {
            if (!piece || piece.color !== playerColor) return;
        }
    }

    const piece = game.board[row][col];

    if (selectedSquare) {
        const move = legalMoves.find(m => m.row === row && m.col === col);
        if (move) {
            SoundEngine.play('select');
            const result = game.makeMove(selectedSquare.row, selectedSquare.col, row, col);
            if (result === 'promotion') {
                showPromotionDialog(selectedSquare.row, selectedSquare.col, row, col);
                return;
            }
            selectedSquare = null;
            legalMoves = [];
            render();
            return;
        }

        // Click on own piece to reselect
        if (piece && piece.color === game.turn) {
            selectedSquare = { row, col };
            legalMoves = game.getLegalMoves(row, col);
            SoundEngine.play('select');
            render();
            return;
        }

        // Deselect
        selectedSquare = null;
        legalMoves = [];
        render();
        return;
    }

    // Select a piece
    if (piece && piece.color === game.turn) {
        selectedSquare = { row, col };
        legalMoves = game.getLegalMoves(row, col);
        SoundEngine.play('select');
        render();
    }
}

/**
 * Show pawn promotion dialog
 * @param {number} fromRow
 * @param {number} fromCol
 * @param {number} toRow
 * @param {number} toCol
 */
function showPromotionDialog(fromRow, fromCol, toRow, toCol) {
    const color = game.board[fromRow][fromCol].color;
    promotionOptions.innerHTML = '';
    const pieces = ['q', 'r', 'b', 'n'];
    for (const type of pieces) {
        const btn = document.createElement('button');
        btn.className = 'promotion-btn';
        btn.textContent = getPieceUnicode(color, type);
        btn.addEventListener('click', () => {
            promotionOverlay.classList.remove('active');
            game.makeMove(fromRow, fromCol, toRow, toCol, type);
            selectedSquare = null;
            legalMoves = [];
            render();
        });
        promotionOptions.appendChild(btn);
    }
    promotionOverlay.classList.add('active');
}

/**
 * Reset the game
 */
function resetGame() {
    if (game.moveHistory.length > 0 && !confirm('Start a new game? Current progress will be lost.')) return;
    game.reset();
    selectedSquare = null;
    legalMoves = [];
    promotionOverlay.classList.remove('active');
    render();
}

/**
 * Undo the last move
 */
function undoMove() {
    if (game.moveHistory.length === 0) return;
    game.undoLastMove();
    selectedSquare = null;
    legalMoves = [];
    promotionOverlay.classList.remove('active');
    render();
}

/**
 * Flip the board orientation
 */
function flipBoard() {
    isBoardFlipped = !isBoardFlipped;
    render();
}

/**
 * Set the piece skin style
 * @param {string} skin - 'classic', 'modern', 'neon', 'wood'
 */
function setPieceSkin(skin) {
    currentSkin = skin;
    document.querySelectorAll('.skin-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.skin === skin);
    });
    render();
}

/**
 * Create floating gold particles in the background
 */
function createParticles() {
    const container = document.getElementById('bgParticles');
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 8 + 's';
        particle.style.animationDuration = (6 + Math.random() * 8) + 's';
        particle.style.width = (1 + Math.random() * 3) + 'px';
        particle.style.height = particle.style.width;
        container.appendChild(particle);
    }
}

// ============================================================
// INITIALIZATION
// ============================================================

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'r' && !e.ctrlKey && !e.metaKey) resetGame();
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        undoMove();
    }
    if (e.key === 'f' && !e.ctrlKey && !e.metaKey) flipBoard();
});

// Initialize particles and render
createParticles();
render();