# Production readiness

This extension targets Vue 3 and X6 3 applications that need ordinary HTML node
content without SVG `foreignObject`. Production suitability depends on the graph
features and browsers your application uses; it is not a drop-in replacement for
every official Vue shape feature.

## Current baseline

Reviewed on **2026-09-14** against the local `0.0.0` development version. Peer
ranges are Vue `^3.3.0` and X6 `^3.0.0`; local validation uses Vue 3.5.42 and
X6 3.1.8. This is a controlled-evaluation baseline, not a declaration of stable
API compatibility or feature parity with `@antv/x6-vue-shape@3.0.2`.

The registry did not expose a `latest` release for `x6-vue-html-shape` on the review
date. Follow [Getting Started](./getting-started.md) for local evaluation. The
[detailed comparison](./comparison.md) distinguishes implementation differences
from missing verification.

## Implemented behavior

- The complete graph matrix is inherited through the HTML layer, including
  nonuniform scale, translation, rotation and skew. A viewport attribute observer
  handles direct `graph.matrix(...)` and `graph.rotate(...)` calls after its
  mutation callback runs; those operations do not emit scale/translate events.
- Node rotation uses the node center, matching X6 SVG geometry.
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

The checked baseline has **45 tests in eight unit-test files** and **six browser
scenarios run across Chromium, Firefox and WebKit (18 executions)**. The browser
count represents the same six scenarios in three engines, not 18 distinct flows.

| Evidence      | Covered behavior                                                                              | Test location                                                                             |
| ------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Real browsers | Native mouse dragging and `node:moved` delegation                                             | `tests/browser/graph.test.ts`                                                             |
| Real browsers | SVG/HTML bounds under position, size, rotation, nonuniform scale and direct affine matrices   | `tests/browser/graph.test.ts`                                                             |
| Real browsers | Unscaled content, custom targets, synchronization restart and return to a newly created layer | `tests/browser/graph.test.ts`                                                             |
| Real browsers | Pan/zoom of 100 ordinary nodes without individual style mutations                             | `tests/browser/graph.test.ts`                                                             |
| Real browsers | Scoped provider, input focus/fill, queued-work cleanup and graph disposal                     | `tests/browser/graph.test.ts`                                                             |
| Unit tests    | Dynamic props/classes/styles/interactivity, hidden state and component removal                | `tests/view.test.ts`                                                                      |
| Unit tests    | Vue state retention, remount option and listener removal                                      | `tests/view.test.ts`                                                                      |
| Unit tests    | Global components/providers, multiple graphs and duplicate node IDs                           | `tests/teleport.test.ts`                                                                  |
| Unit tests    | RAF batching/cancellation, repeated setup and stale disposer safety                           | `tests/sync.test.ts`                                                                      |
| Unit tests    | Registry collisions, interactive/`contenteditable` guards and layer management                | `tests/index.test.ts`, `tests/layer.test.ts`                                              |
| Unit tests    | Demo connections, editor data updates and playground teardown                                 | `tests/playground.test.ts`, `tests/richText.test.ts`, `tests/playgroundLifecycle.test.ts` |

Programmatic edge creation in demo tests does not establish pointer-driven port
connection support. Unit `touchstart` events do not establish real iOS touch or
input-method behavior. Inherited plugin context is implemented, but Pinia, Router,
i18n and UI-provider combinations are not individually certified by this suite.

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

- SVG export and X6 SVG-based image export do not include the separate HTML
  content. A future export adapter must compose the layers and define handling of
  fonts, images, external resources and asynchronous components.
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

| Area                                             | Current status                     | Acceptance needed                                                       |
| ------------------------------------------------ | ---------------------------------- | ----------------------------------------------------------------------- |
| Safari/iOS devices                               | Automated WebKit coverage only     | Actual target versions, touch, IME and popup acceptance                 |
| Ports, connection tools, selection and snaplines | Combination coverage missing       | Verify hit targets, stacking, dragging and selected-state visuals       |
| History, clipboard and embedding                 | Complete workflows unverified      | Undo/redo and serialization/recreation with registered components       |
| Scroller, minimap and virtualization             | Unverified                         | Coordinate offsets, secondary graph rendering and view remount/disposal |
| Comparative speed and memory                     | No benchmark published             | Identical workloads and recorded frame/heap measurements                |
| Export                                           | HTML composition adapter absent    | Implement an adapter or explicitly exclude the requirement              |
| Cross-layer interleaving                         | Not supported by this architecture | Accept a fixed layer policy or design another rendering strategy        |

These are remaining acceptance criteria, not supported features hidden behind an
option. In particular, stronger test coverage cannot by itself supply export or
arbitrary layer interleaving.

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
