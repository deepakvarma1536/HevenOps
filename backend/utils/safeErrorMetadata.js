function safeIdentifier(value, fallback) {
    if (typeof value !== "string" || !/^[A-Za-z0-9_.-]{1,80}$/.test(value)) return fallback;
    return value;
}

function safeErrorMetadata(error) {
    return {
        errorName: safeIdentifier(error?.name, "Error"),
        errorCode: safeIdentifier(error?.code, undefined),
    };
}

module.exports = { safeErrorMetadata, safeIdentifier };
