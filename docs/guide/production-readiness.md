# Production readiness

This extension targets Vue 3 and X6 3 applications that need ordinary HTML node
content without SVG `foreignObject`. Production suitability depends on the graph
features and browsers your application uses; it is not a drop-in replacement for
every official Vue shape feature.

## Current baseline

The `0.0.0` development version declares peer ranges Vue `^3.3.0` and X6
`^3.0.1`. Repository tests use Vue 3.5.46 and X6 3.1.8. An earlier packed build
passed the original browser suite in a clean consumer with Vue 3.3.0 and X6 3.0.1.
Follow [Getting Started](./getting-started.md) for local evaluation.

## Implemented behavior

- The complete graph matrix is inherited through the HTML layer, including
  nonuniform scale, translation, rotation and skew. A viewport attribute observer
  handles direct `graph.matrix(...)` and `graph.rotate(...)` calls after its
  mutation callback runs; those operations do not emit scale/translate events.
- Node rotation uses the node center, matching X6 SVG geometry.
- Shape registration forwards X6 defaults. Generated SVG markup includes a
  centered text label. The HTML wrapper mirrors the SVG view cursor and rises
  above unselected wrappers in its layer when the X6 Selection plugin selects it.
- Normal nodes share one CSS matrix update on pan/zoom. The browser still needs
  to compute styles and paint; this is not an O(1) rendering-time guarantee.
- Nodes with `scaleContent: false` preserve the transformed box while laying out
  their content at screen size. Custom-container nodes use explicit matrices.
  These exceptions still need individual JavaScript updates on graph transforms.
- Component props update without remounting by default. Geometry changes never
  force a remount, even with `keepAliveOnUpdate: false`.
- Wrapper classes, styles, interactivity and visibility options can change at
  runtime. Removed styles and classes are cleared. Removing the component unmounts
  its content when no registered fallback component exists.
- A graph-specific Teleport host preserves the surrounding Vue provider tree.
  Create and mount the host before adding nodes. Keep it mounted for the entire
  graph lifetime; switching rendering hosts while nodes are alive is unsupported.
- Synchronization setup is idempotent. Explicit disposal cancels pending work;
  `graph.dispose()` also removes subscriptions through X6's plugin lifecycle.
  Empty owned HTML layers are removed when their last node unmounts.

## Browser verification

The browser scenarios run across Chromium, Firefox and WebKit.

| Evidence      | Covered behavior                                                                              | Test location                                                                             |
| ------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Real browsers | Native mouse dragging and `node:moved` delegation                                             | `tests/browser/graph.test.ts`                                                             |
| Real browsers | SVG label positioning, cursor changes and selection stacking                                  | `tests/browser/graph.test.ts`                                                             |
| Real browsers | SVG/HTML bounds under position, size, rotation, nonuniform scale and direct affine matrices   | `tests/browser/graph.test.ts`                                                             |
| Real browsers | Unscaled content, custom targets, synchronization restart and return to a newly created layer | `tests/browser/graph.test.ts`                                                             |
| Real browsers | Pan/zoom of 100 ordinary nodes without individual style mutations                             | `tests/browser/graph.test.ts`                                                             |
| Real browsers | Scoped provider, input focus/fill, queued-work cleanup and graph disposal                     | `tests/browser/graph.test.ts`                                                             |
| Real browsers | Dragging from right, bottom and inset ports, plus independent card controls and drag handles  | `tests/browser/migration.test.ts`                                                         |
| Real browsers | MiniMap zoom and remount with synchronized Vue cards or SVG outlines                          | `tests/browser/migration.test.ts`                                                         |
| Real browsers | SVG card serialization and PNG pixels under pan, zoom, rotation and cropping                  | `tests/browser/export.test.ts`                                                            |
| Real browsers | Playground Teleport host timing, Vue I18n locale changes, reset and disposal                  | `tests/browser/playground.test.ts`                                                        |
| Unit tests    | Dynamic props/classes/styles/interactivity, hidden state and component removal                | `tests/view.test.ts`                                                                      |
| Unit tests    | Vue state retention, remount option and listener removal                                      | `tests/view.test.ts`                                                                      |
| Unit tests    | Global components/providers, multiple graphs and duplicate node IDs                           | `tests/teleport.test.ts`                                                                  |
| Unit tests    | RAF batching/cancellation, repeated setup and stale disposer safety                           | `tests/sync.test.ts`                                                                      |
| Unit tests    | Registry collisions, interactive/`contenteditable` guards and layer management                | `tests/index.test.ts`, `tests/layer.test.ts`                                              |
| Unit tests    | Demo connections, editor data updates and playground teardown                                 | `tests/playground.test.ts`, `tests/richText.test.ts`, `tests/playgroundLifecycle.test.ts` |

