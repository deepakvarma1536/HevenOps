# Authorization policy

Every staff route is authenticated and every organization-owned query receives the
organization ID from the verified JWT, never from client input.

| Role | Access |
| --- | --- |
| `owner` | All actions, including organization settings and destructive deletes. |
| `manager` | Read/write operations (properties, inventory, tenants and stays), issue tenant invites/resets, and manage finance (dues, payments, deposits). |
| `staff` | Read/write operations only. Cannot perform financial actions, change organization settings, or delete records. |

Tenant invite and password-reset tokens are random 256-bit values. Only their SHA-256
hash is stored, each token expires after `TENANT_AUTH_TOKEN_TTL_HOURS` (24 by default),
and it is marked used in the same transaction that sets the password. Create a token
through `POST /api/tenants/:id/auth-token` with purpose `INVITE` or `PASSWORD_RESET`.
The response
must be delivered through a trusted out-of-band channel; replace this handoff with a
mail/SMS provider before public production use.

Submit that `invitationToken` and a new password to
`POST /api/tenant-auth/setup-password`. The endpoint accepts both invitation and
password-reset tokens, but never an email address as proof of identity.
