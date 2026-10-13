# Native Waters
## Quality-First Vertical Slice PRD

**Version:** 1.0  
**Status:** Draft  
**Product stage:** Pre-MVP / Vertical Slice  
**Goal:** Prove the final visual and interaction quality with the smallest possible production-ready experience.

---

# 1. Executive Summary

The Native Waters vertical slice is a **small but production-quality demonstration** of the final product.

It will not attempt to represent India’s complete freshwater ecosystem network.

Instead, it will prove the hardest and most important parts of the product at the same quality bar expected for the final website:

- realistic native fish
- convincing underwater environment
- believable fish behaviour
- cinematic camera movement
- production-quality water rendering
- minimal species interaction
- India map entry point
- continuous map-to-water transition

The vertical slice should feel like a finished piece of Native Waters rather than a prototype that will later be discarded.

The core philosophy is:

> **Minimum scope. Maximum quality.**

---

# 2. Primary Objective

The vertical slice must answer one question:

> **Can Native Waters make a user feel like they have entered a real Indian freshwater ecosystem?**

If the answer is yes, the product concept is validated.

---

# 3. Secondary Objectives

The vertical slice should also validate:

- browser performance
- Blender-to-web asset pipeline
- fish rigging strategy
- procedural fish motion
- schooling behaviour
- water shader quality
- environmental rendering
- map-to-3D transition
- mobile feasibility
- progressive asset loading
- future reuse of the architecture

---

# 4. Non-Objective

This version is not intended to validate:

- the complete India freshwater atlas
- hundreds of fish species
- complete GIS infrastructure
- user accounts
- social features
- CMS architecture
- database scalability
- all water systems
- conservation dashboards
- seasonal simulation
- multiplayer
- mobile applications

---

# 5. Product Scope

The vertical slice consists of exactly three experiences:

## Experience A — India Entry Map

A simplified but visually production-quality India map.

Only one selected water system needs to be interactive.

---

## Experience B — Enter Water Transition

A seamless cinematic transition from the India map into the selected river habitat.

---

## Experience C — Underwater Encounter

One highly polished freshwater environment containing:

- one hero native fish species
- one small school
- optional 1–2 supporting species
- environmental movement
- fish identification
- follow mode
- short species story

---

# 6. Target Duration

A first-time user should be able to experience the complete vertical slice in approximately:

**30–90 seconds**

Users may remain longer to observe the fish.

---

# 7. Golden User Journey

```text
Open Native Waters

↓

Dark India map appears

↓

One real river/basin slowly illuminates

↓

User selects it

↓

Camera moves toward the river

↓

River expands to fill the screen

↓

Water surface becomes visible

↓

Camera moves through surface

↓

Underwater sound replaces above-water ambience

↓

Riverbed gradually appears

↓

Particles move through current

↓

A school of native fish passes through frame

↓

User moves cursor over one fish

↓

Scientific name appears

↓

User clicks

↓

Camera begins following the fish

↓

Minimal species information appears

↓

User selects "Explore Species"

↓

Short behaviour/habitat story

↓

User chooses "Back to Water"

↓

Normal exploration resumes
```

---

# 8. Success Definition

The vertical slice succeeds when a first-time viewer reacts primarily to the **experience**, rather than the technology.

Desired reaction:

> "This feels like I entered a river."

Not:

> "That's a cool Three.js demo."

---

# 9. Selected Water

Only one real habitat should be represented.

Requirements:

- located in India
- native fish data available
- visually interesting habitat
- ecologically defensible
- suitable for schooling fish
- good research/reference material available
- manageable environment complexity

A Western Ghats river or stream is a strong candidate.

Final location should be selected only after validating species and habitat data.

---

# 10. Hero Species

The vertical slice requires one hero species.

Selection criteria:

- native to selected water system
- visually distinctive
- recognizable in motion
- enough reference imagery available
- behavioural characteristics suitable for interaction
- suitable for small-school animation where applicable

Possible candidate:

**Sahyadria denisonii**

if the final selected habitat supports its occurrence.

---

# 11. Supporting Species

Maximum:

**0–2 supporting species**

Supporting species should primarily improve ecological believability.

They should not increase production scope significantly.

Examples could include:

- bottom-dwelling species
- smaller schooling fish
- loach-like species

Only include them if distribution is verified.

---

# 12. India Map Requirements

The entry map should feel visually aligned with the final Native Waters product.

Required:

- accurate India outline
- subtle terrain relief
- dark visual palette
- minimal labels
- one visible river or basin
- hover/select state
- camera movement
- production-quality typography

