/**
 * Updates order POST bodies in Postman collection for POS total validation.
 */
const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, 'restaurant-pos.postman_collection.json');
const collection = JSON.parse(
  fs.readFileSync(collectionPath, 'utf8').replace(/^\uFEFF/, ''),
);

const ORDER_BODIES = {
  DINE_IN_2: {
    orderType: 'DINE_IN',
    items: [{ menuItemId: '{{menuItemId}}', quantity: 1, unitPrice: 12.5 }],
    itemsSubtotal: 12.5,
    deliveryFees: 0,
    serviceFee: 1.88,
    totalAmount: 14.38,
  },
  DINE_IN_MULTI: {
    orderType: 'DINE_IN',
    customerId: '{{customerId}}',
    items: [
      { menuItemId: '{{menuItemId}}', quantity: 1, unitPrice: 12.5 },
      { menuItemId: '{{menuItemId}}', quantity: 2, unitPrice: 12.5 },
    ],
    itemsSubtotal: 37.5,
    deliveryFees: 0,
    serviceFee: 5.63,
    totalAmount: 43.13,
  },
  TAKEAWAY_1: {
    orderType: 'TAKEAWAY',
    items: [{ menuItemId: '{{menuItemId}}', quantity: 1, unitPrice: 12.5 }],
    itemsSubtotal: 12.5,
    deliveryFees: 0,
    serviceFee: 0,
    totalAmount: 12.5,
  },
  DELIVERY_2: {
    orderType: 'DELIVERY',
    customerId: '{{customerId}}',
    deliveryAddress: 'شارع الجلاء عمارة 5',
    deliveryRegionId: '{{deliveryRegionId}}',
    updateCustomerProfile: false,
    items: [{ menuItemId: '{{menuItemId}}', quantity: 2, unitPrice: 12.5 }],
    itemsSubtotal: 25,
    deliveryFees: 5.5,
    serviceFee: 0,
    totalAmount: 30.5,
  },
  DELIVERY_SAVE_PROFILE: {
    orderType: 'DELIVERY',
    customerId: '{{customerId}}',
    deliveryAddress: 'شارع النصر - عمارة جديدة',
    deliveryRegionId: '{{deliveryRegionId}}',
    updateCustomerProfile: true,
    items: [{ menuItemId: '{{menuItemId}}', quantity: 1, unitPrice: 12.5 }],
    itemsSubtotal: 12.5,
    deliveryFees: 5.5,
    serviceFee: 0,
    totalAmount: 18,
  },
};

function toRaw(obj) {
  return JSON.stringify(obj, null, 2).replace(/"(\{\{[^"]+\}\})"/g, '$1');
}

function patchOrderBody(raw) {
  if (!raw || !raw.includes('"orderType"')) return raw;
  if (raw.includes('"DELIVERY"')) return toRaw(ORDER_BODIES.DELIVERY_2);
  if (raw.includes('"TAKEAWAY"')) return toRaw(ORDER_BODIES.TAKEAWAY_1);
  if (raw.includes('"customerId"')) return toRaw(ORDER_BODIES.DINE_IN_MULTI);
  return toRaw(ORDER_BODIES.DINE_IN_2);
}

function patchDeliveryResponseBody(bodyStr) {
  if (!bodyStr || !bodyStr.includes('"DELIVERY"')) return bodyStr;
  try {
    const obj = JSON.parse(bodyStr);
    if (obj.orderType === 'DELIVERY' && !obj.deliveryAddress) {
      obj.deliveryAddress = 'شارع الجلاء عمارة 5';
      return JSON.stringify(obj, null, 2);
    }
  } catch {
    // keep non-JSON bodies unchanged
  }
  return bodyStr;
}

function walk(items) {
  for (const item of items) {
    if (item.item) {
      walk(item.item);
      continue;
    }
    const req = item.request;
    if (req?.method === 'POST' && String(req.url).includes('/orders')) {
      req.body.raw = patchOrderBody(req.body.raw);
      req.body.options = { raw: { language: 'json' } };
      req.description =
        'POS sends unitPrice per line + itemsSubtotal, deliveryFees, serviceFee, totalAmount. DELIVERY: deliveryAddress + deliveryRegionId (default from customer); updateCustomerProfile saves address/zone to customer. Server recalculates and rejects mismatches. Branch + shift from JWT.';
    }

    if (item.response) {
      for (const ex of item.response) {
        if (ex.originalRequest?.body?.raw) {
          ex.originalRequest.body.raw = patchOrderBody(ex.originalRequest.body.raw);
          ex.originalRequest.body.options = { raw: { language: 'json' } };
        }
        if (ex.body) {
          ex.body = patchDeliveryResponseBody(ex.body);
        }
      }
    }
  }
}

walk(collection.item);

const ordersFolder = collection.item.find((i) => i.name === 'orders');
if (
  ordersFolder &&
  !ordersFolder.item.some((i) => i.name?.includes('update customer profile'))
) {
  const deliveryIdx = ordersFolder.item.findIndex((i) =>
    i.name?.includes('with delivery'),
  );
  ordersFolder.item.splice(deliveryIdx + 1, 0, {
    name: 'Create order — delivery (update customer profile)',
    request: {
      method: 'POST',
      header: [{ key: 'Content-Type', value: 'application/json' }],
      body: {
        mode: 'raw',
        raw: toRaw(ORDER_BODIES.DELIVERY_SAVE_PROFILE),
        options: { raw: { language: 'json' } },
      },
      url: '{{baseUrl}}/api/v1/orders',
      description:
        'DELIVERY with updateCustomerProfile: true — persists deliveryAddress and deliveryRegionId to the customer record for future orders.',
    },
  });
}

collection.info.description =
  'Restaurant POS API — Bearer auth, POS-style order validation (submitted totals must match server), saved POST examples, E2E scenarios. Service fee on DINE_IN only.';

fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2) + '\n');
console.log('Patched order POST bodies for POS validation.');
