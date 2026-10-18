# 1.1.1 Tipos de Datos Abstractos (TDA) y principios de abstracción

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

# 1.1.2 Medición de memoria: tipos primitivos vs. objetos

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

# 1.2.2 Gestión de archivos con acceso secuencial y aleatorio

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

--

### Qué medir al leer archivos

- **Latencia:** tiempo total de la operación, en milisegundos.
- **Rendimiento (*throughput*):** MiB leídos por segundo.
- **Memoria:** `heapUsed`, `rss` y `external` durante la lectura (ver 1.1.2).
- **Operaciones:** cuántas lecturas se hacen y de qué tamaño.

Para que la comparación sea válida:

- Usa el mismo archivo y el mismo equipo, y **repite** la medición varias veces.
- La primera lectura puede ser más lenta: el sistema operativo guarda datos en caché y las siguientes pueden resultar más rápidas. Registra la primera por separado.
- Mide con `performance.now()` del módulo `node:perf_hooks`.

--

### Una función para medir

Guarda este bloque y los dos siguientes en un solo archivo, `metricas-io.js`.

```js
const { createReadStream } = require("node:fs");
const { readFile, writeFile, open, rm } = require("node:fs/promises");
const { performance } = require("node:perf_hooks");

async function medir(nombre, tarea) {
  const inicio = performance.now();
  const bytes = await tarea();
  const segundos = (performance.now() - inicio) / 1000;
  const ms = (segundos * 1000).toFixed(1);
  const velocidad = (bytes / 1024 ** 2 / segundos).toFixed(0);
  console.log(`${nombre}: ${ms} ms, ${velocidad} MiB/s`);
}
```

`medir` recibe una tarea que devuelve cuántos bytes leyó, y calcula latencia y rendimiento con la misma fórmula para todos los patrones.

--

### Tres patrones de lectura

Cada patrón es una función que devuelve cuántos bytes leyó, para que `medir` pueda compararlos.

```js
const leerCompleto = async (ruta) => (await readFile(ruta)).length;

async function leerPorBloques(ruta) {
  let total = 0;
  for await (const bloque of createReadStream(ruta)) total += bloque.length;
  return total;
}

async function leerPorPosicion(ruta, tamaño, lecturas = 1000) {
  const archivo = await open(ruta, "r");
  const buffer = Buffer.alloc(4096);
  let total = 0;
  for (let i = 0; i < lecturas; i++) {
    const posicion = Math.floor(Math.random() * (tamaño - 4096));
    total += (await archivo.read(buffer, 0, 4096, posicion)).bytesRead;
  }
  await archivo.close();
  return total;
}
```

--

### Ejecutar la comparación

```js
async function main() {
  const ruta = "datos.bin";
  const tamaño = 64 * 1024 ** 2; // 64 MiB
  await writeFile(ruta, Buffer.alloc(tamaño, 1));

  await medir("readFile completo", () => leerCompleto(ruta));
  await medir("stream por bloques", () => leerPorBloques(ruta));
  await medir("1000 lecturas de 4 KiB", () => leerPorPosicion(ruta, tamaño));

  await rm(ruta);
}

main().catch(console.error);
```

Ejecútalo con `node metricas-io.js`. El archivo de prueba se borra al terminar.

--

### Interpretar los resultados

| Patrón | Memoria | Conviene cuando… |
| --- | --- | --- |
| `readFile` | Carga todo el archivo en un `Buffer` | El archivo cabe cómodamente en memoria y se necesita completo |
| Stream | Bloques pequeños (64 KiB por defecto en `fs.createReadStream`) | El archivo es grande o se procesa de forma incremental |
| Lectura posicional | Un buffer pequeño por lectura | Se accede a registros concretos por su offset |

