/**
 * Adds customers module requests and wires customerId through orders.
 */
const fs = require('fs');
const path = require('path');

const collectionPath = path.join(__dirname, 'restaurant-pos.postman_collection.json');
const collection = JSON.parse(
  fs.readFileSync(collectionPath, 'utf8').replace(/^\uFEFF/, ''),
);

const jsonHeader = [{ key: 'Content-Type', value: 'application/json' }];

function ensureVariable(key, value) {
  if (!collection.variable.some((v) => v.key === key)) {
    collection.variable.push({ key, value });
  }
}

ensureVariable('customerId', '1');
ensureVariable('customerPhone', '01012345678');

const customersFolder = {
  name: 'customers',
  description:
    'End-customer phone book (separate from staff users). Orders reference customers via customerId.',
  item: [
    {
      name: 'List customers',
      request: {
        method: 'GET',
        url: {
          raw: '{{baseUrl}}/api/v1/customers?page=1&pageSize=10&search=',
          host: ['{{baseUrl}}'],
          path: ['api', 'v1', 'customers'],
          query: [
            { key: 'page', value: '1' },
            { key: 'pageSize', value: '10' },
            { key: 'search', value: '', description: 'name, phone, address' },
            { key: 'customerType', value: 'NORMAL', disabled: true },
          ],
        },
      },
    },
    {
      name: 'Get customer by phone',
      request: {
        method: 'GET',
        url: '{{baseUrl}}/api/v1/customers/by-phone/{{customerPhone}}',
        description: 'Call-center quick lookup by phone number.',
      },
    },
    {
      name: 'Create customer',
      event: [
        {
          listen: 'test',
          script: {
            type: 'text/javascript',
            exec: [
              "const j=pm.response.json();",
              "if(j.id) pm.collectionVariables.set('customerId', String(j.id));",
              "if(j.phone) pm.collectionVariables.set('customerPhone', String(j.phone));",
            ],
          },
        },
      ],
      request: {
        method: 'POST',
        header: jsonHeader,
        body: {
          mode: 'raw',
          raw: [
            '{',
            '  "name": "محمد",',
            '  "phone": "01012345678",',
            '  "address": "شارع الجلاء",',
            '  "customerType": "NORMAL",',
            '  "defaultDeliveryRegionId": {{deliveryRegionId}}',
            '}',
          ].join('\n'),
          options: { raw: { language: 'json' } },
        },
        url: '{{baseUrl}}/api/v1/customers',
        description:
          'Creates an end-customer record. defaultDeliveryRegionId is optional — when set, DELIVERY orders can omit deliveryRegionId.',
      },
    },
    {
      name: 'Get customer by id',
      request: {
        method: 'GET',
        url: '{{baseUrl}}/api/v1/customers/{{customerId}}',
      },
    },
    {
      name: 'Update customer',
      request: {
        method: 'PUT',
        header: jsonHeader,
        body: {
          mode: 'raw',
          raw: '{\n  "name": "محمد أحمد",\n  "address": "شارع الجلاء - محدث"\n}',
        },
        url: '{{baseUrl}}/api/v1/customers/{{customerId}}',
      },
    },
    {
      name: 'Delete customer',
      request: {
        method: 'DELETE',
        url: '{{baseUrl}}/api/v1/customers/{{customerId}}',
      },
    },
  ],
};

collection.item = collection.item.filter((folder) => folder.name !== 'customers');

const deliveryIdx = collection.item.findIndex((f) => f.name === 'delivery-regions');
if (deliveryIdx >= 0) {
  collection.item.splice(deliveryIdx + 1, 0, customersFolder);
} else {
  collection.item.push(customersFolder);
}

function walk(items) {
  for (const item of items) {
    if (item.item) {
      walk(item.item);
      continue;
    }
    const req = item.request;
    if (!req) continue;

    const url = typeof req.url === 'string' ? req.url : req.url?.raw || '';

    if (url.includes('/api/v1/orders') && req.method === 'GET' && req.url?.query) {
      if (!req.url.query.some((q) => q.key === 'customerId')) {
        req.url.query.push({
          key: 'customerId',
          value: '{{customerId}}',
          disabled: true,
        });
      }
      req.url.raw = req.url.raw.replace(
        /pageSize=10(&|$)/,
        'pageSize=10&customerId={{customerId}}$1',
      );
      if (!req.url.raw.includes('customerId=')) {
        req.url.raw += '&customerId={{customerId}}';
      }
    }

    if (url.includes('/api/v1/orders') && req.method === 'POST' && req.body?.raw) {
      if (req.body.raw.includes('"DELIVERY"') && !req.body.raw.includes('"customerId"')) {
        req.body.raw = req.body.raw.replace(
          '"orderType": "DELIVERY",',
          '"orderType": "DELIVERY",\n  "customerId": {{customerId}},',
        );
      }
    }
  }
}

walk(collection.item);

collection.info.description =
  'Complete Restaurant POS collection — all `/api/v1` endpoints, Bearer auth, customers module, sample request bodies, saved response examples on every POST, and runnable E2E scenario folders. Orders use customerId (end-customer), not staff userId. Service fee applies to DINE_IN only.';

fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2) + '\n');
console.log('Patched customers endpoints into Postman collection.');