The migration tests use real mouse dragging and check that the created edge
references both native ports. The Vue MiniMap test shares providers with the
main graph and checks that removing the preview unmounts its cards and cleans
up its HTML layer. See the [port and MiniMap recipes](./migration.md#keep-native-ports-reachable).

The Case Flow playground exercises Vue I18n through a graph-specific Teleport
host. Pinia, Router and UI-provider combinations require application-level
validation. Unit `touchstart` events do not establish real iOS touch or
input-method behavior.

Run `pnpm test:browser` after installing the Playwright browser binaries with
`pnpm exec playwright install chromium firefox webkit`.

The suite uses real X6 views and checks geometry against SVG bounding boxes,
matrix changes, shared style updates, Vue context, native input focus and cleanup.
Both CI and tag publication run the browser suite. Unit tests cover props,
wrapper updates, interaction guards, multi-graph Teleport isolation and disposal.

CI configures unit/build jobs on Linux, Windows and macOS with Node 22/24/26, and
browser jobs on Linux. That configured matrix is separate from local test results;
it is not a statement that remote CI has already passed for these working changes.
The tag workflow runs formatting, lint, types, units, package build and browser
tests before publication. `release:check` alone does not include browser tests or
the package build, and local `prepublishOnly` only builds.

WebKit automation does not certify every Safari release or iOS device. Before
declaring your application supported, validate its actual components on its target
Safari/iOS versions, including touch dragging, input methods and popups.

## Architectural limitations

- The [SVG and PNG export hook](./export.md) exports a caller-supplied static SVG
  card. Reproducing the live HTML appearance requires capturing the rendered
  graph.
- HTML content is above the SVG layer. Arbitrary interleaving of edges, nodes,
  tools and ports across the two layers is unavailable. Keep ports outside opaque
  HTML regions and verify connection tools in the application.
- Popups can overflow node bounds but are clipped at the graph viewport. Use
  a separate popup Teleport target when necessary.
- A custom node container must use the graph container's coordinate origin. X6
  event delegation requires the content to remain inside the graph container.
- Vue 2, arbitrary external container coordinates and switching Teleport hosts
  for live nodes are outside the supported contract.
- `throttle` and `safariSafe` remain reserved compatibility fields with no effect.
- Node sizes are explicit X6 model values. Intrinsic HTML content changes do not
  automatically resize nodes. HTML visibility and pointer options do not disable
  the corresponding SVG model or every graph-level interaction.

## Remaining evidence for a stable release

| Area                                             | Current status                     | Acceptance needed                                                      |
| ------------------------------------------------ | ---------------------------------- | ---------------------------------------------------------------------- |
| Safari/iOS devices                               | Automated WebKit coverage only     | Actual target versions, touch, IME and popup acceptance                |
| Ports, connection tools, selection and snaplines | Native port dragging covered       | Verify tooling combinations, stacking and selected-state visuals       |
| History, clipboard and embedding                 | Complete workflows unverified      | Undo/redo and serialization/recreation with registered components      |
| Scroller and virtualization                      | Unverified                         | Check coordinate offsets and viewport-driven view remount and disposal |
| MiniMap                                          | Vue and SVG previews covered       | Verify combinations with Scroller and the application's other plugins  |
| Comparative speed and memory                     | No benchmark published             | Identical workloads and recorded frame/heap measurements               |
| Export                                           | Static SVG and PNG cards verified  | Validate application card renderers, resources and export bounds       |
| Cross-layer interleaving                         | Not supported by this architecture | Accept a fixed layer policy or design another rendering strategy       |

Validate the actual combinations of selection, history/undo, ports, connection
tools, embedding, scroller, minimap and viewport virtualization used by consumers.
Record a compatibility matrix instead of assuming that keeping SVG nodes makes
every X6 plugin work automatically.

Benchmark equal components and graph data against the official Vue renderer at
representative scales (for example 100, 500 and 1,000 nodes). Record mount time,
pan/zoom frame durations, data-update latency and memory after repeated disposal.
Run on specified hardware/browser versions and publish the raw measurements.
The regression suite's 100-node style-mutation check is not a performance benchmark
and establishes no supported node-count limit.

Release a prerelease for applications accepting these limitations, then promote
after the compatibility matrix, target-device checks and performance budgets pass.
Matching the official package's maturity also requires sustained usage evidence;
passing the automated checks alone does not establish that equivalence.
