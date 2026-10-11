Reveal.initialize({
  hash: true,
  controls: true,
  progress: true,
  slideNumber: "c / t",
  transition: "fade",
  backgroundTransition: "fade",
  center: false,
  width: 1100,
  height: 760,
  margin: 0.04,
  plugins: [RevealMarkdown, RevealNotes, RevealHighlight, RevealMath, RevealSearch],
  math: {
    mathjax: "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js",
    config: "TeX-AMS_HTML-full"
  },
  highlight: {
    highlightOnLoad: true
  }
});