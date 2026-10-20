# 1.1.1 Conceptos fundamentales y abstracción

### El TDA define el contrato

Un **Tipo de Dato Abstracto (TDA)** especifica qué valores representa y qué operaciones ofrece, sin imponer cómo se implementan.

| TDA | Operaciones | Regla observable |
| --- | --- | --- |
| Pila | `push`, `pop`, `peek` | LIFO: sale primero el último elemento añadido |
| Cola | `enqueue`, `dequeue` | FIFO: sale primero el elemento más antiguo |

La abstracción permite cambiar la representación interna sin cambiar el código cliente que depende del contrato.

--

### Encapsular una pila en JavaScript

Los campos privados `#` impiden el acceso directo desde fuera de la clase. La clase ofrece operaciones en lugar de exponer su arreglo interno.

```js
class Pila {
  #elementos = [];

  push(valor) {
    this.#elementos.push(valor);
  }

  pop() {
    return this.#elementos.pop();
  }

  peek() {
    return this.#elementos.at(-1);
  }

  get longitud() {
    return this.#elementos.length;
  }
}

const historial = new Pila();
historial.push("inicio");
historial.push("edición");
console.log(historial.pop()); // edición
```

--

### Contratos, clases e interfaces implícitas

- JavaScript no tiene una declaración nativa `interface`; TypeScript sí ofrece interfaces de comprobación estática.
- En JavaScript, el código suele depender de la **forma y el comportamiento** de un objeto: es tipado estructural informal (duck typing).
- Una clase ES6 es una forma de construir objetos; no es requisito para cumplir un contrato.
- Mantén las invariantes dentro del TDA y prueba sus operaciones públicas, no su almacenamiento privado.

```js
function guardarTodo(almacen, valores) {
  for (const valor of valores) almacen.guardar(valor);
}

const memoria = { datos: [], guardar(valor) { this.datos.push(valor); } };
guardarTodo(memoria, ["A", "B"]);
console.log(memoria.datos); // ["A", "B"]
```

Referencia: [campos privados de clase en MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_elements).

---

# 1.1.2 Memoria: valores y referencias

### Qué significa “stack” y “heap”

- **Primitivos** (`number`, `boolean`, `bigint`, `string`, `symbol`, `undefined`, `null`): el valor se copia al asignar o pasar como argumento.
- **Objetos**: la variable contiene una referencia; copiarla crea otro alias al mismo objeto. La referencia también se pasa por valor.
- “Stack para primitivos, heap para objetos” es un modelo didáctico, no una garantía de ubicación física dictada por ECMAScript.
- El motor puede optimizar la representación; el recolector libera objetos que dejan de ser alcanzables.

--

### Medir el heap en Node.js

`process.memoryUsage()` informa métricas del proceso; `heapUsed` refleja el heap usado por V8, no el costo exacto de cada objeto.

```js
const antes = process.memoryUsage().heapUsed;
const registros = Array.from({ length: 250_000 }, (_, id) => ({
  id,
  activo: id % 2 === 0
}));
const despues = process.memoryUsage();

console.log({
  heapDeltaMiB: ((despues.heapUsed - antes) / 1024 ** 2).toFixed(2),
  heapTotalMiB: (despues.heapTotal / 1024 ** 2).toFixed(2),
  rssMiB: (despues.rss / 1024 ** 2).toFixed(2)
});
console.log("Registros retenidos:", registros.length);
```

--

### Interpretar y optimizar una medición

- **`heapUsed` / `heapTotal`**: heap de V8 usado y asignado.
- **`external` / `arrayBuffers`**: memoria externa a objetos JavaScript, incluidos buffers y `ArrayBuffer`.
- **`rss`**: memoria residente total del proceso; incluye más que el heap.
- La recolección de basura y la carga de trabajo alteran las lecturas. Compara varias muestras en condiciones repetibles; no infieras “bytes por objeto” de una única resta.
- En Chrome DevTools, toma *heap snapshots* antes y después, busca objetos retenidos y sigue sus referencias desde **Retainers**.

