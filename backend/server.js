const express = require("express");

const app = express();
app.use(express.json());
const PORT = 3000;

// Routes
const organizationRoutes = require("./routes/organizationRoutes");
const propertyRoutes = require("./routes/propertyRoutes");
const floorRoutes = require("./routes/floorRoutes");
const roomRoutes = require("./routes/roomRoutes");
const bedRoutes = require("./routes/bedRoutes");
const tenantRoutes = require("./routes/tenantRoutes");
const stayRoutes = require("./routes/stayRoutes");
const rentDueRoutes = require("./routes/rentDueRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
// Health check
app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        message: "HevenOps backend is running"
    });
});

// Mount routes
app.use("/api/organizations", organizationRoutes);
app.use("/api/organizations", propertyRoutes);
app.use("/api/properties", floorRoutes);
app.use("/api/floors", roomRoutes);
app.use("/api/rooms", bedRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/stays", stayRoutes);
app.use("/api/rent-dues", rentDueRoutes);
app.use("/api/rent-dues", paymentRoutes);
// Start server
app.listen(PORT, () => {
    console.log(`HevenOps backend running on http://localhost:${PORT}`);
});
