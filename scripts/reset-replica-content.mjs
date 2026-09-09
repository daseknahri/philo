import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const write = args.has('--write');
const deleteImages = args.has('--delete-images');
const clearCategories = args.has('--clear-categories');
const noBackup = args.has('--no-backup');

if (args.has('--help') || args.has('-h')) {
  printHelp();
  process.exit(0);
}

const unknownArgs = [...args].filter((arg) => ![
  '--write',
  '--delete-images',
  '--clear-categories',
  '--no-backup',
].includes(arg));

if (unknownArgs.length > 0) {
  console.error(`Unknown option${unknownArgs.length === 1 ? '' : 's'}: ${unknownArgs.join(', ')}`);
  console.error('Run with --help to see the available options.');
  process.exit(1);
}

const operations = [];
const failures = [];
const backupRoot = path.join(root, '.replica-backups', timestamp());

resetJsonArray('content/posts.json', 'Cleared launch posts');
resetJsonArray('content/image-plan.json', 'Cleared launch image plan');

if (clearCategories) {
  resetJsonArray('content/categories.json', 'Cleared launch categories');
}

if (deleteImages) {
  removeContentImages();
} else {
  noteImageCount();
}

if (failures.length > 0) {
  console.error('Content reset could not continue:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

if (operations.length === 0) {
  console.log('No launch content reset needed.');
  process.exit(0);
}

console.log(`${write ? 'Applied' : 'Planned'} ${operations.length} content reset change${operations.length === 1 ? '' : 's'}:`);
for (const operation of operations) {
  console.log(`- ${operation}`);
}

if (!write) {
  console.log('\nDry run only. Add --write to apply these changes in the cloned repo.');
}

if (write && !noBackup) {
  console.log(`\nBackup written to ${path.relative(root, backupRoot).replace(/\\/g, '/')}`);
}

console.log('\nNext: add the new categories, posts, image plan, and images, then run:');
console.log('node scripts/verify-content.mjs');
console.log('node scripts/audit-rebrand.mjs');

function printHelp() {
  console.log(`Usage:
node scripts/reset-replica-content.mjs
node scripts/reset-replica-content.mjs --write --delete-images

By default this is a dry run. With --write it clears:
  - content/posts.json
  - content/image-plan.json

Options:
  --delete-images     Remove files from content/images, keeping .gitkeep
  --clear-categories  Also clear content/categories.json
  --no-backup         Do not save changed files under .replica-backups/
  --write             Apply changes. Without this, only planned changes are shown.

This script is meant for the cloned repo, after creating a new blog. It does not clear pages because About, Contact, Privacy, Cookies, Terms, and disclaimer pages should be rebranded and reviewed, not blindly removed.`);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function relative(filePath) {
  return path.relative(root, filePath).replace(/\\/g, '/');
}

function ensureParentDirectory(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function backupFile(filePath) {
  if (noBackup || !fs.existsSync(filePath)) return;

  const targetPath = path.join(backupRoot, relative(filePath));
  ensureParentDirectory(targetPath);
  fs.copyFileSync(filePath, targetPath);
}

function resetJsonArray(relativePath, label) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`Missing file: ${relativePath}`);
    return;
  }

  const current = fs.readFileSync(absolutePath, 'utf8');
  const next = '[]\n';
  if (current === next) return;

  operations.push(`${label}: ${relativePath}`);

  if (write) {
    backupFile(absolutePath);
    fs.writeFileSync(absolutePath, next);
  }
}

function removeContentImages() {
  const imagesDir = path.join(root, 'content/images');
  if (!fs.existsSync(imagesDir)) {
    failures.push('Missing directory: content/images');
    return;
  }

  const files = fs.readdirSync(imagesDir)
    .filter((filename) => filename !== '.gitkeep')
    .filter((filename) => fs.statSync(path.join(imagesDir, filename)).isFile());

  if (files.length === 0) return;

  operations.push(`Removed ${files.length} launch image file${files.length === 1 ? '' : 's'} from content/images`);

  if (!write) return;

  for (const filename of files) {
    const imagePath = path.join(imagesDir, filename);
    backupFile(imagePath);
    fs.unlinkSync(imagePath);
  }

  const gitkeepPath = path.join(imagesDir, '.gitkeep');
  if (!fs.existsSync(gitkeepPath)) {
    fs.writeFileSync(gitkeepPath, '');
  }
}

function noteImageCount() {
  const imagesDir = path.join(root, 'content/images');
  if (!fs.existsSync(imagesDir)) return;

  const files = fs.readdirSync(imagesDir)
    .filter((filename) => filename !== '.gitkeep')
    .filter((filename) => fs.statSync(path.join(imagesDir, filename)).isFile());

  if (files.length > 0) {
    operations.push(`Kept ${files.length} existing content image file${files.length === 1 ? '' : 's'}; add --delete-images to remove them`);
  }
}
