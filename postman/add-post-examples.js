/**
 * Adds saved response examples to every POST request in the Postman collection.
 */
const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, 'restaurant-pos.postman_collection.json');
const collection = JSON.parse(
  fs.readFileSync(collectionPath, 'utf8').replace(/^\uFEFF/, ''),
);

const jsonHeader = [{ key: 'Content-Type', value: 'application/json' }];

function example(name, status, code, body, originalRequest) {
  return {
    name,
    originalRequest,
    status,
    code,
    _postman_previewlanguage: 'json',
    header: jsonHeader,
    cookie: [],
    body: JSON.stringify(body, null, 2),
  };
}

function cloneRequest(req) {
  return JSON.parse(JSON.stringify(req));
}

function examplesForPost(url, req) {
  const u = typeof url === 'string' ? url : url.raw || '';
  const originalRequest = cloneRequest(req);

  if (u.includes('/auth/login')) {
    return [
      example('200 OK — login', 'OK', 200, {
        user: {
          id: 1,
          name: 'Admin',
          username: 'admin',
          role: 'ADMIN',
          isActive: true,
          branch: {
            id: 1,
            name: 'Main Branch',
            type: 'DINE_IN',
            address: '123 Example Rd',
            servicePercentage: 0.15,
          },
        },
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example',
      }, originalRequest),
    ];
  }

  if (u.includes('/branches') && !u.match(/\/\d+/)) {
    return [
      example('201 Created — branch', 'Created', 201, {
        id: 1,
        name: 'Main Branch',
        type: 'DINE_IN',
        address: '123 Example Rd',
        phone: '+15550101',
        servicePercentage: 0.15,
        createdAt: '2026-06-16T10:00:00.000Z',
        updatedAt: '2026-06-16T10:00:00.000Z',
      }, originalRequest),
    ];
  }

  if (u.includes('/users') && !u.match(/\/\d+/)) {
    return [
      example('201 Created — user', 'Created', 201, {
        id: 2,
        name: 'Cashier One',
        username: 'cashier1',
        role: 'CASHIER',
        isActive: true,
        branch: { id: 1, name: 'Main Branch' },
        createdAt: '2026-06-16T10:00:00.000Z',
        updatedAt: '2026-06-16T10:00:00.000Z',
      }, originalRequest),
    ];
  }

  if (u.includes('/menu-categories') && !u.match(/\/\d+/)) {
    return [
      example('201 Created — category', 'Created', 201, {
        id: 1,
        nameAr: 'مشروبات',
        nameEn: 'Beverages',
        isActive: true,
        createdAt: '2026-06-16T10:00:00.000Z',
        updatedAt: '2026-06-16T10:00:00.000Z',
      }, originalRequest),
    ];
  }

  if (u.includes('/menu-items/assign-branch')) {
    return [
      example('201 Created — branch assignment', 'Created', 201, {
        id: 1,
        menuItemId: 1,
        branchId: 1,
        price: 14,
        isActive: true,
      }, originalRequest),
    ];
  }

  if (u.includes('/menu-items') && !u.match(/\/\d+/) && !u.includes('assign-branch')) {
    return [
      example('201 Created — menu item', 'Created', 201, {
        id: 1,
        nameAr: 'قهوة',
        nameEn: 'Coffee',
        defaultPrice: 12.5,
        isActive: true,
        menuCategory: { id: 1, nameEn: 'Beverages' },
        createdAt: '2026-06-16T10:00:00.000Z',
        updatedAt: '2026-06-16T10:00:00.000Z',
      }, originalRequest),
    ];
  }

  if (u.includes('/delivery-regions') && !u.match(/\/\d+/)) {
    return [
      example('201 Created — delivery region', 'Created', 201, {
        id: 1,
        regionName: 'Downtown',
        deliveryPrice: 5.5,
        branch: { id: 1, name: 'Main Branch', type: 'DINE_IN' },
        createdAt: '2026-06-16T10:00:00.000Z',
        updatedAt: '2026-06-16T10:00:00.000Z',
      }, originalRequest),
    ];
  }

  if (u.includes('/customers') && !u.includes('by-phone') && !u.match(/\/\d+/)) {
    return [
      example('201 Created — customer', 'Created', 201, {
        id: 1,
        name: 'محمد',
        phone: '01012345678',
        address: 'شارع الجلاء',
        customerType: 'NORMAL',
        defaultDeliveryRegion: {
          id: 1,
          regionName: 'Downtown',
          deliveryPrice: 5.5,
        },
        createdAt: '2026-06-16T10:00:00.000Z',
        updatedAt: '2026-06-16T10:00:00.000Z',
      }, originalRequest),
    ];
  }

  if (u.includes('/shift-managements/open')) {
    return [
      example('201 Created — shift opened', 'Created', 201, {
        id: 1,
        status: 'OPEN',
        isCalculatedShift: false,
        startShift: '2026-06-16T08:00:00.000Z',
        branch: { id: 1, name: 'Main Branch' },
        cashier: { id: 2, name: 'Cashier One', username: 'cashier1' },
        createdAt: '2026-06-16T08:00:00.000Z',
        updatedAt: '2026-06-16T08:00:00.000Z',
      }, originalRequest),
    ];
  }

  if (u.includes('/shift-managements/end')) {
    return [
      example('201 Created — shift closed', 'Created', 201, {
        id: 1,
        status: 'CLOSED',
        isCalculatedShift: false,
        endShift: '2026-06-16T20:00:00.000Z',
        branch: { id: 1, name: 'Main Branch' },
        cashier: { id: 2, name: 'Cashier One', username: 'cashier1' },
        createdAt: '2026-06-16T08:00:00.000Z',
        updatedAt: '2026-06-16T20:00:00.000Z',
      }, originalRequest),
    ];
  }

  if (u.includes('calculate-orders-totals')) {
    return [
      example('201 Created — calculated end money', 'Created', 201, 40, originalRequest),
    ];
  }

  if (u.includes('/orders')) {
    const raw = req.body?.raw || '';
    const isDelivery = raw.includes('"DELIVERY"');
    const isTakeaway = raw.includes('"TAKEAWAY"');
    const qty = raw.includes('"quantity": 2') ? 2 : 1;
    const subtotal = 12.5 * qty;
    const deliveryFees = isDelivery ? 5.5 : 0;
    const serviceFee = !isDelivery && !isTakeaway ? Math.round(subtotal * 0.15 * 100) / 100 : 0;

    return [
      example(
        isDelivery
          ? '201 Created — delivery order'
          : isTakeaway
            ? '201 Created — takeaway order'
            : '201 Created — dine-in order',
        'Created',
        201,
        {
          id: 10,
          orderType: isDelivery ? 'DELIVERY' : isTakeaway ? 'TAKEAWAY' : 'DINE_IN',
          orderQueue: 0,
          itemsSubtotal: subtotal,
          deliveryFees,
          serviceFee,
          totalAmount: Math.round((subtotal + deliveryFees + serviceFee) * 100) / 100,
          status: 'PENDING',
          branch: { id: 1, name: 'Main Branch', type: 'DINE_IN', servicePercentage: 0.15 },
          items: [
            {
              id: 1,
              quantity: qty,
              unitPrice: 12.5,
              menuItemNameAr: 'قهوة',
              menuItemNameEn: 'Coffee',
            },
          ],
          createdAt: '2026-06-16T10:05:00.000Z',
          updatedAt: '2026-06-16T10:05:00.000Z',
        },
        originalRequest,
      ),
    ];
  }

  return [
    example('201 Created', 'Created', 201, { success: true }, originalRequest),
  ];
}