Optional:

- subtle other major rivers
- faint elevation
- ambient particle/light movement

---

# 13. Map Complexity

Do not load the national hydrological dataset yet.

For the vertical slice, use:

```text
India geometry

+

one real river geometry

+

optional simplified surrounding rivers
```

This may initially be stored directly as GeoJSON/static application data.

---

# 14. Map Interaction

Default state:

India visible.

No large UI panels.

On hover over selected river:

- river brightens
- name appears
- short ecological summary appears if required

Example:

```text
CAUVERY

Southern India

Enter Water ↓
```

---

# 15. Enter Water Trigger

Primary CTA:

# ENTER WATER ↓

This should be the central transition into the 3D experience.

---

# 16. Map-to-Water Transition

This is a critical production feature.

Transition sequence:

```text
India

↓

camera approaches selected basin

↓

river becomes dominant

↓

river geometry fills viewport

↓

river representation transforms/fades into water surface

↓

camera continues downward

↓

camera passes through surface

↓

underwater environment becomes fully visible
```

The transition should feel continuous rather than like a route change.

---

# 17. Loading Strategy During Transition

When the user hovers or selects the river:

begin preloading:

- hero fish
- river environment
- audio
- water textures
- shader assets

The transition should provide enough time to hide loading where possible.

A loading indicator should appear only if the required assets are unavailable.

---

# 18. Underwater Environment Scope

Approximate environment size:

**20–30 metres of visible river habitat**

The environment does not need to represent an entire river.

Its edges should remain invisible using:

- fog
- terrain
- rocks
- vegetation
- camera constraints
- depth attenuation

---

# 19. Environment Components

Required:

- riverbed
- gravel / substrate
- stones
- boulders
- wood
- branches
- aquatic/riparian vegetation where appropriate
- suspended particles
- water current
- environmental lighting

Optional:

- leaf litter
- roots
- small debris

---

# 20. Environmental Asset Count

Keep the number of unique assets deliberately small.

Suggested:

```text
6 rock variants
3 boulder variants
3 branch variants
2 log variants
3–5 plant variants
3–4 leaf/debris variants
```

Variation should come from:

- scale
- rotation
- position
- partial burial
- material variation
- lighting

---

# 21. Environment Creation

Primary environment authoring tool:

**Blender**

Recommended use:

- riverbed modelling
- rock placement
- vegetation
- Geometry Nodes scattering
- asset composition
- GLB export

---

# 22. Procedural Environment

Geometry Nodes should be used where useful.

Potential controls:

```text
rockDensity
largeBoulderProbability
plantDensity
branchDensity
leafDensity
currentDirection
slopeInfluence
```

The result should remain art-directed rather than fully random.

---

# 23. Water Rendering

Water should be rendered in real time in Three.js.

Blender water should not be used as final production rendering.

---

# 24. Water Visual Layers

The water system should combine:

## Surface

- animated normal maps
- subtle displacement
- Fresnel effect
- reflection
- refraction

## Underwater volume

- fog
- distance attenuation
- colour absorption
- turbidity

## Lighting

- sunlight
- moving caustics
- subtle volumetric shafts

## Motion

- particles
- debris
- plant sway
- fish response

---

# 25. Current System

A simplified vector field should represent water current.

Example:

```text
CurrentField {
  direction
  strength
  turbulence
}
```

The same field should affect:

- particles
- vegetation
- debris
- fish steering

This creates perceptual consistency.

---

# 26. Fish Model Quality

The hero fish is the highest-priority visual asset.

Target hero model:

**20K–40K triangles**

depending on morphology.

The model should include:

- accurate body proportions
- species-correct fin geometry
- detailed eye
- scale detail via texture/normal maps
- translucent fins
- natural material response

---

# 27. Fish Reference Package

Before modelling begins, collect:

- side photographs
- underwater video
- top or angled photographs
- close-up head references
- eye references
- fin references
- reliable length measurements
- body proportions
- scientific illustrations if available

AI-generated anatomy should not be treated as the biological reference.

---

# 28. Hero Fish Textures

Recommended:

```text
2K Albedo

2K Normal

2K Roughness

Optional:
2K detail/scale map
```

Use smaller sizes where visual testing proves sufficient.

---

# 29. Fish Material Requirements

The material should support:

- wet specular response
- roughness variation
- subtle scale reflection
- translucent fins
- eye reflections
- optional subtle iridescence

Avoid plastic-looking material response.

---

# 30. Fish Eye

