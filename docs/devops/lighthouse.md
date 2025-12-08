# Lighthouse CI Workflow

This workflow keeps an eye on LCP/CLS regressions for the marketing site.

## CLI

Run audits locally after building the web app:

```powershell
pnpm lighthouse
```

Under the hood `lhci autorun` will:

1. Build the public Next.js app (`pnpm --filter @virgo/web build`).
2. Boot it via `next start` on `http://localhost:3000`.
3. Hit the most important URLs twice:
   - `/ru`
   - `/en/courses`
   - `/ru/courses/intro-design`
4. Store JSON/HTML reports in `.lighthouse/`.

## Assertions

- `largest-contentful-paint` must stay `< 2500ms` (warn if slower).
- `cumulative-layout-shift` must stay `< 0.15`.
- Performance category should stay above `0.7`.

You can tweak thresholds in `lighthouserc.json` if marketing assets change.

## CI integration

Add a new job to GitHub Actions (pseudo):

```yaml
- name: Run Lighthouse
  run: pnpm lighthouse
  env:
    LHCI_BUILD_CONTEXT__CURRENT_BRANCH: ${{ github.ref_name }}
```

Uploading is currently set to `filesystem`, so the job archives `.lighthouse` as an artifact for designers to review.

## Next steps

- Wire reports into Slack using `@lhci/cli upload --target=temporary-public-storage` on main to share links automatically.
- Expand URL list once dashboard/frontier pages stabilize.
- Promote `warn` → `error` once we consistently meet targets.
