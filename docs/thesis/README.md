# The thesis

`thesis.pdf` is the compiled thesis; `thesis.tex` and `chapters/` are its source.

## Build

```bash
cd docs/thesis
latexmk -pdf thesis.tex      # pdflatex + biber
```

Needs a TeX Live with `latex-extra`, `fonts-recommended`, `lmodern` and `biber`.

## Layout

`akventhesis.cls` reproduces the page layout of the official ELTE Faculty of Informatics template
([elteikthesis](https://github.com/mcserep/elteikthesis), MIT licence) and accepts the same commands. To build with
the official class instead, put `elteikthesis.cls` and the ELTE seal (`images/elte_cimer_szines.pdf`, or the `.eps`
from the template) next to `thesis.tex` and change the first line to `\documentclass{elteikthesis}`. With
`akventhesis.cls` the seal is shown on the title page as soon as `images/elte_cimer_szines.pdf` exists.

## Before submission

- Attach the signed **topic registration form** (`\includepdf` line after `\maketitle` in `thesis.tex`).
- Add the **ELTE seal** for the title page (see above).
- Check the **department** on the title page (`\department{...}` in `thesis.tex`).
- Screenshots in `images/` were taken from the demo with `reducedMotion`, at 1280 × 800.
- The code excerpts in `listings/` are copied from the backend (non-ASCII characters replaced so pdflatex can read
  them); if that code changes, copy them again.
