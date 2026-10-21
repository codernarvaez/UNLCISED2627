(function () {
  if (typeof runSnippet !== "function") {
    return;
  }

  document.querySelectorAll("pre > code.language-javascript").forEach(function (code) {
    code.dataset.source = code.textContent.trim();
    var pre = code.parentElement;
    var column = document.createElement("div");
    column.className = "example-column";
    pre.parentNode.insertBefore(column, pre);
    var box = document.createElement("div");
    box.className = "example-run";
    var button = document.createElement("button");
    button.type = "button";
    button.className = "playground-run";
    button.textContent = "Ejecutar";
    var output = document.createElement("pre");
    output.className = "playground-output example-output";
    output.textContent = "La salida aparece acá.";
    box.append(button, output);
    column.append(pre, box);

    button.addEventListener("click", function () {
      output.textContent = "Ejecutando…";
      runSnippet(code.dataset.source).then(function (text) {
        output.textContent = text;
      });
    });
  });

  var source = document.querySelector(".playground-code");
  var button = document.querySelector(".playground .playground-run");
  var output = document.querySelector(".playground .playground-output");
  if (!source || !button || !output) {
    return;
  }

  source.addEventListener("keydown", function (event) {
    event.stopPropagation();
  });

  button.addEventListener("click", function () {
    output.textContent = "Ejecutando…";
    runSnippet(source.value).then(function (text) {
      output.textContent = text;
    });
  });
})();