Eye quality is a mandatory acceptance criterion.

Recommended layers:

```text
Outer cornea

↓

Iris

↓

Pupil
```

The cornea should provide separate reflective response.

---

# 31. Fish Rig

Required bones:

```text
Root

Head

Spine01
Spine02
Spine03

Tail01
Tail02
TailFin

PectoralLeft
PectoralRight

Dorsal

AnalFin
```

Exact rig may vary by species.

---

# 32. Fish Motion

Do not rely exclusively on a repeating baked animation.

Swimming should respond to movement parameters.

Example:

```text
swim speed
→ tail frequency

acceleration
→ tail amplitude

turning
→ body curvature

idle movement
→ fin micro-motion
```

---

# 33. Fish Behaviour

For the hero species, implement:

- cruising
- turning
- schooling
- mild avoidance
- camera response
- obstacle avoidance
- current response

No advanced biological AI is required.

---

# 34. School Size

Recommended:

**8–12 fish**

for the hero school.

This is enough to demonstrate natural schooling without excessive simulation cost.

---

# 35. Schooling System

Implement simplified boid-style behaviour:

- cohesion
- alignment
- separation
- target seeking
- obstacle avoidance
- current influence

Add per-fish variation to:

- speed
- body scale
- turning
- animation phase
- preferred offset

---

# 36. Fish LOD

Create three levels immediately.

## High

Used near camera.

Suggested:

```text
20–40K triangles
2K textures
full rig
```

## Medium

Suggested:

```text
5–10K triangles
1K textures
simplified detail
```

## Low

Suggested:

```text
500–2K triangles
512px textures
minimal animation
```

---

# 37. Fish Interaction

Only three interactions are required.

## Hover

Show:

```text
Scientific name
```

Optional common name below.

---

## Select

Click/tap fish.

Activates Follow Mode.

---

## Explore Species

Displays short narrative content.

---

# 38. Follow Mode

The camera should follow the fish using damping rather than direct attachment.

Architecture:

```text
Fish position

↓

smoothed tracking target

↓

spring/damped camera

↓

cinematic movement
```

The camera should preserve a comfortable distance and avoid sudden rotations.

---

# 39. Follow Mode UI

Minimal content:

```text
RED-LINE TORPEDO BARB

Sahyadria denisonii

Western Ghats, India

Explore Species →
```

Only display conservation status if confidently sourced.

---

# 40. Species Story

One short interactive narrative is enough for the vertical slice.

Suggested structure:

## Chapter 1 — Habitat

Short explanation while showing fish within habitat.

## Chapter 2 — Behaviour

Pull camera outward to show schooling or other defining behaviour.

## Chapter 3 — Range

Optionally transition briefly back toward the map or show minimal location visual.

---

# 41. Back to Water

Required control:

```text
← Back to Water
```

Behaviour:

- hide content UI
- camera releases fish
- transition back to exploratory camera
- environment continues without reset

---

# 42. Camera Exploration

Do not implement completely free first-person movement.

Use a constrained cinematic camera.

Desktop:

```text
scroll → forward/back movement

mouse → subtle look/parallax

click → interaction
```

Mobile:

```text
swipe → progression

drag → look

tap → select
```

---

# 43. Audio

Audio is part of the quality bar.

Required:

## Above water

- river flow
- forest/ambient sound

## Transition

high-frequency environmental audio attenuates.

## Underwater

- low current rumble
- subtle stones/water movement
- quiet environmental texture

---

# 44. Audio Rules

Avoid obvious looping.

Use layered ambient audio with:

- differing loop lengths
- random playback offsets
- varying levels

---

# 45. Application Stack

Use the same stack expected for production.

Recommended:

```text
Next.js
TypeScript
React

React Three Fiber
Three.js
Drei

Zustand

GSAP or Motion

WebAudio
```

---

# 46. Asset Stack

```text
Blender

GLB

Meshopt

KTX2
```

---

# 47. Data Storage

For the vertical slice, no database is required.

Use structured local files.

Example:

```text
/content

  /species
    hero-species.json

  /waters
    first-water.json
```

---

# 48. Sample Water Configuration

```json
{
  "id": "first-water",
  "name": "Selected River",
  "environment": {
    "flow": 0.7,
    "turbidity": 0.15,
    "visibility": 12,
    "canopy": 0.7,
    "substrate": [
      "gravel",
      "rock",
      "boulder"
    ]
  }
}
```

---

# 49. Sample Species Configuration

