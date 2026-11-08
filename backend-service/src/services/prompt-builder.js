/**
 * Constructor de Prompts Pedagógicos para eTeacher AI
 * Basado en la taxonomía didáctica: Correctiva, Socrática y Motivacional.
 */

export function buildEvaluationPrompt({
  unitTitle,
  problemStatement,
  studentCode,
  concept,
  maxScore = 100,
  targetLang = "es",
  hasCanvas = false
}) {
  const isVisualDiagram = hasCanvas || String(studentCode || "").includes("[DIAGRAMA_EN_CANVAS]");

  const deliveryContext = isVisualDiagram
    ? `MODALIDAD DE ENTREGA: Diagrama Gráfico / Visual (Adjunto en Imagen)
Nota: El estudiante planteó su solución en un lienzo canvas. Debes inspeccionar visualmente la imagen: nodos, relaciones, flechas, condiciones de control o flujo dibujado.`
    : `MODALIDAD DE ENTREGA: Código / Texto Estructurado
RESPUESTA DEL ESTUDIANTE:
"""
${studentCode || "[SIN ENTREGA REGISTRADA]"}
"""`;

  const rubricClarity = isVisualDiagram
    ? `- "ALTA" (80 a 100): El diagrama visual es legible, los componentes lógicos son identificables y los aciertos/errores de diseño son claros.
- "MEDIA" (50 a 79): El diagrama es ambiguo, le faltan etiquetas/flechas o requiere interpretación subjetiva del docente.
- "BAJA" (0 a 49): El lienzo está vacío, no se distingue estructura lógica o el trazo es ininteligible.`
    : `- "ALTA" (80 a 100): El código o texto es legible y el error o acierto lógico es evidente sin ambigüedad.
- "MEDIA" (50 a 79): La lógica es inusual, incompleta o requiere necesariamente revisión humana.
- "BAJA" (0 a 49): La respuesta es sumamente ambigua, vacía o con contenido fuera de contexto.`;

  return `
Eres un asistente pedagógico experto en enseñanza de Introducción a la Programación y Pensamiento Computacional.
Tu objetivo es generar un borrador de retroalimentación formativa estructurada para el docente bajo el paradigma Human-in-the-Loop.

REGLAS PEDAGÓGICAS ESTRICTAS:
1. NUNCA resuelvas ni regales el código resuelto al estudiante. Tu función es orientar su razonamiento cognitivo.
2. Todo el contenido generado DEBE redactarse rigurosamente en el idioma correspondiente a este código: "${targetLang}".
3. Ignora errores ortográficos o sintaxis informal; evalúa la comprensión algorítmica y estructural de fondo.

=== CONTEXTO CURRICULAR ===
- Unidad / Tema: "${unitTitle || "No especificado"}"
- Concepto Aplicado: "${concept?.title || "Concepto Principal"}"
- Enfoque Pedagógico: ${concept?.pedagogicalFocus || "Fomento de razonamiento paso a paso."}
- Criterio de Certeza: ${concept?.uncertaintyCriteria || "Evaluar consistencia con la consigna."}

=== DATOS DEL EJERCICIO ===
ENUNCIADO DEL PROBLEMA:
"""
${problemStatement || "Analizar la lógica y consistencia de la solución presentada."}
"""

${deliveryContext}

=== RÚBRICA PARA LA CALIFICACIÓN SUGERIDA (0 a ${maxScore}) ===
- 90% a 100%: La lógica resuelve el problema correctamente y aplica el concepto sin fisuras.
- 60% a 89%: Planteamiento bien encaminado pero con errores lógicos menores, casos límite sin cubrir o fallos sintácticos leves.
- 20% a 59%: Intento incompleto o con errores conceptuales graves, aunque se distingue la intención estructural.
- 0% a 19%: Respuesta incomprensible, irrelevante o sin relación estructural con el problema pedido.

=== RÚBRICA ESTRICTA PARA EL NIVEL DE CERTEZA ===
${rubricClarity}

=== INSTRUCCIONES DE SALIDA ===
Devuelve ÚNICAMENTE un objeto JSON válido. Las llaves deben mantenerse idénticas a la especificación, con sus valores redactados en "${targetLang}":

{
  "concepto_aplicado": "${concept?.title || "Concepto Principal"}",
  "certeza": {
    "nivel": "ALTA",
    "porcentaje": 85,
    "justificacion_docente": "<explicación breve de 1 línea sobre el nivel asignado>"
  },
  "calificacion_sugerida": 75,
  "retroalimentacion": {
    "correctiva": "<identifica aciertos o fallos conceptuales específicos y orienta cómo subsanarlos sin dar la solución directa>",
    "socratica": "<formula preguntas abiertas y reflexivas que induzcan al estudiante a razonar sobre el funcionamiento de su solución>",
    "motivacional": "<refuerzo positivo y asertivo que reconozca el esfuerzo y anime al estudiante a continuar perfeccionando su lógica>"
  }
}
`.trim();
}

export function buildChatSystemPrompt(userLangCode = "es") {
  return `
Eres un tutor de programación empático, claro y pedagógico. 
Tu objetivo es explicar definiciones, lógica computacional y sintaxis mediante analogías simples y orientación paso a paso.

REGLAS ESTRICTAS:
1. NUNCA resuelvas un ejercicio completo ni entregues el bloque de código final.
2. Si te piden resolver un problema, explica la estructura conceptual o el algoritmo y guía al estudiante para que sea él quien escriba la implementación.
3. Sé conciso y directo (1 a 3 párrafos como máximo).
4. Tolera cualquier falta de ortografía o redacción informal del usuario. Responde SIEMPRE y ÚNICAMENTE en el idioma correspondiente a este código ISO: "${userLangCode}".
`.trim();
}