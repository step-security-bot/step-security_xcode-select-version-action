[![StepSecurity Maintained Action](https://raw.githubusercontent.com/step-security/maintained-actions-assets/main/assets/maintained-action-banner.png)](https://docs.stepsecurity.io/actions/stepsecurity-maintained-actions)

# Xcode Select Version

Points a macOS runner at a specific Xcode installation, so every later step in
the job compiles against the version you named instead of the image default.

This is a StepSecurity maintained action: a secure drop-in replacement for
`mobiledevops/xcode-select-version-action`, with the same inputs and the same
behaviour.

## Usage

```yaml
jobs:
  build:
    runs-on: macos-15
    steps:
      - uses: actions/checkout@v7

      - uses: step-security/xcode-select-version-action@v1
        with:
          xcode-select-version: "16.4"

      - run: xcodebuild -version
```

## Inputs

| Name                   | Required | Description                                        |
| ---------------------- | -------- | -------------------------------------------------- |
| `xcode-select-version` | yes      | Version of an Xcode already installed on the image |

There are no outputs. The action changes the runner's active developer
directory, which subsequent steps pick up automatically.

## Choosing a version

Only versions already present on the runner image can be selected; this action
installs nothing. The version you pass has to match the image's own naming
exactly, because it resolves to `/Applications/Xcode_<version>.app`. That means
`16.4` and `16.4.0` are different bundles, and only one of them exists.

Quote the value in YAML. Unquoted, `16.40` and `16.4` are both parsed as the
number `16.4`, and a trailing zero you meant to keep disappears.

The available versions change as images are updated, so check the
[runner images documentation](https://github.com/actions/runner-images/tree/main/images/macos)
for the image you target rather than relying on a list here. The
`xcodebuild -version` step in the example above records what the job actually
used.

## Failure modes

The step fails if the requested version is not installed, reporting
`Xcode <version> not installed`. It also fails if `xcode-select` itself refuses
the switch, in which case its own error is passed through.

## Licence

MIT. See [LICENSE](LICENSE).
