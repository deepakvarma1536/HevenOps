const validateIdParam = (id, res, paramName = "ID") => {
    // Check if the id is a string of digits
    if (!/^\d+$/.test(id)) {
        res.status(400).json({ error: `Invalid parameter: ${paramName} must be a positive integer` });
        return false;
    }
    return true;
};

const isValidIsoDate = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const validateIdempotencyKey = (value) =>
    typeof value === "string" && value.length >= 16 && value.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(value);

module.exports = { validateIdParam, isValidIsoDate, validateIdempotencyKey };
