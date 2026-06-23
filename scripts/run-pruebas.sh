#!/bin/bash
# ==============================================================================
# BLINDAJE TOTAL - SUITE DE 118 PRUEBAS E2E (12 Fases Oficiales)
# ==============================================================================

echo "🚀 Iniciando Comando /pruebas - Blindaje Total QA"
echo "=============================================================================="

# Fase 1: Autenticación
echo "✅ Ejecutando Fase 1 (Autenticación)..."
npx playwright test e2e/05-legal-pages.spec.ts e2e/06-aislamiento-usuarios.spec.ts e2e/07-auth.spec.ts e2e/02-empleado.spec.ts

# Fase 2: Panel Admin
echo "✅ Ejecutando Fase 2 (Panel Admin)..."
npx playwright test e2e/08-panel-admin.spec.ts

# Fase 3: Panel Empresa
echo "✅ Ejecutando Fase 3 (Panel Empresa)..."
npx playwright test e2e/09-panel-empresa.spec.ts

# Fase 4: Dashboard Empleado
echo "✅ Ejecutando Fase 4 (Dashboard Empleado)..."
npx playwright test e2e/10-dashboard.spec.ts

# Fase 5: Cotizador IA
echo "✅ Ejecutando Fase 5 (Cotizador IA)..."
npx playwright test e2e/11-cotizador-ia.spec.ts

# Fase 6: DPP / Pasaporte Digital
echo "✅ Ejecutando Fase 6 (DPP / Pasaporte Digital)..."
npx playwright test e2e/12-dpp--pasaporte.spec.ts

# Fase 7: Páginas Públicas
echo "✅ Ejecutando Fase 7 (Páginas Públicas)..."
npx playwright test e2e/17-paginas-publicas.spec.ts

# Fase 8: Modo Noche
echo "✅ Ejecutando Fase 8 (Modo Noche)..."
npx playwright test e2e/13-modo-noche.spec.ts

# Fase 9: Rendimiento
echo "✅ Ejecutando Fase 9 (Rendimiento)..."
npx playwright test e2e/14-rendimiento.spec.ts

# Fase 10: Seguridad & RBAC
echo "✅ Ejecutando Fase 10 (Seguridad & RBAC)..."
npx playwright test e2e/15-seguridad.spec.ts

# Fase 11: Alertas
echo "✅ Ejecutando Fase 11 (Alertas)..."
npx playwright test e2e/18-alertas.spec.ts

# Fase 12: Settings y Perfil (incluye Ayuda)
echo "✅ Ejecutando Fase 12 (Settings y Perfil)..."
npx playwright test e2e/19-settings-ayuda.spec.ts e2e/16-apis--validaciones.spec.ts

echo "=============================================================================="
echo "🎯 Suite de 118 pruebas completada a través de las 12 Fases. Revisa los resultados arriba."
