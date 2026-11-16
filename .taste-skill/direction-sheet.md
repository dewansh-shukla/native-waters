# DIRECTION SHEET — The page is the object
seed 1734716076 · drawn 2026-11-16 · redraws: 5 · sector culture · tone editorial
Brief: Native Waters: five Indian river basins, sourced freshwater fish records, and immersive Three.js underwater habitats. A natural-history museum and living river atlas, never a SaaS template.

| | |
| --- | --- |
| Direction | The page is the object |
| Hero | Card over a dim room |
| Type | Archivo |
| Colour | Bottle green, gold |
| Sections | intro (Title, note, facts row) → showcase (Output slips along the edge) → list (The printed menu sheet) → about (Side facts, wide paragraph) → footer (The back of the card) |
| Motion | Curtain footer |
| Photographs | the "Water" set, as atmosphere |

This is the direction for this build. Adopt it. Do not blend it with the layout you would have made anyway,
and do not redraw because it is unfamiliar: unfamiliar is the point. Redraw a slot only when it conflicts
with a stated brand constraint or needs an asset that does not exist, and say why in your report.

The parts of this sheet were written separately and will disagree in small ways. Settle every disagreement in this order:
**house rules** (including type no smaller than 13px and body text of 16px or more) → **the direction** (the idea, the composition habits, where the
one accent goes) → **the type system and the palette** (which face does which job, the five size steps, which colour is the ground and where the
accent goes) → **the hero blueprint** → **the section blueprints**. Under each blueprint below, "Adjusted for this page" lists where it disagrees.
In practice: take geometry from blueprints (columns, proportions, what sits where) and take everything else from above them. Map every size a
blueprint names onto one of your five type steps instead of adding a sixth. Use one button shape, one corner radius and one pair of page margins on
the whole page, whatever individual blueprints say. If a blueprint names a kind of typeface (a light serif, a heavy grotesk), use the dealt face.

## 1. The idea
Find the printed or physical artefact that already exists in the subject's world and build the page as that thing. A wedding site is the invitation card. A restaurant is its menu. A conference is the ticket; a record is its sleeve; a shop is the receipt or the swing tag; an archive is a stack of tabbed folders; a course is the syllabus sheet. The artefact supplies everything a template would otherwise invent: its proportions, its typographic manners, its way of grouping information. Visitors recognise the object instantly, which is why these pages feel specific.

Before anything else, write one sentence in your notes: "On this page, <the subject's own material> becomes <the device>."
Fill the first blank from your inventory of what only this client has (its name and what it means, its street, its numbers, its
constraint), then put the nearest competitor in the sentence: if it still works, the idea is the category's, not the client's.
Then name the one live thing the visitor can do on the page (SKILL.md step 4).

## 2. Composition
The first screen shows the artefact as a single filled panel (paper colour on a contrasting ground) centred or offset, with believable proportions: a card at 5:7, a ticket at about 2.2:1 with a notch cut by `clip-path`, a menu as a tall sheet. All primary content lives on it, set the way that object is set: centred and symmetrical for an invitation, in tidy aligned columns for a menu or ticket. The ground behind is a flat colour or one full-bleed photograph. As the page continues, each section is another piece of the same stationery: a second card, a tear-off stub, a folded panel, always filled shapes with real edges (straight, notched, scalloped, perforated by a dotted `border` of round dots at 4px or more), never outlined boxes. The footer is the back of the object.

