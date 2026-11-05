/**
 * Aligns shift-managements requests/examples with current API:
 * - POST /open — cashier JWT + manager username/password in body
 * - POST /end — cashier JWT + manager username/password in body
 * - GET /has-open-shift
 * - POST /:id/calculate-orders-totals (admin)
 */
const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, 'restaurant-pos.postman_collection.json');

const jsonHeader = [{ key: 'Content-Type', value: 'application/json' }];

const MANAGER_BODY_RAW =
  '{\n  "username": "{{managerUsername}}",\n  "password": "{{managerPassword}}"\n}';

const CASHIER_LOGIN_RAW =
  '{\n  "username": "{{cashierUsername}}",\n  "password": "{{cashierPassword}}"\n}';

const OPEN_SHIFT_DESCRIPTION =
  'Opens a shift for the logged-in cashier (JWT must be CASHIER). Body: manager username/password for authorization. Resets branch order queue counter.';

const END_SHIFT_DESCRIPTION =
  'Closes the logged-in cashier open shift. Body: manager username/password for authorization.';

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

function ensureVariables(collection) {
  const defaults = {
    managerUsername: 'manager1',
    managerPassword: '123456',
    cashierUsername: 'cashier1',
    cashierPassword: '123456',
  };
  for (const [key, value] of Object.entries(defaults)) {
    if (!collection.variable.some((v) => v.key === key)) {
      collection.variable.push({ key, value });
    }
  }
}

function applyManagerBody(req) {
  req.body = {
    mode: 'raw',
    raw: MANAGER_BODY_RAW,
    options: { raw: { language: 'json' } },
  };
  req.header = req.header || [];
  if (!req.header.some((h) => h.key === 'Content-Type')) {
    req.header.push({ key: 'Content-Type', value: 'application/json' });
  }
}

function patchLoginBody(req) {
  if (!req?.body?.mode) return;
  req.body.raw = CASHIER_LOGIN_RAW;
  req.body.options = { raw: { language: 'json' } };
}

function folderUsesShiftOpenOrEnd(folder) {
  return folder.item?.some((child) => {
    const name = child.name?.toLowerCase() || '';
    const url = urlRaw(child.request?.url);
    return (
      name.includes('open shift') ||
      (url.includes('/shift-managements/open') && child.request?.method === 'POST') ||
      (url.includes('/shift-managements/end') && child.request?.method === 'POST')
    );
  });
}

function ensureAdminLoginBeforeCalculate(folder) {
  const calcIdx = folder.item.findIndex((i) =>
    i.name?.toLowerCase().includes('calculate orders totals'),
  );
  if (calcIdx < 0) return;

  const prev = folder.item[calcIdx - 1];
  if (prev?.name?.toLowerCase().includes('login as admin')) return;

  folder.item.splice(calcIdx, 0, {
    name: 'Login as admin (for calculate)',
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            "pm.collectionVariables.set('accessToken', pm.response.json().token);",
          ],
        },
      },
    ],
    request: {
      auth: { type: 'noauth' },
      method: 'POST',
      header: jsonHeader,
      body: {
        mode: 'raw',
        raw: '{\n  "username": "admin",\n  "password": "123456"\n}',
        options: { raw: { language: 'json' } },
      },
      url: '{{baseUrl}}/api/v1/auth/login',
      description: 'Admin login required for calculate-orders-totals.',
    },
  });
}

function patchE2EScenarioFolder(folder) {
  if (!folderUsesShiftOpenOrEnd(folder)) return;
  patchE2ELoginsForShift(folder);
  ensureAdminLoginBeforeCalculate(folder);
}

function patchE2ELoginsForShift(folder) {
  for (const child of folder.item) {
    if (!child.name?.toLowerCase().includes('login')) continue;
    if (child.name?.toLowerCase().includes('login as admin')) continue;
    if (!urlRaw(child.request?.url).includes('/auth/login')) continue;

    patchLoginBody(child.request);
    if (child.response) {
      for (const res of child.response) {
        if (res.originalRequest?.body) {
          patchLoginBody(res.originalRequest);
        }
      }
    }
  }
}

