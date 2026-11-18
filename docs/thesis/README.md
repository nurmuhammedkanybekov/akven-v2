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

## The AI declaration

The faculty requires a signed *Declaration on the use of AI tools* (Dean's Instruction No. I/2026 (III. 26.)) and a
summary of AI use in the developer documentation. Both are written: `chapters/aideclaration.tex` and
`chapters/aiuse.tex`.

- **The draft for the supervisor (22 November) leaves them out:** `\aideclarationfalse` in `thesis.tex`. They go to him
  separately for his check, as `ai-declaration.pdf` (build it after the thesis: `latexmk -pdf ai-declaration.tex`).
- **Once he has approved them:** set `\aideclarationtrue` in `thesis.tex` and build again. The declaration then follows
  the topic registration, the summary becomes Section 4.14, and the introduction and acknowledgements refer to them.

Before the Neptun upload (1 December):

1. In `thesis.tex`, set `\neptuncode` and `\declarationdate` (the same two lines are at the top of
   `ai-declaration.tex`).
2. Read `chapters/aideclaration.tex` once more and make sure every row is true.
3. Sign the declaration page: print, sign and scan it, or put a picture of the signature at `images/signature.png`
   (kept out of git); the page then shows it instead of the empty line.
4. The same declaration as the faculty's Word form is `AI-declaration-filled.docx`: add the Neptun code, the date and
   the signature, and put it in the submitted .zip file as well.
