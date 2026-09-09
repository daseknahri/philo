# Image Generation Workflow

The site now keeps launch-image planning in `content/image-plan.json`.

## What The Plan Stores

Each post entry includes:

- `slug`: matches the WordPress post slug.
- `filename`: exact file name expected in `content/images/`.
- `alt`: Romanian alt text for accessibility and image SEO.
- `title`: Media Library title.
- `caption`: optional public-facing caption.
- `description`: Media Library description.
- `prompt`: AI image prompt for generation, stored in the repo workflow rather than shown in the WordPress editor.

## How To Use It

1. Generate the image from the stored prompt.
2. Keep the image realistic, food-first, and free from text overlays, logos, or watermarks.
3. Prefer a compressed `webp` export and save it as the exact filename in `content/images/`.
4. Redeploy or rerun the seed.
5. The site imports the image into WordPress and sets it as the featured image for that post.

You can check repo coverage with:

```bash
node scripts/image-status.mjs
```

You can convert the launch set to `webp` and update the manifest with:

```bash
python scripts/optimize-launch-images.py
```

## Suggested Rules

- Prefer horizontal 4:3 or close editorial crops.
- Keep lighting natural and honest.
- Avoid showing faces or hands in recipe images unless the article truly needs them.
- Do not add fake labels, fake reviews, nutrition claims, or decorative text inside the image.
- If the final image differs from the prompt, update the alt text in WordPress so it matches the actual image.
