# eTeacher Formative AI Assistant

Prototipo de asistente de retroalimentación formativa para docentes que utilizan **Programino eTeacher**. Integra una extensión de Chrome con un servidor Node.js/Express y la API de Google Gemini.

El docente puede analizar entregas, revisar las sugerencias, elegir una capa pedagógica, editar el comentario y la calificación e insertarlos en la interfaz de Programino. La aprobación final corresponde al docente.

## Funcionalidades

- Análisis de respuestas de programación y preguntas abiertas, e interpretación de diagramas mediante capturas cuando están disponibles.
- Borradores de retroalimentación correctiva, socrática y motivacional.
- Organización de entregas por nivel de certeza para apoyar la revisión.
- Edición de comentarios y calificaciones antes de su inserción.
- Panel lateral de consulta conceptual.
- Recursos de interfaz en español, inglés, francés y neerlandés.
- Registro de métricas de sesiones, inserciones y consultas mediante Supabase.
- Descubrimiento dinámico de modelos con una sola clave de Gemini.

## Organización del proyecto

Los componentes principales se distribuyen de la siguiente forma; se omiten archivos auxiliares:

```text
eteacher-ai-assistant/
  backend-service/
    package.json
    src/
      server.js
      clients/
        gemini-registry.js
      config/
        gemini-keys.js
        supabase.js
        concepts.js
      controllers/
        evaluation.controller.js
        telemetry.controller.js
      routes/
        evaluation.routes.js
        chat.routes.js
      services/
        gemini-service.js
        prompt-builder.js
        supabase-service.js
  extension-client/
    manifest.json
    src/
      background/
        service-worker.js
      content/
        content-main.js
        api-client.js
        network-interceptor.js
        dom-adapter.js
        editor-adapter.js
        ui-panel.js
        chat-panel.js
        storage-service.js
        telemetry-service.js
        i18n.js
      styles/
        panel.css
  .env                 # Configuración privada; no se publica
```

### Responsabilidades

| Componente | Responsabilidad |
| --- | --- |
| Extensión | Capturar contexto y entregas, mostrar sugerencias y ejecutar la inserción aprobada en Programino. |
| Servidor Express | Recibir solicitudes, construir instrucciones, solicitar inferencias y registrar métricas. |
| `gemini-registry.js` | Descubrir y ordenar modelos permitidos, gestionar caché y cambiar de candidato ante fallos recuperables. |
| `gemini-service.js` | Preparar texto e imágenes y procesar las respuestas para evaluación y chat. |
| Supabase | Persistir métricas operativas de las pruebas y sesiones. |

## Requisitos

- Node.js con `fetch`, `AbortController` y módulos ES disponibles; el código requiere Node.js 18 o posterior.
- npm y Git.
- Google Chrome con modo de desarrollador habilitado para cargar la extensión desempaquetada.
- Acceso docente a Programino y a su vista de revisión de entregas.
- Una clave de la API de Gemini.
- Un proyecto Supabase y sus tablas si se desea persistir la telemetría.

