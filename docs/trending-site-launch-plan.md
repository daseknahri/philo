# Trending Site Launch Plan

Use this plan when creating a new viral/trending blog from the same engine. This is not the normal food-blog path. The goal is a Facebook-first content site that can use instant ad networks, while still keeping the operation controlled, measurable, and reusable.

AdSense-first sites should remain clean. Existing monetization test sites should remain separate. A trending site should usually be its own repo/site so it can use a broader identity without damaging another brand.

## 1. Pick The Site Positioning

Choose a broad but believable identity, not a random "anything viral" site.

Good positioning options:

- Everyday home and kitchen tips.
- Money-saving family life.
- Health-aware lifestyle for adults over 40, without medical claims.
- Nostalgia, habits, and practical explainers.
- Food, home, cleaning, shopping, family, and simple life advice.

Avoid:

- Fake news.
- Celebrity rumors.
- Medical diagnosis or cure claims.
- Stolen content.
- Fake emergency headlines.
- Adult/scam-style framing.
- Any brand identity that looks like a low-quality ad arbitrage site.

The reader should feel: "This is useful and easy to read," not "This site is trying to trick me."

## 2. Use The Existing Duplicate Workflow

Start from the normal new-site process, then apply the trending adjustments.

Read first:

- `docs/new-blog-launch-plan.md`
- `docs/replicate-food-blog.md`
- `docs/codex-new-site-prompt.md`
- `docs/trending-site-launch-plan.md`

Create a site brief:

```powershell
node scripts/create-site-brief.mjs --brand "Daily Useful Ideas" --domain https://new-domain.com --writer-name "Writer Name" --writer-email writer@example.com --site-email contact@new-domain.com --language en --write
```

Run the clone setup:

```powershell
node scripts/start-new-blog.mjs --brief site-brief.json --write
```

Then validate:

```powershell
node scripts/validate-new-blog.mjs --brief site-brief.json
```

## 3. Change The Content Model

The default food clone expects recipes and guides. A trending site should still keep the engine structure, but categories should be broader.

Recommended category set:

- Food Tips
- Home Hacks
- Money Savers
- Health Habits
- Family Life
- Nostalgia
- Smart Shopping
- Simple Explainers

If the theme or scripts still expect recipes/guides slugs, keep them technically valid but change public labels and page copy to match the new site.

Example:

- `recipes` can become `ideas` or `tips`.
- `guides` can become `stories` or `explainers`.
- Keep admin English.
- Keep public locale aligned with the target audience.

## 4. Write Authentic Page Copy

Update `content/pages.json` so the public site explains itself honestly.

The public copy should say the site publishes:

- Practical tips.
- Simple explainers.
- Food and home ideas.
- Lifestyle articles for everyday readers.
- Clear editorial review and corrections policy.

Do not say the site is a newsroom unless it will actually behave like one.

Legal pages should mention:

- Third-party ads.
- Affiliate or sponsored links if used.
- General information only for lifestyle/health-adjacent content.
- No professional medical, financial, or legal advice.

## 5. Content Strategy For Facebook

The site should be built around posts that older Facebook readers want to open, read, and continue.

Best article formats:

- Mistake and fix: "Most people store onions the wrong way."
- Cost saver: "7 small kitchen habits that waste money every week."
- Curiosity explainer: "Why chicken turns dry even when you follow the recipe."
- Nostalgia: "Things families used to do in the kitchen that still work."
- Gentle warning: "Do not ignore this simple fridge rule after shopping."
- Checklist: "Before you throw it away, try these uses."
- Comparison: "What to buy fresh, frozen, or canned."

Article structure:

- Clear title with one promise.
- Short intro that confirms the reader is in the right place.
- Useful sections with real payoff.
- 2-3 part split only when the article is long enough and the split feels natural.
- Related article suggestions at the end.
- No fake buttons and no fake "continue" traps.

## 6. AI Prompt Contract

Outside AI should return only title and content. The plugin should do metadata, schema where relevant, excerpt, tags, category suggestions, image metadata, and split support.

Use this universal prompt for trending articles:

```text
Write a clean, original article for a Facebook audience over 40.

Return only:
Title:
Content:

Topic: [TOPIC]
Audience: adults over 40, mostly mobile Facebook readers
Tone: useful, warm, clear, curious, not sensational
Length: 900-1300 words
Language: [English/Romanian/etc.]

Rules:
- No HTML tags.
- No markdown tables.
- No fake news, celebrity rumors, medical cures, or unsupported claims.
- Make the article genuinely useful, not empty clickbait.
- Use short paragraphs and clear section headings.
- Keep the title compelling but honest.
- Start with a strong practical hook.
- Include examples, mistakes to avoid, and what to do instead.
- If the topic is health-adjacent, add a careful note to seek professional advice for serious symptoms.
- Do not mention ads, SEO, AI, or the prompt.
- Do not include image prompts or metadata.
```

## 7. Monetization Strategy

Use the instant-network ad model, not the AdSense-first model.

Default env direction:

```env
ADSENSE_ENABLE=0
KT_AD_MODE=baseline
KT_PRELANDER_ENABLE=0
DISPLAY_ADS_ENABLE=1
DISPLAY_ADS_PROVIDER=adsterra
MONETAG_ENABLE=1
MONETAG_POST_ONLY=1
MONETAG_INSTALL_CHECK=0
```

