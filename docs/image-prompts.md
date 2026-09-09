# Kepoli — Image Prompts (authentic home-cook look)

The whole point of these images is that they read as **a real home cook's own photos** — not glossy stock, not obviously AI. That authenticity is an E-E-A-T signal; a plasticky, over-perfect image works *against* approval. Lean unstyled, natural, and a little imperfect.

## The authenticity test (reject an image if…)
- it looks like a **stock photo or an ad** (too polished, staged);
- colors are **candy-saturated / plasticky / HDR** (real food is more muted);
- the background is a **seamless studio sweep** (you want a real, softly-blurred kitchen);
- **everything is flawless and symmetrical** (real plates have a stray crumb, an off-center spoon, a drip);
- there's any **text, watermark, or logo**;
- (portraits) the face is **over-smoothed/uncanny** or hands have **extra fingers**.
Regenerate until it passes. A slightly imperfect, natural photo beats a perfect fake every time.

## MASTER STYLE (append to every food prompt)
> Style: authentic home-cook food photography, like a real food blogger's own photo — natural and a little unstyled. Bright soft daylight from a nearby window, gentle directional shadows. Shot close on a 35–50mm lens with modest shallow depth of field. A real lived-in home kitchen softly out of focus behind. Muted natural colors (warm creams, browns, soft greens), not saturated, not glossy, no HDR. Everyday tableware — simple ceramic, a worn wooden board, a creased linen napkin. Small honest imperfections: a stray crumb, a drip on the rim, a spoon set down mid-use, faint steam. Realistic home portion, casual slightly off-center composition. Photorealistic with natural film-like texture and fine grain. No text, no watermark, no logo, no hands unless specified. Landscape 3:2.

## NEGATIVE prompt (if your tool supports it)
> studio seamless background, staged perfection, glossy plastic sheen, oversaturated, HDR, neon colors, cartoon, 3D render, illustration, stock-photo look, floating food, extra or duplicated utensils, deformed hands, garbled text, watermark, logo, brand names

## Make them look like ONE kitchen (consistency)
- Use the **same MASTER STYLE line on every prompt**.
- Pick your best first result as a **style reference** and apply it to the rest (Midjourney `--sref`, or reuse a fixed **seed** and vary only the dish).
- Keep **2–3 recurring props** (one wooden board, one cream bowl, the same linen) so the blog feels like a single home.
- Export **3:2 landscape ~1600×1066**, save as **WebP named by the post slug** (e.g. `hearty-bean-soup.webp`) into `content/images/`.
- Generate the **hero** for all 20, and where you can, **1–2 process shots** per recipe — multiple real photos per post is a strong authenticity signal.

---

## Recipe heroes
Each line = the dish, then append the MASTER STYLE.

- **classic-cabbage-rolls** — A rustic pot of cabbage rolls, pale-green parcels in a red tomato sauce, one roll cut open showing the pork-and-rice filling, a little dill and a small dish of sour cream beside it.
- **easy-stuffed-peppers** — Halved red and yellow bell peppers filled with rice-and-meat, baked in a shallow dish in a light tomato sauce, tops lightly browned, a little parsley.
- **homestyle-apple-pie** — A golden double-crust apple pie on a wooden board, one slice lifted showing soft cinnamon-apple filling, a little juice pooling, an old table knife alongside.
- **hearty-bean-soup** — A deep bowl of thick white bean soup with chunks of smoked pork and diced carrot and celery, a swirl of oil, chopped parsley, torn crusty bread beside it.
- **sour-meatball-soup** — A bowl of clear-golden sour meatball soup, small tender meatballs and diced root veg in the broth, fresh dill and parsley, a lemon wedge on the rim.
- **chicken-soup-with-dumplings** — A bowl of clear golden chicken soup with soft fluffy semolina dumplings floating on top, rounds of carrot, a little parsley, gentle steam.
- **chicken-stew-with-polenta** — Bone-in braised chicken in a glossy paprika-red tomato-pepper sauce spooned over a mound of soft polenta on a rustic plate, a scatter of parsley.
- **braised-cabbage-with-sausage** — A cast-iron pan of silky slow-braised shredded cabbage gone golden and sweet, browned slices of smoked sausage through it, a dusting of paprika.
- **white-bean-stew** — A bowl of thick creamy white bean stew flecked with paprika and soft onion, a drizzle of oil and parsley, crusty bread at the edge.
- **crepes-with-jam** — A plate of thin rolled crêpes filled with red fruit jam, one partly unrolled showing the glossy jam, a light dusting of powdered sugar.
- **no-bake-chocolate-biscuit-salami** — A dark chocolate biscuit "salami" log partly sliced into rounds on parchment, cut faces showing a mosaic of pale biscuit pieces in dark chocolate.

