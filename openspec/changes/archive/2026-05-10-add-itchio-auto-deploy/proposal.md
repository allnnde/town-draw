## Why

TownDraw needs a repeatable release path so every merged PR can produce a versioned build and the latest playable Angular app can be delivered to itch.io without manual packaging. Automating this now reduces release mistakes and adapts the provided GitHub Actions examples to this repository's Angular 21/npm setup.

## What Changes

- Add GitHub Actions automation that runs after a pull request is merged into the release branch and can also be triggered manually.
- Build and test the Angular app with npm before any release or deploy work proceeds.
- Generate the next package version and GitHub release using conventional changelog semantics when release commits are available.
- Build the Angular app for itch.io with a relative base href so the static app works under itch.io hosting paths.
- Deploy the Angular browser output to itch.io via Butler using repository secrets for the itch.io account, project, and API key.
- Keep release/versioning output aligned with the deployed itch.io user version so deployments can be traced back to the generated version.

## Capabilities

### New Capabilities

- `ci-itchio-deployment`: Defines automated PR-merge validation, version generation, GitHub release creation, and itch.io deployment for the Angular app.

### Modified Capabilities

## Impact

- Adds one or more workflow files under `.github/workflows/`.
- Requires GitHub repository secrets: `BUTLER_API_KEY`, `ITCH_USERNAME`, and `ITCH_PROJECT`.
- Uses existing npm scripts: `npm ci`, `npm test`, and `npm run build`.
- Uses Angular production output from `dist/town-draw/browser` and builds with `--base-href ./` for itch.io.
- Uses GitHub Actions permissions for release/tag creation and Butler for itch.io publishing.
