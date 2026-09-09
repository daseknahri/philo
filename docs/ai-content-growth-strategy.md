# AI Content Growth Strategy

This document captures the reusable AI, content, traffic, and monetization direction for the shared food-blog engine.

The goal is to use AI as an editorial and optimization system, not as uncontrolled auto-publishing. Each launched site should become easier to operate, better at turning outside drafts into clean posts, and more intentional about traffic, monetization, and long-term trust.

For the current production site status, read `docs/project-status.md` and `docs/future-session-handoff.md`. This file should stay reusable for future sibling blogs.

## Engine Principle

AI can help write faster than a human, but the system should still behave like an editor.

Good AI use:

- Extract structure from pasted posts.
- Improve SEO metadata.
- Suggest tags, categories, internal links, and image alt text.
- Detect weak titles, thin introductions, bad schema, repeated tags, and missing post sections.
- Generate social hooks from the same article.
- Score whether a post is search-safe, reader-friendly, and monetization-safe.

Bad AI use:

- Auto-publishing unreviewed posts.
- Generating large volumes of shallow articles.
- Making unsupported health or nutrition claims.
- Writing fake urgency or misleading clickbait.
- Creating content only to force ad impressions.
- Rewriting published recipes without a manual accuracy review.

## Site Strategy Types

The engine can support different food-blog strategies, but each site should choose one primary lane.

### Search And AdSense First

Best for long-term trust, indexing, and stable ad approval.

Primary goals:

- Keep the site clean, trustworthy, and policy-safe.
- Publish recipes and helpful kitchen articles with originality and clear public value.
- Build long-term SEO and brand trust.
- Avoid aggressive ads, misleading claims, thin AI content, and risky medical-style topics.

Best content types:

- Family recipes.
- Traditional food with practical modern versions.
- Budget meals and everyday cooking.
- Ingredient guides.
- Storage, meal planning, and kitchen mistake articles.
- Soft health-adjacent food articles only when careful, non-medical, and useful.

### Social Traffic And Instant Monetization

Best for controlled experiments with Facebook/mobile readers and non-AdSense ad networks.

Primary goals:

- Build content that mobile social readers want to open and continue reading.
- Increase finalized revenue per 1,000 social clicks.
- Use monetization more aggressively than an AdSense-first site, but keep it controlled enough to protect user trust, platform reach, and ad-network payment quality.
- Treat SEO as a secondary benefit, not the first growth channel.

Best content types:

- Problem-solution cooking articles.
- Nostalgic recipes and comfort food.
- Mistake/fix articles.
- Budget and pantry cooking.
- Simple recipes with emotional or practical hooks.
- Short guides that create curiosity and deliver useful payoff.

## Current AI Layer

Implemented:

- Deterministic author-tools extraction.
- Optional OpenRouter repair for incomplete recipe schema.
- Manual review before publish.

Not implemented by design:

- Blind auto-publish.
- Full-content generation inside WordPress.
- Automatic social posting.
- Automatic ad strategy changes.

The detailed extraction flow is mapped in `docs/content-machine-extraction-map.md`.

## Open Questions

### AI Model Choice

Questions:

- Should the plugin call OpenRouter directly, or should outside writing tools remain separate?
- Are free OpenRouter models reliable enough for production workflow?
- Should extraction, editorial scoring, and social hook generation use different models?

Possible paths:

- Keep AI disabled by default.
- Add optional admin-only analysis buttons.
- Use deterministic parsing first, AI second, and validation last.
- Use free models for non-critical suggestions only.
- Keep paid or stronger models optional for higher-quality editorial review.

Useful tools:

- OpenRouter API.
- Outside AI writers.
- WordPress admin plugin UI.
- JSON schema validation inside the plugin.
- Existing content verification scripts.

### Plugin Extraction And SEO Enhancement

Questions:

- Which fields should AI be allowed to fill automatically?
- Which fields should always require human review?
- Should the plugin rewrite content, or only extract and suggest?

Possible paths:

- Add `AI Analyze` in the post editor.
- Return strict JSON only.
- Let AI suggest recipe schema, excerpt, meta title, meta description, image metadata, tags, and category.
- Reject invalid or overly long fields before saving.
- Keep the current deterministic recipe/article parser as the fallback.

Useful tools:

- OpenRouter free models for extraction drafts.
- Existing WordPress plugin parser.
- JavaScript admin UI.
- PHP sanitization and validation.
- `scripts/verify-content.mjs`.

### Content Planning

Questions:

- How many posts should each site publish per week?
- Which topics produce the highest social click-through without becoming clickbait?
- Which content should be evergreen for SEO versus short-term social traffic?

Possible paths:

- Search-first sites publish fewer, cleaner posts focused on trust and indexing.
- Social-first sites publish faster and test headline angles with real traffic.
- Build a monthly content calendar with recipes, articles, and social caption variants.
- Keep a small performance log of title, topic, traffic source, clicks, revenue, and reader behavior.

Useful tools:

- Google Trends.
- Social page insights.
- Histats.
- Google Search Console.
- Manual competitor review.
- A monthly `content-plan.md` file.

### Social Traffic Strategy

Questions:

