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

## Before submitting (Neptun, 1 December)

The faculty requires a signed *Declaration on the use of AI tools* (Dean's Instruction No. I/2026 (III. 26.)):

1. In `thesis.tex`, set `\neptuncode` and `\declarationdate`, then build again.
2. Read `chapters/aideclaration.tex` and make sure every row is true; change it if not.
3. Sign the declaration page. Either print it, sign it and scan it, or put a picture of the signature at
   `images/signature.png`; the page then shows it instead of the empty line (keep that picture out of git).
4. The same declaration as the faculty's Word form is `AI-declaration-filled.docx`: add the Neptun code, the date and
   the signature, and put it in the submitted .zip file as well.
5. Section 4.14 of the thesis (*Use of AI tools in this work*) is the summary the policy asks for in the developer
   documentation.
