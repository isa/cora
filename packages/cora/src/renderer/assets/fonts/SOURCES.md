# Noto Sans — Vendored Font Provenance

## Files

| File                    | Purpose                          | Size  | SHA-256                                                            |
| ----------------------- | -------------------------------- | ----- | ------------------------------------------------------------------ |
| `NotoSans-Regular.woff` | resvg-js text rasterization      | ~17KB | (pre-existing, vendored in Phase 2)                                |
| `NotoSans-SemiBold.woff`| resvg-js text rasterization      | ~17KB | (pre-existing, vendored in Phase 2)                                |
| `NotoSans-Regular.ttf`  | pdf-lib selectable-text embedding| ~622KB| `478c558ea716033cd60c03438f628dfa75694dcf6b5f6d505a2f05fd2b4f3823` |
| `NotoSans-SemiBold.ttf` | pdf-lib selectable-text embedding| ~625KB| `a4e91fd530ac2b4ef5367240144ff37d7d65d66cf76f2e9a2187b93c676f92d0` |

## Upstream

- **Repository:** [notofonts/notofonts.github.io](https://github.com/notofonts/notofonts.github.io)
- **Pinned commit:** `c0f00677ac9a4d2d019ab283d1848af3acaacc8f`
- **Paths within upstream:**
  - `fonts/NotoSans/hinted/ttf/NotoSans-Regular.ttf`
  - `fonts/NotoSans/hinted/ttf/NotoSans-SemiBold.ttf`
- **Date vendored:** 2026-05-22

To verify integrity:

```bash
curl -sSL "https://github.com/notofonts/notofonts.github.io/raw/c0f00677ac9a4d2d019ab283d1848af3acaacc8f/fonts/NotoSans/hinted/ttf/NotoSans-Regular.ttf" \
  | shasum -a 256
# 478c558ea716033cd60c03438f628dfa75694dcf6b5f6d505a2f05fd2b4f3823

curl -sSL "https://github.com/notofonts/notofonts.github.io/raw/c0f00677ac9a4d2d019ab283d1848af3acaacc8f/fonts/NotoSans/hinted/ttf/NotoSans-SemiBold.ttf" \
  | shasum -a 256
# a4e91fd530ac2b4ef5367240144ff37d7d65d66cf76f2e9a2187b93c676f92d0
```

## License

Noto fonts are licensed under the **SIL Open Font License (OFL) 1.1**. The license permits
free use, embedding, and redistribution including in commercial products and bundled
applications. The OFL text is published with each upstream Noto release. See:

- License text (canonical): [scripts.sil.org/OFL](https://scripts.sil.org/OFL)
- Upstream license file: [notofonts/notofonts.github.io OFL.txt](https://github.com/notofonts/notofonts.github.io/blob/main/OFL.txt)

This project vendors the fonts unmodified; we do not relicense, rename, or alter the
binary files. Per OFL §1, Noto Sans remains under OFL 1.1 inside this repository.

## Why TTF (and not just WOFF)?

The WOFF siblings stay because `@resvg/resvg-js` accepts WOFF buffers via `fontBuffers`.
TTF is added because `pdf-lib` + `@pdf-lib/fontkit` (used by Plan 02's `renderToPDF`) is
most reliably tested with TTF; WOFF embedding via fontkit works but adds a "did the WOFF
inflater regress in this fontkit version?" risk class to the PDF text path. See
`.planning/phases/03-pdf-export/03-RESEARCH.md` "Standard Stack" and "Open Questions §1".
