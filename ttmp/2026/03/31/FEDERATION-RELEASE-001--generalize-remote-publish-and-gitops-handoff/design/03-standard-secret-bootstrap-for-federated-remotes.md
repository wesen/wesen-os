# Standard Secret Bootstrap For Federated Remotes

This page captures the standard bootstrap inputs a source repo needs before it can use the generalized federated remote release pattern.

It exists because the release mechanics themselves can be generic, but the first-run operator setup still needs an explicit checklist.

## Required Inputs

Every source repo that publishes a federated remote will need:

### GitHub Secrets

- `HETZNER_OBJECT_STORAGE_ACCESS_KEY_ID`
- `HETZNER_OBJECT_STORAGE_SECRET_ACCESS_KEY`
- `HETZNER_OBJECT_STORAGE_BUCKET`
- `HETZNER_OBJECT_STORAGE_ENDPOINT`
- `HETZNER_OBJECT_STORAGE_REGION`
- `GITOPS_PR_TOKEN`

### GitHub Variables

- remote public base URL
  - for example `INVENTORY_FEDERATION_PUBLIC_BASE_URL`
- platform package version, if the repo consumes published `@go-go-golems/os-*`
  - for example `GO_GO_OS_PLATFORM_VERSION`

## Standard Bootstrap Commands

For a source repo, the standard secret bootstrap should look like:

```bash
gh secret set HETZNER_OBJECT_STORAGE_ACCESS_KEY_ID --repo <owner>/<repo>
gh secret set HETZNER_OBJECT_STORAGE_SECRET_ACCESS_KEY --repo <owner>/<repo>
gh secret set HETZNER_OBJECT_STORAGE_BUCKET --repo <owner>/<repo>
gh secret set HETZNER_OBJECT_STORAGE_ENDPOINT --repo <owner>/<repo>
gh secret set HETZNER_OBJECT_STORAGE_REGION --repo <owner>/<repo>
gh secret set GITOPS_PR_TOKEN --repo <owner>/<repo>

gh variable set <REMOTE_PUBLIC_BASE_URL_VAR> --repo <owner>/<repo> --body "https://<bucket>.<region>.your-objectstorage.com"
gh variable set GO_GO_OS_PLATFORM_VERSION --repo <owner>/<repo> --body "<platform-version>"
```

## Inventory Example

The current inventory-shaped example is:

```bash
gh secret set HETZNER_OBJECT_STORAGE_ACCESS_KEY_ID --repo go-go-golems/go-go-app-inventory
gh secret set HETZNER_OBJECT_STORAGE_SECRET_ACCESS_KEY --repo go-go-golems/go-go-app-inventory
gh secret set HETZNER_OBJECT_STORAGE_BUCKET --repo go-go-golems/go-go-app-inventory
gh secret set HETZNER_OBJECT_STORAGE_ENDPOINT --repo go-go-golems/go-go-app-inventory
gh secret set HETZNER_OBJECT_STORAGE_REGION --repo go-go-golems/go-go-app-inventory
gh secret set GITOPS_PR_TOKEN --repo go-go-golems/go-go-app-inventory

gh variable set INVENTORY_FEDERATION_PUBLIC_BASE_URL --repo go-go-golems/go-go-app-inventory --body "https://scapegoat-federation-assets.fsn1.your-objectstorage.com"
gh variable set GO_GO_OS_PLATFORM_VERSION --repo go-go-golems/go-go-app-inventory --body "0.1.0-canary.5"
```

## What Should Become Generic

The pattern should avoid baking app names into the release mechanics. The only app-specific part that should remain is the variable naming and target metadata.

That means future source repos should differ mainly in:

- repo name
- remote-id-specific public base URL variable name
- target config entry

not in the overall bootstrap process.

## Recommendation

Long term, standardize one naming convention for the public base URL variable too, for example:

- `FEDERATION_REMOTE_PUBLIC_BASE_URL`

or:

- `FEDERATION_PUBLIC_BASE_URL_<REMOTE_ID>`

That would reduce one more piece of inventory-specific wiring.
