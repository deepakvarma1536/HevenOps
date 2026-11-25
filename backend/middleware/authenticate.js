const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const authenticate = async (req, res, next) => {
    // 1. Get the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Authentication required" });
    }

    // 2. Extract the token (remove "Bearer " prefix)
    const token = authHeader.split(" ")[1];

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ error: "Token has expired" });
        }
        return res.status(401).json({ error: "Invalid token" });
    }

    if (decoded.role === "manager") {
        const membership = await pool.query(
            `SELECT 1 FROM organization_members om
             JOIN organizations o ON o.id = om.organization_id
             WHERE om.organization_id = $1 AND om.user_id = $2
               AND om.role = 'manager' AND o.archived_at IS NULL`,
            [decoded.organizationId, decoded.userId]
        );
        if (!membership.rowCount) return res.status(401).json({ error: "Manager access has ended" });
    }

    req.user = {
        userId: decoded.userId,
        email: decoded.email,
        organizationId: decoded.organizationId,
        role: decoded.role,
    };
    next();
};

module.exports = authenticate;
