const express = require("express");

const app = express();
app.use(express.json());
const PORT = 3000;

// Routes
const authRoutes = require("./routes/authRoutes");
const organizationRoutes = require("./routes/organizationRoutes");
const propertyRoutes = require("./routes/propertyRoutes");
const floorRoutes = require("./routes/floorRoutes");
const roomRoutes = require("./routes/roomRoutes");
const bedRoutes = require("./routes/bedRoutes");
const tenantRoutes = require("./routes/tenantRoutes");
const stayRoutes = require("./routes/stayRoutes");
const rentDueRoutes = require("./routes/rentDueRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

// Middleware
const authenticate = require("./middleware/authenticate");

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        message: "HevenOps backend is running"
    });
});

// ─── Public Routes (no JWT required) ───
app.use("/api/auth", authRoutes);

// ─── Protected Routes (JWT required) ───
app.use(authenticate);

app.use("/api/organizations", organizationRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/floors", floorRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/beds", bedRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/stays", stayRoutes);
app.use("/api/rent-dues", rentDueRoutes);
app.use("/api/payments", paymentRoutes);

// 404 Handler (Catch-all for undefined routes)
app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Unhandled Server Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
});

// Start server
app.listen(PORT, () => {
    console.log(`HevenOps backend running on http://localhost:${PORT}`);
});