function walkItems(items) {
  for (const item of items) {
    if (item.item) {
      walkItems(item.item);
      continue;
    }
    if (item.request?.method === 'POST') {
      const url = item.request.url;
      item.response = examplesForPost(url, item.request);
      if (!item.request.description) {
        item.request.description =
          'Example request body is pre-filled where applicable. Shift open/end use the logged-in cashier from the JWT.';
      }
    }
  }
}

walkItems(collection.item);

// Add takeaway order example in orders folder
const ordersFolder = collection.item.find((i) => i.name === 'orders');
if (ordersFolder) {
  const hasTakeaway = ordersFolder.item.some((i) =>
    i.name?.includes('takeaway'),
  );
  if (!hasTakeaway) {
    const dineInIdx = ordersFolder.item.findIndex((i) =>
      i.name?.includes('dine-in'),
    );
    ordersFolder.item.splice(dineInIdx + 1, 0, {
      name: 'Create order — takeaway',
      request: {
        method: 'POST',
        header: jsonHeader,
        body: {
          mode: 'raw',
          raw: '{\n  "orderType": "TAKEAWAY",\n  "items": [{ "menuItemId": {{menuItemId}}, "quantity": 1 }]\n}',
          options: { raw: { language: 'json' } },
        },
        url: '{{baseUrl}}/api/v1/orders',
        description:
          'Takeaway order — no service fee, no delivery fee. Requires open shift on logged-in cashier.',
      },
      response: examplesForPost('{{baseUrl}}/api/v1/orders', {
        method: 'POST',
        header: jsonHeader,
        body: {
          mode: 'raw',
          raw: '{\n  "orderType": "TAKEAWAY",\n  "items": [{ "menuItemId": 1, "quantity": 1 }]\n}',
        },
        url: '{{baseUrl}}/api/v1/orders',
      }),
    });
  }
}

// Ensure all POST bodies use json language option
function ensureJsonBodyOption(items) {
  for (const item of items) {
    if (item.item) {
      ensureJsonBodyOption(item.item);
      continue;
    }
    if (item.request?.method === 'POST' && item.request.body?.mode === 'raw') {
      item.request.body.options = { raw: { language: 'json' } };
    }
  }
}

ensureJsonBodyOption(collection.item);

collection.info.description =
  'Complete Restaurant POS collection — all `/api/v1` endpoints, Bearer auth, customers module, sample request bodies, saved response examples on every POST, and runnable E2E scenario folders. Orders use customerId (end-customer). Service fee applies to DINE_IN only.';

fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2) + '\n');
console.log('Added response examples to all POST requests.');
