const fs = require('fs');
const path = require('path');
const collectionPath = path.join(__dirname, 'restaurant-pos.postman_collection.json');
const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

function printItems(items, depth = 0) {
  for (const item of items) {
    const indent = '  '.repeat(depth);
    if (item.item) {
      console.log(`${indent}[Folder] ${item.name}`);
      printItems(item.item, depth + 1);
    } else {
      const method = item.request.method;
      const url = item.request.url.raw || item.request.url;
      console.log(`${indent}- ${method} ${item.name} (${url})`);
      if (item.request.body && item.request.body.raw) {
        console.log(`${indent}  Body: ${item.request.body.raw.replace(/\n/g, '\n' + indent + '  ')}`);
      }
    }
  }
}

printItems(collection.item);
