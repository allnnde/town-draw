## 1. Workflow Structure

- [x] 1.1 Create `.github/workflows/itchio-release.yml` for the combined CI, version, release, and itch.io deployment flow.
- [x] 1.2 Configure triggers for `workflow_dispatch` and `pull_request` `closed` events targeting `main` or `master`.
- [x] 1.3 Add workflow-level concurrency and `contents: write` permission for version commits, tags, and GitHub releases.
- [x] 1.4 Gate release/deploy jobs so closed-but-unmerged pull requests do not publish anything.

## 2. Validation Job

- [x] 2.1 Add a validation job on `ubuntu-latest` that checks out the repository.
- [x] 2.2 Set up Node.js 22 with npm cache support.
- [x] 2.3 Install dependencies with `npm ci`.
- [x] 2.4 Run the project test command in CI.
- [x] 2.5 Run the Angular production build and fail the workflow if validation fails.

## 3. Version and GitHub Release Jobs

- [x] 3.1 Add a versioning job that depends on successful validation.
- [x] 3.2 Configure conventional changelog versioning against `package.json` with the GitHub token and `skip-on-empty: false`.
- [x] 3.3 Expose the generated tag, skipped flag, and clean changelog as job outputs.
- [x] 3.4 Add a GitHub release job that creates a release from the generated tag and changelog when versioning is not skipped.

## 4. itch.io Deployment Job

- [x] 4.1 Add a deploy job that depends on successful versioning and uses the generated tag as the deployment version.
- [x] 4.2 Check out the repository and set up Node.js 22 with npm cache support.
- [x] 4.3 Install dependencies with `npm ci`.
- [x] 4.4 Build the Angular app with `npm run build -- --base-href ./`.
- [x] 4.5 Set up Butler with `remarkablegames/setup-butler`.
- [x] 4.6 Push `dist/town-draw/browser` to `${{ secrets.ITCH_USERNAME }}/${{ secrets.ITCH_PROJECT }}:html5` using `BUTLER_API_KEY` and `--userversion` set to the generated tag.

## 5. Verification

- [x] 5.1 Run `openspec status --change add-itchio-auto-deploy` and confirm the change remains apply-ready.
- [x] 5.2 Run `npm run build` locally to confirm the Angular app still builds.
- [x] 5.3 Review the workflow YAML for secret usage and confirm no credential values are hard-coded.
- [x] 5.4 Document required repository secrets in the implementation summary for the maintainer to configure in GitHub.
