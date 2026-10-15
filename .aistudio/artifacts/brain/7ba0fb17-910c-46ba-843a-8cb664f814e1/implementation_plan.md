# PressForge Studio — Pre-Prensa Vectorial & Asistente Técnico de Imprenta

PressForge Studio es una estación de trabajo de pre-prensa y diseño vectorial técnico diseñada para talleres de impresión (offset, serigrafía, flexografía, huecograbado, vinil de corte), diseñadores gráficos e impresores independientes. Resuelve la preparación ágil de papelería comercial (notas de venta, remisiones, recibos), vectorizado con separación de color por tintas, cálculo de pinza de impresión, análisis de legibilidad/emplastado e imposición de pliegos (armado 2 al tiro / 4 al tiro) asistido por visión e IA multimodal.

---

### Decisiones Críticas y Preferencias del Usuario

> [!IMPORTANT]
> Se han incorporado las directrices clave confirmadas durante la clarificación:
> 1. **Asistente Técnico Proactivo**: El sistema analiza el sistema de salida seleccionado (Offset, Serigrafía, Flexo, Huecograbado) y alerta sobre tolerancias críticas: marcas de agua que superen el 8% (peligro de mancha sólida en talleres pequeños), textos menores a 8pt con serif en serigrafía manual (peligro de emplaste), y márgenes mecánicos de pinza (0.8 cm).
> 2. **Separación de Color Multitipo**: Motor de separación dual que procesa Cuatricromía CMYK (con previsualización de positivos e información de ángulos de trama) y Tintas Planas / Spot Pantone para serigrafía, vinil de corte y offset directo.
> 3. **Visión IA con Rectificación Perspectiva & Imposición**: Detección de fotos distorsionadas (aspecto trapezoidal) de notas viejas o muestras de clientes, rectificación proyectiva homográfica a rectángulo plano, deducción del formato estándar (media carta apaisada 21x14 cm, medio oficio, etc.) y asistente de armado de pliegos (ej. 2 notas en carta, 4 notas en doble carta) con guías de corte y crucetas.

---

### 1. Visión General & Concepto del Producto

- **Propósito**: Eliminar la dependencia de suites pesadas genéricas o versiones no autorizadas para tareas repetitivas de imprenta (como redibujar notas de venta con regla, calcular pinza de offset, separar colores para marcos de serigrafía o armar tiros dobles).
- **Público Objetivo**: Impresores de prensas offset de pliego pequeño/mediano, serigrafistas de taller, rotulistas de vinil de corte y diseñadores freelance de pre-prensa.
- **Valor Diferencial**: Reglas de física de taller integradas en el lienzo (pinzas de 0.8 cm, ganancia de punto simulada, avisos de emplastado, marcas de agua seguras al 4–8% de tinta negra, generación de folios secuenciales para suajes y separación limpia por capas de tinta).

---

### 2. Experiencia de Usuario & Diseño Visual

- **Aesthetic Direction**: Estación de trabajo industrial CAD/Prepress limpia, sobria y de alta precisión (estilo Esko / Heidelberg Prinect / CorelDRAW clásico modernizado).
- **Paleta de Color**:
  - Neutros: Pizarra y grafito oscuro balanceado (`slate-900` / `zinc-900` en barras de herramientas, fondo de lienzo en gris técnico neutro `neutral-200/80` con contraste óptimo para ver el papel blanco).
  - Acentos Técnicos: Ámbar industrial (`amber-500` para advertencias de pre-vuelo y pinzas) y Azul Cobalto (`sky-600` / `blue-600` para vectores activos, nodos y líneas de corte).
  - Cero clisés de IA: Sin púrpuras genéricos, sin blobs borrosos, bordes nítidos de 1px con radios controlados (`rounded-md`).
- **Tipografía**:
  - Títulos e Interfaz: Sans geométrica moderna y neutra (`Plus Jakarta Sans` / `Outfit`).
  - Cotas, Medidas y Densidades: Tipografía monoespaciada con cifras tabulares (`font-mono tabular-nums`) para mm, cm, pt, ángulos de trama (15°, 75°, 0°, 45°) y porcentajes de tinta (%).
