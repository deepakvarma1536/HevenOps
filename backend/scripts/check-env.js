require("dotenv").config({ quiet: true });

const { loadEnv } = require("../config/env");

loadEnv();
console.log("Environment configuration is valid.");
