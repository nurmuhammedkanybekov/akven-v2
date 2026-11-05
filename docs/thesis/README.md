# The thesis

`thesis.pdf` is the compiled thesis; `thesis.tex` and `chapters/` are its source.

## Build

```bash
cd docs/thesis
latexmk -pdf thesis.tex      # pdflatex + biber
```

Needs a TeX Live with `latex-extra`, `science`, `pictures`, `lang-european` (Hungarian, which the class loads),
`fonts-recommended`, `cm-super` and `biber`.

## Layout

The document uses the official ELTE Faculty of Informatics class, `elteikthesis.cls` (version 2.4,
[mcserep/elteikthesis](https://github.com/mcserep/elteikthesis), MIT licence, unchanged). The title page shows the
ELTE seal (`images/elte_cimer_szines.pdf`, converted from the template's `.eps`), and the registered topic
(`topicdeclaration.pdf`, submitted on 10 October 2026) follows it, as the faculty asks.

## Notes

- The title is exactly the registered one: *Design and Implementation of AkVen Integrated E-Commerce and Inventory
  Management System*.
- Screenshots in `images/` are taken from the demo with `reducedMotion`, at 1280 × 800.
- The code excerpts in `listings/` are copied from the backend (non-ASCII characters replaced so pdflatex can read
  them); if that code changes, copy them again.