- **Estructura del Espacio de Trabajo**:
  - **Barra Superior**: Contrato de 3 zonas con nombre de proyecto, selector de sistema de impresión (Offset / Serigrafía / Flexo / Vinil), estado de pre-vuelo técnico y botón principal de exportación (SVG / PDF Positivos / Planillas de Armado).
  - **Barra de Herramientas Lateral Izquierda**: Puntero de Selección, Edición de Nodos (Bezier), Pluma Vectorial, Rectángulo/Cuadro de Folio, Elipse, Línea con Renglones/Punteado de Suaje, Texto Tipográfico, Cuentagotas de Tinta, y Medidor de Pinza.
  - **Lienzo Central de Dibujo**: Reglas dinámicas en cm/mm, visualización de la hoja física, zona no imprimible de pinza (0.8 cm en margen de agarre), marcas de corte exteriores, crucetas de registro (`+`) y cuña de densitometría.
  - **Panel Lateral Derecho Plegable**:
    - *Pestaña 1: Separación de Color & Tintas*: Selector CMYK vs Tintas Spot / Capas de corte, simulador de positivos en negro puro para fotolitos/pantallas, y cálculo de cobertura de tinta.
    - *Pestaña 2: Vectorizador de Imagen*: Vectorizado por contornos/color, umbrales, simplificación de curvas y eliminación de ruido (despeckle).
    - *Pestaña 3: Asistente IA de Pre-Prensa*: Subida de foto de nota/recibo, rectificación de perspectiva keystone, detección de formato sugerido, recomendación tipográfica y armado de imposición (2 al tiro / 4 al tiro).
    - *Pestaña 4: Pre-Flight Checklist*: Alertas de resolución, advertencia de texto < 8pt para serigrafía, validación de marca de agua entre 4% y 8%, y verificación de sangrado/pinza.

---

### 3. Decisiones de Producto & Compensaciones Técnicas

1. **Motor Vectorial en Navegador con Canvas & SVG Híbrido**:
   - *Decisión*: Canvas 2D acelerado para manipulación rápida a 60 FPS (zoom, pan, snapping, trazado bezier interactivo) con serialización bidireccional a SVG paramétrico con capas identificadas por nombre de tinta (ej. `ink-cyan`, `ink-spot-pantone-186c`).
   - *Por qué*: Permite al usuario exportar archivos SVG estándar limpios que pueden abrirse directamente en Illustrator, CorelDRAW o plotters de vinil (Roland, Graphtec, Silhouette) sin pérdida de escala milimétrica.
2. **Motor de Vectorización y Separación Client-Side con Procesamiento de Imagen**:
   - *Decisión*: Cuantización de color (K-means / paleta selectiva), binarización adaptativa por umbral de luminancia y algoritmo de trazado de curvas paramétricas (poligonización de fronteras con ajuste cúbico de Bézier).
   - *Por qué*: Respuesta inmediata e interactiva al deslizar el número de tintas (de 1 a 6 tintas planas) sin latencia de red.
3. **Visión Multimodal con Gemini en Backend (`gemini-3.8-flash`)**:
   - *Decisión*: Endpoint `/api/prepress/analyze-image` con `@google/genai` en el servidor Node/Express para procesar imágenes fotográficas de notas de venta con ángulos oblicuos, devolviendo:
     - Coordenadas de los 4 vértices del papel para corrección de perspectiva.
     - Formato sugerido (Media Carta 21.5x14cm, Medio Oficio 21.5x17cm, etc.).
     - Tipo de documento (Nota de venta con folio, remisión con membrete, recibo de pago, etc.).
     - Detección de fuentes tipográficas recomendadas (Sans, Serif, Mecánica, Cursiva) y familias coincidentes.
     - Renglones y cotas entre líneas de llenado manual.
4. **Cálculo Riguroso de Imposición (Armado de Pliegos)**:
   - *Decisión*: Generador algorítmico de imposición que toma el documento actual (ej. 21 x 14 cm) y genera el pliego de impresión en pliegos estándar (Carta 21.59 x 27.94 cm -> 2 al tiro; Tabloide / Doble Carta 27.94 x 43.18 cm -> 4 al tiro) calculando automáticamente la calle de corte (3 mm a 5 mm), las cruces de registro centrales y el margen de pinza del impresor.

---

### 4. Arquitectura del Sistema & Flujo de Datos

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PressForge Studio Client                        │
├──────────────────┬─────────────────────────────┬───────────────────────┤
│  Toolbox (Left)  │     Vector CAD Workspace    │ Prepress Panel (Right)│
│  - Select/Transform│ - Interactive Zoom / Pan    │ - Color Separator     │
│  - Bezier Pen    │ - SVG/Canvas Vector Engine  │   (CMYK & Spot Plates)│
│  - Node Editor   │ - Millimeter Rulers & Grid  │ - Vectorizer Engine   │
│  - Shapes/Folio  │ - Gripper Margins (0.8 cm)  │ - Imposition Manager  │
│  - Rulings & Text│ - Registration Marks & Bars │ - AI Vision Assistant │
│  - Watermark Bar │ - Real-time Pre-Flight Alert│ - Font & Typography   │
└────────┬─────────┴──────────────┬──────────────┴───────────┬───────────┘
         │                        │                          │
         ▼                        ▼                          ▼
