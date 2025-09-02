const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");

require("dotenv").config();
require("./models/Department");
require("./models/User");

const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const teacherRoutes = require("./routes/teacher");
const studentRoutes = require("./routes/student");
const { authenticate } = require("./middleware/auth");

const seedUsers = require("./utils/seedUsers");

const app = express("json");

// Serve static files from the 'uploads' directory
app.use("/uploads", express.static("uploads"));

// Middleware
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", async () => {
  console.log("Connected to MongoDB");

  // Seed default users
  await seedUsers();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", authenticate, adminRoutes);
app.use("/api/teacher", authenticate, teacherRoutes);
app.use("/api/student", authenticate, studentRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