## 3. Type — Archivo
One variable family pushed to its narrowest, heaviest setting for headlines and relaxed to normal width for text, so display and body share a skeleton. Suits sportswear, campaigns and fintech pages that speak in capitals.
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&display=swap" rel="stylesheet">
```
- Display: **Archivo** — weight 800 at font-stretch 62% (load the wdth axis and use its narrowest setting) · tracking -0.01em · leading 0.86 · uppercase
- Text: **Archivo** — normal width · 400 for body, 500 for buttons and emphasis · leading 1.5 · tracking 0
```css
:root {
  --step-small: clamp(0.8125rem, 0.79rem + 0.1vw, 0.875rem);
  --step-body: clamp(1.0625rem, 1rem + 0.25vw, 1.1875rem);
  --step-lead: clamp(1.25rem, 1.1rem + 0.7vw, 1.625rem);
  --step-head: clamp(2.5rem, 1.2rem + 5vw, 5.5rem);
}
```
Take the manners of the artefact: a bookish serif with small caps avoided, or a blunt condensed face for tickets and posters. Sizes stay within what print would use relative to the panel; the name is large on the panel, details are small and exact.
The direction decides sizes and how many of them; the type system decides how this face is set. Where the two give different tracking or leading, use the values of the type system: they are tuned to this face.
The display size itself comes from the hero blueprint below.

## 4. Colour — Bottle green, gold
```css
:root {
  --bg: #133621;
  --surface: #1a4429;
  --ink: #f4d96c;
  --muted: #b3a55e;
  --accent: #f4d96c;
  --accent-ink: #133621;
}
```
Bottle green covers the page and warm gold sets all the type, with panels one step lighter than the ground. The button is solid gold with green text, and photographs are kept dark and warm so the pair is not disturbed.
Paper and ink plus the ground the paper sits on. Two or three flat colours in total, like a two-colour print job.

## 5. Imagery
**The project has no photographs of its own yet.** First choice: **real pictures of the subject's world from the open collections**: its city and street in old postcards and photographs, an old map of the neighbourhood, its materials up close, its trade in engravings, museum objects of its kind (references/imagery.md §3). Start with `node /Users/dewanshshukla/Desktop/Personal/SAAS/native-waters-taste-redesign/.agents/skills/design-taste-frontend/scripts/assets.mjs "museum"`, then queries from your inventory (its street, its materials, its trade's tools and history). Download what you use into the project with `--get` and credit every one on the page (`--credits` prints the footer line). They show the world around the client, never the client's own room, dish, product, person or team. Second, for what no honest picture exists of: draw the subject's own things in code, large, in one flat graphic language and the palette's real colours (its tiles, its windows, its objects; references/imagery.md §8). Third: the dealt photographs, only where an honestly generic picture fits (the sea, the weather, a material), never one a visitor could take for the thing itself and never an unrelated scene. One treatment for all of them. If this direction is built on photographs, plan the set before building (four to six pictures of one family) and reuse them at different crops and scales instead of finding or drawing a new picture for every slot; keep drawings as `<symbol>` + `<use>` or generate them with a small script so the page stays light. List every found picture (with its source and licence), every dealt photograph and every drawing that stands in for photography in your report.

Optional. One photograph behind the object, or small photographs placed on it like tipped-in plates. The object itself is the image.

**Floor (the inspector checks it):** at least four real pictures on the page, usually six to twelve; SVG drawings do not count. One moving picture where an honest clip exists: `node <skill>/scripts/assets.mjs --video "<query>"`, used as a muted loop with a poster frame. Whatever this direction says about pictures, it is carried out with real ones.

Photographs dealt for this build, from the "Water" set (lakes, rivers, waterfalls and water surfaces)
Order of preference for imagery: (1) the project's own photographs and product shots; (2) images you generate, if an image tool is
available; (3) real pictures of the subject's world found in the open collections (assets.mjs, downloaded and credited on the page);
(4) drawings of the subject in code; (5) these. They are real photographs (Unsplash licence, served by picsum.photos) of places, light and
texture. They are atmosphere, never a stand-in for a specific product, dish, person or interface. List the ones you use in your report so
they can be replaced.
- `https://picsum.photos/id/124/1600/1000` — Small red boat floating on clear turquoise water, seen from above · mid tone · turquoise, teal, red · calm area: right · native landscape · photo: Anton Sulsky
- `https://picsum.photos/id/87/1600/1000` — Wooden bench on a timber deck beside rippling water · mid tone · grey brown, slate grey · calm area: bottom · native landscape · photo: Barcelona
- `https://picsum.photos/id/637/1600/1000` — Metal ladder at the edge of a wooden dock over still water at dusk · mid tone · pale blue, peach, dark brown · calm area: left · native landscape · photo: Griffin Keller
- `https://picsum.photos/id/700/1600/1000` — Bird skimming over deep blue water leaving a trail of ripples · dark tone · deep blue, navy · calm area: all · native landscape · photo: John Cobb
- `https://picsum.photos/id/774/1600/1000` — Deep blue twilight sky over a still, flat water horizon · dark tone · cobalt blue, navy · calm area: all · native landscape · photo: Alex Wigan
- `https://picsum.photos/id/384/1600/1000` — Close view of a rippling deep blue water surface · mid tone · deep blue, teal · calm area: all · native landscape · photo: Griffin Keller
- `https://picsum.photos/id/509/1600/1000` — Tall waterfall pouring over a green mossy cliff into mist · mid tone · green, white, dark grey · native landscape · photo: Jeff Sheldon
- `https://picsum.photos/id/1044/1600/1000` — Rocky river flowing through a misty mountain forest · mid tone · grey green, mist grey, teal · calm area: top · native landscape · photo: Steve Carter
The last two path numbers are width and height: request the exact crop you render (`/1200/1500` for a 4:5 portrait, `/2400/1350` for a hero) and
add `?grayscale` to desaturate. Use three to six of them, not all eight. Always set `width`, `height`, `alt` and `loading="lazy"` (not on the hero image).
Other sets that fit this brief: fog-and-quiet, architecture, city-day, object-still — `node draw.mjs --photos <set>` prints one in full; `--photos list` shows all sets. Taking photographs from another set is your call and is not a redraw; keep them to one light and one treatment.

