# Factores por categoría — reuso.lurdes.co

Valores por defecto cuando el usuario solo proporciona peso total y categoría.
Fuente: ACV europeos simplificados (ecoinvent, ELCD, PEF), coherentes con España/Europa.

---

## Recetas de composición por categoría

### Muebles — madera
| Material     | % del peso | factor_ahorro (kg CO₂/kg) |
|--------------|------------|--------------------------|
| madera_dura  | 90%        | 0.90                     |
| acero        | 10%        | 1.80                     |

### Muebles — tapizado (sofá, sillón)
| Material     | % del peso | factor_ahorro (kg CO₂/kg) |
|--------------|------------|--------------------------|
| madera_dura  | 50%        | 0.90                     |
| espuma_PU    | 30%        | 3.50                     |
| tela_algodón | 20%        | 5.50                     |

### Muebles — metálicos (estanterías, archivadores)
| Material | % del peso | factor_ahorro (kg CO₂/kg) |
|----------|------------|--------------------------|
| acero    | 95%        | 1.80                     |
| plástico | 5%         | 2.50                     |

### Textiles — lana
| Material | % del peso | factor_ahorro (kg CO₂/kg) |
|----------|------------|--------------------------|
| lana     | 100%       | 27.0                     |

### Textiles — algodón
| Material | % del peso | factor_ahorro (kg CO₂/kg) |
|----------|------------|--------------------------|
| algodón  | 100%       | 5.50                     |

### Textiles — sintéticos (poliéster, nylon)
| Material    | % del peso | factor_ahorro (kg CO₂/kg) |
|-------------|------------|--------------------------|
| poliéster   | 100%       | 5.50                     |

### Electrónica — pequeño electrodoméstico / gadget (< 2 kg)
| Material   | % del peso | factor_ahorro (kg CO₂/kg) |
|------------|------------|--------------------------|
| plástico   | 40%        | 2.50                     |
| acero      | 30%        | 1.80                     |
| aluminio   | 20%        | 8.50                     |
| cobre      | 10%        | 3.50                     |

### Electrónica — electrodoméstico grande (> 2 kg)
| Material | % del peso | factor_ahorro (kg CO₂/kg) |
|----------|------------|--------------------------|
| acero    | 60%        | 1.80                     |
| plástico | 25%        | 2.50                     |
| aluminio | 10%        | 8.50                     |
| cobre    | 5%         | 3.50                     |

---

## Factores de servicios de reacondicionamiento (kg CO₂ / servicio)

| Servicio           | Factor (kg CO₂) | Notas                              |
|--------------------|----------------|------------------------------------|
| pintar             | 0.80           | 1 servicio = pintar pieza completa |
| tapizar            | 2.50           | incluye tela y espuma nuevas       |
| barnizar           | 0.50           |                                    |
| reparación_básica  | 0.30           | ajuste de piezas, limpieza         |
| restauración_completa | 3.00        | lijado + pintura + barniz          |
| lavado_industrial  | 0.20           | textiles                           |
| reparación_electrónica | 0.40       | soldadura, componentes mínimos     |

---

## Factor de transporte europeo

| Modo              | Factor (kg CO₂ / km·kg) | Uso típico                      |
|-------------------|-------------------------|---------------------------------|
| furgoneta_gasoil  | 0.000220                | reparto urbano / recogida        |
| furgoneta_eléctrica | 0.000080              | reparto urbano con red renovable |
| camión_ligero     | 0.000150                | transporte interurbano           |

**Default recomendado**: `0.000180` (media europea furgoneta mixta)

---

## Factores de insumos nuevos (kg CO₂ / kg de insumo)

| Insumo           | Factor (kg CO₂/kg) |
|------------------|--------------------|
| barniz           | 4.00               |
| pintura_base_agua| 3.20               |
| espuma_PU        | 3.50               |
| tela_algodón     | 5.50               |
| tela_sintética   | 5.50               |
| tornillería_acero| 1.80               |
| madera_nueva     | 0.90               |
| adhesivo         | 5.00               |
