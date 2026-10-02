/**
 * Adds manager close-shift, date-range list params, calculate DTO example,
 * and the statistics dashboard/print folder.
 */
const fs = require('fs');
const path = require('path');

const collectionPath = path.join(
  __dirname,
  'restaurant-pos.postman_collection.json',
);

const FROM = '2026-10-01T00:00:00.000Z';
const TO = '2026-10-31T23:59:59.999Z';

const calculatedShiftBody = {
  id: 1,
  status: 'CALCULATED',
  actualEndMoney: 40,
  totalOrders: 2,
  endMoney: 42,
  endShift: '2026-06-16T20:00:00.000Z',
  startShift: '2026-06-16T08:00:00.000Z',
  branch: { id: 1, name: 'Main Branch' },
  cashier: { id: 2, name: 'Cashier One', username: 'cashier1' },
  createdAt: '2026-06-16T08:00:00.000Z',
  updatedAt: '2026-06-16T21:00:00.000Z',
};

const closedShiftBody = {
  id: 1,
  status: 'CLOSED',
  endMoney: 1250.75,
  endShift: '2026-06-16T20:00:00.000Z',
  startShift: '2026-06-16T08:00:00.000Z',
  branch: { id: 1, name: 'Main Branch' },
  cashier: { id: 2, name: 'Cashier One', username: 'cashier1' },
};

function jsonExample(name, status, code, url, body, method = 'GET') {
  return {
    name,
    originalRequest: { method, url },
    status,
    code,
    _postman_previewlanguage: 'json',
    header: [{ key: 'Content-Type', value: 'application/json' }],
    cookie: [],
    body: JSON.stringify(body, null, 2),
  };
}

function getQuery(raw, query) {
  return {
    method: 'GET',
    url: {
      raw,
      host: ['{{baseUrl}}'],
      path: raw
        .replace('{{baseUrl}}/', '')
        .split('?')[0]
        .split('/'),
      query,
    },
  };
}

function walk(items, fn) {
  for (const item of items || []) {
    fn(item);
    if (item.item) walk(item.item, fn);
  }
}

function ensureVariables(collection) {
  const defaults = {
    from: FROM,
    to: TO,
    topItemsLimit: '10',
  };
  collection.variable = collection.variable || [];
  for (const [key, value] of Object.entries(defaults)) {
    if (!collection.variable.some((v) => v.key === key)) {
      collection.variable.push({ key, value });
    }
  }
}

function patchListShifts(item) {
  if (item.name !== 'List shifts' || !item.request) return;
  const url = item.request.url;
  if (typeof url === 'string') return;
  const query = url.query || [];
  const add = (key, value, disabled = false) => {
    if (!query.some((q) => q.key === key)) {
      query.push({ key, value, disabled });
    }
  };
  add('from', '{{from}}');
  add('to', '{{to}}');
  url.query = query;
  url.raw =
    '{{baseUrl}}/api/v1/shift-managements?page=1&pageSize=10&branchId={{branchId}}&cashierId={{cashierId}}&from={{from}}&to={{to}}';
  item.request.description =
    'Admin: all branches. Manager: own branch. Optional from/to filter startShift.';
}

function ensureCloseShift(folder) {
  if (folder.item.some((i) => i.name === 'Close shift (admin/manager)')) {
    return;
  }
  const closeItem = {
    name: 'Close shift (admin/manager)',
    request: {
      method: 'POST',
      header: [{ key: 'Content-Type', value: 'application/json' }],
      url: '{{baseUrl}}/api/v1/shift-managements/{{shiftId}}/close',
      description:
        'Admin or manager JWT. Force-closes an OPEN shift. Manager: own branch only. Optional endMoney. Does not change order statuses.',
      body: {
        mode: 'raw',
        raw: '{\n  "endMoney": 1250.75\n}',
        options: { raw: { language: 'json' } },
      },
    },
    response: [
      jsonExample(
        '200 OK — shift closed',
        'OK',
        200,
        '{{baseUrl}}/api/v1/shift-managements/{{shiftId}}/close',
        closedShiftBody,
        'POST',
      ),
    ],
  };
  const getIdx = folder.item.findIndex((i) => i.name === 'Get shift by id');
  folder.item.splice(getIdx >= 0 ? getIdx + 1 : folder.item.length, 0, closeItem);
}

function patchCalculate(item) {
  if (item.name !== 'Calculate orders totals (admin)' || !item.request) return;
  item.request.description =
    'Admin only. Sums PREPARED totals for a CLOSED shift. Returns the full shift DTO including totalOrders and actualEndMoney.';
  item.event = [
    {
      listen: 'test',
      script: {
        type: 'text/javascript',
        exec: [
          "pm.test('Returns calculated shift DTO', () => {",
          '  pm.expect(pm.response.code).to.be.oneOf([200, 201]);',
          '  const j = pm.response.json();',
          "  pm.expect(j.status).to.eql('CALCULATED');",
          '  pm.expect(j.totalOrders).to.be.a("number");',
          '  pm.expect(j.actualEndMoney).to.be.a("number");',
          '});',
        ],
      },
    },
  ];
  item.response = [
    jsonExample(
      '200 OK — calculated shift',
      'OK',
      200,
      '{{baseUrl}}/api/v1/shift-managements/{{shiftId}}/calculate-orders-totals',
      calculatedShiftBody,
      'POST',
    ),
  ];
}