## 6. Hero — Card over a dim room
A full-bleed, low-key photograph of the room fills the viewport, darkened with `filter: brightness(0.7)` so it reads as atmosphere. Centred over it is one square-cornered panel in a flat warm tone taken from the photograph: columns 4–10, about 55% of the width and 62% of the height, a filled programme card with 32px padding. Along its top edge the three words of the title are spread to the left, centre and right in bold condensed capitals at clamp(28px, 2.5vw, 38px); that line is the headline. Under it sit two left-aligned blocks in the same face and size, line-height 1.0: the facts (date, time, place) as three short lines, then one supporting sentence held to 30ch. Along the card's bottom edge: a credit at left in 14px, the single action as a solid rectangular button in the centre, one text link at right. There is no navigation outside the card. The card is `position: sticky`: as the page scrolls it shrinks with `transform: scale` toward the bottom-left corner and stays there as a ticket-sized stub while photographs of differing sizes pass on a flat ground.

On a phone: The photograph fills 100svh and the card sits centred at full width minus 16px margins, 70svh tall. The title words stack as a two-line heading at 9vw at the card's top-left. The facts and the supporting sentence follow at 5.2vw in the condensed face. The action button spans the card's bottom edge. On scroll the card shrinks to a 120px stub pinned bottom-left.
Headline: The event or venue name, three words at most and up to about 8 characters each, spread across the card's top edge; two lines on a phone.

Adjusted for this page:
- It names a kind of typeface: use the dealt faces (display Archivo, text Archivo) and their settings; capitals only where the type system sets them.
- It sets a sentence large over several lines: jurors read that as a long headline. Either cut it to a two-line headline at display size, or keep it a statement at 36px or less on three lines (24px, four lines on a phone).
- Its vw sizes assume a face of normal width: with this condensed display face, size the words to fill the measure the blueprint gives them instead of copying the vw value.

## 7. Sections, in order
Each is a composition to rebuild with this project's content. Keep the geometry; change the subject. Re-order or drop a
section when the argument of the page needs it (see references/copy.md), never to fall back to a card grid.

### 1. intro — Title, note, facts row (split)
First row: a heading of two to four words in a light weight at clamp(44px, 5vw, 76px) sits on the left margin in columns 1–6; a three-line paragraph at 16px, 260px wide, sits in columns 10–12 with its last line on the heading's baseline. Columns 7–9 stay empty. 120px lower, a second row sets three or four facts (a date, a time, a place, a price) as large light text at clamp(28px, 3vw, 44px), spread across the 12 columns with `justify-content: space-between`. Each fact has a one-line explanation at 14px directly under it in the soft ink, left-aligned to the fact. Facts are separated only by the space between them, so the row reads like the line of times on a printed programme. A photograph may start under the right half of the facts row, 5 columns wide at 4:3. Padding 140px top, 120px bottom.
On a phone: Heading at 11vw on the left margin; the note follows directly under it at 16px, full width. The facts become a two-column grid with a 32px row gap, each fact at 26px with its explanation beneath. Any photograph goes last, full width.

Adjusted for this page:
- Its vw sizes assume a face of normal width: with this condensed display face, size the words to fill the measure the blueprint gives them instead of copying the vw value.

