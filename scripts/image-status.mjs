import fs from 'node:fs';
import path from 'node:path';

const imagePlan = JSON.parse(fs.readFileSync('content/image-plan.json', 'utf8'));
const imagesDir = path.resolve('content/images');

const rows = imagePlan.map((item) => {
  const filename = item.filename || '';
  const filePath = path.join(imagesDir, filename);
  const exists = filename ? fs.existsSync(filePath) : false;

  return {
    slug: item.slug,
    filename,
    exists,
  };
});

const missing = rows.filter((row) => !row.exists);

for (const row of rows) {
  console.log(`${row.exists ? 'OK ' : 'MISS'}  ${row.slug}  ${row.filename}`);
}

console.log('');
console.log(`Images present: ${rows.length - missing.length}/${rows.length}`);

if (missing.length) {
  console.log('Missing files:');
  for (const row of missing) {
    console.log(`- ${row.filename}`);
  }
  process.exitCode = 1;
}
