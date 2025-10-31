const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
require('dotenv').config();

// LOAD ENVIRONMENT VARIABLES FIRST - before ANY other imports
const envPath = path.join(__dirname, "../.env");
console.log("📁 Loading .env from:", envPath);
dotenv.config({ path: envPath });

// DEBUG: Check if env vars are loaded
console.log("🔧 Environment check in server.js:");
console.log("DB_USER:", process.env.DB_USER || "UNDEFINED");
console.log("EMAIL_USER:", process.env.EMAIL_USER || "UNDEFINED");

// NOW import other modules that depend on process.env
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');

// Import pool AFTER environment variables are loaded
const pool = require("./db");

console.log("🚀 Server starting...");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
app.use(cors());
app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ 
    limit: '10mb', 
    extended: true 
}));
app.use(bodyParser.json({ limit: '10mb' }));

// Make io accessible to routes
app.set('io', io);

// Store connected users
const connectedUsers = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins their own room (using user ID)
  socket.on('join-user-room', (userId, callback) => {
    if (!userId) {
      console.log('❌ No userId provided for join-user-room');
      if (callback) callback({ success: false, error: 'No userId provided' });
      return;
    }
    
    socket.join(`user-${userId}`);
    connectedUsers.set(userId, socket.id);
    console.log(`✅ User ${userId} joined room user-${userId}`);
    
    if (callback) callback({ success: true, room: `user-${userId}` });
  });

  // Admin joins admin room
  socket.on('join-admin-room', (adminId, callback) => {
    socket.join(`admin-${adminId}`);
    console.log(`Admin ${adminId} joined room`);
    if (callback) callback({ success: true, room: `admin-${adminId}` });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Remove from connected users
    for (let [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`🗑️ Removed user ${userId} from connected users`);
        break;
      }
    }
  });

  // Debug: log all events
  socket.onAny((eventName, ...args) => {
    console.log(`🔍 Server socket event: ${eventName}`, args);
  });
});

const isProduction = process.env.NODE_ENV === 'production';

// Your existing routes
app.use("/api/auth", require("./routes/regularAdminAuth"));
app.use("/api/admin", require("./routes/regularAdminLogs"));
app.use("/api/superadmin", require("./routes/superAdminLogs"));
app.use("/api", require("./routes/mobile-users"));
app.use("/api/event-plans", require("./routes/event-plan"));
app.use("/api/admin/event-plans", require("./routes/event-auth"));
app.use("/api/admin/notifications", require('./routes/notifications'));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

if (isProduction) {
  // Serve your built Electron files
  app.use(express.static(path.join(__dirname, "../dist")));
  
  // Catch-all handler for SPA routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
} else {
  // Development static serving (your existing code)
  app.use(express.static(path.join(__dirname, "../")));
  
  app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
      res.status(404).json({ error: "API endpoint not found" });
    } else {
      res.sendFile(path.join(__dirname, "../LandingPage.html"));
    }
  });
}

// Your existing routes continue...
app.get("/api/test", (req, res) => {
  console.log("TEST: Basic API test");
  res.json({ message: "Basic test works!", timestamp: new Date().toISOString() });
});

app.get("/api", (req, res) => {
  console.log("Health check hit");
  res.json({ 
    message: "API is running",
    timestamp: new Date().toISOString()
  });
});

app.use(express.static(path.join(__dirname, "../")));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    console.log(`404 API: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
      error: "API endpoint not found",
      path: req.originalUrl
    });
  } else {
    res.sendFile(path.join(__dirname, "../LandingPage.html"));
  }
});

app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

const PORT = process.env.PORT || 3000;
// Change from app.listen to server.listen
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server started successfully!`);
  console.log(`🚀 Local:   http://localhost:${PORT}`);
  console.log(`🚀 Network: http://192.168.1.7:${PORT}`);
  console.log(`🚀 Socket.io running on port ${PORT}`);
});

pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("Database connected:", res.rows[0]);
  }
});