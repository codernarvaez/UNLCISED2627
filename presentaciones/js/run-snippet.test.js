const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { runSnippet } = require("./run-snippet");

function examplesFromDeck() {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  return Array.from(html.matchAll(/<code class="language-javascript"[^>]*>([\s\S]*?)<\/code>/g), function (match) {
    return match[1]
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&amp;", "&")
      .trim();
  });
}

test("every deck example runs and shows its result", async function () {
  const examples = examplesFromDeck();
  assert.equal(examples.length, 10);

  const expectations = [
    ["conRegistro", "entra sumar 22 9\nsale sumar 31\n31"],
    ["toSorted", "3,1,2\n1,2,3"],
    ["sumarPuntos", "31\n22,9"],
    ["class Pila", "edición\ninicio"],
    ["guardarTodo", "A, B"],
    ["memoryUsage", "true true true"],
    ["new Set", "Estructuras\n2\nAna\n3"],
    ["createReadStream", "Bytes desde offset 128:"],
    ["writeUInt32LE", "Ana\n2026"],
    ["indexedDB.open", "claro\nok"]
  ];

  assert.equal(expectations.length, 10);
  for (const [marker, expected] of expectations) {
    const source = examples.find(function (example) {
      return example.includes(marker);
    });
    assert.ok(source, "missing example: " + marker);
    const output = await runSnippet(source);
    assert.ok(output.includes(expected), marker + " => " + output);
  }
});

test("the conceptual base is the reference before the examples", function () {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const base = html.indexOf("La base para citar");
  const wrapper = html.indexOf("Un envoltorio registra la llamada");
  const concepts = html.indexOf("Conceptos<br>fundamentales");
  assert.ok(base > 0 && base < wrapper && wrapper < concepts);
  assert.match(html, /La base para citar<\/span><span class="index-page">4<\/span>/);
  assert.match(html, /El TDA define el contrato<\/span><span class="index-page">9<\/span>/);
  assert.match(html, /localStorage e IndexedDB<\/span><span class="index-page">28<\/span>/);
});

test("a syntax error is the result, not an empty success", async function () {
  const output = await runSnippet("{{{");
  assert.match(output, /SyntaxError|Unexpected|Invalid|expected/i);
});
