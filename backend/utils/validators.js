const validateIdParam = (id, res, paramName = "ID") => {
    // Check if the id is a string of digits
    if (!/^\d+$/.test(id)) {
        res.status(400).json({ error: `Invalid parameter: ${paramName} must be a positive integer` });
        return false;
    }
    return true;
};

module.exports = { validateIdParam };
