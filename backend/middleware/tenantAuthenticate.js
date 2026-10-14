const jwt = require("jsonwebtoken");

const tenantAuthenticate = (req, res, next) => {
    // 1. Get the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Tenant authentication required" });
    }

    // 2. Extract the token (remove "Bearer " prefix)
    const token = authHeader.split(" ")[1];

    try {
        // 3. Verify and decode the JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Make sure this is a tenant token, not an admin token
        if (!decoded.tenantId) {
             return res.status(403).json({ error: "Access denied. Not a tenant token." });
        }

        // 4. Attach tenant info to the request object
        req.tenant = {
            tenantId: decoded.tenantId,
            email: decoded.email,
            phone: decoded.phone,
            organizationId: decoded.organizationId
        };

        // 5. Continue to the next middleware or controller
        next();

    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ error: "Token has expired" });
        }
        return res.status(401).json({ error: "Invalid token" });
    }
};

module.exports = tenantAuthenticate;