┌──────────────────┐    ┌────────────────────┐    ┌──────────────────────┐
│ Vector State     │    │ Client Color &     │    │ Server AI Proxy      │
│ - Path Geometry  │    │ Separation Engine  │    │ - POST /api/analyze  │
│ - Layers & Inks  │    │ - Quantization     │    │ - Gemini 3.8 Flash   │
│ - Margins & Specs│    │ - Bitmap Potrace   │    │   (Vision + Specs)   │
│ - Undo/Redo      │    │ - Positive Masks   │    │ - Rectification Math │
└──────────────────┘    └────────────────────┘    └──────────────────────┘
```

---

### 5. Plan de Ejecución Paso a Paso

1. **Configuración de Dependencias & Metadatos**:
   - Registrar nombre formal y descripción en `metadata.json` ("PressForge Studio - Pre-Prensa Vectorial & Asistente Técnico").
   - Configurar soporte de servidor Express / API routes para `@google/genai` con `GEMINI_API_KEY`.
2. **Motor Matemático de Pre-Prensa & Separación de Color**:
   - Modelos de datos para documentos (dimensiones en mm, orientación, tipo de sistema de impresión, pinza de 8 mm, rebase de 3 mm).
   - Separación CMYK: conversión RGB -> CMYK con cálculo de tintas individuales y visualización de películas positivas en escala de grises/negro de alta densidad.
   - Separación Spot: asignación de tintas directas (Pantone / colores sólidos) por capa vectorial.
   - Algoritmo de vectorización de mapas de bits a trazos SVG limpios.
3. **Lienzo Vectorial Interactivo (Estilo CorelDRAW / Illustrator)**:
   - Dibujo interactivo: pluma Bézier con manejadores de curvatura, herramientas de rectángulos, óvalos, textos con tipografías personalizadas (carga de `.ttf`/`.otf`), renglones para notas de venta con interlineado milimétrico, y caja de folio automático para notas numeradas.
   - Reglas milimétricas graduadas, retícula configurable y guías magnéticas.
   - Visualizador de pinza de la máquina (franja achurada de 0.8 cm donde no debe tocar tinta en el borde de entrada).
4. **Asistente IA de Visión & Rectificación de Perspectiva**:
   - Carga de fotografía de notas viejas o muestras con distorsión trapezoidal.
   - Análisis con Gemini 3.8 Flash: detección de 4 esquinas del papel, sugerencia de formato estándar (Media Carta, Medio Oficio, etc.), estimación de interlineado de renglones y fuentes sugeridas.
   - Transformación de homografía perspectiva interactiva (con tiradores para ajustar los 4 vértices del papel y proyectar a un plano ortogonal recto).
5. **Generador de Imposición & Armado de Pliegos**:
   - Vista de armado: 1 al tiro, 2 al tiro (ej. 2 notas en hoja carta) y 4 al tiro (4 notas en doble carta/tabloide).
   - Generación automática de crucetas de registro (`+`), cuñas de color densitométricas y marcas de corte exteriores e intermedias.
6. **Pre-Flight Inspector & Avisos de Taller**:
   - Validación proactiva en vivo:
     - Detección de marca de agua: si supera el 8% de tinta negra, emite alerta crítica ("Peligro: una marca de agua superior a 8% tapará el texto manuscrito en offset de taller pequeño; se sugiere 4% - 7%").
     - Detección de fuentes finas: si el sistema es Serigrafía manual y hay textos < 8pt o líneas con serifs de menos de 0.2mm, emite alerta de emplaste.
     - Invasión de pinza: alerta si algún objeto vectorial invade el margen de 0.8 cm.
7. **Plantillas de Taller & Exportador Completo**:
   - Plantillas pre-cargadas listas para usar: Nota de Venta Media Carta con Folio, Recibo de Dinero Medio Oficio, Remisión Comercial con Marca de Agua a 6%, y Diseño de Serigrafía a 3 Tintas con Cruces.
   - Exportación: Archivo SVG editable con capas separadas por tinta, Descarga de Positivos individuales (PDF/SVG/PNG monocromático listo para insoladora/quemadora de placas) y Reporte de Pre-Prensa Técnico.
