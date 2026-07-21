# ♚ Royal Chess

A fully-featured chess game with online multiplayer, beautiful UI, and rich game mechanics — built with pure HTML, CSS, and JavaScript.

![Royal Chess](https://img.shields.io/badge/Royal%20Chess-v1.0-gold?style=flat-square)

## ✨ Features

- **♟ Full Chess Logic** — Complete move validation, check/checkmate detection, castling, en passant, pawn promotion, and draw conditions
- **🌐 Online Multiplayer** — Play against friends in real-time by creating or joining rooms with a 4-letter room code
- **🎨 4 Piece Skins** — Classic, Modern, Neon, and Wood styles to customize your board
- **🔄 Move History** — Full log of all moves played during the game
- **↩ Undo Moves** — Take back moves during local games
- **🖼 Flip Board** — Toggle board orientation for a different perspective
- **🔊 Synthesized Sound Effects** — Immersive audio feedback for moves, captures, and game events
- **✨ Animated Background** — Dynamic particle system for a royal atmosphere
- **📱 Responsive Layout** — Optimized for both desktop and mobile play

## 🎮 How to Play

### Local 1v1
1. Open `index.html` in your browser
2. Click **"Play Locally (1v1)"**
3. White moves first — take turns on the same device

### Online Multiplayer
1. Click **"Play Online"**
2. **Create a Room** — Get a 4-letter code to share with a friend
3. **Join a Room** — Enter your friend's room code to connect
4. Play in real-time!

## 🛠 Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Chess Engine:** Custom-built chess logic engine (`chess-engine.js`)
- **Networking:** Peer-to-peer via PeerJS (WebRTC)
- **Deployment:** Ready for Netlify, GitHub Pages, or any static host

## 🚀 Deployment

### Netlify (Recommended)
The project includes a `netlify.toml` for easy deployment:
```bash
# Just connect your repo to Netlify or drag-drop the folder
```

### GitHub Pages
Push to GitHub and enable Pages from the `main` branch.

### Any Static Host
Since this is a fully static site, just serve the root directory.

## 📁 Project Structure

```
chess-game/
├── index.html           # Main entry point
├── netlify.toml         # Netlify deployment config
├── css/
│   └── style.css        # All styles and animations
├── js/
│   ├── chess-engine.js  # Chess logic engine
│   └── app.js           # UI, sound, online mode, events
└── README.md            # This file
```

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features (like AI opponent, analysis board, etc.)
- Submit pull requests

## 📄 License

MIT License — feel free to use, modify, and share.

---

*Built with ♚ by [Sindbad-bee](https://github.com/Sindbad-bee)*