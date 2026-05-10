## ADDED Requirements

### Requirement: Release workflow runs only for completed release events

The repository SHALL provide a GitHub Actions workflow that starts for closed pull requests targeting the release branch and for manual dispatch, and automated release/deploy jobs MUST proceed only when the pull request was merged or the workflow was manually dispatched.

#### Scenario: Merged pull request targets release branch

- **WHEN** a pull request into `main` or `master` is closed as merged
- **THEN** the workflow runs validation, versioning, release, and itch.io deployment jobs

#### Scenario: Pull request is closed without merge

- **WHEN** a pull request into `main` or `master` is closed without being merged
- **THEN** the workflow does not create a version, GitHub release, or itch.io deployment

#### Scenario: Workflow is run manually

- **WHEN** a maintainer starts the workflow with `workflow_dispatch`
- **THEN** the workflow can run the same validation, versioning, release, and itch.io deployment path

### Requirement: CI validates the Angular application before release

The workflow SHALL install dependencies with npm and validate the Angular application before versioning or deployment.

#### Scenario: Validation succeeds

- **WHEN** the workflow runs for a release event
- **THEN** it installs dependencies with `npm ci`, runs the test command, and runs the Angular production build before any version or deploy job can succeed

#### Scenario: Validation fails

- **WHEN** dependency installation, tests, or production build fails
- **THEN** version generation, GitHub release creation, and itch.io deployment are skipped or marked failed by job dependencies

### Requirement: Completed PRs produce a versioned GitHub release

The workflow SHALL generate the next package version from conventional changelog semantics, update the version source in `package.json`, and create a GitHub release for the generated tag.

#### Scenario: Version is generated after validation

- **WHEN** validation succeeds for a merged pull request or manual release run
- **THEN** the workflow generates a release tag from the package versioning process and exposes that tag to downstream jobs

#### Scenario: GitHub release is created

- **WHEN** a generated version tag is available
- **THEN** the workflow creates a GitHub release named with that tag and populated with the generated changelog body

### Requirement: Angular build is deployable on itch.io

The workflow SHALL build the Angular app for itch.io with relative asset paths and publish the browser output directory through Butler.

#### Scenario: Deploy build uses relative base href

- **WHEN** the deploy job builds the Angular app for itch.io
- **THEN** it runs the build with `--base-href ./` so generated asset URLs work under itch.io hosting

#### Scenario: Butler publishes browser output

- **WHEN** the deploy job runs after a generated version tag is available
- **THEN** it pushes `dist/town-draw/browser` to the itch.io `html5` channel using Butler

#### Scenario: itch.io user version matches release tag

- **WHEN** Butler publishes the build to itch.io
- **THEN** the published itch.io user version matches the generated GitHub release tag

### Requirement: Deployment uses repository secrets

The workflow SHALL read itch.io credentials and project routing from GitHub repository secrets and MUST NOT hard-code secret values in the workflow.

#### Scenario: Required secrets are configured

- **WHEN** `BUTLER_API_KEY`, `ITCH_USERNAME`, and `ITCH_PROJECT` are available as repository secrets
- **THEN** the deploy job authenticates Butler and publishes to `${ITCH_USERNAME}/${ITCH_PROJECT}:html5`

#### Scenario: Required secrets are missing

- **WHEN** one or more required itch.io secrets are not configured
- **THEN** the deploy job fails without exposing credential values in logs or repository files
