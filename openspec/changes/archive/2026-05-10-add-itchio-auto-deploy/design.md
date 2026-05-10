## Context

TownDraw is a single Angular 21 application using npm (`packageManager: npm@11.11.0`). There is no current `.github/workflows/` automation in the repository. The production build is produced by `npm run build`, and Angular's application builder emits the deployable browser bundle at `dist/town-draw/browser`.

The requested release flow combines two patterns from the examples: build/version/release after a pull request is completed, and deploy the static Angular app to itch.io with Butler. Because itch.io serves HTML5 projects from a nested path, the deploy build must use `--base-href ./`.

## Goals / Non-Goals

**Goals:**

- Run CI automatically when a pull request is merged into `main` or `master`, with an optional manual trigger for recovery or initial release.
- Validate the app with npm dependency installation, tests, and Angular production build before versioning or deployment.
- Generate the next semantic version and changelog from conventional commits, update `package.json`, and create a GitHub release.
- Deploy the Angular browser output to itch.io via Butler using repository secrets.
- Use the generated release tag as the itch.io `--userversion` so the itch build is traceable.

**Non-Goals:**

- Introducing another package manager or changing existing npm scripts.
- Deploying from every push, unmerged pull request, or non-release branch.
- Configuring itch.io project metadata outside Butler publishing.
- Changing Angular source code or runtime behavior.

## Decisions

### Single release-and-deploy workflow

Use one GitHub Actions workflow for validation, versioning, GitHub release creation, and itch.io deployment.

- **Rationale:** The deployment must use the version generated for the completed PR. Keeping these jobs in one workflow lets the deploy job consume the versioning output directly.
- **Alternative considered:** Separate CI/release and itch deploy workflows connected by a push/tag trigger. This is more decoupled but makes it easier for itch.io deployment to drift from the generated version.

### Trigger on merged PRs into release branches plus manual dispatch

Configure `pull_request` with `types: [closed]` and `branches: [main, master]`, then gate jobs with `github.event.pull_request.merged == true`. Also support `workflow_dispatch`.

- **Rationale:** This matches the requirement to deploy when a PR is completed, while preventing deployments for closed-but-unmerged PRs. The itch.io example targets `main`, while this local repository currently uses `master`, so both common release branch names are supported.
- **Alternative considered:** Trigger on push to `main`. This is simpler, but it does not explicitly model the completed-PR event and can deploy direct pushes unintentionally.

### Node 22 with npm cache and `npm ci`

Use `actions/setup-node@v4` with Node 22 and npm caching, then install dependencies with `npm ci`.

- **Rationale:** The repo commits `package-lock.json`, so `npm ci` gives deterministic CI installs. Node 22 is appropriate for the current Angular toolchain and matches the itch deploy example.
- **Alternative considered:** Use `npm install`, as in the first example. `npm install` is less deterministic in CI and can update the lockfile unexpectedly.

### Conventional changelog creates the version source of truth

Use `TriPSs/conventional-changelog-action` against `package.json`, with `skip-on-empty: false`, and pass the resulting tag/changelog to `ncipollo/release-action`.

- **Rationale:** This produces the generated version requested for each completed PR and keeps `package.json`, changelog output, tags, and GitHub releases aligned.
- **Alternative considered:** Use the Git SHA as the itch.io version. That is traceable but does not satisfy the generated semantic version requirement.

### Butler deploy uses the generated tag

Build for itch.io with `npm run build -- --base-href ./`, set up Butler via `remarkablegames/setup-butler@v3`, and run `butler push dist/town-draw/browser ${{ secrets.ITCH_USERNAME }}/${{ secrets.ITCH_PROJECT }}:html5 --userversion <generated-tag>`.

- **Rationale:** `dist/town-draw/browser` is the Angular browser output path for this app, and `--base-href ./` avoids broken asset URLs on itch.io. The `html5` channel matches itch.io's static web game/app hosting convention.
- **Alternative considered:** Deploy the default production build without base-href override. That risks absolute asset paths that fail under itch.io hosting.

## Risks / Trade-offs

- **Conventional commits are missing or inconsistent** → `skip-on-empty: false` still permits a release, but the changelog may be low-value. Mitigate by documenting commit message expectations for contributors.
- **The initial Angular bundle exceeds production budgets** → CI fails before release/deploy. Mitigate by treating the failure as a release blocker and optimizing before merging.
- **Required itch.io secrets are absent** → Deploy fails after versioning/release. Mitigate by adding `BUTLER_API_KEY`, `ITCH_USERNAME`, and `ITCH_PROJECT` before enabling the workflow.
- **Versioning action commits back to `main` and retriggers workflows** → Triggering on merged PRs rather than pushes reduces accidental release loops.
- **Default branch is not `main` or `master`** → The workflow will not run automatically until the branch filter is adjusted. Mitigate by changing the branch list during implementation if the repository uses a different release branch.

## Migration Plan

1. Add the GitHub Actions workflow under `.github/workflows/`.
2. Configure repository secrets for Butler and itch.io project routing.
3. Merge a PR into `main` or `master`, or run the workflow manually, to verify CI, versioning, release creation, and itch.io deployment.
4. If deployment fails, keep the generated GitHub release for traceability and rerun with `workflow_dispatch` after fixing secrets or build issues.

## Open Questions

- Confirm whether GitHub uses another default release branch beyond `main` or `master`. If so, add it to the branch filter before merging.
