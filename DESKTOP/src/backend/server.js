const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const pool = require("./db");
const bodyParser = require('body-parser');

dotenv.config({ path: path.join(__dirname, ".env") });
console.log("🚀 Server starting...");

const app = express();

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

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.headers.authorization) {
    console.log("Has Authorization header");
  }
  next();
});

app.use("/api/auth", require("./routes/regularAdminAuth"));
app.use("/api/admin", require("./routes/regularAdminLogs"));
app.use("/api/superadmin", require("./routes/superAdminLogs"));
app.use("/api", require("./routes/mobile-users"));
app.use("/api/event-plans", require("./routes/event-plan"));
app.use("/api/admin/event-plans", require("./routes/event-auth"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server started successfully!`);
  console.log(`🚀 Local:   http://localhost:${PORT}`);
  console.log(`🚀 Network: http://192.168.1.7:${PORT}`);
});

pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("Database connected:", res.rows[0]);
  }
});