- Which hooks work best for the target audience?
- How aggressive can monetization be before reach drops?
- Should prelanders be used often or only for tests?

Possible paths:

- Use warm curiosity instead of hard clickbait.
- Generate three social captions per post: practical, emotional, and curiosity-based.
- Track every social link with UTM parameters.
- Use split posts only when the split improves reading flow.
- Increase ads only after the user has shown intent, such as scrolling, clicking next, or continuing to another part.

Useful tools:

- Platform analytics.
- UTM links.
- Histats traffic-by-URL.
- Optional GA4 later.
- Existing ad mode environment variables.

### Monetization Strategy

Questions:

- Which ad combinations maximize revenue without making the site feel spammy?
- Should social-first sites test more aggressive formats only on engaged users?
- When should search-first sites activate ad units after approval?

Possible paths:

- Keep AdSense-first sites clean until approval and consent are stable.
- Use separate social-first sites for ad-network experiments.
- Test one ad change at a time.
- Measure finalized revenue per 1,000 social clicks, not just dashboard RPM.
- Keep aggressive ads behind time, scroll, or click-intent gates.

Useful tools:

- AdSense for search-first sites.
- Instant ad networks for social-first test sites.
- Histats.
- Coolify environment variables.
- Ad operations docs.

### Analytics

Questions:

- Is Histats enough for the first traffic phase?
- When should GA4 or another analytics layer be added?
- Which events matter most for revenue decisions?

Possible paths:

- Use Histats first because it is simple and fast.
- Add GA4 later if deeper event tracking becomes necessary.
- Track post URL, traffic source, device, pageviews per session, time on site, and revenue.
- For split content, add events for page navigation, related post clicks, scroll depth, and ad-trigger actions.

Useful tools:

- Histats.
- GA4.
- Google Search Console.
- Social insights.
- Ad-network dashboards.

## Practical Roadmap

### Phase 1: Manual AI Workflow

Do this first.

- Use outside AI to generate only title and clean content.
- Paste manually into WordPress.
- Use the plugin to extract recipe/article fields.
- Use analytics and ad dashboards to observe behavior.
- Build a simple spreadsheet or markdown log of post performance.

### Phase 2: AI-Assisted Plugin Analysis

Do this after the manual workflow is stable.

- Add optional OpenRouter support.
- Add an admin-only `AI Analyze` button.
- Generate strict JSON suggestions for metadata, schema, tags, categories, and social hooks.
- Do not auto-publish.
- Keep all generated fields editable.

### Phase 3: Content Calendar System

Do this once the site has enough posts to compare.

- Create a 30-day calendar for each site.
- Search-first sites focus on trust, usefulness, and SEO.
- Social-first sites focus on reader curiosity and monetized continuation.
- Review performance weekly.
- Repeat winning topics and remove weak formats.

### Phase 4: Optimization Layer

Do this after real traffic data exists.

- Score posts before publishing.
- Suggest better titles and split points.
- Flag thin content, repeated tags, missing alt text, bad schema, and weak excerpts.
- Compare content types against revenue per 1,000 clicks.
- Adjust ad strategy based on real finalized revenue.

## Default 30-Day Plans

### Search-First Food Site

Target: 3-4 posts per week.

Suggested mix:

- 8 recipes.
- 4 practical kitchen guides.
- 2 ingredient or storage articles.
- 2 budget meal articles.

Publishing rule:

- Quality over speed.
- Keep titles natural.
- Keep public tone trustworthy.
- Avoid aggressive monetization until ad approval and consent are stable.

### Social-First Food Site

Target: up to 1 post per day once operations are stable.

Suggested mix:

- 15 recipes.
- 8 problem/fix cooking articles.
- 4 nostalgia or comfort-food articles.
- 3 budget/pantry articles.

Publishing rule:

- Every post should have a clear social angle.
- Every post should give a real payoff after the hook.
- Use split posts only when the second part contains meaningful content.
- Test ad changes slowly and document them.

## Universal Outside-AI Prompt Direction

Use outside AI for drafting, but keep the output simple for the plugin.

Required output:

- Title.
- Content only.
- No HTML.
- No markdown tables.
- No fake sources.
- No exaggerated medical claims.
- Clear sections.
- Natural human tone.
- Useful details and practical payoff.

For recipes:

- Include servings, prep time, cook/rest time, total time, difficulty, ingredients, method, serving ideas, tips, variations, storage, FAQ, and conclusion.

For articles:

- Include a strong introduction, practical sections, examples, common mistakes, clear takeaways, and conclusion.

## Success Metrics

Search-first sites:

- Ad approval.
- Clean policy pages.
- Stable indexing.
- Growing search impressions.
- Low SEO errors.
- High trust and low policy risk.

Social-first sites:

- Revenue per 1,000 social clicks.
- Social reach stability.
- Mobile engagement.
- Pages per session.
- Split-post continuation rate.
- Finalized revenue versus dashboard revenue.
- Low complaint rate.

## Future Build Candidates

- `AI Analyze` plugin button.
- AI JSON schema validator.
- Social hook generator.
- Post quality score.
- Ad policy safety score.
- Viral/social readability score.
- Monthly content-plan generator.
- Performance log template.
- UTM link helper.
- Split-post quality checker.
