// ==========================================
// EJEMPLO: Evolución de Memoria en JavaScript
// ==========================================

function demoMemoria() {
    // T0: Declaración e instanciación (Stack guarda la referencia; Heap guarda el objeto)
    let obj1 = { valor: 10 };

    // T1: Aliasing (obj2 copia la DIRECCIÓN de obj1, NO el objeto)
    let obj2 = obj1;

    // Mutación compartida
    obj2.valor = 99; // obj1.valor también cambia a 99 porque apuntan al mismo bloque

    // T2: Reasignación de referencia
    obj1 = { valor: 20 }; // obj1 ahora apunta a un NUEVO objeto en otra dirección del Heap

    // T3: Liberación de referencia y Garbage Collection
    obj2 = null; // El objeto { valor: 99 } se queda sin referencias (queda huérfano)
}

demoMemoria();