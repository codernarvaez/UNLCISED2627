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

# 1.3.1 Gestión de memoria estática y asignación dinámica de memoria

### Estrategias de asignación de memoria

| Tipo de memoria | Dónde y cuándo se asigna | Control y ciclo de vida | Ventajas y limitaciones |
| --- | --- | --- | --- |
| **Estática** | En tiempo de compilación / carga; tamaño fijo en la pila (*stack*) o segmentos globales. | Administrada por el sistema; persiste durante toda la ejecución del bloque o programa. | Acceso ultra rápido y predeterminado; inflexible ante volúmenes de datos imprevistos. |
| **Dinámica** | En tiempo de ejecución mediante solicitudes explícitas al montón (*heap*). | Manual (C/C++) o automatizada por recolectores de basura (JavaScript, Java, Python). | Flexibilidad total para estructuras de tamaño variable; sobrecarga por gestión y fragmentación. |

En lenguajes de alto nivel con entornos administrados (V8 en JavaScript, JVM en Java), la asignación dinámica es transparente, pero comprender el costo de crear objetos ayuda a evitar fugas lógicas de memoria.

--

### Simulación en JavaScript: Memoria contigua estática vs. Heap dinámico

El siguiente script muestra cómo un `ArrayBuffer` fija un espacio de memoria estático y de tamaño rígido, mientras que un arreglo estándar o un objeto crece de forma dinámica en el heap del motor.

```js
const { performance } = require("node:perf_hooks");

// 1. Asignación de tamaño fijo / estilo estático (ArrayBuffer de 1 MB)
const inicioEstatico = performance.now();
const bufferFijo = new ArrayBuffer(1024 * 1024);
const vistaDatos = new Float64Array(bufferFijo);
for (let i = 0; i < vistaDatos.length; i++) {
  vistaDatos[i] = i * 1.1;
}
const tiempoEstatico = performance.now() - inicioEstatico;

// 2. Asignación dinámica incremental (Arreglo convencional)
const inicioDinamico = performance.now();
const arregloDinamico = [];
for (let i = 0; i < 131072; i++) {
  arregloDinamico.push(i * 1.1);
}
const tiempoDinamico = performance.now() - inicioDinamico;


console.log(`ArrayBuffer estático creado en: ${tiempoEstatico.toFixed(3)} ms`);
console.log(`Arreglo dinámico creado en: ${tiempoDinamico.toFixed(3)} ms`);
console.log("Capacidad estática fija (elementos):", vistaDatos.length);
console.log("Tamaño dinámico actual:", arregloDinamico.length);

```

### Ciclo de vida y comportamiento interno en motores como V8

En motores orientados a JavaScript (como V8), la asignación dinámica en el *heap* se divide habitualmente en dos espacios principales:

- **New Space (Espacio Nuevo / Nurseries):** Donde se asignan objetos jóvenes o recién creados. Es un área pequeña pero muy dinámica gestionada mediante un recolector basado en copias (*Scavenge*).
- **Old Space (Espacio Viejo):** Donde se promueven los objetos que han sobrevivido a múltiples ciclos de recolección. Utiliza algoritmos de marcado y barrido (*Mark-Sweep-Compact*).

Entender esta separación ayuda a dimensionar el impacto de reutilizar estructuras en lugar de instanciar miles de objetos efímeros que fuercen la promoción al espacio viejo.

```js
// Ejemplo: Reutilización de objetos para evitar presión en el Heap dinámico
class CoordenadaReutilizable {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  actualizar(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }
}

// En lugar de hacer 'new CoordenadaReutilizable()' miles de veces en un ciclo:
const puntoTemporal = new CoordenadaReutilizable();
function procesarEventos(datos) {
  for (let i = 0; i < datos.length; i++) {
    puntoTemporal.actualizar(datos[i].x, datos[i].y);
    // Operaciones con puntoTemporal sin generar basura innecesaria
  }
}
procesarEventos([{x: 10, y: 20}, {x: 15, y: 25}]);
console.log("Coordenada reutilizada:", puntoTemporal.x, puntoTemporal.y);

```

