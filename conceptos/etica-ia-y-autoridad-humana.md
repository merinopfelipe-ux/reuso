---
tags: [concepto, etica, ia, gobernanza, principios, human-in-the-loop]
fecha: 2026-08-23
aliases: [principios-eticos, etica-reuso, autoridad-humana]
---

# Principios Éticos y Autoridad Humana en Reúso

El desarrollo tecnológico en Reúso se fundamenta en la convicción de que la tecnología debe servir para potenciar las capacidades humanas y regenerar el entorno, sin deshumanizar los procesos ni delegar decisiones críticas a sistemas autónomos.

Este documento establece los **5 Principios Éticos Irrenunciables** que rigen todo algoritmo, modelo de IA, interfaz y flujo de trabajo dentro de la plataforma.

---

## 1. Soberanía y Autoridad Humana (*Human-in-the-Loop*)
> **"La Inteligencia Artificial propone; el ser humano dispone, ajusta y autoriza."**

*   **El Humano Nunca se Reemplaza:** En este proyecto, ningún algoritmo o agente de IA tiene potestad para tomar decisiones finales, cerrar ventas, autorizar cotizaciones o publicar pasaportes de producto de manera autónoma.
*   **Aprobación Obligatoria:** Toda métrica calculada, precio de mercado sugerido, estimación de vida útil o reconocimiento visual generado por IA es estrictamente **un borrador referencial**. Requiere siempre la revisión, ajuste y aprobación activa de una persona (asesor, vendedor, operario de taller o administrador).

---

## 2. Prudencia Técnica y Cero Promesas Absolutas
> **"Rigor científico sobre exageración comercial."**

*   **Lenguaje Objetivo:** Queda terminantemente prohibido utilizar adjetivos absolutos o promesas infalibles ("cálculo exacto", "100% ecológico", "garantía total", "cero emisiones").
*   **Estimación Transparente:** La plataforma se expresa siempre en términos de estimación prudente, promedios ponderados y metodologías verificables ("estimado", "promediado", "referencial", "calculado según factores oficiales").

---

## 3. Trazabilidad Radical e Inmutabilidad de la Verdad
> **"Todo dato debe tener fuente, autor y fecha inalterable."**

*   **Evidencia Comportable:** Ningún indicador ambiental (CO₂ evitado, agua ahorrada, espacio en vertedero) se presenta como un número mágico. Cada cifra debe estar vinculada a su factor de emisión oficial, fuente técnica y fórmula documentada.
*   **Inmutabilidad Histórica:** Los cálculos aprobados quedan sellados mediante snapshots inmutables (`factor_snapshot_json`), garantizando que auditorías futuras reflejen exactamente las condiciones bajo las cuales se tomó la decisión.

---

## 4. Privacidad y Aislamiento Multi-Tenant
> **"Los datos de cada empresa son sagrados y confidenciales."**

*   **Aislamiento Estricto:** La estructura de costos, márgenes de ganancia, tarifas de mano de obra y bases de clientes de una empresa están estrictamente aislados por RLS (*Row Level Security*).
*   **Cero Filtraciones:** Los datos privados de una empresa jamás se mezclarán, compararán públicamente ni utilizarán para entrenar modelos de IA sin autorización expresa.

---

## 5. Dignificación del Oficio y Economía Local
> **"La economía circular se construye con manos locales."**

*   **Valorización del Taller:** La plataforma no busca automatizar para desplazar oficios tradicionales, sino visibilizar, revalorizar y retribuir justamente el talento de carpinteros, tapiceros, costureros, artesanos y técnicos de reparación.
*   **Impacto Social Positivo:** Cada proyecto debe fomentar la economía local, midiendo la proporción de inversión que se queda en comunidades y talleres cercanos frente a cadenas globales de descarte.
