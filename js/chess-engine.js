/* ============================================================
   ROYAL CHESS - Chess Engine Module
   Complete chess logic with all rules and strategies
   ============================================================ */

/**
 * ChessEngine - Core chess logic
 * Handles all game rules: piece movement, check/checkmate,
 * castling, en passant, pawn promotion, and draw conditions
 */
class ChessEngine {
    constructor() {
        this.PIECES = {
            KING: 'k',
            QUEEN: 'q',
            ROOK: 'r',
            BISHOP: 'b',
            KNIGHT: 'n',
            PAWN: 'p'
        };

        this.COLORS = {
            WHITE: 'w',
            BLACK: 'b'
        };

        this.PIECE_UNICODE = {
            'wk': '♔', 'wq': '♕', 'wr': '♖', 'wb': '♗', 'wn': '♘', 'wp': '♙',
            'bk': '♚', 'bq': '♛', 'br': '♜', 'bb': '♝', 'bn': '♞', 'bp': '♟'
        };

        this.PIECE_VALUES = {
            'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0
        };

        this.reset();
    }

    /**
     * Reset the game to initial state
     */
    reset() {
        this.board = this.createInitialBoard();
        this.turn = this.COLORS.WHITE;
        this.moveHistory = [];
        this.moveLog = [];
        this.capturedWhite = [];
        this.capturedBlack = [];
        this.lastMove = null;
        this.gameOver = false;
        this.gameResult = null;
        this.enPassantTarget = null;
        this.castlingRights = {
            'w': { kingSide: true, queenSide: true },
            'b': { kingSide: true, queenSide: true }
        };
        this.positionHistory = [];
        this.halfMoveClock = 0;
        this.fullMoveNumber = 1;
        this.inCheck = false;
        this.promotionPending = null;
    }

    /**
     * Create the standard chess starting position
     * @returns {Array} 8x8 board array
     */
    createInitialBoard() {
        const board = Array(8).fill(null).map(() => Array(8).fill(null));
        const backRank = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
        for (let col = 0; col < 8; col++) {
            board[0][col] = { type: backRank[col], color: this.COLORS.BLACK };
            board[1][col] = { type: this.PIECES.PAWN, color: this.COLORS.BLACK };
            board[6][col] = { type: this.PIECES.PAWN, color: this.COLORS.WHITE };
            board[7][col] = { type: backRank[col], color: this.COLORS.WHITE };
        }
        return board;
    }

    /**
     * Get piece at a given position
     * @param {number} row
     * @param {number} col
     * @returns {Object|null}
     */
    getPiece(row, col) {
        if (row < 0 || row > 7 || col < 0 || col > 7) return null;
        return this.board[row][col];
    }

    /**
     * Check if coordinates are within board bounds
     * @param {number} row
     * @param {number} col
     * @returns {boolean}
     */
    isInBounds(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }

