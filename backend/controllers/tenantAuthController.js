const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');

const TOKEN_TTL_HOURS = Number(process.env.TENANT_AUTH_TOKEN_TTL_HOURS || 24);
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const tenantAuthController = {
    // POST /api/tenant-auth/login
    login: async (req, res) => {
        try {
            const { identifier, password } = req.body;

            if (!identifier || !password) {
                return res.status(400).json({ error: "Email/Phone and password are required" });
            }

            // Find tenant by email or phone
            const result = await pool.query(
                `SELECT * FROM tenants 
                 WHERE (email = $1 OR phone = $1) 
                 AND is_active = true AND archived_at IS NULL`,
                [identifier]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({ error: "Invalid credentials or account inactive" });
            }

            const tenant = result.rows[0];

            // If the tenant doesn't have a password set up yet
            if (!tenant.password_hash) {
                return res.status(403).json({ error: "Account not setup. Please contact administrator." });
            }

            // Compare passwords
            const isValid = await bcrypt.compare(password, tenant.password_hash);
            if (!isValid) {
                return res.status(401).json({ error: "Invalid credentials" });
            }

            // Generate JWT
            const token = jwt.sign(
                {
                    tenantId: tenant.id,
                    email: tenant.email,
                    phone: tenant.phone,
                    organizationId: tenant.organization_id
                },
                process.env.JWT_SECRET,
                { expiresIn: '7d' } // Tenants might stay logged in longer
            );

            // Don't send password_hash in response
            delete tenant.password_hash;

            res.json({
                message: "Login successful",
                token,
                tenant
            });

        } catch (error) {
            req.log.error({ errorName: error.name, errorCode: error.code }, "tenant login failed");
            res.status(500).json({ error: "Internal server error" });
        }
    },

    // POST /api/tenant-auth/setup-password
    setupPassword: async (req, res) => {
        try {
            const { invitationToken, newPassword } = req.body;
            
            if (!invitationToken || !newPassword) {
                return res.status(400).json({ error: "invitationToken and newPassword are required" });
            }
            if (typeof newPassword !== 'string' || newPassword.length < 8) {
                return res.status(400).json({ error: "newPassword must be at least 8 characters" });
            }

            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                const tokenResult = await client.query(
                    `SELECT id, tenant_id FROM tenant_auth_tokens
                     WHERE token_hash = $1 AND purpose IN ('INVITE', 'PASSWORD_RESET')
                       AND used_at IS NULL AND expires_at > NOW()
                     FOR UPDATE`,
                    [hashToken(invitationToken)]
                );
                if (tokenResult.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: "Invitation token is invalid or expired" });
                }

                const passwordHash = await bcrypt.hash(newPassword, 12);
                await client.query(
                    'UPDATE tenants SET password_hash = $1 WHERE id = $2',
                    [passwordHash, tokenResult.rows[0].tenant_id]
                );
                await client.query(
                    'UPDATE tenant_auth_tokens SET used_at = NOW() WHERE id = $1',
                    [tokenResult.rows[0].id]
                );
                await client.query('COMMIT');
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }

            res.json({ message: "Password setup successfully. You can now login." });

        } catch (error) {
            req.log.error({ errorName: error.name, errorCode: error.code }, "tenant password setup failed");
            res.status(500).json({ error: "Internal server error" });
        }
    },

    // POST /api/tenants/:id/auth-token (owner/manager only)
    issueInvite: async (req, res) => {
        try {
            const tenantId = req.params.id;
            const purpose = req.body?.purpose || 'INVITE';
            if (!['INVITE', 'PASSWORD_RESET'].includes(purpose)) {
                return res.status(400).json({ error: 'purpose must be INVITE or PASSWORD_RESET' });
            }
            const rawToken = crypto.randomBytes(32).toString('base64url');
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                const tenant = await client.query(
                    `SELECT id FROM tenants
                     WHERE id = $1 AND organization_id = $2 AND is_active = TRUE AND archived_at IS NULL
                     FOR UPDATE`,
                    [tenantId, req.user.organizationId]
                );
                if (tenant.rows.length === 0) {
                    await client.query('ROLLBACK');
                    return res.status(404).json({ error: 'Tenant not found' });
                }
                await client.query(
                    `UPDATE tenant_auth_tokens SET used_at = NOW()
                     WHERE tenant_id = $1 AND purpose = $2 AND used_at IS NULL`,
                    [tenantId, purpose]
                );
                const token = await client.query(
                    `INSERT INTO tenant_auth_tokens (tenant_id, token_hash, purpose, expires_at)
                     VALUES ($1, $2, $3, NOW() + ($4 * INTERVAL '1 hour'))
                     RETURNING expires_at`,
                    [tenantId, hashToken(rawToken), purpose, TOKEN_TTL_HOURS]
                );
                await client.query('COMMIT');

                // The caller must send this through a trusted out-of-band channel.
                // A notification provider should replace this response in production.
                return res.status(201).json({ invitationToken: rawToken, purpose, expiresAt: token.rows[0].expires_at });
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            req.log.error({ errorName: error.name, errorCode: error.code }, "tenant invitation creation failed");
            res.status(500).json({ error: 'Failed to create tenant invitation' });
        }
    }
};

module.exports = tenantAuthController;
