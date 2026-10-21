process.memoryUsage().heapUsed

// Código base para el estudiante
let notaPrimitiva1 = 85;
let notaPrimitiva2 = notaPrimitiva1;
notaPrimitiva2 = 95;

class Estudiante {
  constructor(nombre, nota) {
    this.nombre = nombre;
    this.nota = nota;
  }
}

let e1 = new Estudiante("Carlos", 85);
let e2 = e1; // Copia de referencia (Alias)
e2.nota = 95;