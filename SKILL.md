# Cora Skill

## Triggers

Use Cora when the task mentions architecture diagram, system diagram, infra diagram, flowchart, render YAML diagram, SVG artifact, PDF artifact, PNG artifact, text diagram, or validating diagram YAML for an agent workflow.

## Use Cora When

- You need to author or review a diagram as YAML with `version: 1`.
- You need a rendered `.svg`, `.png`, `.pdf`, or `.txt` artifact from that YAML.
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

Use `cora schema` before adding fields. Do not invent fields outside the schema.

## Built-in icons

For `component: icon` or `component: labelIcon`, use `provider: default` with
`service` set to one of: `server`, `database`, `cloud`, `network`, `user`,
`bug`, `warning`, `error`, `stop`. No extension install is required.

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

## Common Fixes

- `SCHEMA_VIOLATION`: run `cora schema`, then fix the rejected field or missing `version: 1`.
- `MISSING_EDGE_TARGET`: add the missing node id or correct the edge `from` / `to`.
- `UNKNOWN_SERVICE`: set `provider` with `service`, or remove the service field.
- `MISSING_EXTENSION`: install the required provider extension when extensions exist, use `provider: default` for built-in icons, or remove `provider`.
- Built-in icons: `provider: default` + `service: database` (etc.) — see **Built-in icons** above.
- `LAYOUT_ERROR`: for `layout: preserve`, add `position` to every node or switch to `layout: auto`.
- `CHROMIUM_NOT_INSTALLED`: pass `--yes`, set `CORA_AUTO_INSTALL=1`, or use the default PDF lane.

## Review Checklist

- Validate with `--format json`; repair every `code` and `path`.
- Render at least one artifact required by the task.
- For text output, confirm labels and directional relationships are readable.
- For new fields, confirm the schema accepts them.
- Keep source YAML as the single diagram definition.

## Further Reading

- `README.md`: install, commands, examples, and output formats.
- `AGENTS.md`: full agent contract, JSON error shape, CI behavior, and renderer component surface.
