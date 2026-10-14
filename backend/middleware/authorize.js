const ROLE_PERMISSIONS = {
    owner: ["*"],
    manager: ["operations:read", "operations:write", "tenant:auth", "finance:read", "finance:write"],
    staff: ["operations:read", "operations:write"]
};

const authorize = (...requiredPermissions) => (req, res, next) => {
    const permissions = ROLE_PERMISSIONS[req.user?.role] || [];
    const permitted = permissions.includes("*") || requiredPermissions.every(
        (permission) => permissions.includes(permission)
    );

    if (!permitted) {
        return res.status(403).json({ error: "You do not have permission to perform this action" });
    }

    next();
};

module.exports = { authorize, ROLE_PERMISSIONS };