```json
{
  "id": "hero-species",
  "scientificName": "Species name",
  "commonName": "Common name",
  "schoolSize": 10,
  "behavior": {
    "cruisingSpeed": 1,
    "schoolingStrength": 0.8,
    "currentPreference": 0.7
  }
}
```

---

# 50. Repository Structure

Suggested:

```text
native-waters/

apps/
  web/

packages/

  three/
    fish/
    water/
    environment/
    particles/
    camera/
    lighting/

  content/

  ui/

assets/

  blender/
  textures/
  audio/

tools/

  blender/
  optimization/
```

---

# 51. Codex Responsibilities

Codex should assist heavily with:

- R3F architecture
- shader code
- fish steering
- schooling
- camera systems
- asset loading
- Blender Python tooling
- rig generation helpers
- GLB export scripts
- LOD generation
- texture compression
- validation scripts
- performance profiling

---

# 52. Codex Non-Responsibilities

Codex should not be trusted to autonomously decide:

- exact fish anatomy
- true species colours
- ecological occurrence
- scientifically correct habitat relationships

These require reliable references and manual verification.

---

# 53. Blender Automation

Recommended tooling:

```text
/tools/blender

create_fish_rig.py

generate_lods.py

setup_fish_material.py

validate_mesh.py

export_glb.py

batch_export.py
```

---

# 54. Performance Targets

## Modern desktop/laptop

Target:

**60 FPS**

Minimum acceptable:

**45 FPS**

---

## Modern mobile

Target:

**30 FPS**

---

# 55. Initial Asset Target

Aim for:

**<10–15 MB initial playable underwater payload**

Higher-resolution content may stream after entry.

---

# 56. Rendering Guardrails

Initial targets:

```text
< 150–200 draw calls

< approximately 1M visible triangles

hero textures <= 2K

environment textures <= 2K

far/background textures <= 1K
```

These are guardrails rather than strict limits.

---

# 57. Progressive Loading

Load order:

```text
application shell

↓

India map

↓

base water scene

↓

hero fish

↓

school

↓

environment detail

↓

high-resolution textures

↓

secondary species
```

---

# 58. Quality Settings

Implement at least:

```text
AUTO
HIGH
LOW
```

Auto should be default.

High:

- full particles
- full post-processing
- high texture resolution

Low:

- fewer particles
- simplified water
- reduced post-processing
- reduced fish count if required

---

# 59. Mobile Strategy

Mobile may reduce:

- particles
- fish count
- shadows
- texture resolution
- post-processing
- reflection quality

The interaction and story should remain the same.

---

# 60. Accessibility

Even in the vertical slice:

- species text must exist in the DOM
- keyboard access should work
- reduced motion should be supported
- fish information must be accessible without precise moving-target interaction
- audio must not autoplay if platform rules prevent it

---

# 61. Reduced Motion

When enabled:

- remove aggressive camera movement
- simplify map zoom transition
- reduce follow-camera movement
- disable unnecessary animated UI

The experience should remain understandable.

---

# 62. Development Order

## Step 1

Hero fish reference collection.

---

## Step 2

Hero fish Blender model.

---

## Step 3

Fish materials and eye.

---

## Step 4

Rig.

---

## Step 5

Export one GLB.

---

## Step 6

Basic R3F underwater scene.

---

## Step 7

Procedural swimming.

---

## Step 8

Water fog/attenuation.

---

## Step 9

Caustics.

---

## Step 10

Particles.

---

## Step 11

Riverbed assets.

---

## Step 12

Environment movement.

---

## Step 13

Schooling.

---

## Step 14

Follow camera.

---

## Step 15

Species UI.

---

## Step 16

India map.

---

## Step 17

Map-to-water transition.

---

## Step 18

Audio.

---

## Step 19

Performance optimization.

---

## Step 20

Mobile testing.

---

# 63. Milestone 1 — Living Fish

Deliverable:

One hero fish swimming against a simple background.

Acceptance:

- model looks anatomically credible
- material does not look plastic
- animation is convincing
- turns do not look mechanical

---

# 64. Milestone 2 — Living Water

Deliverable:

Empty river scene without fish.

Acceptance:

- environment feels underwater
- current is perceptible
- particles feel natural
- lighting is convincing
- scene is interesting without interaction

---

# 65. Milestone 3 — Living River

Deliverable:

Hero school in environment.

Acceptance:

- school behaviour feels organic
- individuals are visibly asynchronous
- current influences movement
- environment and fish feel connected

---

# 66. Milestone 4 — Interaction

Deliverable:

