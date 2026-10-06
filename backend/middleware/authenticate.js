const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
    // 1. Get the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Authentication required" });
    }

    // 2. Extract the token (remove "Bearer " prefix)
    const token = authHeader.split(" ")[1];

    try {
        // 3. Verify and decode the JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 4. Attach user info to the request object
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            organizationId: decoded.organizationId,
            role: decoded.role
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

module.exports = authenticate;
