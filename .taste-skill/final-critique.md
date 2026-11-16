# Final rendered critique

ROUND 3
Seen in one second: a large freshwater scene beside the invitation “India, beneath the surface”.
Idea (one sentence): a living river atlas joins an immersive exhibit to a sourced natural-history record.
Live thing: choose a river, enter its exhibit, follow a fish and open a supported species record; search scientific or common names independently of 3D.
Layout words by section: hero=split / rivers=selector-and-record / species=plates / search=index / method=photograph-and-essay / footer=colophon.
Scores: design 7.5 · usability 8 · creativity 7 · content 8 → overall 7.6.
Caps applied: creativity 7; the atlas approach is a familiar museum/editorial concept, not an unprecedented invention. This is an internal assessment of rendered screenshots, not an external jury score or award.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. The archival Rohu drawing is much fainter than the Arulius and Calbasu plates (`after/mobile-page-01.jpg`, `after/rohu-desktop-fold.png`). Its caption identifies age and limitations. A future replacement should be a verified, licensed species photograph, not AI detail enhancement or an unrelated fish. Preserve the historical plate as supporting evidence.
2. Mobile has eleven computed type sizes (`after/mobile-fold.jpg`, `after/mobile-page-01.jpg`, `after/report.json`). Display, body, captions, responsive subheadings and control labels remain distinguishable/readable; a tighter scale is a minor future polish opportunity, not a reason to flatten scientific hierarchy. Running body copy is now 17px/1.6.
3. The home illustration is not field footage (`after/desktop-fold.jpg`). No verified Indian freshwater clip was available. Keep the explicit illustrative label and real opt-in WebGL exhibit rather than imply generic footage documents these basins. Adding an honest licensed field clip is optional editorial work, not an unmet functional dependency.

The final sheets show consistent page edges, unequal but deliberate text/image masses, wrapped river choices on phones, visible primary actions, no clipped headings and no footer covering content. Reference content is the main column, not a narrow dismissible sidebar. The field guide has a real species index and full sourced records rather than decorative cards.

Earlier refinement passes removed an overlapping pinned footer, reduced its oversized brand, added restrained progressive section motion, and raised running annotations from 14px to 17px. Final inspector: 0 FAIL, 3 WARN (footage, tablet alignment anchors and mobile size count). Three design refinement passes; subsequent checks corrected accessibility and network-loading defects without changing the composition.

Source warnings retained deliberately: borders distinguish interactive exhibit/consent controls; “robust” appears in inherited fish-care prose, not a marketing claim; punctuation warnings span scientific citations and metadata. Source inspection: 0 FAIL, 10 WARN. Archive credits and model disclaimers remain visible.

Production accessibility/performance validation then found that scroll-linked opacity reduced contrast before elements completed entry, and LCP image priority was missing. Corrected these as validation defects: motion now changes position only, text remains opaque throughout, and above-the-fold artwork loads eagerly with high fetch priority. The composition and three-round design direction are unchanged. Lighthouse reports before this correction are retained in `performance-refinement/`.

The tablet alignment warning counts the three archival-plate columns, padded hero/record panels and shared page edges as seven anchors. The final tablet sheet shows deliberate grid alignment rather than clipped or arbitrarily offset text; retain these distinct content groups. All seven final inspector sheets were reviewed after the normal-width font and opaque-motion corrections.
