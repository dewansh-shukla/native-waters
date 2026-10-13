# Blender MCP setup

## Installed

- MCP for Blender `2.1.9`, run through existing `uvx` with Python 3.11.
- Add-on: `~/Library/Application Support/Blender/5.2/scripts/addons/blender_mcp.py`.
- Project-scoped Pi configuration: `.pi/mcp.json`. No global MCP configuration changed.
- Server flags: `DISABLE_TELEMETRY=true`, `BLENDER_MCP_SAFE_MODE=1`, destination `127.0.0.1:9876`.
- Only `get_scene_info`, `look`, and `execute_blender_code` are exposed directly. Asset downloads, paid generation, and other tools are hidden.

## User activation

1. Open Blender into a new, disposable scene. Existing scenes and saved preferences were not modified by setup.
2. Edit → Preferences → Add-ons: search for **MCP for Blender** and enable it. If absent, restart Blender; alternatively use **Install from Disk** to select the add-on file above. Leave **Allow Telemetry** unchecked.
3. In the 3D viewport, press **N** and open the **MCP for Blender** tab. The add-on may connect automatically; otherwise click **Connect to MCP server**. Expect **Connected on port 9876**. Disable auto-start if you prefer explicit activation, and disconnect when finished.
4. In Pi, run `/trust` and approve this project, then `/reload`. Project configuration is ignored until trusted. Use `/mcp` to inspect the Blender server and reconnect if necessary.

## Verification performed

- Installed the pinned package and bundled add-on.
- Initialized the MCP server over stdio and listed its tools using the MCP Python SDK.
- Asserted that all three configured tool names exist.
- Server log confirmed telemetry was disabled by environment variable.
- Initial live connection failed before GUI activation. After user activation, scene inspection, visual feedback, and Python execution succeeded.
- Live listener verified as `127.0.0.1:9876`.
- Created `Native Waters - Pipeline Test`, a separate scene with a simple 102-vertex fixture, three deform bones, and keyed swim motion. Original scene retained its cube, camera, and light. The test scene is not saved as a .blend file.
- Exported `artifacts/blender-probe/pipeline-test.glb` (10,836 bytes). Independent binary/JSON assertions passed: GLB v2 header, file length, skin attributes, three joints, and animation channels. Mesh inspected through MCP multi-angle visual feedback.
- Browser playback and visual production quality remain untested; add-on telemetry consent has not been independently inspected.

## Next probe

The Blender/export portion passed. Next, check the exported GLB and animation in the browser after the web foundation exists. This is not a scientifically representative fish or visual acceptance milestone.

## Safety and limits

The standard add-on listener defaults to localhost. The configured `BLENDER_HOST` controls the MCP client's destination, not the listener's binding; verify the live binding after activation. Do not expose or forward port 9876. Its socket is unauthenticated, and local processes can submit Python directly. Safe mode validates MCP-submitted scripts but is not OS isolation and cannot prevent every destructive Blender operation. Keep valuable scenes closed during the initial probe.

No paid integrations or API keys are required for this local pipeline. Do not enable add-on updates until deliberately reviewing a new release; the configured MCP package is pinned.
