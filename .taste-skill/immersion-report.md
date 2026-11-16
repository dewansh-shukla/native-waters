# IMMERSION handoff

## Implemented
- Scoped dark river UI in `src/components/experience.css`, imported by Experience. Explicit colors/headings/control backgrounds, visible focus, 44px controls, compact portrait follow sheet and landscape arrangement. Public globals/pages untouched.
- Removed the blocking portrait rotate overlay and automatic fullscreen/orientation locking. Existing aspect-aware camera remains the sole camera writer. Portrait users can select/follow/read profiles; navigation remains visible.
- Corrected the pale horizon's color-space mismatch: water scatter is display RGB, but the Three background treated it as linear RGB. Background now converts correctly; surface scattering occurs after output conversion, matching bed/fish fog. Extended terrain beyond visible absorption range without increasing its vertex counts. Reduced fill lighting for more directional depth.
- Fixed particle-buffer overlap: HIGH silt updates previously overwrote part of the HIGH snow field with the LOW layout. Only the active quality layout is now updated. Current-driven plants, fins, schooling, surface motion and reduced-motion behavior are retained.
- Fish now consume their river's actual water optics instead of always using Cauvery absorption. Existing environment restoration now also releases the world's scene-environment reference on cleanup.
- Paused/hidden/story scenes use demand rendering (reduced-motion entry remains able to complete). Follow-pointer movement reuses its intersection vector rather than allocating each event. Removed the duplicate rotating WebGL fish-preview renderer and its obsolete test: the scene itself shows the fish, and the study dialog is HTML. This eliminates a second context, uncontrolled animation during pause/reduced motion and accidental HIGH-model downloads from a LOW study.
- Retry clears the active species' actual GLTF cache entries, not an unused fixture. Asset/LOD changes reset the scene's readiness without recreating the Canvas. Added asset-count/preparing-light loading status and readable graphics failure with a direct field-guide escape route. Entry disables again while a new river prepares.
- Fixed initial river prop pinning: changing the map's river now changes the actual profile, not just its label.
- Always-visible selected basin link and explicit owned Arulius high/low model → `/species/dawkinsia-arulius` link. Other models point to separate sourced basin records, never inferred taxon matches. Generic exhibit/river descriptions replace stale polar-parrot/Cauvery-only overview text; polar-specific text remains only for that actual model/legacy fixture study.
- Removed the Arulius inline unsourced study (its Tamiraparani/synonym assertions conflicted with the curated catalog); the exact sourced profile is now authoritative. Other pre-existing aquarium study notes remain separate from catalog evidence.
- Inner native-dialog cancellation stops propagation; Escape releases following before an enclosing fullscreen dialog can close. Follow-sheet Back restores focus after its controls become visible.

## Interfaces
`Experience` and `ExperienceUI` public interfaces unchanged. `FishSchoolProps` adds optional `water?: WaterOptics`, supplied by SceneViewport; standalone callers retain the existing default.

## Files
- `src/components/Experience.tsx`
- `src/components/experience.css` (new)
- `src/components/experience-ui/ExperienceUI.tsx`, `ExperienceUI.test.tsx`
- Deleted unused `src/components/experience-ui/FishPreview.tsx`, `FishPreview.test.tsx`
- `src/components/scene/SceneViewport.tsx`, `SceneViewport.test.tsx`, `SceneBoundary.tsx`
- `src/components/scene/camera/ExperienceCamera.tsx`, `ExperienceCamera.test.tsx`
- `src/components/scene/fish/FishSchool.tsx`, `FishSchool.test.tsx`
- `src/components/scene/world/PreviewWorld.tsx`, `materials.ts`, `waterOptics.ts`, `waterOptics.test.ts`
- `src/experience/contracts.ts`, `species.ts`, new `referenceLinks.ts`, `referenceLinks.test.ts`
- `tests/e2e/mobile.spec.ts`, `tests/e2e/journey.spec.ts`

## Parent verification required
No build, tests, lint, formatter, browser smoke or runtime measurements were run by this worker, as assigned. New tests have not been observed failing/passing.

Run focused unit coverage for ExperienceUI, SceneViewport, SceneBoundary, ExperienceCamera, FishSchool, waterOptics, referenceLinks, species, plus existing world/material/quality/journey coverage. The new tests cover exact-vs-unsupported identity mappings, background encoding, river fish optics updates, active-model cache retry, demand rendering, reference links, changed-river readiness, nested cancellation and reusable pointer targets.

Browser: inspect real water at 1440/768/390, LOW and HIGH, normal and reduced motion; pause/resume and tab hide/show; switch basin on an initially named route; fail WebGL/context and retry; inspect modal text contrast inside the public light-page dialog. E2E journey/mobile files now start at `/experience`, retain keyboard/quality selection/canvas reuse checks, remove obsolete homepage split/portrait-blocking assumptions and add exact profile → basin traversal. Parent owns homepage → basin → lazy native-dialog integration test.

Exact sourced journey: Enter Water → combobox `Select fish`, option value `fish-10` → `Follow fish` → link accessible name `Read species profile Dawkinsia arulius` → `/species/dawkinsia-arulius` → basin link. Header `Cauvery basin` links directly to `/basins/cauvery`. No inner study modal is required for this route.

## Limitations
Visual improvement is grounded in the observed source color mismatch, not a claimed post-change screenshot or benchmark; parent must judge actual output. No new scientific identity was inferred beyond the explicitly known Arulius model. The unchanged `globals.css` contains obsolete rotate/preview selectors, but no matching rotate/preview elements remain; parent owns global cleanup. No renderer, heavy library, models, catalog evidence, routes or model geometry were replaced. Independent review and integrated runtime verification remain parent responsibilities.
