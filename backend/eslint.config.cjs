const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
    {
        ignores: ["coverage/**", "migrations/**", "node_modules/**"],
    },
    {
        ...js.configs.recommended,
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "commonjs",
            globals: globals.node,
        },
        rules: {
            "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }],
        },
    },
];