### 2. showcase — Output slips along the edge (full-bleed)
For subjects whose result is a piece of text or paper: a receipt, a note, a ticket, a written line. A full-bleed photograph, 100vw by 96svh, sets the scene. In the upper centre, left-aligned in a column starting at 18% of the width, two short paragraphs in paper colour at 28–32px, the first opening with the heading's two to four words; a neutral scrim sits behind that column only. Along the bottom, six paper-coloured slips stand side by side across the full width with 12px gaps, each a filled rectangle of a different height (between 26 and 44svh), their lower ends cut off by the section's bottom edge. Two or three of the slips, not all, are tilted by 1–2 degrees. Each slip carries a sample of real output in the text face at 15px: a bold first line, a divider made of typed characters, then four to eight lines.
On a phone: The photograph is 100svh. The paragraphs sit in the top third at 22px. Only three slips show, each 30vw wide, standing along the bottom at different heights, and the row scrolls sideways to reveal the rest. Slip text stays at 14px; do not scale it down.

Adjusted for this page:
- It draws lines or borders: keep them only inside a table, a form or a `data-ui` fragment; elsewhere separate with space or a change of ground.
- Its vw sizes assume a face of normal width: with this condensed display face, size the words to fill the measure the blueprint gives them instead of copying the vw value.

### 3. list — The printed menu sheet (band)
The list is one tall sheet of paper. A filled paper-colour panel 640px wide sits centred, or offset to columns 7–12, on a contrasting flat ground or a full-bleed photograph, with square corners and its top and bottom edges cut into shallow scallops by `clip-path` or an SVG `mask`. Inside, 64px padding and a centred, symmetrical setting like a printed card: the venue or section name at 40–48px, a one-line note at 15px, then three or four groups 56px apart. Each group opens with its name at 22px, centred. Items follow at 17px with 16px between them: the dish or service at the left of a 420px measure, the price at the right with tabular figures, and a one-line description at 14px in the soft ink under the name. Alignment alone links name and price; there are no leaders. The sheet ends with the opening hours as two centred lines. Holds 12–24 items.
On a phone: The sheet spans the screen with 10px of ground showing at each side and 28px padding; the scalloped edges stay at top and bottom. The measure is the full inner width and prices stay right-aligned. Group names at 20px, items at 16px.

### 4. about — Side facts, wide paragraph (table)
Two rows share one vertical line at 34% of the viewport width. Row one: in a 160px column at the left margin, three label and value pairs stack with 20px between them, each a label in the soft ink with its value beneath in full ink, all at 13px (founded, based in, team size). From the 34% line a five-line paragraph at clamp(20px, 1.7vw, 26px), leading 1.35, runs to 90% of the width. Row two starts 120px lower and repeats the logic for the record of the practice: one plain word at 13px at the far left (awards, press, clients), then from the 34% line two list columns, each 260px wide with a 64px gutter, at 13px with 10px between lines: name at the left, year at the right in the soft ink. No heading; the paragraph opens the section. Each list comfortably holds 6–12 lines. No photographs are needed.
On a phone: Everything aligns to the left margin. The paragraph comes first at 19px. The three label and value pairs follow as a two-column grid at 14px. The two record lists stack with 40px between them, each opened by its plain word in full ink.

Adjusted for this page:
- Its vw sizes assume a face of normal width: with this condensed display face, size the words to fill the measure the blueprint gives them instead of copying the vw value.

### 5. footer — The back of the card (stack)
The footer is the reverse side of the page's artefact, laid out as the back of a postcard. A paper-coloured panel spans columns 2–11 on the contrasting ground, about 420px tall, its top edge cut into a row of twelve semicircular scallops (an inline SVG path or `clip-path`, each scallop about 100px wide). The panel is divided by space into two halves. Left half: a short sign-off of two to four words at 32px, then two or three lines at 16px, written like a message. Right half: the address block, four left-aligned lines at 18px with 12px between them, each line a link (email, telephone, street, social); above it in the top-right corner, a stamp: one small photograph, 3:4 and 88px wide, with a 6px paper-coloured margin. Along the panel's bottom edge, a single centred line at 12px gives the copyright like a printer's imprint.
On a phone: The panel runs full width with six scallops across its top edge. The stamp sits top-right at 64px wide; the sign-off and message come first, then the address lines at 17px beneath them, then the imprint line centred at 12px.

Adjusted for this page:
- It sets text at 12px: use your small step (13px or more) instead.

