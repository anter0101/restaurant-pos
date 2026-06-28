/**
 * Aligns shift-managements requests/examples with current API:
 * - POST /open — no body (cashier from JWT)
 * - POST /end — no body (closes logged-in cashier's open shift)
 * - GET /has-open-shift
 * - POST /:id/calculate-orders-totals (admin)
 */
const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, 'restaurant-pos.postman_collection.json');

const shiftOpenedExampleBody = {
  id: 1,
  status: 'OPEN',
  isCalculatedShift: false,
  startShift: '2026-06-16T08:00:00.000Z',
  branch: { id: 1, name: 'Main Branch' },
  cashier: { id: 2, name: 'Cashier One', username: 'cashier1' },
  createdAt: '2026-06-16T08:00:00.000Z',
  updatedAt: '2026-06-16T08:00:00.000Z',
};

const shiftClosedExampleBody = {
  id: 1,
  status: 'CLOSED',
  isCalculatedShift: false,
  endShift: '2026-06-16T20:00:00.000Z',
  branch: { id: 1, name: 'Main Branch' },
  cashier: { id: 2, name: 'Cashier One', username: 'cashier1' },
  createdAt: '2026-06-16T08:00:00.000Z',
  updatedAt: '2026-06-16T20:00:00.000Z',
};

const shiftCalculatedExampleBody = {
  id: 1,
  status: 'CALCULATED',
  isCalculatedShift: true,
  actualEndMoney: 40,
  totalOrders: 2,
  endShift: '2026-06-16T20:00:00.000Z',
  branch: { id: 1, name: 'Main Branch' },
  cashier: { id: 2, name: 'Cashier One', username: 'cashier1' },
  createdAt: '2026-06-16T08:00:00.000Z',
  updatedAt: '2026-06-16T21:00:00.000Z',
};

function urlRaw(url) {
  if (typeof url === 'string') return url;
  return url?.raw || '';
}

function fixOpenShiftRequest(req) {
  if (req.method !== 'POST') return;
  const raw = urlRaw(req.url);
  if (!raw.includes('/shift-managements/open')) return;

  delete req.body;
  req.description =
    'Opens a shift for the logged-in cashier. Branch is resolved from the user token. Resets branch order queue counter.';
}

function fixEndShiftRequest(req) {
  const raw = urlRaw(req.url);
  if (!raw.includes('/shift-managements') || !raw.includes('/end')) return;
  if (req.method !== 'PUT' && req.method !== 'POST') return;

  req.method = 'POST';
  delete req.body;
  req.url = '{{baseUrl}}/api/v1/shift-managements/end';
  req.description =
    'Closes the logged-in cashier open shift at their branch. No request body.';
}

function fixShiftResponses(item) {
  if (!item.response) return;
  for (const res of item.response) {
    const reqUrl = urlRaw(res.originalRequest?.url || item.request?.url);
    if (reqUrl.includes('/shift-managements/open')) {
      res.body = JSON.stringify(shiftOpenedExampleBody, null, 2);
    }
    if (reqUrl.includes('/shift-managements') && reqUrl.includes('/end')) {
      res.name = res.name?.includes('Created') ? res.name : '201 Created — shift closed';
      res.status = 'Created';
      res.code = 201;
      res.body = JSON.stringify(shiftClosedExampleBody, null, 2);
    }
    if (reqUrl.includes('calculate-orders-totals')) {
      res.name = '201 Created — calculated end money';
      res.status = 'Created';
      res.code = 201;
      res.body = '40';
    }
  }
}

function ensureShiftCrudItems(folder) {
  const names = new Set(folder.item.map((i) => i.name));

  if (!names.has('Has open shift')) {
    folder.item.push({
      name: 'Has open shift',
      request: {
        method: 'GET',
        url: '{{baseUrl}}/api/v1/shift-managements/has-open-shift',
        description: 'Returns true when the logged-in cashier has an open shift at their branch.',
      },
    });
  }

  if (!names.has('Calculate orders totals (admin)')) {
    folder.item.push({
      name: 'Calculate orders totals (admin)',
      event: [
        {
          listen: 'test',
          script: {
            type: 'text/javascript',
            exec: [
              "pm.test('Returns calculated total', () => {",
              '  pm.expect(pm.response.code).to.eql(200);',
              '  pm.expect(Number(pm.response.text())).to.be.a("number");',
              '});',
            ],
          },
        },
      ],
      request: {
        method: 'POST',
        url: '{{baseUrl}}/api/v1/shift-managements/{{shiftId}}/calculate-orders-totals',
        description:
          'Admin only. Sums PREPARED order totals for a CLOSED shift, sets status CALCULATED, marks orders SHIFT_CALCULATED. Returns actualEndMoney.',
      },
      response: [
        {
          name: '200 OK — calculated end money',
          originalRequest: {
            method: 'POST',
            url: '{{baseUrl}}/api/v1/shift-managements/{{shiftId}}/calculate-orders-totals',
          },
          status: 'OK',
          code: 200,
          _postman_previewlanguage: 'json',
          header: [{ key: 'Content-Type', value: 'application/json' }],
          cookie: [],
          body: '40',
        },
      ],
    });
  }

  const getById = folder.item.find((i) => i.name === 'Get shift by id');
  if (getById && !getById.response?.length) {
    getById.response = [
      {
        name: '200 OK — shift (calculated)',
        originalRequest: {
          method: 'GET',
          url: '{{baseUrl}}/api/v1/shift-managements/{{shiftId}}',
        },
        status: 'OK',
        code: 200,
        _postman_previewlanguage: 'json',
        header: [{ key: 'Content-Type', value: 'application/json' }],
        cookie: [],
        body: JSON.stringify(shiftCalculatedExampleBody, null, 2),
      },
    ];
  }
}

function walkItems(items, inShiftFolder = false) {
  for (const item of items) {
    if (item.item) {
      const nextInShift = inShiftFolder || item.name === 'shift-managements';
      walkItems(item.item, nextInShift);
      if (item.name === 'shift-managements') {
        ensureShiftCrudItems(item);
      }
      continue;
    }

    if (item.request) {
      fixOpenShiftRequest(item.request);
      fixEndShiftRequest(item.request);
      fixShiftResponses(item);
    }
  }
}

const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
walkItems(collection.item);
fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2) + '\n');
console.log('Patched', path.basename(collectionPath));
