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
`POST /api/stays/:id/rate-plans` for a future rate change. Automatic billing
charges at 30-day intervals from move-in, using the rate in effect at the start of
each cycle. A legacy monthly charge covers the first cycle due in its billing
month. The manual monthly generation endpoint uses the rate at the start of the
requested month.