### Consideraciones de rendimiento, costos y diseño

- **Predicción de tamaño:** Si conoces de antemano el volumen máximo de datos (por ejemplo, procesamiento de tramas de red o matrices de audio), la memoria estática o buffers tipados evitan la reasignación constante de memoria.
- **Costo de redimensionamiento dinámico:** Cuando un arreglo dinámico se queda sin capacidad reservada en memoria contigua, el motor debe solicitar un bloque nuevo más grande, copiar todos los elementos anteriores y liberar el bloque viejo.
- **Presión sobre el recolector de basura (*Garbage Collector*):** Una alta tasa de creación y descarte de objetos dinámicos pequeños satura el *heap*, provocando pausas breves (*stop-the-world*) que afectan el rendimiento en aplicaciones de tiempo real.
- **Alineación de memoria:** Los bloques estáticos de tipo binario permiten un acceso optimizado por parte del procesador al alinear correctamente los bytes según la arquitectura subyacente.

Referencia: [Gestión de memoria en MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management).

# 1.3.2 Administración de punteros, referencias y auditoría de fugas de memoria

### Referencias, punteros y gestión en lenguajes administrados

| Concepto | Mecanismo | Comportamiento y alcance |
| --- | --- | --- |
| **Puntero (Puro)** | Memoria directa | Dirección de memoria explícita (común en C/C++); permite aritmética de punteros pero conlleva riesgos de seguridad y corrupción. |
| **Referencia** | Enlace indirecto | Identificador o alias a un objeto en el *heap* (usado en JavaScript, Java, Python); oculta direcciones físicas de memoria. |
| **Alcance y Alcance Léxico** | Visibilidad de variables | Determina qué referencias son accesibles en un momento dado de la ejecución y cuándo los objetos quedan huérfanos. |

JavaScript no expone punteros de memoria físicos ni permite aritmética de punteros por razones de seguridad y abstracción, operando estrictamente mediante referencias a objetos almacenados en el *heap*.

--

### Simulación de referencias y referencias débiles (`WeakMap`)

En JavaScript, las referencias fuertes mantienen los objetos en memoria aunque ya no sean necesarios en la lógica principal, lo que puede desencadenar fugas si no se limpian adecuadamente. `WeakMap` permite asociar metadatos a objetos sin impedir que el recolector de basura los elimine.

```js
// Referencia fuerte convencional
let cacheGlobal = new Map();
function registrarObjeto(id, datos) {
  cacheGlobal.set(id, datos);
}

registrarObjeto(1, { metricas: [10, 20, 30] });
// Aunque la referencia local 'datos' desaparezca, cacheGlobal la retiene fuertemente.

// Referencia débil para evitar retención innecesaria
let cacheDebil = new WeakMap();
let usuario = { id: 42, nombre: "Freddy" };

cacheDebil.set(usuario, { ultimoAcceso: Date.now() });
console.log("Metadatos recuperados:", cacheDebil.get(usuario));

// Si 'usuario' se anula o sale de ámbito, el recolector podrá liberar la memoria asociada:
usuario = null;
```

### Auditoría y detección de fugas de memoria (*Memory Leaks*)

Una fuga de memoria ocurre cuando objetos que ya no son necesarios siguen siendo alcanzables por una referencia activa en la aplicación. Las causas comunes en entornos web y Node.js incluyen:

- **Listeners de eventos huérfanos:** No remover eventos (`removeEventListener`) en elementos del DOM eliminados.
- **Temporizadores activos:** Funciones en `setInterval` o cierres léxicos (*closures*) que capturan variables pesadas indefinidamente.
- **Variables globales accidentales:** Asignar propiedades a objetos globales sin la palabra clave `let`, `const` o `var`.

