---
description: Regla fundamental sobre la generación del PDF de cotizaciones
---

# Regla: PDF y Vista de Lista

**Regla de oro:** El PDF de la cotización y la vista de "lista" en la web **están siempre ligados**.

* Si se añade, elimina o cambia algo en la vista de lista de la cotización (por ejemplo, mostrar más datos, rediseñar el cálculo del tema ambiental o las notas legales), **el desarrollador debe acordarse de modificar el código de generación del PDF en el backend (`jsPDF`)**.
* Ambos deben ser siempre una réplica en la estructura (lista de muebles con foto pequeña, desglose, tema ambiental, módulos y textos legales).
* Todo debe ser en blanco y negro / escala de grises.
* El PDF se genera en el backend (`src/lib/pdf/generar-pdf-cotizacion.ts`). NO usar `window.print()` como reemplazo, ya que el usuario necesita explícitamente descargar el archivo `.pdf` generado desde el backend sin diálogos del navegador.