## Story / lifestyle heroes
- **the-sunday-table** — A relaxed family Sunday table from above, several shared home-cooked dishes, mismatched plates, worn linen, warm afternoon light, no people.
- **grandmothers-recipe-card** — A slice of sweet walnut roll on a small plate beside a cup of coffee, a worn browned hand-written recipe card slightly out of focus behind, nostalgic light.
- **cooking-in-a-small-kitchen** — A simple comforting bowl of polenta topped with white cheese and a spoon of sour cream, on a narrow cozy small-kitchen counter, one good knife nearby.

## Tips heroes
- **store-cooked-food-safely** — Cooked food portioned into clean glass containers on a bright counter, one open showing soup, a hand-written date label on a lid.
- **stock-a-practical-pantry** — An organized pantry shelf: labeled jars of rice, pasta, dried beans and lentils, tins of tomatoes, onions and garlic in a basket, soft light.
- **simple-dough-techniques** — Close-up of two floured hands kneading a smooth ball of dough on a worn wooden board, a light dusting of flour in the air (hands allowed here).
- **choose-fresh-ingredients** — A market-style spread of fresh vegetables, herbs, eggs and a whole fish on ice on a wooden counter, natural and a little wet, a hand gently checking a tomato.
- **cooking-with-the-seasons** — A flat-lay of seasonal produce loosely grouped by season (spring peas & asparagus; summer tomatoes & zucchini; autumn squash & apples; winter roots & cabbage) on a rustic table.
- **home-pickling-basics** — Several glass jars of assorted homemade pickles (cucumbers with dill, carrots, cauliflower, peppers) on a counter, brine and mustard seeds visible, one jar open with a fork.

## Process shots (optional but powerful for authenticity)
Template: *"[hands doing a specific step], real home kitchen, [action],"* + MASTER STYLE. Examples:
- cabbage-rolls: "Hands rolling a cabbage leaf around meat filling on a wooden board, a bowl of filling and a stack of blanched leaves beside."
- apple-pie: "Hands crimping the edge of a raw apple pie crust in a metal tin, flour on the counter."
- crepes-with-jam: "Pouring thin crêpe batter into a hot pan and swirling to coat, on a home stovetop."

---

## Author portrait — read this first
For a byline that presents **Isalune as a real person**, the honest and strongest option is a **real photo of a real, consenting person** who actually stands behind the site. Google's E-E-A-T rewards a genuine, accountable author, and an AI-generated face presented as a real cook is both deceptive and a real risk if anyone notices. Two clean paths:
- **Best:** use a real person's photo (you, or someone who agrees to be the face + be reachable).
- **If you generate a persona portrait:** treat it as a clearly-owned brand face, keep it consistent, and make sure a *real, reachable human/entity* is genuinely accountable for the content (named on About / responsive on Contact).

Portrait prompt (candid and believable — NOT a glamour headshot):
> Candid natural portrait of a woman in her late 30s in a real home kitchen, warm genuine half-smile, relaxed and approachable. Everyday look: minimal makeup, a simple apron over a plain shirt, hair slightly imperfect. Mid-moment — holding a wooden spoon or a mug of coffee, leaning on the counter. Soft daylight from a side window. ~50mm, natural shallow depth of field, **real skin texture (pores, fine lines — not airbrushed)**, slight natural asymmetry. Looks like a real candid photo a friend took, not a studio headshot. Photorealistic, natural color, fine grain. No text, no watermark. Square 1:1.

Portrait negative:
> glamour shot, fashion model, heavy makeup, airbrushed or over-smoothed skin, plastic skin, studio backdrop, perfect symmetry, uncanny face, extra fingers, deformed hands, text, watermark

Set it via wp-admin → Users → the author profile → **"Author photo (image URL or media ID)"**, or drop the file in `content/images/` and set `writer.photo` in `content/site-profile.json`, then reseed.

## Brand assets
- **Wordmark** — *"Minimal wordmark reading 'Kepoli' in warm dark brown (#252416) serif on a cream background, clean, no icon."* (transparent PNG/SVG)
- **Icon / favicon** — already a simple "K" monogram; optional upgrade: *"Simple rounded-square app icon, cream 'K' on deep olive-brown (#2b2a1c), flat, no gradient."* (512×512 PNG)
- **Social/OG cover** — *"Warm cozy home-kitchen table with a few dishes, generous empty space on one side for a title overlay."* (1200×630)