    /**
     * Find the king of a given color
     * @param {string} color
     * @returns {Object|null} {row, col}
     */
    findKing(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.type === this.PIECES.KING && piece.color === color) {
                    return { row, col };
                }
            }
        }
        return null;
    }

    /**
     * Check if a square is attacked by pieces of a given color
     * @param {number} row
     * @param {number} col
     * @param {string} byColor
     * @returns {boolean}
     */
    isSquareAttacked(row, col, byColor) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (!piece || piece.color !== byColor) continue;
                const attacks = this.getPseudoLegalMoves(r, c, true);
                if (attacks.some(m => m.row === row && m.col === col)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Check if a given color's king is in check
     * @param {string} color
     * @returns {boolean}
     */
    isInCheck(color) {
        const king = this.findKing(color);
        if (!king) return false;
        const opponent = color === this.COLORS.WHITE ? this.COLORS.BLACK : this.COLORS.WHITE;
        return this.isSquareAttacked(king.row, king.col, opponent);
    }

    /**
     * Generate pseudo-legal moves for a piece (doesn't check if move leaves king in check)
     * @param {number} row
     * @param {number} col
     * @param {boolean} attacksOnly
     * @returns {Array} Array of move objects
     */
    getPseudoLegalMoves(row, col, attacksOnly = false) {
        const piece = this.board[row][col];
        if (!piece) return [];
        const moves = [];
        const { type, color } = piece;
        const opponent = color === this.COLORS.WHITE ? this.COLORS.BLACK : this.COLORS.WHITE;
        const direction = color === this.COLORS.WHITE ? -1 : 1;

        switch (type) {
            case this.PIECES.PAWN: {
                this._pawnMoves(moves, row, col, direction, color, opponent, attacksOnly);
                break;
            }
            case this.PIECES.KNIGHT: {
                this._knightMoves(moves, row, col, opponent);
                break;
            }
            case this.PIECES.BISHOP: {
                this._slidingMoves(moves, row, col, [[-1,-1], [-1,1], [1,-1], [1,1]], color, opponent, attacksOnly);
                break;
            }
            case this.PIECES.ROOK: {
                this._slidingMoves(moves, row, col, [[-1,0], [1,0], [0,-1], [0,1]], color, opponent, attacksOnly);
                break;
            }
            case this.PIECES.QUEEN: {
                this._slidingMoves(moves, row, col,
                    [[-1,-1], [-1,1], [1,-1], [1,1], [-1,0], [1,0], [0,-1], [0,1]],
                    color, opponent, attacksOnly);
                break;
            }
            case this.PIECES.KING: {
                this._kingMoves(moves, row, col, color, opponent, attacksOnly);
                break;
            }
        }

        return moves;
    }

    /**
     * Generate pawn moves
     * @private
     */
    _pawnMoves(moves, row, col, direction, color, opponent, attacksOnly) {
        const startRow = color === this.COLORS.WHITE ? 6 : 1;

        // Forward one
        const fwdRow = row + direction;
        if (this.isInBounds(fwdRow, col) && !this.board[fwdRow][col]) {
            if (!attacksOnly) moves.push({ row: fwdRow, col });
            // Forward two from start
            const fwd2Row = row + 2 * direction;
            if (row === startRow && !this.board[fwd2Row][col]) {
                moves.push({ row: fwd2Row, col });
            }
        }

        // Captures
        for (const dc of [-1, 1]) {
            const capRow = row + direction;
            const capCol = col + dc;
            if (!this.isInBounds(capRow, capCol)) continue;
            const target = this.board[capRow][capCol];
            if (target && target.color === opponent) {
                moves.push({ row: capRow, col: capCol });
            }
            // En passant
            if (this.enPassantTarget &&
                this.enPassantTarget.row === capRow &&
                this.enPassantTarget.col === capCol) {
                moves.push({ row: capRow, col: capCol, enPassant: true });
            }
        }
    }

    /**
     * Generate knight moves
     * @private
     */
    _knightMoves(moves, row, col, opponent) {
        const knightOffsets = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (const [dr, dc] of knightOffsets) {
            const nr = row + dr, nc = col + dc;
            if (!this.isInBounds(nr, nc)) continue;
            const target = this.board[nr][nc];
            if (!target || target.color === opponent) {
                moves.push({ row: nr, col: nc });
            }
        }
    }

    /**
     * Generate sliding piece moves (bishop, rook, queen)
     * @private
     */
    _slidingMoves(moves, row, col, directions, color, opponent, attacksOnly) {
        for (const [dr, dc] of directions) {
            let r = row + dr, c = col + dc;
            while (this.isInBounds(r, c)) {
                const target = this.board[r][c];
                if (!target) {
                    if (!attacksOnly) moves.push({ row: r, col: c });
                } else {
                    if (target.color === opponent) {
                        moves.push({ row: r, col: c });
                    }
                    break;
                }
                r += dr;
                c += dc;
            }
        }
    }

    /**
     * Generate king moves including castling
     * @private
     */
    _kingMoves(moves, row, col, color, opponent, attacksOnly) {
        for (const [dr, dc] of [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]]) {
            const nr = row + dr, nc = col + dc;
            if (!this.isInBounds(nr, nc)) continue;
            const target = this.board[nr][nc];
            if (!target || target.color === opponent) {
                moves.push({ row: nr, col: nc });
            }
        }

        // Castling
        if (!attacksOnly && !this.isInCheck(color)) {
            const rights = this.castlingRights[color];
            const kingRow = color === this.COLORS.WHITE ? 7 : 0;
            if (row === kingRow && col === 4) {
                // King-side
                if (rights.kingSide &&
                    !this.board[kingRow][5] && !this.board[kingRow][6] &&
                    this.board[kingRow][7] && this.board[kingRow][7].type === this.PIECES.ROOK &&
                    this.board[kingRow][7].color === color &&
                    !this.isSquareAttacked(kingRow, 5, opponent) &&
                    !this.isSquareAttacked(kingRow, 6, opponent)) {
                    moves.push({ row: kingRow, col: 6, castling: 'king' });
                }
                // Queen-side
                if (rights.queenSide &&
                    !this.board[kingRow][3] && !this.board[kingRow][2] && !this.board[kingRow][1] &&
                    this.board[kingRow][0] && this.board[kingRow][0].type === this.PIECES.ROOK &&
                    this.board[kingRow][0].color === color &&
                    !this.isSquareAttacked(kingRow, 3, opponent) &&
                    !this.isSquareAttacked(kingRow, 2, opponent)) {
                    moves.push({ row: kingRow, col: 2, castling: 'queen' });
                }
            }
        }
    }

    /**
     * Get legal moves for a piece (validates king safety)
     * @param {number} row
     * @param {number} col
     * @returns {Array} Array of legal move objects
     */
    getLegalMoves(row, col) {
        const piece = this.board[row][col];
        if (!piece) return [];
        const pseudoMoves = this.getPseudoLegalMoves(row, col);
        const legalMoves = [];

        for (const move of pseudoMoves) {
            // Create simulation board
            const simBoard = this.board.map(r => r.map(c => c ? { ...c } : null));
            const savedBoard = this.board;
            const savedEnPassant = this.enPassantTarget;
            const savedCastling = JSON.parse(JSON.stringify(this.castlingRights));

            this.board = simBoard;
            this.enPassantTarget = null;
            this.castlingRights = JSON.parse(JSON.stringify(savedCastling));

            // Execute move on simulation board
            this.board[move.row][move.col] = this.board[row][col];
            this.board[row][col] = null;

            if (move.enPassant) {
                const epRow = piece.color === this.COLORS.WHITE ? move.row + 1 : move.row - 1;
                this.board[epRow][move.col] = null;
            }
            if (move.castling === 'king') {
                const kingRow = piece.color === this.COLORS.WHITE ? 7 : 0;
                this.board[kingRow][5] = this.board[kingRow][7];
                this.board[kingRow][7] = null;
            } else if (move.castling === 'queen') {
                const kingRow = piece.color === this.COLORS.WHITE ? 7 : 0;
                this.board[kingRow][3] = this.board[kingRow][0];
                this.board[kingRow][0] = null;
            }

            const inCheck = this.isInCheck(piece.color);

            // Restore
            this.board = savedBoard;
            this.enPassantTarget = savedEnPassant;
            this.castlingRights = savedCastling;

            if (!inCheck) {
                legalMoves.push(move);
            }
        }

        return legalMoves;
    }

    /**
     * Execute a move on the board
     * @param {number} fromRow
     * @param {number} fromCol
     * @param {number} toRow
     * @param {number} toCol
     * @param {string|null} promotionType
     * @returns {boolean|string} true on success, 'promotion' if pawn promotion needed, false on failure
     */
    makeMove(fromRow, fromCol, toRow, toCol, promotionType = null) {
        const piece = this.board[fromRow][fromCol];
        if (!piece) return false;

        const legalMoves = this.getLegalMoves(fromRow, fromCol);
        const move = legalMoves.find(m => m.row === toRow && m.col === toCol);
        if (!move) return false;

        // Handle promotion request
        const promoRow = piece.color === this.COLORS.WHITE ? 0 : 7;
        if (piece.type === this.PIECES.PAWN && toRow === promoRow && !promotionType) {
            this.promotionPending = { fromRow, fromCol, toRow, toCol, move };
            return 'promotion';
        }

        // Save state for undo
        const stateSnapshot = this.createSnapshot();
        const captured = this.board[toRow][toCol];
        const moveData = {
            captured: captured,
            enPassantCapture: null,
            promotionType: promotionType
        };

        // Execute move
        this.board[toRow][toCol] = piece;
        this.board[fromRow][fromCol] = null;

        // Handle en passant capture
        if (move.enPassant) {
            const epRow = piece.color === this.COLORS.WHITE ? toRow + 1 : toRow - 1;
            const epCaptured = this.board[epRow][toCol];
            if (epCaptured) {
                moveData.enPassantCapture = epCaptured;
                if (epCaptured.color === this.COLORS.WHITE) this.capturedWhite.push(epCaptured);
                else this.capturedBlack.push(epCaptured);
            }
            this.board[epRow][toCol] = null;
        }

        // Handle capture
        if (captured) {
            if (captured.color === this.COLORS.WHITE) this.capturedWhite.push(captured);
            else this.capturedBlack.push(captured);
        }

        // Handle promotion
        if (promotionType) {
            this.board[toRow][toCol] = { type: promotionType, color: piece.color };
        }

        // Handle castling rook movement
        if (move.castling === 'king') {
            const kingRow = piece.color === this.COLORS.WHITE ? 7 : 0;
            this.board[kingRow][5] = this.board[kingRow][7];
            this.board[kingRow][7] = null;
        } else if (move.castling === 'queen') {
            const kingRow = piece.color === this.COLORS.WHITE ? 7 : 0;
            this.board[kingRow][3] = this.board[kingRow][0];
            this.board[kingRow][0] = null;
        }

        // Update en passant target
        this.enPassantTarget = null;
        if (piece.type === this.PIECES.PAWN && Math.abs(toRow - fromRow) === 2) {
            this.enPassantTarget = {
                row: (fromRow + toRow) / 2,
                col: fromCol
            };
        }

        // Update castling rights
        this._updateCastlingRights(piece, fromRow, fromCol, toRow, toCol);

        // Update half-move clock
        if (piece.type === this.PIECES.PAWN || captured || moveData.enPassantCapture) {
            this.halfMoveClock = 0;
        } else {
            this.halfMoveClock++;
        }

        // Switch turn
        this.turn = this.turn === this.COLORS.WHITE ? this.COLORS.BLACK : this.COLORS.WHITE;
        if (this.turn === this.COLORS.WHITE) this.fullMoveNumber++;

        // Generate notation
        const notation = this.generateMoveNotation(piece, fromRow, fromCol, toRow, toCol, captured, move, promotionType);

        // Record move
        this.lastMove = { from: { row: fromRow, col: fromCol }, to: { row: toRow, col: toCol } };
        this.moveHistory.push(stateSnapshot);
        this.moveLog.push({
            notation: notation,
            piece: { ...piece },
            from: { row: fromRow, col: fromCol },
            to: { row: toRow, col: toCol },
            captured: captured,
            move: move,
            promotion: promotionType
        });

        // Check game state
        this._updateGameState();

        this.promotionPending = null;
        return true;
    }

    /**
     * Update castling rights after a move
     * @private
     */
    _updateCastlingRights(piece, fromRow, fromCol, toRow, toCol) {
        if (piece.type === this.PIECES.KING) {
            this.castlingRights[piece.color].kingSide = false;
            this.castlingRights[piece.color].queenSide = false;
        }
        if (piece.type === this.PIECES.ROOK) {
            if (fromCol === 0) this.castlingRights[piece.color].queenSide = false;
            if (fromCol === 7) this.castlingRights[piece.color].kingSide = false;
        }
        // If a rook is captured
        if (toRow === 0 && toCol === 0) this.castlingRights[this.COLORS.BLACK].queenSide = false;
        if (toRow === 0 && toCol === 7) this.castlingRights[this.COLORS.BLACK].kingSide = false;
        if (toRow === 7 && toCol === 0) this.castlingRights[this.COLORS.WHITE].queenSide = false;
        if (toRow === 7 && toCol === 7) this.castlingRights[this.COLORS.WHITE].kingSide = false;
    }

    /**
     * Update game state (check, checkmate, stalemate, draw)
     * @private
     */
    _updateGameState() {
        this.inCheck = this.isInCheck(this.turn);
        const hasLegalMoves = this._hasLegalMoves(this.turn);

        if (!hasLegalMoves) {
            this.gameOver = true;
            if (this.inCheck) {
                this.gameResult = this.turn === this.COLORS.WHITE
                    ? 'Black wins by checkmate!'
                    : 'White wins by checkmate!';
            } else {
                this.gameResult = 'Draw by stalemate!';
            }
        } else if (this.inCheck) {
            this.gameResult = null;
        } else if (this._isDraw()) {
            this.gameOver = true;
            this.gameResult = this._getDrawReason();
        } else {
            this.gameResult = null;
        }
    }

    /**
     * Check if a color has any legal moves
     * @private
     */
    _hasLegalMoves(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    if (this.getLegalMoves(row, col).length > 0) return true;
                }
            }
        }
        return false;
    }

    /**
     * Check for draw conditions
     * @private
     */
    _isDraw() {
        if (this._isInsufficientMaterial()) return true;
        if (this.halfMoveClock >= 100) return true;
        if (this._isThreefoldRepetition()) return true;
        return false;
    }

    /**
     * Get human-readable draw reason
     * @private
     */
    _getDrawReason() {
        if (this._isInsufficientMaterial()) return 'Draw by insufficient material!';
        if (this.halfMoveClock >= 100) return 'Draw by fifty-move rule!';
        if (this._isThreefoldRepetition()) return 'Draw by threefold repetition!';
        return 'Draw!';
    }

    /**
     * Check for insufficient material draw
     * @private
     */
    _isInsufficientMaterial() {
        const pieces = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const p = this.board[row][col];
                if (p) pieces.push(p);
            }
        }
        if (pieces.length === 2) return true; // K vs K
        if (pieces.length === 3) {
            const nonKing = pieces.find(p => p.type !== this.PIECES.KING);
            if (nonKing && (nonKing.type === this.PIECES.BISHOP || nonKing.type === this.PIECES.KNIGHT)) return true;
        }
        if (pieces.length === 4) {
            const bishops = pieces.filter(p => p.type === this.PIECES.BISHOP);
            if (bishops.length === 2) {
                const colors = bishops.map(b => {
                    const pos = this._findPieceByRef(b);
                    return pos ? (pos.row + pos.col) % 2 : 0;
                });
                if (colors[0] === colors[1]) return true; // Same color bishops
            }
        }
        return false;
    }

    /**
     * Find a piece by object reference
     * @private
     */
    _findPieceByRef(piece) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const p = this.board[row][col];
                if (p && p.type === piece.type && p.color === piece.color) {
                    if (p === piece) return { row, col };
                }
            }
        }
        return null;
    }

    /**
     * Check for threefold repetition draw
     * @private
     */
    _isThreefoldRepetition() {
        const currentFen = this._getFen().split(' ').slice(0, 4).join(' ');
        let count = 1;
        for (const snap of this.positionHistory) {
            if (snap === currentFen) count++;
        }
        this.positionHistory.push(currentFen);
        return count >= 3;
    }

    /**
     * Generate FEN string for current position
     * @private
     */
    _getFen() {
        let fen = '';
        for (let row = 0; row < 8; row++) {
            let empty = 0;
            for (let col = 0; col < 8; col++) {
                const p = this.board[row][col];
                if (p) {
                    if (empty > 0) { fen += empty; empty = 0; }
                    const symbol = p.type.toUpperCase();
                    fen += p.color === this.COLORS.WHITE ? symbol : symbol.toLowerCase();
                } else {
                    empty++;
                }
            }
            if (empty > 0) fen += empty;
            if (row < 7) fen += '/';
        }
        fen += ' ' + (this.turn === this.COLORS.WHITE ? 'w' : 'b') + ' ';
        let castling = '';
        if (this.castlingRights['w'].kingSide) castling += 'K';
        if (this.castlingRights['w'].queenSide) castling += 'Q';
        if (this.castlingRights['b'].kingSide) castling += 'k';
        if (this.castlingRights['b'].queenSide) castling += 'q';
        fen += castling || '-';
        fen += ' ' + (this.enPassantTarget
            ? String.fromCharCode(97 + this.enPassantTarget.col) + (8 - this.enPassantTarget.row)
            : '-');
        return fen;
    }

    /**
     * Create a snapshot of the current game state for undo
     * @returns {Object}
     */
    createSnapshot() {
        return {
            board: this.board.map(r => r.map(c => c ? { ...c } : null)),
            turn: this.turn,
            enPassantTarget: this.enPassantTarget ? { ...this.enPassantTarget } : null,
            castlingRights: JSON.parse(JSON.stringify(this.castlingRights)),
            capturedWhite: [...this.capturedWhite],
            capturedBlack: [...this.capturedBlack],
            lastMove: this.lastMove
                ? { from: { ...this.lastMove.from }, to: { ...this.lastMove.to } }
                : null,
            gameOver: this.gameOver,
            gameResult: this.gameResult,
            halfMoveClock: this.halfMoveClock,
            fullMoveNumber: this.fullMoveNumber,
            inCheck: this.inCheck,
            moveLog: this.moveLog.map(m => ({ ...m, piece: { ...m.piece } }))
        };
    }

    /**
     * Restore a previous game state
     * @param {Object} snap
     */
    restoreSnapshot(snap) {
        this.board = snap.board;
        this.turn = snap.turn;
        this.enPassantTarget = snap.enPassantTarget;
        this.castlingRights = snap.castlingRights;
        this.capturedWhite = snap.capturedWhite;
        this.capturedBlack = snap.capturedBlack;
        this.lastMove = snap.lastMove;
        this.gameOver = snap.gameOver;
        this.gameResult = snap.gameResult;
        this.halfMoveClock = snap.halfMoveClock;
        this.fullMoveNumber = snap.fullMoveNumber;
        this.inCheck = snap.inCheck;
        this.moveLog = snap.moveLog;
        this.promotionPending = null;
    }

    /**
     * Undo the last move
     * @returns {boolean}
     */
    undoLastMove() {
        if (this.moveHistory.length === 0) return false;
        const snap = this.moveHistory.pop();
        this.restoreSnapshot(snap);
        if (this.positionHistory.length > 0) this.positionHistory.pop();
        return true;
    }

    /**
     * Generate standard algebraic notation for a move
     * @param {Object} piece
     * @param {number} fromRow
     * @param {number} fromCol
     * @param {number} toRow
     * @param {number} toCol
     * @param {Object|null} captured
     * @param {Object} move
     * @param {string|null} promotionType
     * @returns {string}
     */
    generateMoveNotation(piece, fromRow, fromCol, toRow, toCol, captured, move, promotionType = null) {
        const files = 'abcdefgh';
        const ranks = '87654321';
        let notation = '';

        if (move.castling === 'king') return 'O-O';
        if (move.castling === 'queen') return 'O-O-O';

        if (piece.type === this.PIECES.PAWN) {
            if (captured || move.enPassant) {
                notation += files[fromCol] + 'x';
            }
            notation += files[toCol] + ranks[toRow];
            if (promotionType) {
                notation += '=' + promotionType.toUpperCase();
            }
        } else {
            const pieceChar = piece.type.toUpperCase();
            notation += pieceChar;

            // Disambiguation for identical pieces that can move to same square
            const others = this._findOtherPieces(piece.type, piece.color, fromRow, fromCol);
            if (others.length > 0) {
                const sameFile = others.some(p => p.col === fromCol);
                const sameRank = others.some(p => p.row === fromRow);
                if (!sameFile) {
                    notation += files[fromCol];
                } else if (!sameRank) {
                    notation += ranks[fromRow];
                } else {
                    notation += files[fromCol] + ranks[fromRow];
                }
            }
            if (captured) notation += 'x';
            notation += files[toCol] + ranks[toRow];
        }

        // Check/checkmate symbol
        const savedBoard = this.board;
        this.board = this.board.map(r => r.map(c => c ? { ...c } : null));
        this.board[toRow][toCol] = this.board[fromRow][fromCol];
        this.board[fromRow][fromCol] = null;
        const opponent = piece.color === this.COLORS.WHITE ? this.COLORS.BLACK : this.COLORS.WHITE;
        const inCheckAfter = this.isInCheck(opponent);
        const hasMoves = this._hasLegalMoves(opponent);
        this.board = savedBoard;

        if (!hasMoves && inCheckAfter) {
            notation += '#';
        } else if (inCheckAfter) {
            notation += '+';
        }

        return notation;
    }

    /**
     * Find other pieces of same type and color that have legal moves
     * @private
     */
    _findOtherPieces(type, color, excludeRow, excludeCol) {
        const others = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (row === excludeRow && col === excludeCol) continue;
                const p = this.board[row][col];
                if (p && p.type === type && p.color === color) {
                    const moves = this.getLegalMoves(row, col);
                    if (moves.length > 0) others.push({ row, col });
                }
            }
        }
        return others;
    }
}