## 8. Motion — Curtain footer
The page content slides up like a sheet to uncover the footer waiting beneath it, so the last screen is revealed rather than scrolled to. Build with a sticky footer at the bottom and a main element with its own background and a higher stacking order. No JavaScript.
This is the signature move, the one loud moment. Around it the page still needs the rest of the motion layer (SKILL.md step 9): an entrance for the parts of every section, feedback on every control, and one moving picture. The inspector fails a page that barely moves. Recipes: references/motion.md.

## 10. Where the richness comes from
Recognition. The shaped edges, the print-like alignment and the limited inks make a familiar object out of plain HTML.

## 11. How this direction goes wrong
Choose an artefact that truly belongs to the subject, or it becomes costume. Shape the edges with fills and `clip-path`; an outlined rectangle with a thin border is not an object. Keep text sizes readable on a phone, where the object becomes full width with its shaped edge kept at top and bottom.

## 12. Real references
Studied sites that work this way. Take the principle, never the specifics: no names, copy, images or signature assets of theirs.
- **WeekSync** (One Page Love, studied score 7.1) `opl-weeksync`
  Idea: The page is a paper coupon: a dotted cut line with a scissors icon frames the viewport, and on scroll the navigation rail is cut free while the rest of the sheet tilts and falls away.
  Hero: Taupe-grey field wrapped by a black dotted rounded-rectangle border inset 16px from every edge. A left rail about 26% wide holds, centred on its own axis, a small black logo glyph at the top, a two-line mono tagline and a text link in braces; four nav labels, each under a small empty circle, stack at the bottom of the rail. A scissors icon sits on the bottom dotted line where rail meets main area. The main area carries one four-line statement in medium grotesk at 3vw, flush left and flush top, ending in the first quarter of the height. The remaining three quarters are empty.
  Worth taking: Give the page a physical metaphor that also does layout work: a dotted cut line frames the viewport, then separates the nav rail on scroll.
- **Le Petit Bleu** (One Page Love, studied score 7.8) `opl-le-petit-bleu`
  Idea: The cafe's teal-and-white stripes become the whole system: one teal ink on cream, everything boxed in thin double outlines like printed menu cards, beside a permanently visible photo of the room.
  Hero: Viewport split 50/50 with 12px gaps. Left: a cream panel with a thin pale-teal outline and rounded corners. Inside, a second outlined box is the nav bar: two-line hamburger left, teal brush-script logo about 300px wide centred, a caps order link right. Below, a two-line light serif headline at about 3.5vw, centred, in teal, then two centred stacks, each a bold caps label, a serif line and a solid teal button wrapped in a second thin outline. Right: a full-height rounded photo of a striped booth, with an outlined hours bar across its top, three slide dots bottom-left and a white address card bottom-right.
  Worth taking: Print everything in one brand ink on cream, including body text, rules and buttons, and let photographs supply the other colours.
- **Colonia Zacamil** (Awwwards Site of the Day, studied score 7.2) `aww-colonia-zacamil`
  Idea: The sentence is the layout: 'FLY TO ___ ZACAMIL' runs as one full-width line, with a strip of drone video filling the gap where a word would sit.
  Hero: Warm off-white field with no navigation at all. One line of black ultra-condensed capitals about 13vw tall sits on the vertical centre and runs edge to edge with 28px side margins: 'FLY', a wide gap, 'TO', then a rounded-corner strip of aerial video exactly as tall as the letters and half the viewport wide, then 'ZACAMIL'. A tiny mono bracket label sits above the last word. About 150px lower, a small black pill button with a white dot-in-circle at its right end is centred. Two centred lines of 24px serif sit near the bottom edge. The top third is empty.
  Worth taking: Replace a word in the headline with a media strip cut to the cap height, so the picture is read as part of the sentence.
Full notes on any of them: `node draw.mjs --site <id>`.

## Always
Headlines two lines or fewer at every width. No eyebrow labels, no monospace, no 01/02/03, no thin rules, no gradients, no shadows at rest,
no cream-and-terracotta, no violet. The frame: one h1 on the first screen that says what this is, equal outer margins, no
section huddled on one side with the other half empty, no blank stretch over half a screen, a heading on every section.
`inspect.mjs` measures all of it.

Saved to /Users/dewanshshukla/Desktop/Personal/SAAS/native-waters-taste-redesign/.taste-skill/direction.json · reprint with `node draw.mjs --show`
