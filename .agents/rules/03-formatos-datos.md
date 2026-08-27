# Pilar 3: Formatos y Datos (Data UX)

- **Regla de Formato Numérico General (MANDATORIO Y PERMANENTE)**
  - **Alineación:** Alineación siempre a la derecha para campos numéricos (`text-right`). Fechas centradas.
  - **Separadores:** Cédulas/NITs con puntos (ej. `1.123.456.789`). Para Pesos Colombianos, apóstrofe para millones y punto para miles (ej. `$ 1'500.000`).
  - **Decimales:** Coma (`,`) máximo un decimal. Redondeo constante hacia arriba (`Math.ceil(val * 10) / 10`).

- **Regla de Formato del Código de Cotización (MANDATORIO Y PERMANENTE)**
  - Todo código de cotización DEBE iniciar estrictamente con `COT `, seguido del código (ej. `COT ABC12345`).

- **Regla de Formato de Teléfono (MANDATORIO Y PERMANENTE)**
  - El formato del teléfono SIEMPRE debe ser `+57 (300) 300 3030`. El código internacional (+57 o correspondiente) siempre es obligatorio.

- **Regla de Capitalización (MANDATORIO Y PERMANENTE)**
  - Queda estrictamente prohibido usar mayúsculas sostenidas (ALL CAPS) en títulos, encabezados o etiquetas. Usar siempre Title Case o frase estándar.

- **Regla de Objetividad y Cero Promesas Absolutas (MANDATORIO Y PERMANENTE)**
  - Queda prohibido usar adjetivos como "exacto", "preciso", "100%", "perfecto". Usa SIEMPRE lenguaje de estimación ("estimado", "referencial").
