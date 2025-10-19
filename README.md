# FFmpeg to WebRTC Broadcast Project (mediasoup)

This project was created for the "Frontend/Backend Developer - Internship Candidate Task".

The goal of this project is to broadcast a local video file (H.264) using **FFmpeg** over **UDP**, capture this stream with a **Node.js** server, convert it to the WebRTC format using the **Mediasoup SFU**, and distribute it live to multiple web clients (browsers).

The server also concurrently records the incoming UDP stream to disk.

## Table of Contents

* `/backend` – Server-side code (Node.js, Mediasoup, UDP listener)
* `/frontend` – Client-side code (Web interface for watching the stream)
* `README.md` – This project documentation

## Core Features

* **FFmpeg UDP Broadcast**: Broadcasts a local video file as H.264 with low latency.
* **Node.js Backend**: Listens for the incoming UDP stream and forwards it to Mediasoup.
* **WebRTC SFU (Mediasoup)**: Efficiently distributes the single incoming stream to multiple viewers.
* **Disk Recording**: Saves the incoming UDP stream to a file on the server (e.g., `output.ts`).
* **Web Interface**: A simple HTML/JavaScript client to watch the stream.

## Requirements

* **FFmpeg**: Must be installed and available in your system's PATH.
* **Node.js** (v16 or later)
* **NPM** or **Yarn** package manager
* A modern browser with WebRTC support (Chrome, Firefox, Edge)

## Installation

Follow these steps to set up the project locally.

### Backend

```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install
```

If needed, you can create a `.env` file for server port or Mediasoup configurations.

### Frontend

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install
```

## Usage

Running the application involves 3 main steps:

### Step 1: Start the Backend Server

First, run the Node.js server. This server will wait for both the UDP stream from FFmpeg and connections from web clients.

```bash
# While in the /backend directory
npm start
```

The server will start by default on `http://localhost:3000` (or your configured port).

### Step 2: Start the FFmpeg UDP Broadcast

While the server is running, open a **separate terminal window** and start the broadcast with your video file (e.g., `example.mp4`).

```bash
# Example command from the task description:
# (Update the port and filename to match your project's setup if needed)

ffmpeg -re -i example.mp4 -c:v libx264 -preset veryfast -tune zerolatency -f mpegts udp://127.0.0.1:1234
```

* `-re`: Reads the input at its native frame rate (real-time).
* `udp://127.0.0.1:1234`: The destination address. This port **must** match the UDP port your backend application is listening on.

### Step 3: Watch the Stream from the Web Interface

Open your browser and navigate to the frontend address (e.g., `http://localhost:8080` if running with `npm run start`, or `http://localhost:3000` if it's served by the backend).

When you click a "Watch Stream" (or similar) button, the frontend will connect to the server and begin playing the live video stream from FFmpeg over WebRTC.

You can open multiple browser tabs to verify that all viewers are receiving the same stream.

## Architecture Details

* **Backend**: A Node.js process listens for the raw UDP stream on a configured port (e.g., `1234`). This stream is simultaneously written to disk (e.g., `output.ts`) and used to create a Mediasoup `Producer`.
* **Frontend**: On page load, the client connects to the server via signaling (WebSocket/Socket.IO). It requests to create a `Consumer` for the existing broadcast and attaches the incoming WebRTC stream to a `<video>` element.
* **Signaling**: Mediasoup `Router` capabilities, transport connections, and `produce`/`consume` requests between the backend and frontend are managed over WebSocket (or Socket.IO).

## License

This project is distributed under the MIT License.
