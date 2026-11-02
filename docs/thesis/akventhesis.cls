% akventhesis.cls -- the page layout of the ELTE Faculty of Informatics thesis template (elteikthesis, MIT licence,
% Máté Cserép and Bálint Bognár), written again in a small class of its own so this thesis can be built here.
% It accepts the same commands as elteikthesis (\supervisor, \affiliation, \degree, \department, \university,
% \faculty, \city, \logo, \documentlang, \acklabel, \biblabel ...), so thesis.tex can be compiled with the
% official class by changing one word: \documentclass{elteikthesis}.
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{akventhesis}[2026/11/02 ELTE IK thesis layout for AK&VEN]

\LoadClass[a4paper, 12pt, oneside]{report}

\RequirePackage[utf8]{inputenc}
\RequirePackage[T1]{fontenc}
\RequirePackage{lmodern}
\RequirePackage[english]{babel}
\RequirePackage{indentfirst}
\RequirePackage{microtype}
\setlength{\emergencystretch}{3em}
\RequirePackage{xparse}

% ---- metadata, as in elteikthesis ----
\DeclareDocumentCommand{\author}{m}{\newcommand{\authorname}{#1}\renewcommand{\@author}{#1}}
\NewDocumentCommand{\degree}{m}{\newcommand{\degreename}{#1}}
\NewDocumentCommand{\supervisor}{m}{\newcommand{\supname}{#1}}
\NewDocumentCommand{\affiliation}{m}{\newcommand{\supaff}{#1}}
\NewDocumentCommand{\university}{m}{\newcommand{\univname}{#1}}
\NewDocumentCommand{\faculty}{m}{\newcommand{\facname}{#1}}
\NewDocumentCommand{\department}{m}{\newcommand{\deptname}{#1}}
\NewDocumentCommand{\city}{m}{\newcommand{\cityname}{#1}}
\NewDocumentCommand{\logo}{m}{\newcommand{\logofilename}{#1}}
\DeclareDocumentCommand{\title}{m}{\newcommand{\thesistitle}{#1}\renewcommand{\@title}{#1}}
\DeclareDocumentCommand{\date}{m}{\newcommand{\thesisyear}{#1}\renewcommand{\@date}{#1}}
\newcommand{\documentlang}[1]{}

\newcommand{\authorlabel}{Author}
\newcommand{\suplabel}{Supervisor}
\newcommand{\codelabel}{Code}
\newcommand{\biblabel}{Bibliography}
\newcommand{\lstfigurelabel}{List of Figures}
\newcommand{\lsttablelabel}{List of Tables}
\newcommand{\lstcodelabel}{List of Codes}
\newcommand{\acklabel}{Acknowledgements}

% ---- page ----
\RequirePackage[left=35mm, right=25mm, top=25mm, bottom=25mm, headheight=16pt]{geometry}
\RequirePackage{fancyhdr}
\pagestyle{fancy}
\renewcommand{\chaptermark}[1]{\markboth{\thechapter.\ #1}{}}
\renewcommand{\sectionmark}[1]{\markright{\thesection.\ #1}{}}
\renewcommand{\headrulewidth}{1pt}
\renewcommand{\footrulewidth}{0pt}
\fancyhead{}
\fancyhead[C]{\slshape \leftmark}
\topskip = 15pt
\footskip = 40pt
\fancyfoot{}
\fancyfoot[C]{\thepage}
\fancypagestyle{plain}{\renewcommand{\headrulewidth}{0pt}\fancyhf{}\fancyfoot[C]{\thepage}}

\RequirePackage{graphicx}
\RequirePackage[export]{adjustbox}
\RequirePackage{float}
\RequirePackage{subcaption}
\RequirePackage{setspace}
\setstretch{1.427465}
\everydisplay=\expandafter{\the\everydisplay\linespread{1}\selectfont}
\RequirePackage{paralist}
\RequirePackage{amsmath}
\RequirePackage{xcolor}
\definecolor{codebackg}{rgb}{0.97,0.96,0.93}
\definecolor{codecomment}{rgb}{0.35,0.45,0.35}
\definecolor{codestring}{rgb}{0.62,0.22,0.18}
\definecolor{akgold}{HTML}{A88232}
\RequirePackage[pdfborder={0 0 0}, unicode, pdfusetitle]{hyperref}
\RequirePackage[all]{hypcap}
\RequirePackage{url}
\RequirePackage{bookmark}
\RequirePackage{multirow}
\RequirePackage{longtable}
\RequirePackage{array}
\RequirePackage{makecell}
\RequirePackage{booktabs}
\RequirePackage{tabularx}
\RequirePackage{pdfpages}
\RequirePackage[autostyle=true]{csquotes}
\RequirePackage[backend=biber, style=numeric, sorting=none]{biblatex}
\RequirePackage[justification=centering]{caption}
\RequirePackage{tocloft}
\renewcommand{\listfigurename}{\lstfigurelabel}
\renewcommand{\listtablename}{\lsttablelabel}

\RequirePackage{listingsutf8}
\lstset{
	basicstyle=\footnotesize\ttfamily, numbers=left, numberstyle=\tiny, backgroundcolor=\color{codebackg},
	keywordstyle=\color{blue}, commentstyle=\color{codecomment}, stringstyle=\color{codestring},
	numbersep=5pt, showspaces=false, showstringspaces=false, showtabs=false, tabsize=2,
	breaklines=true, breakatwhitespace=false, float, frame=lines, captionpos=b, columns=fullflexible
}
\renewcommand{\lstlistingname}{\codelabel}
\renewcommand{\lstlistlistingname}{\lstcodelabel}

% ---- cover page, laid out as in elteikthesis; the seal is shown when its file is present ----
\renewcommand{\maketitle}{
	\begin{titlepage}
		\begin{center}
			\begin{tabular}{ c c }
				\multirow{4}{*}{\hspace{-1.0cm}\IfFileExists{\logofilename.pdf}{\includegraphics[width=0.25\textwidth]{\logofilename}}{\rule{0pt}{0.25\textwidth}}}
				& {\sc \Large \makecell{\univname}} \vspace{0.3cm}\\
				& {\sc \Large \makecell{\facname}} \vspace{0.5cm}\\
				& {\sc \large \makecell{\deptname}}
			\end{tabular}

			\vspace{3.2cm}
			{\bf \LARGE \thesistitle \par}
			\vspace{2.6cm}
			\begin{tabular}{ l c l }
				{\it \large \suplabel:} & \hspace{4.0cm} & {\it \large \authorlabel:}\\
				{\large \supname} & \hspace{4.0cm} & {\large \authorname}\\
				\supaff & \hspace{4.0cm} & \degreename\\
			\end{tabular}
			\vfill
			{\it \cityname, \thesisyear}
		\end{center}
	\end{titlepage}
}

% Page numbering starts after the table of contents, as in elteikthesis.
\AtBeginDocument{
	\let\oldtableofcontents\tableofcontents
	\renewcommand{\tableofcontents}{
		\pagenumbering{gobble}
		\oldtableofcontents
		\cleardoublepage
		\pagenumbering{arabic}
		\setcounter{page}{1}
	}
}