## Instalación del servidor

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/Nicole-Rodas/eteacher-ai-assistant.git
cd eteacher-ai-assistant/backend-service
npm install
```

Las dependencias se toman de `package.json`. Si el repositorio incluye un archivo `package-lock.json` vigente, puede utilizarse `npm ci` para una instalación reproducible.

### 2. Configurar el entorno

Crea `.env` en la raíz del repositorio:

```dotenv
PORT=3000
GEMINI_API_KEY=REEMPLAZAR_POR_TU_CLAVE
ALLOWED_EXTENSION_IDS=bnbnebnbgiegbboecabeomhdnhpfejka
```

- `GEMINI_API_KEY` es una única credencial del servidor. No debe incorporarse al manifiesto ni al código de la extensión.
- `ALLOWED_EXTENSION_IDS` debe coincidir con el ID mostrado por Chrome al cargar la extensión. El valor del ejemplo corresponde al manifiesto común preparado para este proyecto; solo es válido si se conserva su campo `key`.
- Para telemetría, configura además las variables que lee `backend-service/src/config/supabase.js`. Usa los nombres definidos en ese módulo. Las credenciales de Supabase permanecen en el servidor.

No publiques `.env`, claves privadas ni credenciales. Asegúrate de que `.env` esté excluido mediante `.gitignore`.

### 3. Configurar la telemetría

El servicio de persistencia utiliza estas tablas:

| Tabla | Datos principales |
| --- | --- |
| `triage_sessions` | Identificador de sesión, contexto, cantidad de entregas, distribución de certeza y duraciones. |
| `feedback_injections` | Sesión relacionada, certeza, capa elegida, edición y cambios de calificación. |
| `chat_interactions` | Contexto, longitudes de mensajes y tiempo de respuesta. |

El esquema debe ser compatible con los campos de `supabase-service.js`, incluyendo la relación de `feedback_injections.session_id` con `triage_sessions.id`. El servicio contempla continuar ante fallos de persistencia; que la interfaz funcione no demuestra que las métricas se hayan guardado.

### 4. Iniciar el servidor

Desde `backend-service/`:

```bash
node src/server.js
```

Comprobación local:

```bash
curl http://localhost:3000/health
```

Respuesta esperada:

```json
{"status":"ok"}
```

Esta comprobación verifica disponibilidad del servidor; no prueba una inferencia de Gemini ni la conexión con Supabase.

## Configuración e instalación de la extensión

### 1. Configurar la dirección del servidor

Antes de cargarla, ajusta las referencias al servidor para tu entorno, conservando los sufijos de las rutas:

| Archivo | Dirección que debe utilizar |
| --- | --- |
| `src/background/service-worker.js` | `<BASE_DEL_SERVIDOR>/api/evaluation` |
| `src/content/chat-panel.js` | `<BASE_DEL_SERVIDOR>/api/chat` |
| `src/content/telemetry-service.js` | `<BASE_DEL_SERVIDOR>/api/telemetry` |
| `manifest.json` → `host_permissions` | Patrón del servidor, por ejemplo `http://localhost:3000/*` para pruebas locales. |

Conserva el permiso de Programino y restringe `content_scripts.matches` a `https://programino.eteacher.be/*`. No agregues coincidencias para todos los sitios.

En un entorno con servidor remoto utiliza su URL HTTPS. La dirección del servidor no se configura mediante una API key ni mediante el ID de la extensión.

### 2. Cargar la extensión

1. Abre `chrome://extensions`.
2. Habilita **Modo de desarrollador**.
3. Selecciona **Cargar descomprimida**.
4. Elige la carpeta `extension-client/` que contiene `manifest.json`.
5. Comprueba el identificador mostrado por Chrome.
6. Abre Programino con una sesión docente y entra en la vista de revisión de un ejercicio.

### 3. Mantener el mismo ID entre computadoras

El campo `key` de `manifest.json` contiene una **clave pública** que permite conservar el ID en instalaciones desempaquetadas. Distribuye el mismo manifiesto a todas las computadoras.

Con el manifiesto común preparado, el ID esperado es:

```text
bnbnebnbgiegbboecabeomhdnhpfejka
```

Configura ese valor una sola vez en `ALLOWED_EXTENSION_IDS` y reinicia el servidor. No es necesario registrar cada computadora. Si Chrome muestra otro ID, verifica que estés cargando la carpeta y el manifiesto correctos.

Al sustituir un manifiesto anterior puede aparecer una instalación con un ID nuevo. Retira la copia anterior si queda duplicada; las preferencias asociadas al ID anterior pueden restablecerse.

Una futura publicación en Chrome Web Store debe utilizar la clave pública y el identificador de esa publicación, actualizando el servidor si difieren. Este ID de desarrollo no garantiza el ID que asignará la tienda.

## Uso

1. Accede a un ejercicio desde la vista de revisión de Programino.
2. Abre el panel del asistente y solicita analizar las entregas.
3. Revisa los resultados de certeza alta y la bandeja **Baja Certeza / Por Revisar**.
4. Selecciona la capa pedagógica y edita el comentario o la nota cuando corresponda.
5. Selecciona las filas que deseas insertar y confirma la acción.
6. Comprueba el comentario y la calificación guardados en Programino.

El panel lateral permite realizar consultas conceptuales. El análisis por lotes y el chat utilizan puntos de acceso distintos.

## Gestión de modelos Gemini

La revisión del registro de modelos incluida con esta configuración utiliza:

