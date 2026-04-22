---
tags: [concepto, legal, ia, transparencia]
aliases: [aviso IA, AI disclosure]
fecha: 2026-04-06
---

# Aviso de IA en documentos legales

## Explicación

Bloque de transparencia que declara el uso de inteligencia artificial en el desarrollo de la plataforma y la redacción de los documentos legales. Protege legalmente a Grupo MLP S.A.S. ante posibles errores del modelo (alucinaciones) y cumple con principios de transparencia hacia el usuario.

## Por qué incluirlo

1. Los LLMs pueden generar texto plausible pero incorrecto (alucinaciones).
2. Las páginas legales son generadas con asistencia de IA.
3. Declararlo explícitamente reduce la responsabilidad de la empresa ante errores y construye confianza con el usuario.
4. Es una práctica emergente recomendada por reguladores y asociaciones de derecho tecnológico.

## Implementación en reuso.lurdes.co

Bloque inline al final de cada página legal (`reglamento`, `privacidad`, `medicion`):

```tsx
<div style={{
  marginTop: 40, padding: '20px 24px', borderRadius: 10,
  background: 'rgba(0,130,124,0.06)', border: '1px solid var(--border)',
}}>
  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
    Transparencia sobre el uso de inteligencia artificial
  </p>
  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.7 }}>
    Grupo MLP S.A.S. desarrolló reuso.lurdes.co con asistencia de modelos de inteligencia artificial.
    El cálculo de CO₂ evitado, el diseño de la plataforma, el desarrollo del código y la redacción
    de este documento emplean herramientas de IA. Estos sistemas pueden producir errores o resultados
    imprecisos (alucinaciones). Trabajamos de forma continua para identificarlos y reducirlos.
    Ante cualquier duda o discrepancia, escríbenos a servicio@lurdes.co.
  </p>
</div>
```

## Dónde aplicar

- Páginas legales: reglamento, privacidad, medición.
- Potencialmente: certificados PDF generados con jsPDF (nota al pie).
- Potencialmente: página /ayuda (sección de metodología).

## Wikilinks

- Sin wikilinks relacionados existentes aún.
