# Manager shifts, statistics dashboard, and print APIs

Frontend guide for POS screens that list shifts, close a shift as a supervisor, show branch KPIs, and print reports.

Base URL: `{{baseUrl}}/api/v1`  
Auth: `Authorization: Bearer {{accessToken}}`  
Date query params: ISO 8601 (`2026-10-01T00:00:00.000Z`). Send **start of day** as `from` and **end of day** as `to` in the POS timezone. Max window: **366 days**. `from` must be `<= to`.

---

## Roles

| Role | Shift list / get | Close shift by id | Cashier open/end | Calculate totals | Dashboard + print |
|------|------------------|-------------------|------------------|------------------|-------------------|
| ADMIN | All branches | Any OPEN shift | No | Yes | All branches, optional `branchId` |
| MANAGER | Own branch only | OPEN shifts on own branch | No | No | Own branch only |
| CASHIER | No | No | Yes (`POST /open`, `POST /end` + manager password) | No | No |

Manager `branchId` query that does not match their assigned branch returns **403**. Other-branch shift id on GET returns **404**.

---

## Date columns (do not mix them)

| Screen | Filter column |
|--------|----------------|
| Order dashboard, print branch KPIs, print summary, `GET /orders` | `orders.createdAt` |
| Shift list, shift KPI counts | `shift_managements.startShift` |
| Print shift orders | `orders.shift_management_id` (+ optional `createdAt` clip) |

Do **not** convert dates with `DATE()` on the client for the query string. Send full timestamps.

---

## Revenue rule (dashboard + print footers)

Counted in `kpis.revenue`, `orderCount`, `averageOrderValue`, `byOrderType`, `topItems`, `dailyTrend`:

- `PREPARED`
- `SHIFT_CALCULATED`

Excluded from those KPIs (still shown in `byStatus` and on the shift-orders paper):

- `PENDING` → `kpis.pendingCount`
- `RETURNED` → `kpis.returnedCount`

There is no payment method, tax, or discount on orders. Cards you can render: volume, revenue, items subtotal, delivery fees, service fees, AOV, type mix, status mix, top products, shift cash vs calculated.

---

## 1. Shift list (manager / admin)

`GET /shift-managements`

**Query**

| Param | Required | Notes |
|-------|----------|--------|
| `from`, `to` | No | Filters `startShift` |
| `page`, `pageSize` | No | Default 1 / 10 |
| `branchId` | No | Admin only; ignored/forbidden for manager |
| `cashierId` | No | |
| `status` | No | `OPEN` \| `CLOSED` \| `CALCULATED` |
| `sortField`, `sortOrder` | No | |

**Response:** array of shift DTOs. Pagination: `X-Total-Count` header.

```json
{
  "id": 12,
  "status": "OPEN",
  "startShift": "2026-10-01T08:00:00.000Z",
  "endShift": null,
  "endMoney": null,
  "actualEndMoney": null,
  "totalOrders": null,
  "branch": { "id": 1, "name": "Downtown" },
  "cashier": { "id": 4, "name": "Ali", "username": "cashier1" }
}
```

`GET /shift-managements/:id` — same DTO. Manager: 404 if the shift is not on their branch.

### Manager UI flow

1. Login as manager.
2. Call list with `from`/`to` for the day.
3. Show OPEN / CLOSED / CALCULATED.
4. Close uses the next endpoint. Calculate is **admin-only** — hide that button for manager.

---

## 2. Close a shift as supervisor

`POST /shift-managements/:id/close`  
Roles: ADMIN, MANAGER  
JWT only. **No manager password in the body.**

**Body** (all optional)

```json
{ "endMoney": 1250.75 }
```

**Response:** shift DTO with `status: "CLOSED"` and `endShift` set.

Does **not** change order statuses. After close, admin runs calculate.

Errors: `400` if status is not `OPEN`; `403` manager on another branch; `404` missing id.

Cashier till close is unchanged: `POST /shift-managements/end` with cashier JWT + manager username/password.

```
OPEN  --cashier /end or manager/admin /:id/close-->  CLOSED  --admin calculate-->  CALCULATED
```

---

## 3. Admin calculate (order count is in the response)

`POST /shift-managements/:id/calculate-orders-totals`  
Role: **ADMIN only** (manager gets 403)

**Response is the full shift DTO**, not a bare number:

```json
{
  "id": 12,
  "status": "CALCULATED",
  "actualEndMoney": 5280.00,
  "totalOrders": 47,
  "endMoney": 5300.00,
  "startShift": "...",
  "endShift": "...",
  "branch": { "id": 1, "name": "Downtown" },
  "cashier": { "id": 4, "name": "Ali", "username": "cashier1" }
}
```

Use `totalOrders` and `actualEndMoney` on the admin close-out screen. Prepared orders become `SHIFT_CALCULATED`.

