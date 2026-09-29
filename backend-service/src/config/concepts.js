/**
 * Diccionario Modular de los 11 Capítulos Oficiales en Programino eTeacher (Python)
 */
export const ETEACHER_CONCEPTS = {
  cap1_lenguaje: {
    id: "cap1_lenguaje",
    chapterNumber: 1,
    title: "Capítulo 1 - El lenguaje de la computadora",
    keywords: [
      "capitulo 1", "seccion 1.", "1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7",
      "lenguaje de la computadora", "unos y ceros", "serie de simbolos",
      "nos entendemos", "traductor-interprete", "interprete", "binario"
    ],
    pedagogicalFocus:
      "Evaluar la comprensión conceptual sobre la forma y el rol del lenguaje de programación, la representación simbólica y binaria (unos y ceros), cómo se comunican el programador y la computadora, y la función del traductor-intérprete.",
    uncertaintyCriteria:
      "Certeza ALTA cuando la respuesta textual o conceptual refleja o confunde claramente el rol del intérprete y la representación de símbolos. Certeza BAJA si la respuesta es ambigua o telegráfica."
  },

  cap2_pensar: {
    id: "cap2_pensar",
    chapterNumber: 2,
    title: "Capítulo 2 - Pensar como un programador",
    keywords: [
      "capitulo 2", "seccion 2.", "2.1", "2.2", "2.3", "2.4",
      "pensar como un programador", "maestros de la cocina",
      "diagrama de flujo", "descomposicion"
    ],
    pedagogicalFocus:
      "Evaluar la capacidad de descomposición de un problema en pasos secuenciales ordenados, la conversión de un problema cotidiano a una secuencia lógica y la interpretación correcta de diagramas de flujo.",
    uncertaintyCriteria:
      "Certeza ALTA si se identifica con claridad el orden de pasos o el fallo en la secuencia del diagrama de flujo o descomposición. Certeza MEDIA si el estudiante propone pasos alternativos válidos pero desordenados."
  },

  cap3_hablar: {
    id: "cap3_hablar",
    chapterNumber: 3,
    title: "Capítulo 3 - Hablar con tu computadora",
    keywords: [
      "capitulo 3", "seccion 3.", "3.1", "3.2", "3.3", "3.4", "3.5", "3.6",
      "hablar con tu computadora", "mi primer programa", "entrada - salida",
      "entrada", "salida", "print", "input"
    ],
    pedagogicalFocus:
      "Evaluar la estructura del primer programa en Python, la interactividad mediante instrucciones de entrada (input) y salida (print), y la distinción sintáctica entre código ejecutable y cadenas de texto (uso de comillas).",
    uncertaintyCriteria:
      "Certeza ALTA ante errores clásicos de omisión de comillas en textos, confusión entre código y texto o mal uso de input()/print(). Certeza BAJA si el fragmento no permite distinguir la intención interactiva."
  },

  cap4_variables: {
    id: "cap4_variables",
    chapterNumber: 4,
    title: "Capítulo 4 - Variables, valores y tipos",
    keywords: [
      "capitulo 4", "seccion 4.", "4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "4.8", "4.9",
      "variables, valores y tipos", "contenedor como una caja", "mirada dentro de la caja",
      "especie aparte", "programacion con texto", "numeros enteros", "numeros decimales",
      "transformar de uno a otro", "int", "float", "str", "variable"
    ],
    pedagogicalFocus:
      "Evaluar la diferencia entre variables, valores y tipos de datos en Python, la asignación de valores en contenedores, la manipulación de texto (str), enteros (int) y decimales (float), y la conversión explícita de tipos (casting) al operar con entradas.",
    uncertaintyCriteria:
      "Certeza ALTA cuando existen errores de tipos incompatibles (ej. sumar str con int sin convertir), mala asignación de variables o confusión entre int y float. Certeza MEDIA si usa conversiones redundantes."
  },

  cap5_condicionales: {
    id: "cap5_condicionales",
    chapterNumber: 5,
    title: "Capítulo 5 - ¿Qué pasa si? (Condicionales)",
    keywords: [
      "capitulo 5", "seccion 5.", "5.1", "5.2", "5.3", "5.4", "5.5", "5.6", "5.7", "5.8",
      "que pasa si", "montana rusa", "la condicion", "cumplido o no",
      "algo mas", "un paso mas alla", "compilar condiciones", "bool", "if", "elif", "else"
    ],
    pedagogicalFocus:
      "Evaluar cómo hacer que el código dependa de una condición en Python (if, elif, else), el manejo del tipo booleano (bool), la indentación del bloque asociado, los operadores de comparación y la combinación lógica de múltiples condiciones (and, or, not).",
    uncertaintyCriteria:
      "Certeza ALTA ante fallos en operadores relacionales, condiciones mal combinadas o errores de alcance en ramas if/elif/else. Certeza MEDIA si anida condiciones de forma excesiva pero funcional."
  },

  cap6_bucle_while: {
    id: "cap6_bucle_while",
    chapterNumber: 6,
    title: "Capítulo 6 - Repite una vez más (Bucle while)",
    keywords: [
      "capitulo 6", "seccion 6.", "6.1", "6.2", "6.3", "6.4", "6.5", "6.6", "6.7", "6.8", "6.9",
      "repite una vez mas", "vueltas en la pista", "la repeticion", "iteracion, paso a paso",
      "variable contador", "con una condicion", "escapada", "saltamos uno", "while", "break", "continue"
    ],
    pedagogicalFocus:
      "Evaluar la escritura de bucles while en Python, la formulación de una condición de parada bien elegida, la inicialización y actualización de la variable contador paso a paso, y el control de flujo mediante salidas o saltos de iteración (break/continue).",
    uncertaintyCriteria:
      "Certeza ALTA cuando se detecta un bucle infinito por falta de actualización del contador, condición invertida o mal uso de break/continue. Certeza MEDIA si la lógica iterativa usa banderas complejas."
  },

  cap7_funciones: {
    id: "cap7_funciones",
    chapterNumber: 7,
    title: "Capítulo 7 - Funciones",
    keywords: [
      "capitulo 7", "seccion 7.", "7.1", "7.2", "7.3", "7.4", "7.5", "7.6", "7.7", "7.8", "7.9",
      "funciones", "circulos grandes y pequenos", "la funcion", "mi vecino tambien puede hacerlo",
      "modulos", "fuera de alcance", "contar asistentes", "def", "return", "alcance"
    ],
    pedagogicalFocus:
      "Evaluar la estructura de una función en Python (def, parámetros, return), la diferencia entre definir e invocar una función, la importación de módulos y el alcance local versus global de las variables (fuera de alcance).",
    uncertaintyCriteria:
      "Certeza ALTA si el estudiante define la función pero olvida llamarla, confunde print con return o intenta acceder a variables fuera de su alcance (scope). Certeza MEDIA si resuelve el problema sin modularizar."
  },

  cap8_bucle_for: {
    id: "cap8_bucle_for",
    chapterNumber: 8,
    title: "Capítulo 8 - Más bucles (Bucle for y Colecciones)",
    keywords: [
      "capitulo 8", "seccion 8.", "8.1", "8.2", "8.3", "8.4", "8.5", "8.6", "8.7", "8.8",
      "mas bucles", "leyenda boliviana", "bucle for", "coleccion de numeros",
      "coleccion de letras", "coleccion de cualquier cosa", "bucles anidados", "for", "range", "lista"
    ],
    pedagogicalFocus:
      "Evaluar la escritura del bucle for en Python, la definición y recorrido de colecciones (números con range, cadenas de letras y listas de elementos) y la estructuración correcta de bucles anidados.",
    uncertaintyCriteria:
      "Certeza ALTA ante errores en los límites de range(), recorrido incorrecto de colecciones o fallos de nivel de indentación en bucles anidados. Certeza MEDIA si emplea un bucle while donde se solicitaba un bucle for."
  },

  cap9_errores: {
    id: "cap9_errores",
    chapterNumber: 9,
    title: "Capítulo 9 - Un error, ¿y ahora qué? (Depuración)",
    keywords: [
      "capitulo 9", "seccion 9.", "9.1", "9.2", "9.3", "9.4", "9.5",
      "un error, y ahora que", "ayuda, un error", "analizar mensajes de error",
      "debugger", "depurador", "sintactico", "tiempo de ejecucion", "error logico"
    ],
    pedagogicalFocus:
      "Evaluar la detección y corrección de fallos en Python, diferenciando entre errores sintácticos, errores en tiempo de ejecución (excepciones) y errores lógicos, así como la interpretación de mensajes de error y el seguimiento paso a paso (depuración).",
    uncertaintyCriteria:
      "Certeza ALTA cuando el estudiante corrige o identifica el error sintáctico/lógico del ejercicio o cuando persiste el bug original. Certeza BAJA si reescribe otro programa distinto al que debía depurar."
  },

  cap10_algoritmos: {
    id: "cap10_algoritmos",
    chapterNumber: 10,
    title: "Capítulo 10 - Algoritmos",
    keywords: [
      "capitulo 10", "seccion 10.", "10.1", "10.2", "10.3", "10.4", "10.5", "10.6", "10.7",
      "algoritmos", "maximo comun divisor", "numeros primos", "seguridad",
      "conexiones a internet", "machine learning", "aprendemos a descifrar", "descifrar"
    ],
    pedagogicalFocus:
      "Evaluar el diseño algorítmico estructurado para problemas clásicos (máximo común divisor, verificación de números primos, cifrado/descifrado de texto) integrando estructuras de control, eficiencia lógica y descomposición.",
    uncertaintyCriteria:
      "Certeza ALTA cuando la lógica matemática o algorítmica (ej. operador módulo % en primos o MCD) presenta aciertos o fallos claros en casos borde. Certeza MEDIA ante heurísticas no convencionales."
  },

  cap11_archivos: {
    id: "cap11_archivos",
    chapterNumber: 11,
    title: "Capítulo 11 - Trabajar con archivos",
    keywords: [
      "capitulo 11", "seccion 11.", "11.1", "11.2", "11.3", "11.4",
      "trabajar con archivos", "extraer informacion de un archivo",
      "sintaxis necesaria", "caracteres de escape", "open", "read", "write", "close"
    ],
    pedagogicalFocus:
      "Evaluar la lectura y escritura de datos en archivos en Python, la sintaxis de apertura y cierre (open, with, modos 'r'/'w'/'a'), la extracción y procesamiento de líneas y el manejo adecuado de caracteres de escape (como \\n o \\t).",
    uncertaintyCriteria:
      "Certeza ALTA ante errores en modos de apertura ('r' vs 'w'), omisión de saltos de línea/caracteres de escape o falta de cierre/lectura del archivo. Certeza MEDIA si procesa el texto sin usar los métodos esperados de la sección."
  }
};

