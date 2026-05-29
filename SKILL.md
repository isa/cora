# Cora Skill

## Triggers

Use Cora when the task mentions architecture diagram, system diagram, infra diagram, flowchart, render YAML/JSON diagram, SVG artifact, PDF artifact, PNG artifact, text diagram, or validating diagram YAML/JSON for an agent workflow.

## Use Cora When

- You need to author or review a diagram as YAML or JSON with `version: 1`.
- You need a rendered `.svg`, `.png`, `.pdf`, or `.txt` artifact from that YAML/JSON.
- You need machine-readable validation failures for CI, agent repair loops, or pull request checks.

## Quick Workflow

```bash
cora validate diagram.yaml --format json
cora render diagram.yaml -o diagram.svg
cora render diagram.yaml -o diagram.png
cora render diagram.yaml -o diagram.pdf
cora render diagram.yaml -o diagram.txt
cora render diagram.yaml
cora render diagram.yaml --charset ascii
```

Use `cora schema` before adding fields. Do not invent fields outside the schema. If validation fails, repair by the JSON array's `path` and `code`, then validate again before rendering.

## Agent Loop

1. Author one YAML/JSON file with `version: 1` and one `diagram`.
2. Run `cora validate file.yaml --format json`.
3. If stdout is `[]`, render the requested artifact.
4. If stdout contains errors, fix each `path`; use `suggestion` when present.
5. Re-run validation until it passes.

Do not use deferred commands (`cora serve`, `cora ext`, `cora doctor`). `cora preview` is development-only (excluded from production installs); use it only when running from the source repository to inspect built-in renderer components. It does not render or mutate diagram YAML.

## Canonical Example

```yaml
version: 1

diagram:
  kind: box-arrows
  nodes:
    - id: api
      label: API
    - id: db
      label: Database
  edges:
    - from: api
      to: db
```

## Outputs

- `.svg`: vector diagram for docs and review.
- `.png`: raster diagram for slides and issue attachments.
- `.pdf`: shareable PDF; default path uses bundled browser-free rendering.
- `.txt`: simplified graph-like terminal output.
- No `-o`: prints the text diagram to stdout.
- `--charset ascii`: forces plain ASCII text output instead of Unicode box drawing.
- `--page a4|letter|a4-portrait|letter-portrait`: fits PDF output to a fixed page.
- `--quality high`: uses Playwright/Chromium for PDF rendering after explicit install consent.

## Common Fixes

- `SCHEMA_VIOLATION`: run `cora schema`, then fix the rejected field or missing `version: 1`.
- `MISSING_EDGE_TARGET`: add the missing node id or correct the edge `from` / `to`.
- `UNKNOWN_SERVICE`: use `icon: prefix:name`, set `provider` with `service`, or remove the unknown service/icon field.
- `MISSING_EXTENSION`: install the required provider extension when extensions exist, or avoid provider-specific services.
- `LAYOUT_ERROR`: for `layout: preserve`, add `position` to every node or switch to `layout: auto`.
- `CHROMIUM_NOT_INSTALLED`: pass `--yes`, set `CORA_AUTO_INSTALL=1`, or use the default PDF lane.
- `RESVG_FONT_WARNING`: use the bundled Noto Sans defaults or remove custom non-bundled font families.

## Schema Reminders

- Node ids start with a letter and may contain letters, numbers, `_`, and `-`.
- Components are `box`, `label`, `icon`, `labelIcon`, `website`, `document`, and `app`; omit `component` for `box`.
- Offline icons currently include `material-symbols:*`, `basil:*`, and built-in default icons under `provider: default` (services: `server`, `database`, `cloud`, `network`, `user`) and status icons (`bug`, `warning`, `error`, `stop`). Simple aliases like `server` directly map to `provider: default`.
- Edge markers are `none`, `arrow`, `circle`, `filledCircle`, `diamond`, `filledDiamond`, `square`, and `filledSquare`.
- `layout: preserve` requires `position` on every node.
- `microservice` groups require `contains`.

## Review Checklist

- Validate with `--format json`; repair every `code` and `path`.
- Render at least one artifact required by the task.
- For text output, confirm labels and directional relationships are readable.
- For new fields, confirm the schema accepts them.
- Keep source YAML as the single diagram definition.

## Further Reading

- `README.md`: install, commands, examples, and output formats.
- `AGENTS.md`: full agent contract, JSON error shape, CI behavior, and renderer component surface.
