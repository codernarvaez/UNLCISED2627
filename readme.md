# UNL Projects

Repositorio de materiales académicos de la Universidad Nacional de Loja.

## Estructura del repositorio

```text
.
├── readme.md
└── presentaciones/
    ├── index.html
    ├── contenido.md
    ├── css/
    │   └── custom-theme.css
    ├── img/
    │   ├── computacion.jpeg
    │   └── logounl.png
    └── js/
        └── config.js
```

## Presentaciones

### Índice de contenidos

1. **Conceptos fundamentales y abstracción**: TDA, encapsulamiento, clases ES6, campos privados e interfaces implícitas.
2. **Memoria en JavaScript**: valores primitivos y objetos, referencias, `process.memoryUsage()` y herramientas de inspección.
3. **Arreglos, conjuntos y registros**: `Array`, `TypedArray`, `Set`, `Map` y objetos.
4. **Gestión de archivos**: lectura secuencial con streams y acceso aleatorio mediante offsets.
5. **Persistencia de datos**: archivos JSON y binarios, `localStorage` e IndexedDB.

- `presentaciones/index.html`: estructura del deck Reveal.js y carga de plugins.
- `presentaciones/contenido.md`: contenido de las diapositivas técnicas; `---` separa slides horizontales y `--` crea slides verticales.
- `presentaciones/css/custom-theme.css`: estilos institucionales, tipografía Montserrat y formato de las slides Markdown.
- `presentaciones/js/config.js`: configuración de Reveal.js, navegación y plugins.
- `presentaciones/img/`: recursos gráficos usados por la presentación.

## Ejecución local

Desde la raíz del repositorio, inicia un servidor HTTP:

```bash
python3 -m http.server 8000
```

Abre <http://localhost:8000/presentaciones/> en el navegador. La presentación carga Reveal.js y Montserrat desde CDN, por lo que necesita conexión a Internet.