function fixOpenShiftRequest(req) {
  if (req.method !== 'POST') return;
  const raw = urlRaw(req.url);
  if (!raw.includes('/shift-managements/open')) return;

  applyManagerBody(req);
  req.description = OPEN_SHIFT_DESCRIPTION;
}

function fixEndShiftRequest(req) {
  const raw = urlRaw(req.url);
  if (!raw.includes('/shift-managements') || !raw.includes('/end')) return;
  if (req.method !== 'PUT' && req.method !== 'POST') return;

  req.method = 'POST';
  applyManagerBody(req);
  req.url = '{{baseUrl}}/api/v1/shift-managements/end';
  req.description = END_SHIFT_DESCRIPTION;
}

function fixShiftResponses(item) {
  if (!item.response) return;
  for (const res of item.response) {
    const reqUrl = urlRaw(res.originalRequest?.url || item.request?.url);
    if (reqUrl.includes('/shift-managements/open')) {
      if (res.originalRequest) {
        applyManagerBody(res.originalRequest);
        res.originalRequest.description = OPEN_SHIFT_DESCRIPTION;
      }
      res.body = JSON.stringify(shiftOpenedExampleBody, null, 2);
    }
    if (reqUrl.includes('/shift-managements') && reqUrl.includes('/end')) {
      if (res.originalRequest) {
        applyManagerBody(res.originalRequest);
        res.originalRequest.description = END_SHIFT_DESCRIPTION;
      }
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

function ensureManagerUserRequest(usersFolder) {
  if (!usersFolder?.item) return;
  if (usersFolder.item.some((i) => i.name?.toLowerCase().includes('manager'))) {
    return;
  }

  const createIdx = usersFolder.item.findIndex((i) => i.name === 'Create user');
  const insertAt = createIdx >= 0 ? createIdx + 1 : usersFolder.item.length;

  usersFolder.item.splice(insertAt, 0, {
    name: 'Create manager user',
    request: {
      method: 'POST',
      header: jsonHeader,
      body: {
        mode: 'raw',
        raw: [
          '{',
          '  "name": "Branch Manager",',
          '  "username": "{{managerUsername}}",',
          '  "password": "{{managerPassword}}",',
          '  "role": "MANAGER",',
          '  "branchId": {{branchId}},',
          '  "isActive": true',
          '}',
        ].join('\n'),
        options: { raw: { language: 'json' } },
      },
      url: '{{baseUrl}}/api/v1/users',
      description:
        'Creates a MANAGER user — credentials are used in shift open/end request bodies.',
    },
  });
}

function ensureShiftCrudItems(folder) {
  const names = new Set(folder.item.map((i) => i.name));

  const openShift = folder.item.find((i) => i.name === 'Open shift');
  if (openShift?.request) {
    fixOpenShiftRequest(openShift.request);
    fixShiftResponses(openShift);
  }

  const endShift = folder.item.find((i) => i.name === 'End shift');
  if (endShift?.request) {
    fixEndShiftRequest(endShift.request);
    fixShiftResponses(endShift);
  }

  if (!names.has('Has open shift')) {
    folder.item.push({
      name: 'Has open shift',
      request: {
        method: 'GET',
        url: '{{baseUrl}}/api/v1/shift-managements/has-open-shift',
        description:
          'Returns true when the logged-in cashier has an open shift at their branch.',
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
          header: jsonHeader,
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
        header: jsonHeader,
        cookie: [],
        body: JSON.stringify(shiftCalculatedExampleBody, null, 2),
      },
    ];
  }
}

function walkItems(items, inShiftFolder = false, parentFolder = null) {
  for (const item of items) {
    if (item.item) {
      if (item.name?.startsWith('Scenario') || item.name === 'Full happy path (all flows)') {
        patchE2EScenarioFolder(item);
      }
      if (item.name === 'users') {
        ensureManagerUserRequest(item);
      }
      const nextInShift = inShiftFolder || item.name === 'shift-managements';
      walkItems(item.item, nextInShift, item);
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

const collection = JSON.parse(
  fs.readFileSync(collectionPath, 'utf8').replace(/^\uFEFF/, ''),
);
ensureVariables(collection);
walkItems(collection.item);
fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2) + '\n');
console.log('Patched', path.basename(collectionPath));
