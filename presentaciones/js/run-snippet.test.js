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
  assert.equal(examples.length, 7);

  const expectations = [
    ["class Pila", "edición\ninicio"],
    ["guardarTodo", "A, B"],
    ["memoryUsage", "true true true"],
    ["new Set", "Estructuras\n2\nAna\n3"],
    ["createReadStream", "Bytes desde offset 128:"],
    ["writeUInt32LE", "Ana\n2026"],
    ["indexedDB.open", "claro\nok"]
  ];

  assert.equal(expectations.length, 7);
  for (const [marker, expected] of expectations) {
    const source = examples.find(function (example) {
      return example.includes(marker);
    });
    assert.ok(source, "missing example: " + marker);
    const output = await runSnippet(source);
    assert.ok(output.includes(expected), marker + " => " + output);
  }
});

test("a syntax error is the result, not an empty success", async function () {
  const output = await runSnippet("{{{");
  assert.match(output, /SyntaxError|Unexpected|Invalid|expected/i);
});