- En una ejecución de referencia con 64 MiB, `readFile` resultó **más rápido** que el stream. El stream no busca velocidad: busca **memoria acotada**. Los números dependen del equipo y del disco.
- Las lecturas posicionales pagan un costo fijo por operación: son útiles para pocos registros, no para recorrer todo el archivo.
- Para el informe: reporta tamaño del archivo, patrón, tiempo, MiB/s, memoria y cuántas repeticiones hiciste, no solo un número suelto.

Referencia: [perf_hooks en Node.js](https://nodejs.org/api/perf_hooks.html).

---

# 1.2.3 Esquemas de persistencia de datos

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

# 1.3.1 Gestión de memoria estática y asignación dinámica de memoria

### Memoria estática y dinámica: qué cambia

La **memoria estática** tiene un tamaño fijo y conocido al reservarla; la **dinámica** se reserva durante la ejecución, según lo que el programa necesita. En JavaScript no existe `malloc`: el motor reserva memoria al crear valores y el recolector de basura la libera. La distinción es **conceptual**: «estático» significa tamaño fijo desde su creación.

| Aspecto | Estática (tamaño fijo) | Dinámica (tamaño variable) |
| --- | --- | --- |
| Ejemplo en JavaScript | `new Float64Array(1000)`, `new Uint8Array(256)` | `[]`, `{}`, `new Map()` |
| Tamaño | Se decide al crearla | Cambia mientras se ejecuta |
| Crecer | No puede: hay que crear otra y copiar | El motor reasigna por ti |
| Liberación | Cuando deja de ser alcanzable | Igual: lo decide el recolector |

- Lo estático da previsibilidad: ocupa siempre lo mismo y sus elementos son contiguos.
- Lo dinámico da flexibilidad, a cambio de costos ocultos de reasignación.

--

### Reservar memoria en JavaScript

```js
const fija = new Float64Array(1000);        // 1000 elementos de 8 bytes
console.log(fija.length, fija.byteLength);  // 1000 8000
fija[1500] = 1;                             // fuera de rango: se ignora
console.log(fija.length, fija[1500]);       // 1000 undefined

const dinamica = [];
for (let i = 0; i < 1000; i++) dinamica.push(i);
console.log(dinamica.length);               // 1000: creció sola
```

- `byteLength` es `length` por los bytes de cada elemento: `Float64Array` usa 8 bytes por elemento.
- Un `TypedArray` no crece ni acepta posiciones fuera de rango; un `Array` sí crece al agregar elementos.
- Para medir cuánta memoria ocupa cada enfoque, usa `process.memoryUsage()` como en 1.1.2.

--

### Asignación dinámica sobre memoria fija

Un **arreglo dinámico** guarda sus datos en un bloque de tamaño fijo; cuando se llena, reserva uno más grande y copia.

```js
class ArregloDinamico {
  #datos = new Float64Array(2);
  #longitud = 0;

  agregar(valor) {
    if (this.#longitud === this.#datos.length) {
      const nuevo = new Float64Array(this.#datos.length * 2);
      nuevo.set(this.#datos);
      this.#datos = nuevo;
    }
    this.#datos[this.#longitud++] = valor;
  }

  obtener(indice) {
    return this.#datos[indice];
  }

  get longitud() {
    return this.#longitud;
  }

  get capacidad() {
    return this.#datos.length;
  }
}
```

--

### Uso y costo de reasignar

```js
const lista = new ArregloDinamico();
for (let i = 0; i < 5; i++) {
  lista.agregar(i * 10);
  console.log(lista.longitud, lista.capacidad);
}
// 1 2
// 2 2
// 3 4   <- la capacidad se duplicó: se reservó otro bloque y se copió
// 4 4
// 5 8   <- se duplicó de nuevo
console.log(lista.obtener(4)); // 40
```

- Cada reasignación cuesta O(n), pero ocurre pocas veces: agregar es **O(1) amortizado**.
- El costo oculto es la memoria reservada y no usada (`capacidad` mayor que `longitud`).
- Los arreglos dinámicos de muchos lenguajes usan una estrategia parecida.

---

# 1.3.2 Administración de punteros, referencias y auditoría de fugas de memoria

### Punteros y referencias en JavaScript

JavaScript no expone punteros ni aritmética de direcciones. Las **referencias** cumplen un papel equivalente: apuntan a un objeto, pero solo se pueden copiar y comparar; no se puede ver ni calcular una dirección.

```js
const a = { id: 1 };
const b = a;           // otro alias al mismo objeto
const c = { id: 1 };   // objeto distinto con los mismos datos

console.log(a === b);  // true  (misma referencia)
console.log(a === c);  // false (referencias distintas)

function renombrar(obj) {
  obj.id = 99;         // modifica el objeto compartido
  obj = { id: 0 };     // solo cambia la copia local de la referencia
}
renombrar(a);
console.log(a.id, b.id); // 99 99
```

- `===` compara **referencias**, no el contenido de los objetos.
- Al pasar un objeto se copia la referencia: mutarlo afecta al original; reasignar el parámetro no.

--

### Copiar la referencia o copiar el objeto

```js
const original = { nombre: "Ana", notas: [8, 9] };
const superficial = { ...original };
const profunda = structuredClone(original);

original.notas.push(10);
console.log(superficial.notas); // [8, 9, 10] (comparte el arreglo)
console.log(profunda.notas);    // [8, 9]     (copia independiente)
```

- La copia **superficial** (`{ ...obj }`, `Object.assign`) duplica un nivel: los objetos internos siguen compartidos.
- `structuredClone` hace una copia **profunda**, pero no copia funciones y pierde los prototipos de las clases.
- Compartir referencias sin querer es una causa frecuente de errores y de objetos retenidos en memoria.

--

### Qué es una fuga de memoria en JavaScript

Una **fuga** ocurre cuando el programa conserva referencias a objetos que ya no necesita: siguen siendo **alcanzables** (se llega a ellos siguiendo referencias desde las variables vivas) y el recolector no puede liberarlos. No se debe a «olvidar liberar», sino a «olvidar soltar».

- Colecciones globales que solo crecen: cachés sin límite, arreglos de registros, historiales.
- *Listeners* y temporizadores que nunca se cancelan (`addEventListener`, `setInterval`).
- *Closures* que capturan datos grandes y se conservan más de lo necesario.
- Claves de un `Map` que apuntan a objetos que ya no se usan.
- **Síntoma típico:** `heapUsed` sigue creciendo aun después de forzar una recolección.

--

### Ejemplo: una caché que nunca libera

Ejecútalo con `node --expose-gc fuga.js`. `global.gc()` fuerza una recolección para que las lecturas sean comparables.

```js
const cache = new Map();

function procesar(id) {
  const datos = new Array(10_000).fill(id);
  cache.set(id, datos); // se guarda y nunca se elimina
  return datos.length;
}

function heapMiB() {
  global.gc();
  return (process.memoryUsage().heapUsed / 1024 ** 2).toFixed(1);
}

console.log("antes:", heapMiB(), "MiB");
for (let i = 0; i < 1000; i++) procesar(i);
console.log("después:", heapMiB(), "MiB");
cache.clear();
console.log("tras clear:", heapMiB(), "MiB");
```

- En una ejecución de referencia con Node 22 el heap pasó de unos 3 MiB a unos 80 MiB y volvió a unos 4 MiB tras `cache.clear()`. Las cifras varían según el equipo; lo importante es la **tendencia**.
- Mientras `cache` apunte a los arreglos, el recolector no puede liberarlos, aunque `procesar` ya terminó.

--

### Corregir la fuga: una caché con límite

Una caché con tamaño máximo expulsa la entrada más antigua según el orden de inserción de `Map`.

```js
class CacheLimitada {
  #max;
  #mapa = new Map();

  constructor(max) {
    this.#max = max;
  }

  guardar(clave, valor) {
    this.#mapa.delete(clave);
    this.#mapa.set(clave, valor);
    if (this.#mapa.size > this.#max) {
      this.#mapa.delete(this.#mapa.keys().next().value);
    }
  }

  obtener(clave) {
    return this.#mapa.get(clave);
  }
}
```

- `guardar` reinserta la clave para dejarla al final; al superar el máximo, `keys().next().value` es la clave más antigua y se elimina.

--

### Usar la caché y otras correcciones

```js
const cache = new CacheLimitada(2);
cache.guardar("a", 1);
cache.guardar("b", 2);
cache.guardar("c", 3);
console.log(cache.obtener("a")); // undefined (fue expulsada)
console.log(cache.obtener("c")); // 3
```

- Para asociar datos a un objeto sin mantenerlo vivo, usa `WeakMap` o `WeakRef`: no impiden que el recolector libere el objeto.
- Cancela *listeners* y temporizadores cuando dejen de hacer falta, y suelta referencias con `null` o `clear()`.
- Retener menos memoria también reduce el trabajo del recolector y el consumo de recursos (sostenibilidad computacional).

Referencias: [Gestión de memoria en MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_management) · [WeakMap en MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap).

--

### Auditar una fuga con heap snapshots

1. Inicia el programa con `node --inspect fuga.js` y conéctate desde `chrome://inspect`.
2. En la pestaña **Memory**, toma un *heap snapshot* antes de la operación sospechosa.
3. Ejecuta la operación varias veces y toma un segundo snapshot.
4. Usa la vista **Comparison** para ver qué tipos de objeto aumentaron.
5. Selecciona un objeto retenido y revisa **Retainers**: muestra la cadena de referencias que lo mantiene vivo (en el ejemplo, el `Map` global `cache`).

- Complementa con `heapUsed` medido después de `global.gc()`: si no baja entre repeticiones, hay referencias retenidas.
- Corrige la causa (quitar la referencia) y repite la medición para comprobarlo.

---

# 1.3.3 Ciclo de vida de los objetos y estados de memoria en la pila (Stack) y el montón (Heap)

### Pila de llamadas y heap: estados de memoria

La **pila de llamadas** guarda un marco por cada función en ejecución (variables locales y referencias). Los objetos viven en el **heap**. Al terminar una función se elimina su marco, pero sus objetos siguen vivos mientras alguien los referencie.

```js
function promedio(notas) {
  const suma = notas.reduce((a, b) => a + b, 0);
  return suma / notas.length;
}

function main() {
  const notas = [8, 9, 10]; // el arreglo vive en el heap
  const resultado = promedio(notas);
  console.log(resultado);   // 9
}
main();
```

| Momento | Pila de llamadas | Heap |
| --- | --- | --- |
| Dentro de `promedio` | `main` (`notas` → ref) y `promedio` (`notas` → ref, `suma` = 27) | `[8, 9, 10]` |
| `promedio` terminó | `main` (`notas` → ref, `resultado` = 9) | `[8, 9, 10]` sigue vivo |
| `main` terminó | Vacía | `[8, 9, 10]` sin referencias: recolectable |

--

### Alcanzabilidad: cuándo se libera un objeto

JavaScript libera la memoria de forma automática: el recolector de basura elimina los objetos que ya **no son alcanzables** desde las raíces del programa (variables globales, variables locales activas y otras referencias vivas). No existe un `free()` explícito.

```text
let a = { id: 1 };   a ──▶ { id: 1 }
let b = a;           a ──▶ { id: 1 } ◀── b
a = null;            b ──▶ { id: 1 }        (sigue alcanzable por b)
b = null;            { id: 1 }              (sin referencias: recolectable)
```

- **Instanciar** crea el objeto; **asignar** copia la referencia, no el objeto.
- **Liberar** significa quitar todas las referencias; el recolector decide **cuándo** reclamar la memoria, no es inmediato.
- Dibujar estos estados paso a paso es la forma más segura de razonar sobre quién mantiene vivo a cada objeto.

--

### Desbordamiento de pila

Cada llamada consume un marco de la pila, y la pila tiene un tamaño limitado, mucho menor que el heap.

```js
function contar(n) {
  return n === 0 ? 0 : 1 + contar(n - 1);
}

console.log(contar(1000)); // 1000
try {
  contar(1_000_000);
} catch (error) {
  console.log(error instanceof RangeError); // true
  console.log(error.message);               // Maximum call stack size exceeded
}
```

- Una recursión sin caso base, o demasiado profunda, agota la pila y lanza `RangeError`.
- La profundidad máxima depende del motor y del tamaño de cada marco: no confíes en un número fijo.
- Solución habitual: convertir la recursión en un ciclo o reducir la profundidad.

---

# 1.4.1 Listas enlazadas (listas simples y doblemente enlazadas)

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

# 1.4.1 Listas simples: operaciones, persistencia y pruebas

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

---

# 1.4.1 Listas doblemente enlazadas

### Nodos con dos enlaces

En una **lista doblemente enlazada** cada nodo guarda su valor y dos referencias: `siguiente` y `anterior`. La lista conserva la **cabeza** y la **cola**.

```text
null <-- [ "A" ] <--> [ "B" ] <--> [ "C" ] --> null
          ^ cabeza                  ^ cola
```

- Se puede recorrer en **ambos sentidos**.
- Agregar al final es O(1), porque la lista conoce su cola.
- Eliminar un nodo ya localizado es O(1): él mismo sabe quién es su anterior.
- **Costo:** cada nodo guarda una referencia más, y hay que mantener consistentes **dos** enlaces en cada operación.

--

### Implementar ListaDoble

Guarda la clase como `lista-doble.js`; los métodos de las siguientes diapositivas se agregan dentro de ella. Al final del archivo, exporta la clase con `module.exports = { ListaDoble };`.

```js
class ListaDoble {
  #cabeza = null;
  #cola = null;
  #longitud = 0;

  agregarAlInicio(valor) {
    const nodo = { valor, anterior: null, siguiente: this.#cabeza };
    if (this.#cabeza) this.#cabeza.anterior = nodo;
    else this.#cola = nodo;
    this.#cabeza = nodo;
    this.#longitud++;
  }

  agregarAlFinal(valor) {
    const nodo = { valor, anterior: this.#cola, siguiente: null };
    if (this.#cola) this.#cola.siguiente = nodo;
    else this.#cabeza = nodo;
    this.#cola = nodo;
    this.#longitud++;
  }
}
```

--

### Recorrer en ambos sentidos

Se agregan dentro de `ListaDoble`. El iterador recorre desde la cabeza; `inverso()` recorre desde la cola.

```js
  *[Symbol.iterator]() {
    for (let n = this.#cabeza; n; n = n.siguiente) yield n.valor;
  }

  *inverso() {
    for (let n = this.#cola; n; n = n.anterior) yield n.valor;
  }

  get longitud() {
    return this.#longitud;
  }
```

- Recorrer hacia atrás es posible porque cada nodo conoce a su `anterior`; en la lista simple habría que invertirla primero.
- Si un enlace `anterior` queda mal, el recorrido hacia adelante sigue funcionando y el error pasa desapercibido: por eso las pruebas recorren ambos sentidos.

--

### Eliminar un nodo sin perder enlaces

Hay que reconectar **los dos vecinos** y actualizar la cabeza o la cola si el nodo estaba en un extremo.

```text
antes:    [ "A" ] <--> [ "B" ] <--> [ "C" ]
después:  [ "A" ] <-------------> [ "C" ]     "B" ya no es alcanzable
```

```js
  eliminarSi(predicado) {
    for (let nodo = this.#cabeza; nodo; nodo = nodo.siguiente) {
      if (!predicado(nodo.valor)) continue;
      if (nodo.anterior) nodo.anterior.siguiente = nodo.siguiente;
      else this.#cabeza = nodo.siguiente;
      if (nodo.siguiente) nodo.siguiente.anterior = nodo.anterior;
      else this.#cola = nodo.anterior;
      this.#longitud--;
      return true;
    }
    return false;
  }
```

- Cubre cuatro casos: eliminar la **cabeza**, la **cola**, un nodo **intermedio** y un valor **inexistente**.
- Si olvidas actualizar `#cola`, quedaría una referencia a un nodo eliminado: un error y una fuga a la vez.

--

### Aplicación: historial con navegación bidireccional

Un historial de navegación o de operaciones solo necesita moverse **atrás** y **adelante** desde una posición actual.

```js
class Historial {
  #actual = null;

  visitar(pagina) {
    const nodo = { valor: pagina, anterior: this.#actual, siguiente: null };
    if (this.#actual) this.#actual.siguiente = nodo;
    this.#actual = nodo;
  }

  atras() {
    if (this.#actual?.anterior) this.#actual = this.#actual.anterior;
    return this.#actual?.valor;
  }

  adelante() {
    if (this.#actual?.siguiente) this.#actual = this.#actual.siguiente;
    return this.#actual?.valor;
  }
}
```

--

### Usar el historial

```js
const h = new Historial();
h.visitar("inicio");
h.visitar("cursos");
h.visitar("notas");
console.log(h.atras());    // cursos
console.log(h.atras());    // inicio
console.log(h.adelante()); // cursos
h.visitar("perfil");       // descarta "notas"
console.log(h.adelante()); // perfil (no hay página siguiente)
console.log(h.atras());    // cursos
```

- Al visitar una página nueva desde el medio, el «futuro» anterior se descarta, igual que en un navegador.
- `atras()` y `adelante()` no se salen de los extremos: si no hay nodo, conservan la posición actual.

--

### Pruebas de la lista doble: recorrido

Guarda las pruebas como `lista-doble.test.js` y ejecútalas con `node --test`.

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { ListaDoble } = require("./lista-doble");

function crear(...valores) {
  const lista = new ListaDoble();
  for (const valor of valores) lista.agregarAlFinal(valor);
  return lista;
}

test("recorre en ambos sentidos", () => {
  const lista = crear("A", "B", "C");
  lista.agregarAlInicio("Z");
  assert.deepEqual([...lista], ["Z", "A", "B", "C"]);
  assert.deepEqual([...lista.inverso()], ["C", "B", "A", "Z"]);
  assert.equal(lista.longitud, 4);
});
```

- Verifica siempre **los dos sentidos** de recorrido: un enlace `anterior` roto no se nota al recorrer solo hacia adelante.

--

### Pruebas de la lista doble: eliminación

Estas pruebas continúan en el mismo archivo, `lista-doble.test.js`.

```js
test("eliminarSi mantiene los enlaces en cabeza, medio y cola", () => {
  const lista = crear(1, 2, 3, 4);
  assert.equal(lista.eliminarSi((v) => v === 1), true);
  assert.equal(lista.eliminarSi((v) => v === 3), true);
  assert.equal(lista.eliminarSi((v) => v === 4), true);
  assert.deepEqual([...lista], [2]);
  assert.deepEqual([...lista.inverso()], [2]);
});

test("eliminarSi devuelve false si no existe; la lista vacía funciona", () => {
  const lista = crear(1);
  assert.equal(lista.eliminarSi((v) => v === 9), false);
  assert.equal(lista.eliminarSi((v) => v === 1), true);
  assert.deepEqual([...lista], []);
  lista.agregarAlFinal(7);
  assert.deepEqual([...lista.inverso()], [7]);
});
```

- Cada prueba cubre una situación distinta de los extremos: cabeza, medio, cola, valor inexistente y lista vacía.

--

### Costos: lista simple frente a lista doble

| Operación | Simple (solo cabeza) | Doble (cabeza y cola) |
| --- | --- | --- |
| `agregarAlInicio` | O(1) | O(1) |
| `agregarAlFinal` | O(n) | O(1) |
| Recorrer hacia atrás | No es posible | O(n) |
| Buscar o `eliminarSi` | O(n) | O(n) |
| Eliminar un nodo ya localizado | O(n) si hay que buscar su anterior | O(1) |
| Memoria por nodo | 1 referencia | 2 referencias |

- Elige la lista doble cuando necesites **navegar en ambos sentidos** o quitar nodos de los extremos con frecuencia.
- Si solo recorres hacia adelante, la lista simple ahorra memoria y enlaces que mantener.

---

# 1.4.2 Pilas (stack) y colas (queue)

### Cola con nodos: frente y final

Una cola necesita acceso a **ambos extremos**: `enqueue` agrega por el final y `dequeue` quita por el frente. Con una lista enlazada que conserva referencias a `#frente` y `#final`, ambas operaciones son O(1).

```text
frente --> [ "Ana" | sig ] --> [ "Luis" | sig ] --> [ "Eva" | null ] <-- final
```

- Quitar el primer elemento de un arreglo (`shift`) obliga, en general, a desplazar los demás. Los motores aplican optimizaciones, así que conviene medir (ver 1.2.1).
- Con nodos, `dequeue` solo mueve la referencia `#frente` al siguiente nodo.

--

### Implementar Cola

Guarda la clase como `cola.js`. `#frente` apunta al nodo que sale; `#final`, al último que entró.

```js
class Cola {
  #frente = null;
  #final = null;

  enqueue(valor) {
    const nodo = { valor, siguiente: null };
    if (this.#final) this.#final.siguiente = nodo;
    else this.#frente = nodo;
    this.#final = nodo;
  }

  dequeue() {
    if (!this.#frente) return undefined;
    const { valor, siguiente } = this.#frente;
    this.#frente = siguiente;
    if (!siguiente) this.#final = null;
    return valor;
  }

  peek() {
    return this.#frente?.valor;
  }
}
```

--

### Uso y casos borde de la cola

```js
const turnos = new Cola();
turnos.enqueue("Ana");
turnos.enqueue("Luis");
turnos.enqueue("Eva");

console.log(turnos.dequeue()); // Ana
console.log(turnos.peek());    // Luis

turnos.dequeue();
turnos.dequeue();
console.log(turnos.dequeue()); // undefined (cola vacía)
turnos.enqueue("Zoe");
console.log(turnos.peek());    // Zoe
```

- Cubre tres casos: cola **vacía**, vaciar la cola y volver a **agregar**, y un solo elemento.
- Al quedar vacía, `#final` vuelve a `null`. Si siguiera apuntando al nodo eliminado, lo mantendría alcanzable: sería una pequeña fuga de memoria.

--

### Pila con nodos y comparación de costos

La pila solo necesita un extremo: la **cima**. `push` y `pop` operan sobre la cabeza de la lista.

```js
class PilaEnlazada {
  #cima = null;

  push(valor) {
    this.#cima = { valor, siguiente: this.#cima };
  }

  pop() {
    if (!this.#cima) return undefined;
    const { valor, siguiente } = this.#cima;
    this.#cima = siguiente;
    return valor;
  }
}
```

| Estructura | Inserta | Quita | Nota |
| --- | --- | --- | --- |
| Pila con nodos | `push` O(1) | `pop` O(1) | Un objeto por elemento |
| Pila con arreglo | `push` O(1) amortizado | `pop` O(1) | Memoria contigua |
| Cola con nodos | `enqueue` O(1) | `dequeue` O(1) | Requiere `#frente` y `#final` |
| Cola con arreglo | `push` O(1) amortizado | `shift` hasta O(n) | Depende del motor: mide |

---

# 1.5.1 Búsqueda simple y orden de complejidad (complemento de R1)

### Medir el trabajo: orden de complejidad

La notación **O(f(n))** describe cómo crece el trabajo del algoritmo con el tamaño de la entrada `n`. No da el tiempo exacto: ignora constantes y depende del peor caso, del promedio o del mejor caso según se indique.

| Orden | Nombre | Ejemplo | Comparaciones con n = 1 000 000 |
| --- | --- | --- | --- |
| O(1) | Constante | `arreglo[i]` | 1 |
| O(log n) | Logarítmico | Búsqueda binaria | unas 20 |
| O(n) | Lineal | Búsqueda secuencial | hasta 1 000 000 |

--

### Búsqueda secuencial

Recorre los elementos uno por uno hasta encontrar el objetivo. No exige que los datos estén ordenados. Devuelve también cuántas comparaciones hizo.

```js
function buscarSecuencial(arreglo, objetivo) {
  let comparaciones = 0;
  for (let i = 0; i < arreglo.length; i++) {
    comparaciones++;
    if (arreglo[i] === objetivo) return { indice: i, comparaciones };
  }
  return { indice: -1, comparaciones };
}
```

- **Mejor caso:** el objetivo está al inicio, O(1). **Peor caso:** está al final o no existe, O(n).
- Funciona igual sobre un arreglo, una lista enlazada o un archivo leído por bloques.

--

### Búsqueda binaria

Exige datos **ordenados** y acceso directo por índice. En cada paso descarta la mitad del rango.

```js
function buscarBinaria(ordenado, objetivo) {
  let bajo = 0;
  let alto = ordenado.length - 1;
  let comparaciones = 0;

  while (bajo <= alto) {
    const medio = Math.floor((bajo + alto) / 2);
    comparaciones++;
    if (ordenado[medio] === objetivo) return { indice: medio, comparaciones };
    if (ordenado[medio] < objetivo) bajo = medio + 1;
    else alto = medio - 1;
  }
  return { indice: -1, comparaciones };
}
```

- Cada iteración reduce el rango a la mitad: con un millón de elementos bastan unas 20 comparaciones.
- Caso borde: si el objetivo no existe, el ciclo termina cuando `bajo` supera a `alto` y devuelve `-1`.

--

### Comparar con datos: contar operaciones

```js
const n = 1_000_000;
const datos = Array.from({ length: n }, (_, i) => i * 2); // 0, 2, 4, ...

console.log(buscarSecuencial(datos, 1_999_998));
// { indice: 999999, comparaciones: 1000000 }
console.log(buscarBinaria(datos, 1_999_998));
// { indice: 999999, comparaciones: 20 }
console.log(buscarBinaria(datos, 7));
// { indice: -1, comparaciones: 20 }
console.log(buscarSecuencial(datos, 7));
// { indice: -1, comparaciones: 1000000 }
```

- Contar **comparaciones** muestra el orden de complejidad sin depender del equipo; medir **tiempo** (con `performance.now()`) muestra el costo real.
- Usa ambas: el conteo explica por qué, y el tiempo confirma cuánto.

--

### Criterios para elegir una búsqueda

| Estructura | Búsqueda típica | Costo |
| --- | --- | --- |
| Arreglo sin ordenar | Secuencial | O(n) |
| Arreglo ordenado | Binaria | O(log n) |
| Lista enlazada | Secuencial (no hay acceso por índice) | O(n) |
| `Set` / `Map` | Por valor o por clave | Sublineal en promedio según la especificación: mide |

- La búsqueda binaria no sirve en una lista enlazada: llegar al elemento del medio ya cuesta O(n).
- **Ordenar también cuesta.** La búsqueda binaria compensa si buscas muchas veces o si los datos ya están ordenados (los métodos de ordenación se ven en la Unidad 2).
- Menos comparaciones significan menos ciclos de CPU y menos consumo de energía: otra razón para elegir bien la estructura.
