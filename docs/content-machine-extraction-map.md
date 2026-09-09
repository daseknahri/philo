# Content Machine Extraction Map

This document maps how Kepoli turns an outside draft into a finished WordPress post. It is the reference for future work on author tooling, AI extraction, image metadata, and editorial checks.

## Current Flow

1. Draft outside WordPress.
   - The outside writer or AI tool should return a title plus clean plain-text content.
   - Do not ask the outside tool for WordPress HTML, ad code, fake sources, or unsupported claims.
2. Paste into WordPress.
   - Posts use the classic editor through `wp-content/plugins/kepoli-author-tools/`.
   - Pages keep the normal editor.
3. Choose content type.
   - `Reteta` means recipe.
   - `Articol` means kitchen guide or article.
4. Run `Completeaza automat`.
   - The plugin extracts and suggests post setup data from the title, content, existing posts, categories, tags, and featured image.
5. Review before publish.
   - The writer can override every generated field.
   - `Pregateste pentru publicare` runs one last setup pass near the Publish box.
6. Publish.
   - The public theme reads the stored metadata for SEO, schema, related links, article cards, and image output.

## Source Inputs

The extraction layer uses these inputs:

- WordPress title.
- Main post body.
- Selected post kind: `Reteta` or `Articol`.
- Existing category selection.
- Existing tags.
- Featured image ID and attachment metadata.
- Existing published posts for internal-link suggestions.
- Seed image plan metadata from `content/image-plan.json` when available.
- Optional environment variables for AI repair.

The seed layer uses:

- `content/posts.json` for launch posts.
- `content/pages.json` for official pages.
- `content/categories.json` for taxonomy setup.
- `content/image-plan.json` and `content/images/` for planned launch media.
- `seed/bootstrap.php` for idempotent import and metadata setup.

## Main Outputs

The author-tools plugin writes or updates these post-level fields:

- `_kepoli_post_kind`: `recipe` or `article`.
- `_kepoli_seo_title`: optional manual SEO title.
- `_kepoli_meta_description`: SEO description and social description fallback.
- `_kepoli_related_recipe_slugs`: selected recipe links.
- `_kepoli_related_article_slugs`: selected article links.
- `_kepoli_related_slugs`: combined related-link fallback.
- `_kepoli_recipe_json`: structured recipe data for recipe posts.
- `_kepoli_auto_split_parts`: requested automatic page split count.
- `_kepoli_image_alt`: pending image alt text.
- `_kepoli_image_title`: pending image title.
- `_kepoli_image_caption`: pending image caption.
- `_kepoli_image_description`: pending image description.
- `_kepoli_image_plan_*`: seed image metadata copied from `content/image-plan.json`.

The plugin also stores small auto-generated flags such as:

- `_kepoli_auto_excerpt`
- `_kepoli_auto_meta_description`
- `_kepoli_auto_seo_title`
- `_kepoli_auto_related_slugs`
- `_kepoli_auto_image_meta`
- `_kepoli_auto_recipe_json`

These flags help the tool know when it can safely replace earlier generated text and when the writer has probably made a manual edit.

## Featured Image Metadata

Kepoli treats image metadata as editorial content, not decoration.

- Seeded images receive alt text, title, caption, and description from `content/image-plan.json`.
- Manually uploaded featured images can receive generated defaults in `Detalii imagine`.
- The plugin can copy final alt text to the attachment `_wp_attachment_image_alt` field.
- If the final image differs from the planned prompt, update the alt text manually before publishing.

Recommended image rules:

- Keep recipe images food-first and realistic.
- Avoid text overlays, watermarks, fake labels, fake reviews, and medical-style claims.
- Prefer compressed `webp` files for launch media.
- Use `node scripts\image-status.mjs` to check launch image coverage.

## Recipe Extraction

Recipe extraction is deterministic first.

The parser tries to fill:

- Servings.
- Prep minutes.
- Cook minutes.
- Total minutes.
- Ingredients.
- Steps.
- Difficulty or practical notes when available.
- FAQ and storage notes when they can be inferred safely from existing text.

Optional AI repair only runs after local parsing and only when recipe schema fields are incomplete.

Required env for AI repair:

```env
AI_EXTRACTION_ENABLE=1
AI_EXTRACTION_PROVIDER=openrouter
AI_EXTRACTION_API_KEY=your-openrouter-token
AI_EXTRACTION_MODEL=inclusionai/ling-2.6-1t:free
```

Keep `AI_EXTRACTION_ENABLE=0` by default. AI repair is a helper for messy recipe schema, not a general writer and not an auto-publish system.

## Article Extraction

Article posts use the same setup system but do not need recipe schema.

The plugin helps with:

- Excerpt.
- Meta description.
- SEO title.
- Category suggestion.
- Tag suggestion.
- Internal-link suggestions.
- Heading normalization.
- Image metadata.
- Optional native WordPress page splits for genuinely long articles.

Articles should still have a clear practical payoff. Avoid thin filler written only to create ad impressions.

## Public Output Consumers

The theme reads this data in `wp-content/themes/kepoli/` for:

- SEO title and meta description.
- Canonical URLs and alternate language tags.
- Open Graph and Twitter metadata.
- Recipe, article, collection, organization, author, breadcrumb, and image schema.
- Related post cards.
- Homepage, archive, and category card summaries.
- Native `<!--nextpage-->` navigation for split posts.

The MU plugins handle:

- Canonical host redirects.
- `ads.txt`.
- `/.well-known/security.txt`.
- Newsletter signup storage.
- First-launch autoseed protection.

## Guardrails

Keep these rules unless the site owner explicitly changes strategy:

- Admin language is English.
- Public Kepoli content is Romanian.
- No blind auto-publishing.
- No fake expertise, fake sources, or fake medical authority.
- No unsupported health claims.
- No aggressive ad networks on Kepoli while AdSense approval is pending.
- Keep `ADSENSE_ENABLE=0` and `GA_ENABLE=0` until consent is configured and tested.
- Keep `KEPOLI_FORCE_RESEED=0` after launch.
- Never treat reseed as a normal content update.

## Validation

Run these before committing changes that touch content, seed, theme, author tooling, or launch docs:

```powershell
node scripts\verify-content.mjs
node scripts\audit-adsense-readiness.mjs
node scripts\audit-engine-readiness.mjs
git diff --check
```

Optional checks:

```powershell
node scripts\audit-histats-readiness.mjs
node scripts\image-status.mjs
```

For a live deploy fingerprint check:

```powershell
node scripts\check-live-deploy.mjs https://kepoli.com
```

Only run the live deploy check after temporarily setting `KEPOLI_DEPLOY_FINGERPRINT=1`; turn it back to `0` afterward.

## Safe Future Extensions

Good next improvements:

- Add an admin-only `AI Analyze` button that returns strict JSON suggestions.
- Add validation for AI field lengths and required schema keys before saving.
- Add an editorial quality score that flags weak intros, missing image alt text, missing internal links, and thin sections.
- Add a monthly content plan file for topic tracking and performance review.
- Add a small performance log template for title, source, traffic, clicks, revenue, and notes.

Avoid for Kepoli:

- Auto-publishing AI drafts.
- Automated Facebook-style syndication without review.
- Monetag, Adsterra, popunders, forced redirects, or push ads before the AdSense path is decided.
- AI rewriting of already published recipes without a manual accuracy review.
