# Postman collection

**`restaurant-pos.postman_collection.json`** — single collection for this API:

- Bearer auth (`{{accessToken}}`) on all protected routes
- All API endpoints across auth, branches, users, menu-categories, menu-items, delivery-regions, **customers**, shift-managements, **statistics**, orders
- Sample JSON bodies including `servicePercentage`, create user, dine-in vs delivery orders
- **`00 — E2E Scenarios`** folder — run with Collection Runner in order

### Import

Postman → **Import** → select `postman/restaurant-pos.postman_collection.json`

### Variables (defaults)

| Variable | Purpose |
|----------|---------|
| `baseUrl` | `http://localhost:8080` |
| `accessToken` | Set by Login requests |
| `branchId`, `cashierId`, `customerId`, `customerPhone`, `menuItemId`, etc. | Set by create requests or scenario tests |

### Customers endpoints

| Method | Path | Roles | Notes |
|--------|------|-------|-------|
| GET | `/customers` | Admin, Call center, Cashier, Manager | Paginated; filter `customerType`, search name/phone |
| GET | `/customers/by-phone/:phone` | Same | Call-center lookup |
| GET | `/customers/:id` | Same | Detail with optional `defaultDeliveryRegion` |
| POST | `/customers` | Admin, Call center, Manager | `customerType`: `NORMAL` \| `SPECIAL` |
| PUT | `/customers/:id` | Admin, Call center, Manager | Update contact / default region |
| DELETE | `/customers/:id` | Admin, Manager | |

Orders accept optional `customerId`. Customers have `address`, `secondaryAddress`, and `thirdAddress` — POS picks one and sends it as `deliveryAddress` on DELIVERY orders. `deliveryRegionId` defaults from customer when omitted. `customDeliveryPrice` overrides the region fee.

### Shift management endpoints

| Method | Path | Role | Notes |
|--------|------|------|-------|
| GET | `/shift-managements` | Admin, **Manager** | Paginated. Manager scoped to own branch. Optional `from`/`to` on `startShift`, plus `branchId`, `cashierId`, `status` |
| POST | `/shift-managements/open` | Cashier (JWT) | Body: `username` + `password` (manager credentials). Opens shift for logged-in cashier. |
| POST | `/shift-managements/end` | Cashier (JWT) | Body: manager `username` + `password`. Closes logged-in cashier's open shift. |
| GET | `/shift-managements/has-open-shift` | Cashier | Returns `true` / `false` |
| GET | `/shift-managements/:id` | Admin, **Manager** | Manager 404 if shift is not on their branch |
| POST | `/shift-managements/:id/close` | Admin, **Manager** | JWT only. Force-close OPEN shift. Optional `{ "endMoney": 1250.75 }`. Manager: own branch |
| POST | `/shift-managements/:id/calculate-orders-totals` | Admin | Returns **shift DTO** with `totalOrders` and `actualEndMoney` (not a bare number) |

### Statistics / print endpoints

Frontend guide: [`docs/manager-statistics-api-frontend-guide.md`](../docs/manager-statistics-api-frontend-guide.md)

| Method | Path | Role | Notes |
|--------|------|------|-------|
| GET | `/statistics/dashboard` | Admin, Manager | Required `from`/`to`. Optional `branchId`, `topItemsLimit`. Revenue = PREPARED + SHIFT_CALCULATED |
| GET | `/statistics/print/shift-orders` | Admin, Manager | Required `shiftId`. Print JSON for the till paper |
| GET | `/statistics/print/branch-kpis` | Admin, Manager | Required `from`/`to`. Admin must pass `branchId` |
| GET | `/statistics/print/summary` | Admin, Manager | Required `from`/`to`. Company-wide when admin omits `branchId` |

Collection variables: `from`, `to`, `topItemsLimit`.

### Shift status flow

```
OPEN → (cashier end **or** admin/manager POST /:id/close) → CLOSED → (admin calculate) → CALCULATED
```

Prepared orders move to `SHIFT_CALCULATED` on admin calculation. Calculate returns the shift including `totalOrders`.

### E2E scenario folders (match Jest `scenarios.pos.e2e-spec.ts`)

| Folder | Steps | Assertions |
|--------|-------|------------|
| **Scenario 1 — Dine-in** | Login → Open shift → Order (no region) | `deliveryFees=0`, `orderQueue=0` |
| **Scenario 2 — Delivery** | Login → Create region → Order with region | `deliveryFees>0`, total = subtotal + fees |
| **Scenario 3 — Shift reset** | Login → Shift → Order×2 → End shift → New shift → Order | queues `0`, `1`, then `0` after reset |
| **Scenario 4 — Queue wrap** | Login → Shift → **100×** setup orders → Order → Order | queues `100` then `0` |
| **Scenario 5 — Calculate shift** | Login → Open → Order → End → Admin calculate totals | `status=CALCULATED`, `isCalculatedShift=true` |
| **Full happy path** | Combined smoke test | All flows in one run |

**Scenario 4 tip:** In Collection Runner, select only step 3 and set **Iterations: 100**, then run steps 4–5 once.

### Regenerate POST response examples

```bash
node postman/patch-customers-endpoints.js
node postman/patch-order-bodies.js
node postman/patch-shift-endpoints.js
node postman/patch-statistics-endpoints.js
node postman/add-post-examples.js
```
