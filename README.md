# Pair Room

Two people edit one document at the same time. Each person gets a cursor, and the file is saved on the server.

## Live app

Open Pair Room here: https://pair-room-production.up.railway.app

Create an account, make a room, and share that room link. This address stays online even when your computer is off.

## Folders

| Folder | What is inside |
|---|---|
| `frontend/src/pages` | Login, room list, and the room screen |
| `frontend/src/editor` | The code editor and the live-cursor hook |
| `frontend/src/services` | API calls, login session, and safe redirects |
| `frontend/src/styles` | The page styles |
| `backend/routes` | Account and room HTTP routes |
| `backend/auth` | Passwords, login cookies, and route protection |
| `backend/database` | SQLite tables for users, rooms, and saved documents |
| `backend/collab` | WebSocket sync and the starter code for a new room |
| `backend/lib` | Small shared checks used by the routes |
| `scripts` | The check that two editors stay in sync |

`backend/index.js` only starts the server. `frontend/src/main.jsx` only starts the page.

## Stack

- React and CodeMirror in the browser
- Node.js, Express, and WebSockets on the server
- Yjs for merging edits without dropping characters
- SQLite for accounts, rooms, and document snapshots

## Run it locally

```bash
npm install
npm run dev
```

Open http://localhost:5173, create an account, then open the same room link in a second window.

The API listens on http://localhost:8787.

## What happens when two people type

1. Each browser holds a Yjs document and sends edits over a WebSocket.
2. The server checks the login cookie and room membership before accepting the socket.
3. Yjs merges both streams, including when both people type on the same line.
4. About twice a second, the server stores a snapshot in SQLite. A refresh loads that snapshot.
5. Deletes and new text are listed beside the editor with the name of the person who made the change.

Cursors are presence data. They are not written into the saved file.

## Production

```bash
npm install
npm run build
set NODE_ENV=production
npm start
```

On macOS or Linux, use `NODE_ENV=production npm start`. The app serves the built page and the WebSocket from the same port.