```js
// Ejemplo de auditoría básica del Heap en Node.js para detectar fugas
const fugitivo = [];

function simularFuga() {
  // Acumula elementos indefinidamente simulando una fuga lógica
  for (let i = 0; i < 10000; i++) {
    fugitivo.push(new Array(1000).fill(Math.random()));
  }
  const usoMemoria = process.memoryUsage().heapUsed / 1024 / 1024;
  console.log(`Heap usado actual: ${usoMemoria.toFixed(2)} MB`);
}

// Monitoreo periódico del crecimiento anómalo de memoria
// simularFuga();
```

### Herramientas de diagnóstico y criterios de diseño

- **Chrome DevTools (Memory Panel):** Permite tomar *Heap Snapshots* y realizar comparaciones (*Comparison View*) para identificar objetos que crecen de manera inesperada entre interacciones del usuario.
- **Node.js Inspector y `heapdump`:** Útil para generar instantáneas del proceso en servidores y analizarlas externamente en busca de rutas de retención (*Retainer paths*).
- **Patrones de limpieza defensiva:** Asegúrate de cancelar suscripciones, limpiar arreglos globales y anular temporizadores cuando los componentes o vistas de la aplicación se destruyen.

```js
// Ejemplo: Patrón de limpieza defensiva para evitar fugas con temporizadores y referencias
class GestorSuscripciones {
  constructor() {
    this.datosTemporales = new Array(500000).fill("Buffer de datos");
    this.intervalId = setInterval(() => {
      console.log("Ejecutando tarea periódica... Elementos activos:", this.datosTemporales.length);
    }, 1000);
  }

  // Método de limpieza defensiva para destruir el componente correctamente
  destruir() {
    // 1. Limpiar el temporizador activo para evitar retención por closures
    clearInterval(this.intervalId);
    this.intervalId = null;

    // 2. Anular referencias pesadas para permitir la acción del Garbage Collector
    this.datosTemporales = null;
    console.log("Gestor destruido y memoria liberada de forma defensiva.");
  }
}

const gestor = new GestorSuscripciones();

// Simulamos que el componente o vista se cierra después de 3 segundos
setTimeout(() => {
  gestor.destruir();
}, 3000);

```

### Closures y retención implícita de memoria

Una **clausura (*closure*)** ocurre cuando una función interna recuerda y accede a las variables de su ámbito léxico exterior, incluso después de que la función exterior haya terminado de ejecutarse. Si un closure retiene una referencia a un objeto pesado de forma indefinida, puede convertirse en una fuente silenciosa de fugas de memoria.

```js
function crearSistemaMonitoreo() {
  // Objeto pesado retenido en el ámbito léxico
  const datosPesados = new Array(1000000).fill("Registro crítico del sistema");

  return function() {
    // El closure mantiene vivo a 'datosPesados' en cada ejecución
    console.log("Elementos en memoria del sistema:", datosPesados.length);
  };
}

const monitor = crearSistemaMonitoreo();
// Mientras 'monitor' exista, 'datosPesados' no podrá ser recolectado por el GC.
monitor();
```

### Estrategias de mitigación y buenas prácticas

- **Liberación explícita de referencias:** Asigna `null` o `undefined` a las variables de objetos grandes, arreglos o elementos del DOM cuando ya no se necesiten, permitiendo que el motor marque el bloque como inalcanzable.
- **Uso de colecciones débiles (`WeakSet` y `WeakMap`):** Ideales para almacenar datos asociados a objetos sin interferir en su ciclo de vida ni forzar referencias fuertes.
- **Auditorías de instantáneas (*Heap Snapshots*):** Compara dos capturas de memoria en diferentes momentos de la ejecución de tu aplicación para aislar qué clases o constructores incrementan su conteo sin justificarse.

