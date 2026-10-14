# Accounting write rules

All monetary values are integer paise. Clients must send `amount_paise`; decimal
currency values are never accepted by the API.

`POST /api/payments`, `POST /api/payments/:id/reversals`, and `POST /api/deposits`
require an `Idempotency-Key` header (16–128 URL-safe characters). Retrying the same
key returns the original ledger entry instead of recording money twice.

Payments and deposit transactions are immutable. Correct a payment through a payment
reversal; correct deposit money through a `REFUND` deposit transaction. There are no
edit or delete routes for ledger entries.

Every stay starts with an agreed `monthly_rent_paise` rate plan. Use
`POST /api/stays/:id/rate-plans` for a future rate change. Rent generation resolves
the rate plan effective in the requested month and reports stays without one.
