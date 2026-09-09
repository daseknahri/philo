# Author Workflow

This repo includes a small `kepoli-author-tools` plugin for writing posts. The plugin keeps its internal name, but the public/admin workflow is meant to be reused for cloned food blogs too.

## What Changes In WordPress Admin

- Posts use the classic WordPress editor, so `Add New Post` shows a clear title field and one main content editor.
- Pages keep the normal WordPress editor.
- The post editor toolbar includes:
  - `Pauza`: inserts a page break at the cursor.
  - `2 parti`: splits the current content into two WordPress pages.
  - `3 parti`: splits the current content into three WordPress pages.
- The Text editor tab also gets the same quick buttons.
- The split buttons now try to break long posts at cleaner section boundaries, especially around `H2` and `H3` headings, instead of cutting only by rough paragraph count.
- If content is pasted as one large plain-text paragraph, the splitter may fall back to sentence and word chunks. Formatted content keeps its paragraphs, headings, lists, and line breaks; if there is no safe structural split point, the plugin leaves the post unsplit instead of flattening it.
- If a formatted post has only a few large paragraph blocks, the splitter can break those large paragraphs by word-count sentence groups while keeping them as paragraphs.
- The setup box also includes `Impartire automata`, so a writer can choose `2 parti` or `3 parti` and let the tool apply the split on save. If the post already has manual `nextpage` breaks, the plugin leaves them alone.
- Smart split is conservative for Kepoli: about `650+` words becomes 2 parts, and about `1300+` words becomes 3 parts.
- The `Post setup` box lets the writer choose `Reteta` or `Articol`, write an excerpt, and optionally adjust manual SEO, related links, image metadata, and recipe structured data.
- The setup box keeps one main action in front: `Completeaza automat`. Extra helper actions stay under `Mai multe unelte`, so the editor remains simple for day-to-day use.
- Manual SEO title, meta description, and related-link slug fields now stay inside `Detalii SEO si legaturi`, so the main writing view stays focused on the essentials.
- The image and recipe sections are tucked into simple expandable blocks, so the writer sees the main writing fields first. `Date reteta` opens automatically only for recipe posts.
- The editorial checklist is also tucked into a simple expandable block, so the writer sees a short status first and opens the full list only when needed.
- The plugin also tries to complete empty setup fields earlier in the flow: after the writer adds a real title, pastes enough content, switches to `Reteta`, or inserts one of the built-in templates. In the same phase, it can also replace the default category with a more likely one until the writer makes a manual category choice.
- The setup box also shows a live editorial checklist, so the writer can see what is still missing before publishing.
- If the writer saves a post with empty excerpt, meta description, related slugs, or featured-image metadata, the plugin fills sensible defaults from the title/content and current post library.
- If the writer saves a post that still has no internal links inside the body, the plugin can add a small in-content link paragraph automatically near the most relevant body paragraph, based on the strongest related posts. The intro now adapts a little depending on whether it links to recipes, articles, or both.
- Internal-link suggestions now prefer the same category more strongly, so dessert posts stay pointed at dessert content first, and similar sections stay grouped more naturally.
- The scorer also applies a light diversity penalty to posts that already get suggested very often, so the site spreads internal links across more useful pages instead of reusing the same two or three posts everywhere.
- For article posts, the auto-linker now prefers a balanced mix when possible: one practical recipe and one supporting article, instead of two links of the same kind.
- The plugin also checks whether the post language stays coherent across title, content, meta description, and slug. If WordPress is still using the default title slug, it can shorten and clean it automatically on save.
- When GPT content comes in with messy heading levels, the plugin now normalizes the article structure on save so the content starts with `H2` sections and keeps sub-sections in a simpler `H2/H3` pattern.
- For recipe posts, if there is no FAQ section yet, the plugin can add a small `Intrebari frecvente` block on save using only recipe data that already exists, such as servings, times, and any storage notes already written in the post.
- The `Extrage schema reteta` button now runs deterministic parsing first, then can use an optional OpenRouter AI repair pass when the parsed recipe schema is incomplete. This AI pass is disabled by default and never runs unless `AI_EXTRACTION_ENABLE=1` and an API key are set.
- Seeded launch posts also read prefixed image metadata from `content/image-plan.json`, so the editor can show ready-made alt text, title, caption, and description even before the featured image is uploaded.
- The `Writing tools` box stays compact and focuses on two quick-start buttons: `Structura reteta` and `Structura articol`.
- A side box called `Publish helper` stays near Publish with one main action, `Pregateste pentru publicare`, plus optional details for category, tags, and the short review list.
- The `Posts` list includes `Type` and `Setup` columns, plus a Reteta/Articol filter for quick editorial audits.