---

## 4. Statistics dashboard

`GET /statistics/dashboard?from=&to=&branchId=&topItemsLimit=`

| Param | Required | Notes |
|-------|----------|--------|
| `from`, `to` | **Yes** | `orders.createdAt` window |
| `branchId` | No | Admin filter. Manager always own branch |
| `topItemsLimit` | No | Default 10, max 50 |

**Response**

```json
{
  "from": "2026-10-01T00:00:00.000Z",
  "to": "2026-10-31T23:59:59.999Z",
  "scope": { "branchId": 1, "branchName": "Downtown" },
  "kpis": {
    "orderCount": 120,
    "revenue": 5400.00,
    "itemsSubtotal": 4800.00,
    "deliveryFees": 400.00,
    "serviceFees": 200.00,
    "averageOrderValue": 45.00,
    "pendingCount": 3,
    "returnedCount": 2,
    "openShifts": 1,
    "closedShifts": 8,
    "calculatedShifts": 6,
    "shiftDeclaredEndMoney": 5300.00,
    "shiftActualEndMoney": 5280.00
  },
  "byOrderType": [{ "orderType": "DINE_IN", "count": 40, "revenue": 2000.00 }],
  "byStatus": [{ "status": "PREPARED", "count": 50, "revenue": 2100.00 }],
  "topItems": [
    {
      "menuItemId": 9,
      "nameAr": "قهوة",
      "nameEn": "Coffee",
      "quantity": 80,
      "revenue": 1000.00
    }
  ],
  "dailyTrend": [{ "date": "2026-10-01", "orderCount": 40, "revenue": 1800.00 }],
  "branches": [
    {
      "branchId": 1,
      "branchName": "Downtown",
      "orderCount": 70,
      "revenue": 3200.00,
      "averageOrderValue": 45.71
    }
  ]
}
```

Admin with no `branchId`: `scope.branchId` is `null` and `branches` has every branch in range. Manager: `branches` is a single row.

Suggested widgets: KPI cards from `kpis`, pie from `byOrderType`, bar from `dailyTrend`, table from `topItems`, branch comparison table from `branches`.

Empty range returns zeros, not an error.

---

## 5. Print APIs (JSON only — FE owns layout)

All return the same envelope:

```json
{
  "kind": "SHIFT_ORDERS | BRANCH_KPIS | SUMMARY",
  "printedAt": "...",
  "from": "...",
  "to": "...",
  "branch": { "id": 1, "name": "...", "address": "...", "phone": "..." },
  "header": {},
  "kpis": {},
  "sections": {},
  "footer": { "revenue": 0, "orderCount": 0 }
}
```

### Shift orders paper

`GET /statistics/print/shift-orders?shiftId=`

Optional `from`/`to` clip `orders.createdAt`. If omitted, uses `startShift` → `endShift` (or now if still open).

- `header`: shift id, status, cashier, start/end, `endMoney`, `actualEndMoney`, `totalOrders`
- `sections.orders[]`: queue, type, status, items (nameAr/nameEn, qty, unitPrice, lineTotal), fees, total
- Paper should list **all** statuses so it matches the till
- `footer` uses the revenue rule (PREPARED + SHIFT_CALCULATED)

### Branch KPIs paper

`GET /statistics/print/branch-kpis?from=&to=&branchId=`

Admin **must** pass `branchId`. Manager uses own branch.

`sections`: `byOrderType`, `byStatus`, `topItems`, `dailyTrend`, `shifts` (id, cashier, status, start/end, actualEndMoney).

### Summary paper

`GET /statistics/print/summary?from=&to=&branchId=`

Admin without `branchId` = company. Manager = own branch.

`sections.branches`, `sections.totals`, `sections.topItems`.

Print from the dashboard “Print” button: pick kind, reuse the same `from`/`to` already on the screen.

---

## 6. Optional: paged orders for a shift

`GET /orders?shiftId=&from=&to=&page=&pageSize=`

Same `createdAt` window. Admin/manager scoping follows the order list rules.

---

## Error map for UI

| Code | When |
|------|------|
| 400 | Missing `from`/`to` on statistics; window > 366 days; `from` > `to`; close a non-OPEN shift; admin print branch-kpis without `branchId`; manager with no branch |
| 401 | Missing/invalid JWT |
| 403 | Manager on another branch (close, dashboard `branchId`, print shift) |
| 404 | Unknown shift id, or manager GET shift on another branch |

---

## Indexes (backend)

Shipped in migration `1730870400022`:

1. `IDX_orders_created_at`
2. `IDX_orders_branch_created_at`
3. `IDX_orders_shift_created_at`
4. `IDX_order_items_order_id`
5. `IDX_shift_managements_start_shift`
6. `IDX_shift_managements_branch_start`