El paso de argumentos no crea una referencia compartida por una regla especial: se copia el valor de la variable. Si ese valor es una referencia a objeto, ambos parámetros apuntan al mismo objeto.

Referencia: [process.memoryUsage() en Node.js](https://nodejs.org/api/process.html#processmemoryusage).

---

# 1.2.1 Arreglos, conjuntos y registros

### Elegir la representación

| Estructura | Uso | Propiedad clave |
| --- | --- | --- |
| `Array` | Secuencias ordenadas | Longitud dinámica; índices y métodos de colección |
| `TypedArray` | Datos numéricos binarios | Vista tipada de un `ArrayBuffer`, longitud fija |
| `Set` | Valores únicos | Una sola aparición por valor según igualdad SameValueZero |
| `Map` | Clave → valor | Claves de cualquier tipo; conserva el orden de inserción |
| Objeto | Registro con campos nombrados | Las claves propias suelen ser strings o symbols |

JavaScript no incluye un tipo nativo llamado `Record`; se suele llamar **registro** a un objeto plano con campos conocidos. `Record<K, V>` es además una utilidad de tipos de TypeScript, no una estructura de ejecución de JavaScript.

--

### Ejemplo: colección y vista binaria

```js
const cursos = ["Estructuras", "Algoritmos"];
const etiquetas = new Set(["obligatoria", "carrera", "obligatoria"]);

const estudiante = { id: 42, nombre: "Ana", activo: true };
const estudiantesPorId = new Map([[estudiante.id, estudiante]]);

const bytes = new Uint8Array([0, 127, 255]);

console.log(cursos[0]);                       // Estructuras
console.log(etiquetas.size);                  // 2
console.log(estudiantesPorId.get(42).nombre); // Ana
console.log(bytes.byteLength);                // 3
```

--

### Rendimiento y criterios de uso

- Usa `Array` cuando importen el orden, el recorrido y las operaciones de secuencia.
- Usa `Set` para unicidad y consultas de pertenencia; `Map` cuando las claves no son solo strings o el conjunto de entradas cambia dinámicamente.
- `TypedArray` es adecuado para imágenes, audio, protocolos y datos numéricos empaquetados. No almacena objetos arbitrarios.
- No asumas complejidad exacta para cada método a partir de la especificación. Mide con datos representativos y el motor objetivo.
- Evita convertir colecciones repetidamente; para datos grandes, considera el costo de copias y asignaciones.

Referencia: [TypedArray en MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray).

---

# 1.2.2 Archivos: recorrido secuencial y acceso aleatorio

### Dos patrones de lectura

| Patrón | API de Node.js | Conviene cuando… |
| --- | --- | --- |
| Secuencial | `fs.createReadStream()` | Se procesa el archivo completo por bloques |
| Posicional | `fs.open()` y `file.read(..., position)` | Se conoce el offset del registro o bloque buscado |

Un **stream** aplica lectura incremental y evita cargar todo el archivo de una vez. El acceso posicional recibe un offset en **bytes**; no en caracteres Unicode.

--

### Código: stream y lectura por offset

Guarda el ejemplo como `leer-archivo.js` y ejecútalo con `node leer-archivo.js contenido.md`.

```js
const { createReadStream, promises: fs } = require("node:fs");

async function main() {
  const ruta = process.argv[2] ?? "contenido.md";

  for await (const fragmento of createReadStream(ruta, { encoding: "utf8" })) {
    process.stdout.write(fragmento);
  }

  const archivo = await fs.open(ruta, "r");
  try {
    const buffer = Buffer.alloc(16);
    const { bytesRead } = await archivo.read(buffer, 0, buffer.length, 128);
    console.log("\nBytes desde offset 128:", buffer.subarray(0, bytesRead));
  } finally {
    await archivo.close();
  }
}

main().catch(console.error);
```

--

### Rendimiento y diseño de registros

- El stream procesa bloques; el consumo de memoria no crece con el tamaño total del archivo si el consumidor no acumula los fragmentos.
- El acceso aleatorio es útil para índices, cabeceras y registros de longitud fija. Para registro `i`, un formato fijo puede calcular `offset = cabecera + i * tamañoRegistro`.
- En textos UTF-8, un carácter puede ocupar varios bytes: los offsets deben calcularse con la codificación del archivo.
- Comprueba `bytesRead`: al final del archivo puede ser menor que el tamaño solicitado.
- Para escrituras concurrentes o cambios de tamaño, define cómo se mantiene consistente el índice y el archivo.

Referencia: [FileHandle.read() y streams en Node.js](https://nodejs.org/api/fs.html).

---

# 1.2.3 Persistencia: archivos y navegador

### Elegir dónde guardar

| Medio | Entorno | Datos y consideraciones |
| --- | --- | --- |
| JSON | Node.js / intercambio | Legible e interoperable; parsear materializa el documento completo |
| Binario | Node.js / formatos compactos | Control de bytes y tamaño; requiere definir esquema y versión |
| `localStorage` | Navegador | Strings por origen; API síncrona, apropiada para preferencias pequeñas |
| IndexedDB | Navegador | Registros estructurados, índices y transacciones asíncronas |

JSON no conserva todos los valores JavaScript (por ejemplo, `BigInt` no se serializa directamente). Valida datos al leer archivos externos y maneja errores de permisos, cuota y formato.

--

### Node.js: JSON y un entero binario

Este ejemplo guarda un documento JSON y un entero de 32 bits en orden little-endian. Ejecútalo con `node persistencia.js`.

```js
const { readFile, writeFile } = require("node:fs/promises");

async function main() {
  const estudiantes = [{ id: 42, nombre: "Ana" }];
  await writeFile("estudiantes.json", JSON.stringify(estudiantes, null, 2));
  const recuperados = JSON.parse(await readFile("estudiantes.json", "utf8"));

  const registro = Buffer.alloc(4);
  registro.writeUInt32LE(2026, 0);
  await writeFile("anio.bin", registro);
  const bytes = await readFile("anio.bin");

  console.log(recuperados[0].nombre); // Ana
  console.log(bytes.readUInt32LE(0)); // 2026
}

main().catch(console.error);
```

--

### Navegador: almacenamiento pequeño y estructurado

`localStorage` solo acepta strings. IndexedDB trabaja de forma asíncrona y agrupa cambios en transacciones.

```js
localStorage.setItem("preferencias", JSON.stringify({ tema: "claro" }));
const preferencias = JSON.parse(localStorage.getItem("preferencias") ?? "{}");

const solicitud = indexedDB.open("unl-demo", 1);
solicitud.onupgradeneeded = () => {
  solicitud.result.createObjectStore("ajustes", { keyPath: "id" });
};
solicitud.onsuccess = () => {
  const db = solicitud.result;
  const tx = db.transaction("ajustes", "readwrite");
  tx.objectStore("ajustes").put({ id: "tema", valor: preferencias.tema });
  tx.oncomplete = () => db.close();
  tx.onerror = () => console.error(tx.error);
};
solicitud.onerror = () => console.error(solicitud.error);
```

Usa IndexedDB para colecciones que requieren consultas, índices o transacciones. Ninguna API del navegador debe tratarse como sustituto de copias de seguridad del servidor.

Referencias: [localStorage en MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) · [IndexedDB en MDN](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API).

---

# 1.3.1 Listas simples enlazadas

### Nodos y referencias

Una **lista simple enlazada** es una secuencia de **nodos**. Cada nodo guarda un valor y una referencia al nodo siguiente; el último apunta a `null`.

```text
cabeza --> [ "A" | sig ] --> [ "B" | sig ] --> [ "C" | null ]
```

- JavaScript no tiene punteros explícitos: las **referencias a objetos** cumplen ese papel (diapositiva 1.1.2).
- La lista conserva solo la **cabeza**; para llegar a otro nodo se recorre desde ahí.
- Un nodo que deja de ser alcanzable desde la cabeza puede ser liberado por el recolector.

--

### Implementar ListaSimple

Cada nodo es un registro con dos campos: `valor` y `siguiente`. La lista guarda la cabeza y la longitud en campos privados, igual que `Pila` oculta su arreglo.

Guarda la clase como `lista-simple.js`; los métodos de las siguientes diapositivas se agregan dentro de ella.

```js
class ListaSimple {
  #cabeza = null;
  #longitud = 0;

  agregarAlInicio(valor) {
    this.#cabeza = { valor, siguiente: this.#cabeza };
    this.#longitud++;
  }

  agregarAlFinal(valor) {
    const nodo = { valor, siguiente: null };
    if (!this.#cabeza) this.#cabeza = nodo;
    else {
      let actual = this.#cabeza;
      while (actual.siguiente) actual = actual.siguiente;
      actual.siguiente = nodo;
    }
    this.#longitud++;
  }

  *[Symbol.iterator]() {
    for (let nodo = this.#cabeza; nodo; nodo = nodo.siguiente) {
      yield nodo.valor;
    }
  }

  get longitud() {
    return this.#longitud;
  }
}

module.exports = { ListaSimple };
```

--

### Eliminar un nodo

Eliminar es **reconectar**: el nodo anterior pasa a apuntar al siguiente del eliminado, que queda inalcanzable.

```text
antes:    [ "A" ] --> [ "B" ] --> [ "C" ]
después:  [ "A" ] ------------> [ "C" ]     "B" ya no es alcanzable
```

```js
  eliminarSi(predicado) {
    if (!this.#cabeza) return false;
    if (predicado(this.#cabeza.valor)) {
      this.#cabeza = this.#cabeza.siguiente;
      this.#longitud--;
      return true;
    }
    let anterior = this.#cabeza;
    while (anterior.siguiente && !predicado(anterior.siguiente.valor)) {
      anterior = anterior.siguiente;
    }
    if (!anterior.siguiente) return false;
    anterior.siguiente = anterior.siguiente.siguiente;
    this.#longitud--;
    return true;
  }
```

--

### Casos borde y uso

```js
const alumnos = new ListaSimple();
alumnos.agregarAlFinal({ id: 1, nombre: "Ana" });
alumnos.agregarAlFinal({ id: 2, nombre: "Luis" });
alumnos.agregarAlFinal({ id: 3, nombre: "Eva" });

console.log(alumnos.eliminarSi((a) => a.id === 2)); // true
console.log(alumnos.eliminarSi((a) => a.id === 9)); // false
console.log([...alumnos].map((a) => a.nombre));     // ["Ana", "Eva"]
console.log(alumnos.longitud);                      // 2
```

- Cubre tres casos: lista **vacía**, eliminación de la **cabeza** y valor **inexistente**.
- `eliminarSi` generaliza `eliminar(valor)`: basta pasar `(v) => v === valor`.
- Con objetos, `===` exige la misma referencia; un predicado permite comparar por campo, como `id`.

Referencia: [Protocolos de iteración en MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols).

---

# 1.3.2 Listas simples: operaciones, persistencia y pruebas

### Buscar, insertar e invertir

Se agregan dentro de `ListaSimple`.

```js
  buscar(predicado) {
    for (let nodo = this.#cabeza; nodo; nodo = nodo.siguiente) {
      if (predicado(nodo.valor)) return nodo.valor;
    }
    return undefined;
  }

  insertarEn(indice, valor) {
    if (indice < 0 || indice > this.#longitud) {
      throw new RangeError("Índice fuera de rango");
    }
    if (indice === 0) return this.agregarAlInicio(valor);
    let anterior = this.#cabeza;
    for (let i = 0; i < indice - 1; i++) anterior = anterior.siguiente;
    anterior.siguiente = { valor, siguiente: anterior.siguiente };
    this.#longitud++;
  }

  invertir() {
    let anterior = null;
    let actual = this.#cabeza;
    while (actual) {
      const siguiente = actual.siguiente;
      actual.siguiente = anterior;
      anterior = actual;
      actual = siguiente;
    }
    this.#cabeza = anterior;
  }
```

--

### Convertir y persistir la lista

`JSON.stringify(lista)` no guarda los campos privados. Para persistir, convierte la lista en un arreglo y reconstrúyela al leer.

```js
  toArray() {
    return [...this];
  }

  static desde(valores) {
    const arreglo = Array.from(valores);
    const lista = new ListaSimple();
    for (let i = arreglo.length - 1; i >= 0; i--) {
      lista.agregarAlInicio(arreglo[i]);
    }
    return lista;
  }
```

Guarda el ejemplo como `persistencia-lista.js` y ejecútalo con `node persistencia-lista.js`.

```js
const { readFile, writeFile } = require("node:fs/promises");
const { ListaSimple } = require("./lista-simple");

async function main() {
  const alumnos = ListaSimple.desde([
    { id: 1, nombre: "Ana" },
    { id: 2, nombre: "Luis" }
  ]);
  await writeFile("alumnos.json", JSON.stringify(alumnos.toArray()));

  const texto = await readFile("alumnos.json", "utf8");
  const recuperada = ListaSimple.desde(JSON.parse(texto));
  console.log(recuperada.buscar((a) => a.id === 2).nombre); // Luis
}

main().catch(console.error);
```

--

### Verificar el contrato con pruebas

Guarda las pruebas como `lista-simple.test.js` y ejecútalas con `node --test`.

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { ListaSimple } = require("./lista-simple");

test("conserva el orden y la longitud", () => {
  const lista = new ListaSimple();
  lista.agregarAlFinal("B");
  lista.agregarAlInicio("A");
  assert.deepEqual(lista.toArray(), ["A", "B"]);
  assert.equal(lista.longitud, 2);
});

test("eliminarSi cubre cabeza, nodo intermedio e inexistente", () => {
  const lista = ListaSimple.desde([1, 2, 3, 4]);
  assert.equal(lista.eliminarSi((v) => v === 1), true);
  assert.equal(lista.eliminarSi((v) => v === 3), true);
  assert.equal(lista.eliminarSi((v) => v === 9), false);
  assert.deepEqual(lista.toArray(), [2, 4]);
});

test("insertarEn rechaza índices fuera de rango", () => {
  const lista = ListaSimple.desde(["A", "C"]);
  lista.insertarEn(1, "B");
  assert.deepEqual(lista.toArray(), ["A", "B", "C"]);
  assert.throws(() => lista.insertarEn(9, "X"), RangeError);
});
```

- Prueba el **comportamiento público** (orden, longitud, casos borde), no los campos privados.
- Cada prueba debe fallar por una sola razón: así el error indica qué operación se rompió.

--

### Costo y criterios de uso

| Operación | Costo (peor caso) | Motivo |
| --- | --- | --- |
| `agregarAlInicio` | O(1) | Solo cambia la cabeza |
| `agregarAlFinal` | O(n) | Recorre hasta el último nodo |
| `buscar`, `eliminarSi`, `insertarEn` | O(n) | Recorren desde la cabeza |
| `invertir`, `toArray`, `desde` | O(n) | Visitan cada nodo una vez |

- Prefiere la lista simple cuando predominan las inserciones y eliminaciones al inicio y el recorrido secuencial; prefiere `Array` cuando necesitas acceso directo por índice.
- No asumas que una lista supera a un `Array` solo por su costo teórico: cada nodo es un objeto separado en el heap. Mide con datos representativos.
- Una referencia al último nodo haría `agregarAlFinal` O(1), a cambio de mantenerla consistente al eliminar.

Referencias: [Array.from() en MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from) · [Test runner de Node.js](https://nodejs.org/api/test.html).