## How To Use It

1. Go to `Posts` > `Add New`.
2. Add the title in the top field.
3. Write or paste the article/recipe in the main content field.
4. In `Post setup`, choose whether the post is a `Reteta` or `Articol`.
5. Start with the title and main content. The plugin now tries to fill empty setup fields automatically once there is enough real content to work from.
6. Click `Completeaza automat` whenever you want the main setup pass: SEO title, excerpt, meta description, internal links, image metadata, suggested category, suggested tags, and recipe schema where it can infer them.
7. Open `Mai multe unelte` only when you want a specific helper, like `Sugereaza categorie`, `Sugereaza taguri`, `Extrage schema reteta`, or `Genereaza meta imagine`.
8. Open `Detalii SEO si legaturi` only when you want to override the SEO title, review the meta description, or manually edit related slugs.
9. Open `Detalii imagine` only when you want to review or refine the featured-image text. For recipes, `Date reteta` opens by itself when `Reteta` is selected.
10. For a long article, either click `2 parti` or `3 parti` in the toolbar, or choose `Impartire automata` in the setup box if you want the plugin to split it on save.
11. Open `Checklist editorial` only when you want the full list of missing items. The closed summary already tells you the current status.
12. When you are almost done, use `Pregateste pentru publicare` near Publish for one last automatic pass, then open `Vezi detalii` only if you want the category, tags, or the short review list.
13. Review the generated fields and inserted page breaks before publishing. If you publish with missing essentials, the plugin will show a final warning.
14. If the article still has no internal links in the body, saving the post can add a small automatic `Citeste si` paragraph near the most relevant paragraph. Keep it if it fits naturally, or replace it with more specific manual links.

## Optional AI Extraction Repair

The plugin does not need AI for normal posting. AI is only a fallback for messy recipes where the local parser cannot confidently fill ingredients, steps, servings, or timing.

To enable OpenRouter repair in Coolify:

```env
AI_EXTRACTION_ENABLE=1
AI_EXTRACTION_PROVIDER=openrouter
AI_EXTRACTION_API_KEY=your-openrouter-token
AI_EXTRACTION_MODEL=inclusionai/ling-2.6-1t:free
AI_EXTRACTION_TIMEOUT_SECONDS=14
AI_EXTRACTION_MAX_CHARS=9000
AI_EXTRACTION_MAX_TOKENS=1400
```

Recommended workflow:

1. Paste only the title and clean recipe content.
2. Choose `Reteta`.
3. Click `Extrage schema reteta`.
4. If local parsing finds gaps, the plugin asks OpenRouter to repair only the schema fields.
5. Review the boxes before publishing; AI output is a helper, not an automatic publish decision.

## Image Workflow For Seeded Posts

1. Open `content/image-plan.json` and find the post slug.
2. Use the stored `prompt` in your image tool.
3. Export the final image in a web-friendly format, ideally `webp`, and save it into `content/images/` using the exact `filename` from the plan.
4. Push to GitHub and redeploy.
5. The seed flow imports the image, sets it as featured image, and applies the stored alt text, title, caption, and description automatically.

The split uses WordPress' native `<!--nextpage-->` marker. On the public post page, the theme shows a simple `Partile articolului` navigation block under the content.

## Notes

- Use splitting only for genuinely long posts. Short recipes usually read better on one page.
- After splitting, keep each page useful on its own: intro/context first, method/details next, conclusion/resources last.
- For AdSense readiness, avoid splitting posts only to increase ad views. Split only when it improves readability.
- Related slugs should be post URL slugs, for example `sarmale-in-foi-de-varza` or `ghidul-camarii-romanesti`. The plugin can suggest them automatically, but the author should still remove weak matches.
- The automatic `Citeste si` paragraph is a fallback, not the ideal final editorial form. When you have time, replace it with natural links inside the actual paragraphs.
- Excerptul este folosit in cardurile de postari, in arhive si in intro-ul paginii single. Chiar daca pluginul il poate genera automat, merita sa-l ajustezi astfel incat sa sune natural si clar.
- For seeded launch posts, the image plan gives you a stronger starting point than the generic generator. The prompt stays in the repo workflow, not in the editor UI. If your final image differs from the planned composition, adjust the alt text before publishing.
- In the `Posts` list, `De completat` means the post is missing one or more useful editorial items such as meta description, excerpt, featured image, image alt text, internal links, or recipe schema.