function statisticsFolder() {
  const dashboardBody = {
    from: FROM,
    to: TO,
    scope: { branchId: 1, branchName: 'Main Branch' },
    kpis: {
      orderCount: 2,
      revenue: 40,
      itemsSubtotal: 40,
      deliveryFees: 0,
      serviceFees: 0,
      averageOrderValue: 20,
      pendingCount: 0,
      returnedCount: 0,
      openShifts: 0,
      closedShifts: 0,
      calculatedShifts: 1,
      shiftDeclaredEndMoney: 42,
      shiftActualEndMoney: 40,
    },
    byOrderType: [{ orderType: 'DINE_IN', count: 2, revenue: 40 }],
    byStatus: [{ status: 'SHIFT_CALCULATED', count: 2, revenue: 40 }],
    topItems: [
      {
        menuItemId: 1,
        nameAr: 'قهوة',
        nameEn: 'Coffee',
        quantity: 4,
        revenue: 40,
      },
    ],
    dailyTrend: [{ date: '2026-10-01', orderCount: 2, revenue: 40 }],
    branches: [
      {
        branchId: 1,
        branchName: 'Main Branch',
        orderCount: 2,
        revenue: 40,
        averageOrderValue: 20,
      },
    ],
  };

  return {
    name: 'statistics',
    item: [
      {
        name: 'Dashboard KPIs',
        request: {
          ...getQuery(
            '{{baseUrl}}/api/v1/statistics/dashboard?from={{from}}&to={{to}}&branchId={{branchId}}&topItemsLimit={{topItemsLimit}}',
            [
              { key: 'from', value: '{{from}}' },
              { key: 'to', value: '{{to}}' },
              { key: 'branchId', value: '{{branchId}}' },
              { key: 'topItemsLimit', value: '{{topItemsLimit}}' },
            ],
          ),
          description:
            'Admin/manager. from/to required (orders.createdAt). Manager is scoped to own branch. Revenue = PREPARED + SHIFT_CALCULATED.',
        },
        response: [
          jsonExample(
            '200 OK — dashboard',
            'OK',
            200,
            '{{baseUrl}}/api/v1/statistics/dashboard?from={{from}}&to={{to}}',
            dashboardBody,
          ),
        ],
      },
      {
        name: 'Print shift orders',
        request: {
          ...getQuery(
            '{{baseUrl}}/api/v1/statistics/print/shift-orders?shiftId={{shiftId}}',
            [{ key: 'shiftId', value: '{{shiftId}}' }],
          ),
          description:
            'Print JSON for one shift. Optional from/to clip order createdAt. Lists all order statuses; footer uses revenue rule.',
        },
      },
      {
        name: 'Print branch KPIs',
        request: {
          ...getQuery(
            '{{baseUrl}}/api/v1/statistics/print/branch-kpis?from={{from}}&to={{to}}&branchId={{branchId}}',
            [
              { key: 'from', value: '{{from}}' },
              { key: 'to', value: '{{to}}' },
              { key: 'branchId', value: '{{branchId}}' },
            ],
          ),
          description:
            'Print JSON for one branch. Admin must pass branchId. Manager uses own branch.',
        },
      },
      {
        name: 'Print summary',
        request: {
          ...getQuery(
            '{{baseUrl}}/api/v1/statistics/print/summary?from={{from}}&to={{to}}',
            [
              { key: 'from', value: '{{from}}' },
              { key: 'to', value: '{{to}}' },
              { key: 'branchId', value: '{{branchId}}', disabled: true },
            ],
          ),
          description:
            'Print JSON summary. Admin without branchId = all branches. Manager = own branch.',
        },
      },
    ],
  };
}

const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
ensureVariables(collection);

walk(collection.item, (item) => {
  patchListShifts(item);
  patchCalculate(item);
});

const shiftFolder = collection.item.find((i) => i.name === 'shift-managements');
if (shiftFolder) {
  ensureCloseShift(shiftFolder);
}

if (!collection.item.some((i) => i.name === 'statistics')) {
  const shiftIdx = collection.item.findIndex(
    (i) => i.name === 'shift-managements',
  );
  collection.item.splice(
    shiftIdx >= 0 ? shiftIdx + 1 : collection.item.length,
    0,
    statisticsFolder(),
  );
}

fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2) + '\n');
console.log('Patched Postman collection: close-shift, date range, statistics');
