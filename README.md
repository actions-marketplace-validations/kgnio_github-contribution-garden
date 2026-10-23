# GitHub Contribution Garden 🌱

Turn your GitHub contribution graph into a living, growing garden.

An animated SVG contribution calendar for your GitHub profile README: seedlings become flowers as your activity grows, while a gardener walks through the plots and waters them. A calm, botanical alternative to contribution snake and arcade animations.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/contribution-garden-dark.svg" />
  <img alt="Animated contribution garden with flowers, a gardener, and a bee — synthetic demo data" src="assets/contribution-garden.svg" />
</picture>

*Preview uses reproducible sample data. Your generated garden uses your actual GitHub contribution calendar.*

## Features

- Garden-only artwork with no visible headings, labels, or statistics.
- One plot per day, arranged by week and weekday.
- Five activity stages: soil, seedling, leaves, flower, and full bloom.
- Gentle wind sway with permanently visible plants, a watering gardener, and a bee.
- Separate light and dark SVGs with automatic README theme switching.
- Daily updates using GitHub Actions.
- Reduced-motion support, accessible descriptions, and per-day SVG titles.
- TypeScript running directly on Node.js 24, with no npm dependencies or build step.
- No JavaScript or external images inside generated SVGs.

## Add a garden to your GitHub profile

Create `.github/workflows/garden.yml` in your profile repository (the repository named after your username) with this workflow. No fork or local installation is needed.

```yaml
name: Grow Contribution Garden

on:
  schedule:
    - cron: '17 0 * * *'
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: contribution-garden
  cancel-in-progress: false

jobs:
  grow:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Generate garden SVGs
        uses: kgnio/github-contribution-garden@main
        with:
          github_user_name: ${{ github.repository_owner }}
          github_token: ${{ secrets.GITHUB_TOKEN }}

      - name: Publish to output branch
        uses: crazy-max/ghaction-github-pages@v3.1.0
        with:
          target_branch: output
          build_dir: dist
          keep_history: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Open **Actions → Grow Contribution Garden → Run workflow** once. When it succeeds, add the following to your profile README, replacing both occurrences of `YOUR_USERNAME` in each URL:

```html
## 🌱 Contribution Garden

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_USERNAME/output/contribution-garden-dark.svg" />
  <img alt="My GitHub contribution garden" src="https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_USERNAME/output/contribution-garden.svg" />
</picture>
```

The schedule requests an update at 00:17 UTC each day; GitHub may delay scheduled runs. `@main` follows the current development version. Pin the action to a reviewed full commit SHA if you need reproducible behavior.

### Configuration

| Action input | Default | Description |
| --- | --- | --- |
| `github_user_name` | Required | GitHub username to visualize. |
| `github_token` | Workflow token | Token for reading the GitHub contribution calendar. |
| `output_dir` | `dist` | Directory containing the generated SVGs. Use the same path as the publishing step's `build_dir`. |

The generator creates `contribution-garden.svg` and `contribution-garden-dark.svg`.

### Using a fork of this repository

Fork the project, enable Actions, and run the included **Grow Contribution Garden** workflow. It defaults to the fork owner's username. To visualize someone else, set the repository Actions variable `GARDEN_USERNAME`. Embed the output using your fork's repository name in the raw URLs, rather than your profile repository name.

### Tokens and private contributions

Start with the automatic `GITHUB_TOKEN`; no additional secret is required for the default setup. Private activity visibility depends on your profile settings and token access. If counts are missing, review those settings and the API permissions before adding a suitable token as `GARDEN_TOKEN`. The included repository workflow uses it for reading when available. In the copyable workflow above, change the generator's `github_token` input to `${{ secrets.GARDEN_TOKEN }}` to use that secret. Keep the publishing step on `GITHUB_TOKEN`.

Never put a token in README image URLs or commit it to the repository.

### Sharing an output branch

Publishing tools may replace the branch contents with the files in `build_dir`. If another workflow already publishes Snake, Pac-Man, or other images to `output`, generate all images into one directory and publish them together, or use a separate branch for the garden. `keep_history` preserves commit history, not unrelated files.

## Run locally

Requires Node.js **24 or newer**. Clone this repository, then run:

```sh
npm run demo
```

Open the SVGs in `dist/` in a browser. The demo is deterministic and identified as sample data in the SVG's accessible title and description. No token or network access is used in demo mode.

For real activity, set `GITHUB_TOKEN` in your shell environment using your preferred secret manager, then run:

```sh
npm run generate -- --user YOUR_USERNAME
```

Optional output directory:

```sh
npm run generate -- --user YOUR_USERNAME --out my-garden
```

The generator fails on API errors instead of silently substituting demo data.

## How the contribution garden works

1. Fetch the user's contribution calendar from GitHub's GraphQL API.
2. Map each week to a column and each weekday to a row.
3. Use GitHub's `contributionLevel` to choose the plant's growth stage.
4. Render a standalone SVG with gentle wind sway and a decorative watering loop.
5. Publish the SVGs and embed them as images in a README.

Levels are relative activity bands reported by GitHub, not fixed commit thresholds. Contributions include more than commits. Plants stay visible at their activity level and gently sway from their roots. Sway timing and the gardener's route are decorative; they do not represent the exact times of contributions. The gardener visits a sample of active plots.

The README displays a precomputed animation, not an interactive game. Only days returned by GitHub are rendered. Empty calendars produce empty soil plots, without inventing activity.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Image returns 404 | Run the workflow successfully first; verify the repository, branch, and filename in the image URL. |
| Publishing returns 403 | Check the workflow has `contents: write` and repository or organization policies permit writes. |
| Counts differ from your profile | Check private contribution visibility and token permissions. |
| Garden does not animate | Check your reduced-motion setting; some image viewers also render SVGs statically. |
| Existing output images disappear | Combine generation and publishing, or publish the garden to a separate branch. |

## Development

```sh
npm test
npm run demo
```

| File | Purpose |
| --- | --- |
| `src/data.ts` | GitHub API request, calendar validation, and deterministic demo data. |
| `src/render.ts` | Plant artwork, themes, gardener, and SVG animations. |
| `src/cli.ts` | CLI arguments and file generation. |
| `action.yml` | Reusable GitHub Action. |
| `.github/workflows/garden.yml` | Tests, real-data generation, and output publishing for this repository or a fork. |

## Contributing

Bug reports and improvements are welcome. Include your Node.js version, a minimal reproduction, and the relevant workflow logs with secrets removed. Run the tests and generate both themes before opening a pull request. Keep code, documentation, and user-facing messages in English.

## License

[MIT](LICENSE). Created by [kgnio](https://github.com/kgnio).

## References

- [GitHub contribution calendar API](https://docs.github.com/en/graphql/reference/users#contributioncalendar)
- [What counts as a GitHub contribution](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference)