Start with:

- `DISPLAY_AD_AFTER_INTRO_BASE64`
- `DISPLAY_AD_MID_CONTENT_BASE64`
- `DISPLAY_AD_PART_CONTINUE_BASE64`
- `DISPLAY_AD_BELOW_CONTENT_BASE64`
- Optional `DISPLAY_AD_STICKY_BOTTOM_BASE64` after mobile UX looks stable.
- Optional `MONETAG_INPAGE_PUSH_BASE64` if it does not create redirect complaints.

Keep disabled at first:

- Popunder/OnClick.
- Push notifications.
- Direct Link.
- SmartLink.
- Header ads.
- Listing grid ads.

Test ladder:

1. Baseline display only.
2. Add sticky bottom with time and scroll gates.
3. Add reading-option native ad if pages still feel clean.
4. Add prelander links for selected Facebook posts.
5. Test action-triggered OnClick only after analytics and first payout confidence.
6. Never scale a new aggressive format before checking complaints, Facebook reach, and finalized revenue.

## 8. Analytics And Measurement

Install Histats from day one, as used on other traffic-test sites.

Track:

- Visitors by URL.
- Pages per visit.
- Average visit length.
- Mobile share.
- Referring source.
- Facebook post performance.
- Revenue per 1,000 Facebook clicks.
- Finalized revenue, not only dashboard estimate.

Every Facebook link should use UTM parameters:

```text
?utm_source=facebook&utm_medium=social&utm_campaign=trending_test&utm_content=post_slug_or_hook
```

Main KPI:

- Finalized revenue per 1,000 Facebook clicks.

Supporting KPIs:

- Pages/session.
- Time on site.
- Split-next click rate.
- Related-post click rate.
- Bounce.
- Facebook reach after posting links.
- User complaints.

## 9. Launch Content Pack

Before first traffic, create at least 20 real posts.

Suggested launch mix:

- 5 food/kitchen tips.
- 4 home/cleaning articles.
- 4 money-saving articles.
- 3 health-habit articles with careful language.
- 2 nostalgia articles.
- 2 shopping or family-life articles.

Each post needs:

- Original title.
- Clean article content.
- Real featured image.
- Alt text.
- Category.
- Tags shorter than 70 characters.
- SEO title under the pixel/length warning target.
- Meta description.
- Split only if useful.

## 10. Facebook Publishing Plan

Do not send full traffic on day one.

Ramp:

- Days 1-3: 300-500 visits/day.
- Days 4-7: 800-1,000 visits/day if engagement is normal.
- Days 8-14: 1,500-3,000 visits/day only if ad dashboards and Histats look healthy.
- Scale harder only after first payout or strong confidence in payment quality.

Post each article with 2-3 caption styles:

- Practical: "A simple mistake that makes food spoil faster."
- Curiosity: "Most people do this without realizing the problem."
- Emotional/nostalgic: "Our grandparents often did this better than we do now."

Do not use:

- Fake promises.
- "Doctors hate this" style claims.
- Fake personal tragedy.
- Fake "you won't believe" spam.
- Bait-and-switch headlines.

## 11. Operational Workflow

Daily:

- Generate 3-5 topic ideas.
- Pick 1-2 strongest ideas.
- Use the article prompt.
- Paste title/content into WordPress.
- Use plugin auto-fill.
- Review category, excerpt, tags, image metadata, and split.
- Publish.
- Share with UTM link.
- Record traffic and revenue.

Weekly:

- Review top posts by revenue per 1,000 Facebook clicks.
- Review top posts by pages/session.
- Repeat winning angles with new topics.
- Remove or reduce ad formats that create bad UX or complaints.
- Plan next 10 articles.

Monthly:

- Decide whether to keep the site on instant networks only.
- Decide whether to create a cleaner version for long-term Google review.
- Update the content calendar based on actual winners.

## 12. Quality Guardrails

Even without AdSense, protect the domain and payout quality.

Required:

- Real useful content.
- Clear navigation.
- Public legal pages.
- No adult/scam ad categories if the network allows blocking.
- No fake buttons.
- No hidden redirects.
- No copied content.
- No medical cure claims.
- No auto-published AI without review.

If revenue is low, do not immediately add maximum aggressive ads. First check:

- Are topics strong enough?
- Are titles clickable but honest?
- Are visitors seeing enough pages?
- Are ads filling?
- Is mobile layout clean?
- Are the ad units distinct?
- Are Facebook posts reaching people?

## 13. Definition Of Done

The trending site is ready for first traffic when:

- The duplicate workflow has been completed.
- `site-brief.json` passes validation.
- `content/site-profile.json` is unique.
- `content/pages.json` is authentic for the new brand.
- Categories match the trending/lifestyle positioning.
- At least 20 launch posts exist.
- Featured images are real and not placeholders.
- Histats is installed.
- Instant-network ad env is configured.
- AdSense remains disabled.
- The site passes validation and preflight checks.
- A 14-day Facebook traffic ramp plan is written.

## 14. Best First Site Idea

If we want the easiest first version, build an English site around:

`Useful everyday tips for food, home, money, and simple health habits for adults over 40.`

This is broad enough for trending Facebook posts, but still coherent enough to look like a real publication.
