(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.runSnippet = api.runSnippet;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function createApi(lines) {
    var files = {};
    var memoryReads = 0;
    var consoleApi = {
      log: function () {
        lines.push(Array.prototype.map.call(arguments, String).join(" "));
      }
    };

    function readFile(path) {
      if (!Object.prototype.hasOwnProperty.call(files, path)) {
        return Promise.reject(new Error("No existe " + path));
      }
      return Promise.resolve(files[path]);
    }

    function writeFile(path, data) {
      files[path] = data;
      return Promise.resolve();
    }

    function openFile() {
      return Promise.resolve({
        read: function (buffer, _offset, length) {
          var bytes = buffer && buffer._bytes;
          var count = bytes ? Math.min(length, bytes.length) : length;
          if (bytes) {
            for (var i = 0; i < count; i += 1) bytes[i] = 65 + (i % 26);
          }
          return Promise.resolve({ bytesRead: count });
        },
        close: function () {
          return Promise.resolve();
        }
      });
    }

    function createReadStream() {
      var chunks = ["demo"];
      var index = 0;
      return {
        [Symbol.asyncIterator]: function () {
          return {
            next: function () {
              if (index < chunks.length) {
                return Promise.resolve({ value: chunks[index++], done: false });
              }
              return Promise.resolve({ done: true });
            }
          };
        }
      };
    }

    function requireModule(id) {
      if (id === "node:fs" || id === "fs") {
        return { createReadStream: createReadStream, promises: { open: openFile } };
      }
      if (id === "node:fs/promises" || id === "fs/promises") {
        return { readFile: readFile, writeFile: writeFile };
      }
      throw new Error("No se puede cargar " + id + " en el navegador.");
    }

    function BufferAlloc(size) {
      var bytes = new Uint8Array(size);
      return {
        writeUInt32LE: function (value, offset) {
          new DataView(bytes.buffer).setUint32(offset || 0, value, true);
        },
        readUInt32LE: function (offset) {
          return new DataView(bytes.buffer).getUint32(offset || 0, true);
        },
        subarray: function (start, end) {
          return bytes.subarray(start, end);
        },
        _bytes: bytes,
        toString: function () {
          return String(bytes);
        }
      };
    }

    var storage = {};
    var localStorageApi = {
      setItem: function (key, value) {
        storage[key] = String(value);
      },
      getItem: function (key) {
        return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
      }
    };

    var indexedDBApi = {
      open: function () {
        var saved = {};
        var db = {
          close: function () {},
          createObjectStore: function () {},
          transaction: function () {
            var tx = {
              oncomplete: null,
              objectStore: function () {
                return {
                  put: function (value) {
                    saved[value.id] = value;
                  }
                };
              }
            };
            queueMicrotask(function () {
              if (typeof tx.oncomplete === "function") tx.oncomplete();
            });
            return tx;
          }
        };
        var request = { result: db, onupgradeneeded: null, onsuccess: null };
        queueMicrotask(function () {
          if (typeof request.onupgradeneeded === "function") request.onupgradeneeded();
          if (typeof request.onsuccess === "function") request.onsuccess();
        });
        return request;
      }
    };

    return {
      console: consoleApi,
      require: requireModule,
      process: {
        argv: ["node", "demo"],
        stdout: {
          write: function (chunk) {
            lines.push(String(chunk));
          }
        },
        memoryUsage: function () {
          memoryReads += 1;
          return {
            heapUsed: memoryReads === 1 ? 1000 : 5000,
            heapTotal: 8000,
            rss: 12000,
            external: 0,
            arrayBuffers: 0
          };
        }
      },
      Buffer: { alloc: BufferAlloc },
      localStorage: localStorageApi,
      indexedDB: indexedDBApi
    };
  }

  function runSnippet(source) {
    var lines = [];
    var api = createApi(lines);
    return new Promise(function (resolve) {
      try {
        var runner = new Function(
          "console",
          "require",
          "process",
          "Buffer",
          "localStorage",
          "indexedDB",
          source + "\n;return (typeof main === \"function\" ? main() : undefined);"
        );
        Promise.resolve(
          runner(api.console, api.require, api.process, api.Buffer, api.localStorage, api.indexedDB)
        )
          .catch(function (error) {
            lines.push(error && error.message ? error.message : String(error));
          })
          .then(function () {
            setTimeout(function () {
              resolve(lines.join("\n") || "(sin salida)");
            }, 0);
          });
      } catch (error) {
        resolve(error && error.message ? error.message : String(error));
      }
    });
  }

  return { runSnippet: runSnippet };
});