Referencia: [Guía de Memory Leaks en MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management#memory_management_in_javascript).

# 1.3.3 Ciclo de vida de los objetos y estados de memoria en la pila (Stack) y el montón (Heap)

### Pila (*Stack*) vs. Montón (*Heap*): Dinámica y Arquitectura

| Característica | Pila (*Stack*) | Montón (*Heap*) |
| --- | --- | --- |
| **Estructura de datos** | LIFO (Last In, First Out); asignación contigua y lineal. | Estructura jerárquica no contigua administrada por el motor. |
| **Velocidad de acceso** | Ultra rápida; gestionada mediante punteros de registro de CPU (`SP`). | Más lenta; requiere resolución de referencias y seguimiento. |
| **Ciclo de vida** | Automático; los datos mueren al salir de su ámbito léxico (*scope*). | Dinámico; los objetos persisten hasta que el recolector de basura los elimina. |
| **Almacenamiento** | Tipos primitivos y referencias directas a objetos. | Estructuras complejas, objetos dinámicos, closures y arreglos grandes. |

La distinción entre *stack* y *heap* define el rendimiento de asignación de variables y el comportamiento de los ámbitos de ejecución en JavaScript.

--

### Simulación del ciclo de vida y ámbitos en la Pila

Cuando una función es invocada, se crea un nuevo marco (*stack frame*) en la pila que aloja sus variables locales y parámetros. Al finalizar la ejecución, el marco se desapila automáticamente.

```js
function calcularAreaRectangulo(ancho, alto) {
  // 'ancho', 'alto' y 'resultado' viven temporalmente en la pila (stack frame)
  const resultado = ancho * alto;
  return resultado;
}

const total = calcularAreaRectangulo(10, 5);
console.log("Resultado calculado en la pila:", total);
// Al salir de la función, el espacio del stack frame es liberado de forma instantánea.
```

### Transición de estados de objetos en el *Heap* y Recolección de Basura

En lenguajes administrados como JavaScript, los objetos pasan por distintas fases dentro del ciclo de vida del *heap*:

1. **Asignación (*Allocation*):** El objeto es creado dinámicamente y se le reserva espacio en el *New Space* del *heap*.
2. **Uso (*Use*):** El programa lee y escribe propiedades a través de referencias activas.
3. **Inalcanzabilidad (*Unreachability*):** El objeto deja de tener referencias activas desde la raíz (*Roots* / ámbito global o llamadas vigentes).
4. **Liberación (*Collection*):** El recolector de basura identifica la falta de referencias y libera el bloque de memoria.

```js
// Ejemplo: Ciclo de vida y pérdida de alcanzabilidad
let vehiculo = { marca: "Toyota", modelo: "Corolla" }; // 1. Asignado y en uso

function actualizarVehiculo() {
  let temporal = vehiculo; // Referencia activa compartida
  console.log("Vehículo actual:", temporal.modelo);
}

actualizarVehiculo();

vehiculo = null; // 3. El objeto original pierde su última referencia y pasa a ser inalcanzable (listo para el GC)
```

### Algoritmos del recolector de basura y fragmentación de memoria

Los motores de JavaScript gestionan el *heap* aplicando algoritmos especializados para reciclar memoria sin detener la ejecución de forma abrupta:

- **Scavenge (Algoritmo de copia):** Divide el espacio de objetos jóvenes en dos semiespacios (*From* y *To*). Cuando uno se llena, los objetos vivos se copian de manera contigua al otro, eliminando la fragmentación y barriendo instantáneamente los objetos muertos.
- **Mark-Sweep-Compact (Marcar, Barrer y Compactar):** Utilizado en el espacio de objetos longevos (*Old Space*). Primero marca las referencias activas desde las raíces (*Roots*), "barre" los bloques huérfanos y compacta la memoria reorganizando los datos.
- **Fragmentación de memoria:** Ocurre cuando existe memoria libre total suficiente, pero está dividida en pequeños huecos dispersos, lo que impide asignar bloques contiguos grandes.

```js
// Ejemplo ilustrativo: Creación masiva de objetos efímeros que activan el ciclo Scavenge
function generarCargaTemporal() {
  for (let i = 0; i < 50000; i++) {
    // Objetos creados en el New Space que mueren inmediatamente al terminar la iteración
    const objetoTemporal = { id: i, payload: "datos efímeros" };
  }
}

console.time("Carga temporal en Heap");
generarCargaTemporal();
console.timeEnd("Carga temporal en Heap");
```

### Consideraciones de diseño y optimización

- **Duración del ámbito (*Scope Lifespan*):** Mantén las variables locales dentro del menor ámbito posible para que la pila las descarte de inmediato y no saturen contextos superiores.
- **Evitar retención fantasma:** Un objeto complejo que sobrevive innecesariamente en una variable global o estructura de larga duración fuerza su promoción al *Old Space*, incrementando el consumo general de memoria de la aplicación.
- **Previsión de estructuras eficientes:** Para datos primitivos masivos o cálculos numéricos repetitivos, valora el uso de estructuras tipadas en memoria contigua en lugar de poblar el *heap* con miles de objetos planos idénticos.

Referencia: [Modelo de memoria y Garbage Collection en V8](https://v8.dev/blog/trash-talk).

# 1.4.1 Listas enlazadas (listas simples y listas doblemente enlazadas)

### Comparativa de estructuras enlazadas

| Tipo de lista | Estructura de nodos | Direccionalidad del recorrido | Ventajas y limitaciones |
| --- | --- | --- | --- |
| **Lista Simple** | Cada nodo contiene un valor y un puntero `siguiente` (*next*). | Unidireccional (hacia adelante). | Menor consumo de memoria por nodo; recorrer hacia atrás requiere reiniciar la búsqueda desde la cabeza. |
| **Lista Doblemente Enlazada** | Cada nodo contiene un valor, un puntero `siguiente` y un puntero `anterior` (*prev*). | Bidireccional (adelante y atrás). | Facilita eliminaciones eficientes y recorridos inversos; mayor sobrecarga de memoria por nodo. |

A diferencia de los arreglos contiguos, las listas enlazadas no requieren reasignar ni mover bloques masivos de memoria al insertar o eliminar elementos; operan mediante la reasignación de referencias.

--

### Implementación en JavaScript: Nodo y Lista Enlazada Simple

El siguiente código implementa una lista enlazada simple con operaciones básicas de inserción al final y recorrido, manejando nodos mediante clases de ES6.

```js
class NodoSimple {
  constructor(valor) {
    this.valor = valor;
    this.siguiente = null;
  }
}

class ListaSimple {
  constructor() {
    this.cabeza = null;
  }

  agregar(valor) {
    const nuevoNodo = new NodoSimple(valor);
    if (!this.cabeza) {
      this.cabeza = nuevoNodo;
      return;
    }
    let actual = this.cabeza;
    while (actual.siguiente) {
      actual = actual.siguiente;
    }
    actual.siguiente = nuevoNodo;
  }

  imprimir() {
    let actual = this.cabeza;
    const elementos = [];
    while (actual) {
      elementos.push(actual.valor);
      actual = actual.siguiente;
    }
    console.log(elementos.join(" -> ") + " -> null");
  }
}

const lista = new ListaSimple();
lista.agregar("Elemento A");
lista.agregar("Elemento B");
lista.imprimir(); // Elemento A -> Elemento B -> null
```

### Implementación en JavaScript: Lista Doblemente Enlazada

La lista doble permite un control bidireccional eficiente, útil para estructuras como historiales de navegación, deshacer/rehacer (*undo/redo*) o colas de prioridad avanzadas.

```js
class NodoDoble {
  constructor(valor) {
    this.valor = valor;
    this.siguiente = null;
    this.anterior = null;
  }
}

class ListaDoblementeEnlazada {
  constructor() {
    this.cabeza = null;
    this.cola = null;
  }

  agregarAlFinal(valor) {
    const nuevoNodo = new NodoDoble(valor);
    if (!this.cabeza) {
      this.cabeza = nuevoNodo;
      this.cola = nuevoNodo;
    } else {
      this.cola.siguiente = nuevoNodo;
      nuevoNodo.anterior = this.cola;
      this.cola = nuevoNodo;
    }
  }

  recorrerInverso() {
    let actual = this.cola;
    const elementos = [];
    while (actual) {
        elementos.push(actual.valor);
        actual = actual.anterior;
    }
    console.log(elementos.join(" <- ") + " <- inicio");
  }
}

const listaDoble = new ListaDoblementeEnlazada();
listaDoble.agregarAlFinal(10);
listaDoble.agregarAlFinal(20);
listaDoble.recorrerInverso(); // 20 <- 10 <- inicio
```

### Nodos centinela y optimización de operaciones en listas enlazadas

Para evitar comprobaciones repetitivas de valores `null` en los extremos (como al insertar o eliminar elementos en la cabeza o la cola), las implementaciones avanzadas suelen utilizar **nodos centinela** (*dummy nodes*):

- **Nodo Centinela de Cabecera:** Un nodo ficticio colocado antes del primer elemento real de la lista. Simplifica el código de inserción y eliminación al garantizar que siempre existe un nodo previo.
- **Inserción eficiente en O(1):** Si mantienes una referencia directa a la cola (*tail*) en una lista doblemente enlazada, agregar elementos al final o eliminar un nodo conocido se realiza en tiempo constante de orden $O(1)$.

```js
class ListaConCentinela {
  constructor() {
    // Nodo centinela inicial que simplifica la estructura
    this.cabeza = { valor: null, siguiente: null };
    this.longitud = 0;
  }

  insertarAlInicio(valor) {
    const nuevoNodo = { valor: valor, siguiente: this.cabeza.siguiente };
    this.cabeza.siguiente = nuevoNodo;
    this.longitud++;
  }

  obtenerPrimerValor() {
    return this.cabeza.siguiente ? this.cabeza.siguiente.valor : null;
  }
}

const listaOptimizada = new ListaConCentinela();
listaOptimizada.insertarAlInicio("Dato prioritario");
console.log("Primer elemento mediante centinela:", listaOptimizada.obtenerPrimerValor());
```

### Criterios de selección frente a Arreglos (*Arrays*)

- **Cuándo usar Listas Enlazadas:** Cuando la aplicación requiere inserciones y eliminaciones masivas en posiciones intermedias o al inicio, y el tamaño de la estructura es altamente impredecible.
- **Cuándo evitar Listas Enlazadas:** Cuando se requiere acceso aleatorio frecuente por índice (`lista[i]`), ya que una lista enlazada obligaría a recorrer los nodos secuencialmente desde el inicio con un costo de $O(n)$, a diferencia del acceso directo $O(1)$ de los arreglos.

### Consideraciones de rendimiento y diseño

- **Complejidad temporal:** Insertar o eliminar al inicio de una lista enlazada tiene un costo de $O(1)$ si se dispone de la referencia directa, mientras que buscar o insertar al final requiere $O(n)$ debido al recorrido secuencial de los punteros.
- **Localidad de referencia:** A diferencia de los arreglos, los nodos de una lista enlazada se distribuyen de forma dispersa en el *heap*, lo que reduce la eficacia de la caché del procesador (*cache misses*).
- **Gestión de memoria:** Cada nodo representa una pequeña instancia de objeto en el *heap*, lo que incrementa la presión sobre el recolector de basura si se crean y descartan masivamente.

Referencia: [Linked Lists en MDN / Conceptos de Estructuras de Datos](https://developer.mozilla.org/).

# 1.4.2 Pilas (stack) y colas (queue)

### Comparativa de TDAs lineales

| Tipo de TDA | Política de Acceso | Operaciones Principales | Casos de Uso Típicos |
| --- | --- | --- | --- |
| **Pila (*Stack*)** | LIFO (Last In, First Out): el último elemento en entrar es el primero en salir. | `push`, `pop`, `peek` | Historial de navegación, control de llamadas (*call stack*), operaciones de deshacer (*undo*). |
| **Cola (*Queue*)** | FIFO (First In, First Out): el elemento más antiguo en entrar es el primero en salir. | `enqueue`, `dequeue`, `peek` | Procesamiento de tareas asíncronas, colas de impresión, recorridos en anchura (BFS) en grafos. |

Ambos Tipos de Datos Abstractos (TDA) imponen restricciones sobre cómo se insertan y extraen los elementos, garantizando un comportamiento predecible y controlado frente a los arreglos de libre acceso.

--

### Implementación en JavaScript: Pila y Cola

El siguiente código muestra implementaciones limpias basadas en clases y encapsulamiento mediante campos privados `#` para ambos tipos de estructuras:

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

  get estaVacia() {
    return this.#elementos.length === 0;
  }
}

class Cola {
  #elementos = [];

  enqueue(valor) {
    this.#elementos.push(valor);
  }

  dequeue() {
    return this.#elementos.shift(); // Extrae del inicio (FIFO)
  }

  peek() {
    return this.#elementos[0];
  }

  get estaVacia() {
    return this.#elementos.length === 0;
  }
}

const pila = new Pila();
pila.push("Paso 1");
pila.push("Paso 2");
console.log(pila.pop()); // Paso 2 (LIFO)

const cola = new Cola();
cola.enqueue("Cliente A");
cola.enqueue("Cliente B");
console.log(cola.dequeue()); // Cliente A (FIFO)
```

### Aplicaciones avanzadas: Validación de paréntesis y colas eficientes

Las pilas y colas no solo estructuran datos lineales, sino que resuelven problemas algorítmicos complejos de manera óptima:

- **Validación de balanceo con Pilas:** Útil para verificar sintaxis en compiladores o editores de código (como comprobar que cada llave `{` o paréntesis `(` abierto tenga su respectivo cierre).
- **Colas basadas en Listas Enlazadas:** Para evitar la complejidad temporal $O(n)$ del método `shift()` de los arreglos estándar en JavaScript, se puede implementar una cola utilizando nodos enlazados, logrando inserciones (`enqueue`) y extracciones (`dequeue`) eficientes en tiempo constante $O(1)$ en ambos extremos.

```js
// Ejemplo: Implementación eficiente de una Cola basada en Nodos (Listas Enlazadas)
class NodoCola {
  constructor(valor) {
    this.valor = valor;
    this.siguiente = null;
  }
}

class ColaOptimizada {
  constructor() {
    this.cabeza = null; // Frente de la cola (para extraer con dequeue)
    this.cola = null;   // Final de la cola (para insertar con enqueue)
    this.longitud = 0;
  }

  enqueue(valor) {
    const nuevoNodo = new NodoCola(valor);
    if (!this.cola) {
      this.cabeza = this.cola = nuevoNodo;
    } else {
      this.cola.siguiente = nuevoNodo;
      this.cola = nuevoNodo;
    }
    this.longitud++;
  }

  dequeue() {
    if (!this.cabeza) return null;
    const valorAEliminar = this.cabeza.valor;
    this.cabeza = this.cabeza.siguiente;
    if (!this.cabeza) {
      this.cola = null; // Si la cola queda vacía, reseteamos la cola
    }
    this.longitud--;
    return valorAEliminar;
  }
}

const colaRapida = new ColaOptimizada();
colaRapida.enqueue("Proceso prioritario 1");
colaRapida.enqueue("Proceso prioritario 2");
console.log(colaRapida.dequeue()); // Proceso prioritario 1 (O(1) real)
```

### Colas de prioridad y Búferes circulares

Además de las pilas y colas tradicionales, existen variantes especializadas fundamentales para optimizar algoritmos de alto rendimiento:

- **Cola de prioridad (*Priority Queue*):** Cada elemento posee una prioridad asociada; los elementos con mayor prioridad se atienden antes que los de menor prioridad, independientemente de su orden de llegada (muy utilizada en algoritmos de grafos como Dijkstra).
- **Búfer circular (*Ring Buffer*):** Una cola de tamaño fijo que reutiliza un arreglo contiguo conectando el final con el inicio mediante aritmética modular. Es ideal para flujos de datos en tiempo real (como *streaming* de audio, vídeo o búferes de red) sin generar sobrecarga en el recolector de basura.

```js
// Ejemplo: Implementación eficiente de un Búfer Circular en un arreglo fijo
class BufferCircular {
  constructor(capacidad) {
    this.capacidad = capacidad;
    this.buffer = new Array(capacidad);
    this.cabeza = 0;
    this.cola = 0;
    this.tamano = 0;
  }

  escribir(valor) {
    this.buffer[this.cola] = valor;
    this.cola = (this.cola + 1) % this.capacidad;
    if (this.tamano < this.capacidad) {
      this.tamano++;
    } else {
      this.cabeza = (this.cabeza + 1) % this.capacidad; // Sobrescribe el elemento más antiguo si está lleno
    }
  }

  leer() {
    if (this.tamano === 0) return null;
    const valor = this.buffer[this.cabeza];
    this.cabeza = (this.cabeza + 1) % this.capacidad;
    this.tamano--;
    return valor;
  }
}

const rb = new BufferCircular(3);
rb.escribir("Dato 1");
rb.escribir("Dato 2");
rb.escribir("Dato 3");
rb.escribir("Dato 4"); // Sobrescribe "Dato 1"
console.log("Leído del buffer:", rb.leer()); // Dato 2

```
### Aplicaciones en grafos: Búsqueda en Profundidad (DFS) y en Anchura (BFS)

Las pilas y las colas son los motores algorítmicos que permiten explorar estructuras no lineales como grafos y árboles:

- **Búsqueda en Profundidad (DFS - *Depth-First Search*):** Utiliza una **Pila** (ya sea explícita o mediante la pila de llamadas de la recursión) para explorar lo más lejos posible a lo largo de cada rama antes de retroceder (*backtracking*).
- **Búsqueda en Anchura (BFS - *Breadth-First Search*):** Utiliza una **Cola** para explorar el grafo nivel por nivel, visitando primero a todos los vecinos directos antes de pasar a los nodos más alejados (fundamental para encontrar caminos más cortos en grafos no ponderados).

```js
// Ejemplo conceptual: Recorrido BFS utilizando una cola eficiente
function busquedaEnAnchura(grafo, nodoInicio) {
  const visitados = new Set();
  const cola = [nodoInicio]; // Usamos un arreglo como cola base
  visitados.add(nodoInicio);
  const ordenRecorrido = [];

  while (cola.length > 0) {
    const nodoActual = cola.shift(); // Extrae el primero (FIFO)
    ordenRecorrido.push(nodoActual);

    for (const vecino of (grafo[nodoActual] || [])) {
      if (!visitados.has(vecino)) {
        visitados.add(vecino);
        cola.push(vecino);
      }
    }
  }
  return ordenRecorrido;
}

const grafoEjemplo = {
  'A': ['B', 'C'],
  'B': ['D', 'E'],
  'C': ['F'],
  'D': [], 'E': [], 'F': []
};

console.log("Recorrido BFS desde A:", busquedaEnAnchura(grafoEjemplo, 'A')); 
// [ 'A', 'B', 'C', 'D', 'E', 'F' ]
```

### Consideraciones de rendimiento y optimización

- **Complejidad en Pilas:** Las operaciones `push` y `pop` al final de un arreglo dinámico operan típicamente en tiempo amortizado de orden $O(1)$.
- **El cuello de botella en Colas simples:** Utilizar `Array.shift()` para extraer elementos al inicio de una cola basada en arreglos estándar obliga al motor a desplazar todos los índices restantes, resultando en un costo ineficiente de orden $O(n)$. Para colas de alto rendimiento con grandes volúmenes de datos, se prefiere una lista enlazada o un búfer circular.
- **Gestión de memoria:** Al igual que otras colecciones, una pila o cola retiene referencias fuertes a sus elementos; si se almacenan objetos pesados, es necesario vaciar o anular las referencias al concluir su procesamiento para facilitar el trabajo del recolector de basura.

Referencia: [Stack and Queue Data Structures Documentation](https://developer.mozilla.org/).