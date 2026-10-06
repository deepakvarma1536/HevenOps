const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const UserModel = require("../models/userModel");
const pool = require("../config/db");

const SALT_ROUNDS = 10;

const AuthController = {
    async register(req, res) {
        try {
            const { name, email, password, organizationName } = req.body;

            // 1. Validate required fields
            if (!name || !email || !password || !organizationName) {
                return res.status(400).json({
                    error: "name, email, password, and organizationName are required"
                });
            }

            // 2. Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ error: "Invalid email format" });
            }

            // 3. Validate password length
            if (password.length < 8) {
                return res.status(400).json({
                    error: "Password must be at least 8 characters"
                });
            }

            // 4. Check if email already exists
            const existingUser = await UserModel.findByEmail(email);
            if (existingUser) {
                return res.status(409).json({ error: "Email already registered" });
            }

            // 5. Hash the password
            const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

            // 6. Create user + organization in a transaction
            const client = await pool.connect();
            try {
                await client.query("BEGIN");

                // Create the user
                const userResult = await client.query(
                    `INSERT INTO users (name, email, password_hash)
                     VALUES ($1, $2, $3)
                     RETURNING id, name, email, created_at`,
                    [name, email, passwordHash]
                );
                const user = userResult.rows[0];

                // Create the organization
                const orgResult = await client.query(
                    `INSERT INTO organizations (name)
                     VALUES ($1)
                     RETURNING id, name`,
                    [organizationName]
                );
                const organization = orgResult.rows[0];

                // Link user to organization as owner
                await client.query(
                    `INSERT INTO organization_members (organization_id, user_id, role)
                     VALUES ($1, $2, 'owner')`,
                    [organization.id, user.id]
                );

                await client.query("COMMIT");

                // 7. Generate JWT
                const token = jwt.sign(
                    {
                        userId: user.id,
                        email: user.email,
                        organizationId: organization.id,
                        role: "owner"
                    },
                    process.env.JWT_SECRET,
                    { expiresIn: process.env.JWT_EXPIRES_IN }
                );

                res.status(201).json({
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email
                    },
                    organization: {
                        id: organization.id,
                        name: organization.name
                    },
                    token
                });

            } catch (error) {
                await client.query("ROLLBACK");
                throw error;
            } finally {
                client.release();
            }

        } catch (error) {
            console.error("Registration failed:", error);
            res.status(500).json({ error: "Registration failed" });
        }
    },

    async login(req, res) {
        try {
            const { email, password } = req.body;

            // 1. Validate required fields
            if (!email || !password) {
                return res.status(400).json({
                    error: "email and password are required"
                });
            }

            // 2. Find user by email
            const user = await UserModel.findByEmail(email);
            if (!user) {
                return res.status(401).json({ error: "Invalid email or password" });
            }

            // 3. Compare password with stored hash
            const passwordMatch = await bcrypt.compare(password, user.password_hash);
            if (!passwordMatch) {
                return res.status(401).json({ error: "Invalid email or password" });
            }

            // 4. Get user's organization membership
            const memberResult = await pool.query(
                `SELECT organization_id, role
                 FROM organization_members
                 WHERE user_id = $1
                 LIMIT 1`,
                [user.id]
            );

            if (memberResult.rows.length === 0) {
                return res.status(403).json({
                    error: "User is not a member of any organization"
                });
            }

            const membership = memberResult.rows[0];

            // 5. Generate JWT
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    organizationId: membership.organization_id,
                    role: membership.role
                },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );

            res.json({
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email
                },
                organizationId: membership.organization_id,
                role: membership.role,
                token
            });

        } catch (error) {
            console.error("Login failed:", error);
            res.status(500).json({ error: "Login failed" });
        }
    }
};

module.exports = AuthController;