Hover + Follow Mode + Back to Water.

Acceptance:

- user can discover fish without tutorial
- camera feels cinematic
- fish remains believable during interaction

---

# 67. Milestone 5 — Complete Vertical Slice

Deliverable:

```text
India
→ River
→ Enter Water
→ Fish Encounter
→ Follow
→ Species Story
→ Back to Water
```

Acceptance:

entire flow feels like one continuous product.

---

# 68. Visual Acceptance Criteria

The vertical slice should meet all of the following:

## Fish

Still frame resembles a real fish rather than a game asset.

## Eye

Eye has convincing depth/reflection.

## Fins

Fins appear translucent and flexible.

## Water

Depth and visibility feel physically plausible.

## Lighting

Fish respond naturally to underwater lighting.

## Environment

No obvious repeated/placed asset pattern.

## Particles

Particles communicate depth rather than looking like visual effects.

---

# 69. Motion Acceptance Criteria

## Swimming

Tail frequency responds to speed.

## Turning

Body bends during direction changes.

## Schooling

Fish remain grouped without behaving identically.

## Current

Fish orientation reacts to water flow.

## Camera

Follow mode contains no harsh positional snapping.

---

# 70. Stillness Test

Leave the underwater scene untouched for:

**30 seconds**

Pass condition:

The environment still feels alive.

There should be visible:

- fish movement
- water movement
- plant movement
- particles
- lighting changes
- subtle ambient behaviour

---

# 71. Performance Acceptance Criteria

On target desktop hardware:

- stable 60 FPS preferred
- no severe frame spikes during fish selection
- no visible shader compilation freezes after entry
- smooth map-to-water transition

On target mobile:

- stable ~30 FPS
- no severe input lag
- no browser crash

---

# 72. Scientific Acceptance Criteria

Before public release:

- hero fish is verified for selected ecosystem
- habitat representation is plausible
- distribution text is sourced
- species naming is current
- conservation status is sourced where shown

---

# 73. Failure Conditions

The vertical slice should not ship if:

- fish still looks synthetic/plastic
- water looks like transparent blue fog
- fish movement feels like looping animation
- follow camera produces motion sickness
- the transition contains obvious loading interruptions
- frame rate is poor on ordinary target hardware
- species/habitat relationship is uncertain
- UI dominates the environment

---

# 74. Demo Script

Ideal showcase sequence:

```text
0s

black screen

↓

NATIVE WATERS

↓

India slowly appears

↓

selected river illuminates

↓

cursor approaches

↓

river name

↓

ENTER WATER

↓

camera begins descending

↓

surface fills screen

↓

underwater transition

↓

particles pass lens

↓

riverbed appears

↓

small pause

↓

fish school enters frame

↓

user hovers

↓

scientific name

↓

click

↓

camera follows fish

↓

species title appears

↓

short behavioural narrative

↓

Back to Water
```

---

# 75. Target Emotional Arc

The vertical slice should move through:

```text
Curiosity

↓

Anticipation

↓

Immersion

↓

Discovery

↓

Wonder

↓

Understanding
```

This emotional arc is more important than feature count.

---

# 76. Reusability Requirement

Everything created for the vertical slice should be reusable in production where practical.

Reusable systems include:

- water renderer
- current system
- fish rig
- fish animation controller
- schooling
- camera
- map transition
- asset pipeline
- quality settings
- environment framework

Avoid building throwaway mock architecture.

---

# 77. Explicit Non-Goals

Do not add during this phase:

```text
accounts

login

CMS

full PostGIS

complete India river network

search

filters

species comparison

collections

achievements

comments

community observations

admin dashboard

VR

AR

multiplayer
```

Every additional feature should be challenged with:

> Does this make the first 60 seconds more convincing?

If not, defer it.

---

# 78. Final Deliverable

The end result should be a publicly deployable vertical slice containing:

### One map

India + selected water.

### One transition

Map → river → underwater.

### One habitat

Production-quality river environment.

### One hero species

Production-quality fish model and behaviour.

### One school

Approximately 8–12 individuals.

### One interaction

Hover → follow → story.

### One polished experience

Approximately 30–90 seconds.

---

# 79. Core Quality Principle

The vertical slice should represent the visual standard of every future Native Waters ecosystem.

Do not make this version:

> "good enough for now."

Make it:

> **the smallest possible version of the final product.**

The correct development question throughout this phase is:

> **Would we be comfortable keeping this exact fish, water, camera system and interaction in the final Native Waters website?**

If the answer is no, the vertical slice is not finished.