- Una única variable `GEMINI_API_KEY`.
- Descubrimiento a través del catálogo de modelos y caché en memoria de 12 horas.
- Familias estables permitidas: **Gemini Flash → Gemini Flash Lite → Gemini Pro**.
- Orden por versión numérica descendente dentro de cada familia, seguido de alias `latest` admitidos.
- Exclusión de Gemma, familias desconocidas, variantes especializadas, `preview` y experimentales.
- Hasta 6 intentos, con un máximo de 6 segundos por intento y un presupuesto total de 14 segundos para el flujo de inferencia, incluido el descubrimiento cuando se necesita.
- Cambio al siguiente candidato ante errores recuperables, como 404, 429, 503 o agotamiento del tiempo.
- Retirada temporal de candidatos que responden 404 y solicitud de actualización del catálogo.

Si no existen candidatos permitidos o todos fallan, se devuelve un error. No se recurre a familias desconocidas. Los límites anteriores no representan el tiempo total de un lote de entregas ni garantizan cuota o disponibilidad del proveedor.

## Certeza y supervisión

| Nivel | Intervalo solicitado al modelo |
| --- | --- |
| ALTA | 80–100 |
| MEDIA | 50–79 |
| BAJA | 0–49 |

El porcentaje es un indicador declarado por el modelo, no una probabilidad calibrada de corrección. La interfaz clasifica las respuestas por la etiqueta recibida.

Los filtros locales asignan BAJA con 0 a entregas vacías sin imagen y BAJA con 15 a respuestas de menos de cinco caracteres sin imagen. La falta de respuesta del servicio también se presenta con BAJA y 0, acompañada de una explicación de indisponibilidad; debe distinguirse de una evaluación válida de certeza baja.

## Datos y alcance de seguridad

- Los scripts de contenido se cargan automáticamente solo en el dominio autorizado de Programino.
- Las credenciales de Gemini y de persistencia permanecen en el servidor.
- La política de origen compara Programino y los IDs configurados; no constituye autenticación docente. En la configuración actual, las solicitudes sin cabecera `Origin` continúan.
- Las entregas y los borradores se conservan temporalmente en memoria con los módulos de almacenamiento actualizados. La recarga o salida de la página invalida ese estado; cerrar únicamente el panel no equivale a recargar la página.
- La extensión necesita información de la interfaz para seleccionar la entrega correspondiente. Esto no equivale a anonimización automática de todo su contenido.
- Las respuestas, imágenes y consultas pueden contener información escrita por sus autores. No existe un filtro automático general de datos personales; revisa el contenido antes de enviarlo al servicio externo.
- Las columnas de telemetría del chat registran longitudes y tiempos; el historial utilizado para generar respuestas se transmite al servicio de inferencia.

## Limitaciones del prototipo

El funcionamiento depende de la vista de revisión, los componentes de edición y el comportamiento de guardado de Programino. Los cambios en esa interfaz pueden requerir adaptar la extensión.

Las sugerencias requieren revisión docente. La interpretación de imágenes depende de la captura y de las capacidades del candidato utilizado. Las respuestas muy breves pueden ser válidas en ciertas modalidades, por lo que los filtros de longitud requieren supervisión.

La confirmación local de una inserción no garantiza por sí sola que Programino haya persistido el cambio. Verifica el resultado en la plataforma. La disponibilidad de inferencia y telemetría depende también de la conectividad y de los servicios externos.

## Solución de problemas

| Situación | Comprobación |
| --- | --- |
| El panel no aparece | Revisa el dominio, la vista de revisión, la instalación y los errores de la extensión. |
| Error de origen o HTTP 403 | Compara el ID de Chrome con `ALLOWED_EXTENSION_IDS` y reinicia el servidor tras cambiar el entorno. |
| La extensión apunta a otro servidor | Revisa las tres referencias de comunicación y `host_permissions`. |
| HTTP 429 o 503 | Comprueba cuota y disponibilidad del proveedor; el cambio de modelo no garantiza capacidad disponible. |
| No hay modelos permitidos | Revisa el catálogo, la credencial y la política de familias; no se activa un respaldo desconocido. |
| Se agotó el tiempo | Revisa conectividad y registros del servidor. El presupuesto se aplica por solicitud de inferencia. |
| Las métricas no aparecen | Revisa configuración, esquema y registros de Supabase; la interfaz puede continuar aunque falle la persistencia. |
| El comentario no quedó guardado | Comprueba la entrega en Programino y la compatibilidad del adaptador con la interfaz actual. |

## Estado

Proyecto académico en fase de prototipo. Esta guía corresponde a la configuración con almacenamiento volátil, una sola clave de Gemini, selección restringida de familias e identificador común. Después de aplicar cambios, comprueba evaluación, chat, inserción y persistencia en tu entorno antes de distribuir la extensión.