/**
 * Detecta automáticamente el capítulo de Programino eTeacher según el título o sección en el DOM.
 */
export function detectConcept(unitText = "", customConceptId = null) {
  if (customConceptId && ETEACHER_CONCEPTS[customConceptId]) {
    return ETEACHER_CONCEPTS[customConceptId];
  }

  // Limpia caracteres invisibles (como \u2068 y \u2069 que pone eTeacher) y tildes
  const normalized = unitText
    .replace(/[\u2066-\u2069]/g, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // 1. Búsqueda exacta por patrón "Sección X.Y" o "Capítulo X"
  const sectionMatch = normalized.match(/(?:seccion|capitulo)\s*(\d{1,2})(?:\.\d+)?/);
  if (sectionMatch) {
    const chapterNum = parseInt(sectionMatch[1], 10);
    const foundByNum = Object.values(ETEACHER_CONCEPTS).find(c => c.chapterNumber === chapterNum);
    if (foundByNum) return foundByNum;
  }

  // 2. Búsqueda por palabras clave de sección o tema
  for (const key in ETEACHER_CONCEPTS) {
    const concept = ETEACHER_CONCEPTS[key];
    if (concept.keywords.some(kw => normalized.includes(kw))) {
      return concept;
    }
  }

  // Por defecto: Capítulo 2 (Pensar como un programador) como base de pensamiento computacional
  return ETEACHER_CONCEPTS.cap2_pensar;
}