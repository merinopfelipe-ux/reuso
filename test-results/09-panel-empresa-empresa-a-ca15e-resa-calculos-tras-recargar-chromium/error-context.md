# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 09-panel-empresa.spec.ts >> empresa_admin >> emp-02 - cálculo persiste en /empresa/calculos tras recargar
- Location: e2e/09-panel-empresa.spec.ts:15:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Guardar cálculo")')
    - locator resolved to <button disabled>Guardar cálculo</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    - waiting for element to be visible, enabled and stable
  - element was detached from the DOM, retrying
    - locator resolved to <button disabled>Guardar cálculo</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    113 × waiting for element to be visible, enabled and stable
        - element is not enabled
      - retrying click action
        - waiting 500ms

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e4]:
      - generic [ref=e5]:
        - button "Menú" [ref=e6] [cursor=pointer]:
          - img [ref=e8]
          - generic [ref=e10]: Menú
        - img "Calculadora de Reúso" [ref=e12]
      - generic [ref=e13]:
        - generic [ref=e14]:
          - img [ref=e15]
          - textbox "Buscar..." [ref=e17]
          - generic: ⌘K
        - generic [ref=e18]:
          - button "Cambiar a tema oscuro" [ref=e19] [cursor=pointer]:
            - img [ref=e20]
          - button "Centro de ayuda" [ref=e22] [cursor=pointer]:
            - img [ref=e23]
          - button "Alertas" [ref=e26] [cursor=pointer]:
            - img [ref=e27]
        - button "Menú de usuario" [ref=e31] [cursor=pointer]:
          - generic [ref=e32]:
            - paragraph [ref=e33]: admin
            - paragraph [ref=e34]: Administrador
          - generic [ref=e35]: A
    - generic [ref=e36]:
      - complementary [ref=e37]:
        - navigation [ref=e39]:
          - img [ref=e44] [cursor=pointer]
          - img [ref=e49] [cursor=pointer]
          - img [ref=e54] [cursor=pointer]
          - img [ref=e59] [cursor=pointer]
          - img [ref=e64] [cursor=pointer]
          - img [ref=e69] [cursor=pointer]
          - img [ref=e74] [cursor=pointer]
        - button "Cerrar sesión" [ref=e77] [cursor=pointer]:
          - img [ref=e78]
          - generic: Cerrar sesión
      - generic [ref=e80]:
        - main [ref=e81]:
          - generic [ref=e83]:
            - generic [ref=e84]:
              - heading "Hola, admin" [level=1] [ref=e85]
              - paragraph [ref=e86]: ¡Juntos recuperamos el planeta!
            - generic [ref=e87]:
              - generic [ref=e88]:
                - img [ref=e90]
                - generic [ref=e92]:
                  - paragraph [ref=e93]: CO₂ evitado
                  - paragraph [ref=e94]: 1141.00kg
              - generic [ref=e95]:
                - img [ref=e97]
                - generic [ref=e99]:
                  - paragraph [ref=e100]: Agua ahorrada
                  - paragraph [ref=e101]: 50.932,5L
              - generic [ref=e102]:
                - img [ref=e104]
                - generic [ref=e106]:
                  - paragraph [ref=e107]: Miembros del equipo
                  - paragraph [ref=e108]: "2"
              - generic [ref=e109]:
                - img [ref=e111]
                - generic [ref=e113]:
                  - paragraph [ref=e114]: Certificados generados
                  - paragraph [ref=e115]: "20"
            - generic [ref=e116]:
              - heading "CO₂ evitado — últimos 6 meses" [level=2] [ref=e117]
              - application [ref=e120]:
                - generic [ref=e130]:
                  - generic [ref=e131]:
                    - generic [ref=e133]: Ene 26
                    - generic [ref=e135]: Feb 26
                    - generic [ref=e137]: Mar 26
                    - generic [ref=e139]: Abr 26
                    - generic [ref=e141]: May 26
                    - generic [ref=e143]: Jun 26
                  - generic [ref=e144]:
                    - generic [ref=e146]: "0"
                    - generic [ref=e148]: "250"
                    - generic [ref=e150]: "500"
                    - generic [ref=e152]: "750"
                    - generic [ref=e154]: "1000"
            - generic [ref=e155]:
              - generic [ref=e156]:
                - heading "Ranking del equipo" [level=2] [ref=e157]
                - generic [ref=e159]:
                  - img [ref=e161]
                  - generic [ref=e163]: A
                  - generic [ref=e164]:
                    - generic [ref=e165]:
                      - generic [ref=e166]: admin
                      - generic [ref=e167]: 1141.0 kg
                    - generic [ref=e170]: 38 cálculos
              - generic [ref=e171]:
                - heading "Materiales reutilizados" [level=2] [ref=e172]
                - generic [ref=e174]:
                  - list [ref=e176]:
                    - listitem [ref=e177]:
                      - img "Muebles legend icon" [ref=e178]
                      - generic [ref=e180]: Muebles
                    - listitem [ref=e181]:
                      - img "Ropa y Textiles legend icon" [ref=e182]
                      - generic [ref=e184]: Ropa y Textiles
                  - application [ref=e185]
            - generic [ref=e195]:
              - generic [ref=e196]:
                - heading "Metas Ambientales" [level=3] [ref=e197]
                - button "Crear Meta" [ref=e198] [cursor=pointer]:
                  - img [ref=e199]
                  - text: Crear Meta
              - generic [ref=e201]:
                - img [ref=e202]
                - paragraph [ref=e204]: Aún no has definido ninguna meta.
            - generic [ref=e205]:
              - generic [ref=e206]:
                - heading "Registra objetos reutilizados" [level=2] [ref=e207]
                - paragraph [ref=e208]: Ingresa el peso en kg de los materiales que reutilizaste y calcula tu impacto ambiental.
                - generic [ref=e209]:
                  - button "Ropa y Textiles" [ref=e210] [cursor=pointer]
                  - button "Muebles" [ref=e211] [cursor=pointer]
              - generic [ref=e212]:
                - generic [ref=e213]:
                  - generic [ref=e214]:
                    - paragraph [ref=e215]: Camiseta
                    - generic [ref=e216]: 6.100 kg CO₂/kg
                  - generic [ref=e217]:
                    - spinbutton [ref=e218]
                    - generic [ref=e219]: kg
                - generic [ref=e220]:
                  - generic [ref=e221]:
                    - paragraph [ref=e222]: Pantalón
                    - generic [ref=e223]: 6.100 kg CO₂/kg
                  - generic [ref=e224]:
                    - spinbutton [ref=e225]
                    - generic [ref=e226]: kg
                - generic [ref=e227]:
                  - generic [ref=e228]:
                    - paragraph [ref=e229]: Chaqueta
                    - generic [ref=e230]: 6.100 kg CO₂/kg
                  - generic [ref=e231]:
                    - spinbutton [ref=e232]
                    - generic [ref=e233]: kg
                - generic [ref=e234]:
                  - generic [ref=e235]:
                    - paragraph [ref=e236]: Zapatos par
                    - generic [ref=e237]: 6.100 kg CO₂/kg
                  - generic [ref=e238]:
                    - spinbutton [ref=e239]
                    - generic [ref=e240]: kg
                - generic [ref=e241]:
                  - generic [ref=e242]:
                    - paragraph [ref=e243]: Otra ropa por kg
                    - generic [ref=e244]: 6.100 kg CO₂/kg
                  - generic [ref=e245]:
                    - spinbutton [ref=e246]
                    - generic [ref=e247]: kg
              - generic [ref=e248]:
                - generic [ref=e249]:
                  - generic [ref=e250]: Descripción (opcional)
                  - generic [ref=e251]:
                    - img [ref=e252]
                    - generic [ref=e254]: Puedes pegar imágenes
                - generic [ref=e255]: Describe los objetos reutilizados. Puedes pegar fotos directamente aquí...
              - generic [ref=e256]:
                - generic [ref=e257]:
                  - generic [ref=e258]:
                    - img [ref=e260]
                    - paragraph [ref=e262]: "0.00"
                    - paragraph [ref=e263]: kg CO₂
                  - generic [ref=e264]:
                    - img [ref=e266]
                    - paragraph [ref=e268]: "0"
                    - paragraph [ref=e269]: litros agua
                  - generic [ref=e270]:
                    - img [ref=e272]
                    - paragraph [ref=e274]: "0"
                    - paragraph [ref=e275]: árboles
                  - generic [ref=e276]:
                    - img [ref=e278]
                    - paragraph [ref=e280]: "0.000"
                    - paragraph [ref=e281]: coches/año
                - button "Guardar cálculo" [disabled] [ref=e282]
            - generic [ref=e283]:
              - generic [ref=e285]:
                - generic [ref=e286]:
                  - heading "Historial de cálculos" [level=2] [ref=e287]
                  - paragraph [ref=e288]: 38 registros encontrados
                - generic [ref=e289]:
                  - combobox "Registros por página" [ref=e290]:
                    - option "10 por página"
                    - option "20 por página" [selected]
                    - option "50 por página"
                    - option "100 por página"
                  - button "Descargar" [ref=e292] [cursor=pointer]:
                    - img [ref=e293]
                    - text: Descargar
                  - generic [ref=e295]:
                    - img [ref=e297]
                    - textbox "Buscar objetos..." [ref=e299]
              - generic [ref=e300]:
                - generic [ref=e301]:
                  - generic [ref=e302]: Desde
                  - generic [ref=e303]:
                    - img
                    - textbox [ref=e304]
                - generic [ref=e305]:
                  - generic [ref=e306]: Hasta
                  - generic [ref=e307]:
                    - img
                    - textbox [ref=e308]
                - generic [ref=e309]:
                  - generic [ref=e310]: Categoría
                  - combobox [ref=e311]:
                    - option "Todas" [selected]
                    - option "Ropa y Textiles"
                    - option "Muebles"
                - button "Filtrar" [ref=e313] [cursor=pointer]:
                  - img [ref=e314]
                  - text: Filtrar
              - table [ref=e317]:
                - rowgroup [ref=e318]:
                  - row "Fecha Usuario Objetos CO₂ evitado" [ref=e319]:
                    - columnheader "Fecha" [ref=e320] [cursor=pointer]:
                      - generic [ref=e321]:
                        - text: Fecha
                        - img [ref=e322]
                    - columnheader "Usuario" [ref=e324] [cursor=pointer]:
                      - generic [ref=e325]:
                        - text: Usuario
                        - img [ref=e326]
                    - columnheader "Objetos" [ref=e328]
                    - columnheader "CO₂ evitado" [ref=e329] [cursor=pointer]:
                      - generic [ref=e330]:
                        - text: CO₂ evitado
                        - img [ref=e331]
                - rowgroup [ref=e333]:
                  - row "20 de jun de 2026 admin 5 kg Camiseta 30.500 kg" [ref=e334] [cursor=pointer]:
                    - cell "20 de jun de 2026" [ref=e335]
                    - cell "admin" [ref=e336]
                    - cell "5 kg Camiseta" [ref=e337]:
                      - generic [ref=e338]: 5 kg Camiseta
                    - cell "30.500 kg" [ref=e339]
                  - row "20 de jun de 2026 admin 5 kg Camiseta 30.500 kg" [ref=e340] [cursor=pointer]:
                    - cell "20 de jun de 2026" [ref=e341]
                    - cell "admin" [ref=e342]
                    - cell "5 kg Camiseta" [ref=e343]:
                      - generic [ref=e344]: 5 kg Camiseta
                    - cell "30.500 kg" [ref=e345]
                  - row "19 de jun de 2026 admin 5 kg Camiseta 30.500 kg" [ref=e346] [cursor=pointer]:
                    - cell "19 de jun de 2026" [ref=e347]
                    - cell "admin" [ref=e348]
                    - cell "5 kg Camiseta" [ref=e349]:
                      - generic [ref=e350]: 5 kg Camiseta
                    - cell "30.500 kg" [ref=e351]
                  - row "19 de jun de 2026 admin 5 kg Camiseta 30.500 kg" [ref=e352] [cursor=pointer]:
                    - cell "19 de jun de 2026" [ref=e353]
                    - cell "admin" [ref=e354]
                    - cell "5 kg Camiseta" [ref=e355]:
                      - generic [ref=e356]: 5 kg Camiseta
                    - cell "30.500 kg" [ref=e357]
                  - row "19 de jun de 2026 admin 5 kg Camiseta 30.500 kg" [ref=e358] [cursor=pointer]:
                    - cell "19 de jun de 2026" [ref=e359]
                    - cell "admin" [ref=e360]
                    - cell "5 kg Camiseta" [ref=e361]:
                      - generic [ref=e362]: 5 kg Camiseta
                    - cell "30.500 kg" [ref=e363]
                  - row "19 de jun de 2026 admin 5 kg Camiseta 30.500 kg" [ref=e364] [cursor=pointer]:
                    - cell "19 de jun de 2026" [ref=e365]
                    - cell "admin" [ref=e366]
                    - cell "5 kg Camiseta" [ref=e367]:
                      - generic [ref=e368]: 5 kg Camiseta
                    - cell "30.500 kg" [ref=e369]
                  - row "19 de jun de 2026 admin 5 kg Camiseta 30.500 kg" [ref=e370] [cursor=pointer]:
                    - cell "19 de jun de 2026" [ref=e371]
                    - cell "admin" [ref=e372]
                    - cell "5 kg Camiseta" [ref=e373]:
                      - generic [ref=e374]: 5 kg Camiseta
                    - cell "30.500 kg" [ref=e375]
                  - row "19 de jun de 2026 admin 5 kg Camiseta 30.500 kg" [ref=e376] [cursor=pointer]:
                    - cell "19 de jun de 2026" [ref=e377]
                    - cell "admin" [ref=e378]
                    - cell "5 kg Camiseta" [ref=e379]:
                      - generic [ref=e380]: 5 kg Camiseta
                    - cell "30.500 kg" [ref=e381]
                  - row "17 de jun de 2026 admin 5 kg Camiseta 30.500 kg" [ref=e382] [cursor=pointer]:
                    - cell "17 de jun de 2026" [ref=e383]
                    - cell "admin" [ref=e384]
                    - cell "5 kg Camiseta" [ref=e385]:
                      - generic [ref=e386]: 5 kg Camiseta
                    - cell "30.500 kg" [ref=e387]
                  - row "17 de jun de 2026 admin 5 kg Camiseta 30.500 kg" [ref=e388] [cursor=pointer]:
                    - cell "17 de jun de 2026" [ref=e389]
                    - cell "admin" [ref=e390]
                    - cell "5 kg Camiseta" [ref=e391]:
                      - generic [ref=e392]: 5 kg Camiseta
                    - cell "30.500 kg" [ref=e393]
                  - row "17 de jun de 2026 admin 5 kg Camiseta 30.500 kg" [ref=e394] [cursor=pointer]:
                    - cell "17 de jun de 2026" [ref=e395]
                    - cell "admin" [ref=e396]
                    - cell "5 kg Camiseta" [ref=e397]:
                      - generic [ref=e398]: 5 kg Camiseta
                    - cell "30.500 kg" [ref=e399]
                  - row "17 de jun de 2026 admin 5 kg Camiseta 30.500 kg" [ref=e400] [cursor=pointer]:
                    - cell "17 de jun de 2026" [ref=e401]
                    - cell "admin" [ref=e402]
                    - cell "5 kg Camiseta" [ref=e403]:
                      - generic [ref=e404]: 5 kg Camiseta
                    - cell "30.500 kg" [ref=e405]
                  - row "17 de jun de 2026 admin 5 kg Camiseta 30.500 kg" [ref=e406] [cursor=pointer]:
                    - cell "17 de jun de 2026" [ref=e407]
                    - cell "admin" [ref=e408]
                    - cell "5 kg Camiseta" [ref=e409]:
                      - generic [ref=e410]: 5 kg Camiseta
                    - cell "30.500 kg" [ref=e411]
                  - row "16 de jun de 2026 admin 5 kg Camiseta 30.500 kg" [ref=e412] [cursor=pointer]:
                    - cell "16 de jun de 2026" [ref=e413]
                    - cell "admin" [ref=e414]
                    - cell "5 kg Camiseta" [ref=e415]:
                      - generic [ref=e416]: 5 kg Camiseta
                    - cell "30.500 kg" [ref=e417]
                  - row "10 de jun de 2026 admin 5 kg Camiseta 30.500 kg" [ref=e418] [cursor=pointer]:
                    - cell "10 de jun de 2026" [ref=e419]
                    - cell "admin" [ref=e420]
                    - cell "5 kg Camiseta" [ref=e421]:
                      - generic [ref=e422]: 5 kg Camiseta
                    - cell "30.500 kg" [ref=e423]
              - generic [ref=e424]:
                - paragraph [ref=e425]: Página 1 de 2
                - generic [ref=e426]:
                  - button [disabled] [ref=e427]:
                    - img [ref=e428]
                  - button [ref=e430] [cursor=pointer]:
                    - img [ref=e431]
            - generic [ref=e433]:
              - generic [ref=e434]:
                - heading "Documentos de la empresa" [level=2] [ref=e435]
                - paragraph [ref=e436]: Genera certificados e informes del impacto ambiental de tu organización.
              - generic [ref=e437]:
                - button "Generar certificado" [ref=e438] [cursor=pointer]:
                  - img [ref=e439]
                  - text: Generar certificado
                - button "Generar informe" [ref=e441] [cursor=pointer]:
                  - img [ref=e442]
                  - text: Generar informe
              - generic [ref=e444]:
                - generic [ref=e446]: 20 documentos generados
                - generic [ref=e447]:
                  - img [ref=e449]
                  - generic [ref=e451]:
                    - paragraph [ref=e452]: Certificado de impacto
                    - paragraph [ref=e453]:
                      - text: Emitido el 20 de jun de 2026 ·
                      - code [ref=e454]: RCO2-24BA-F197
                  - generic [ref=e455]: 1141.00 kg CO₂
                  - generic [ref=e456]:
                    - link "Ver en línea" [ref=e457] [cursor=pointer]:
                      - /url: /verificar/24baf197-b16f-432e-825e-11f79f7643b4
                      - img [ref=e458]
                    - button "Descargar PDF" [ref=e460] [cursor=pointer]:
                      - img [ref=e461]
                - generic [ref=e463]:
                  - img [ref=e465]
                  - generic [ref=e467]:
                    - paragraph [ref=e468]: Informe de impacto
                    - paragraph [ref=e469]:
                      - text: 31 de dic de 2023 — 30 de dic de 2024 ·
                      - code [ref=e470]: RCO2-8EFF-7633
                  - generic [ref=e471]: 0.00 kg CO₂
                  - generic [ref=e472]:
                    - link "Ver en línea" [ref=e473] [cursor=pointer]:
                      - /url: /verificar/8eff7633-1a62-4212-82d0-2e394d6d9ada
                      - img [ref=e474]
                    - button "Descargar PDF" [ref=e476] [cursor=pointer]:
                      - img [ref=e477]
                - generic [ref=e479]:
                  - img [ref=e481]
                  - generic [ref=e483]:
                    - paragraph [ref=e484]: Certificado de impacto
                    - paragraph [ref=e485]:
                      - text: Emitido el 20 de jun de 2026 ·
                      - code [ref=e486]: RCO2-71A8-4A79
                  - generic [ref=e487]: 1141.00 kg CO₂
                  - generic [ref=e488]:
                    - link "Ver en línea" [ref=e489] [cursor=pointer]:
                      - /url: /verificar/71a84a79-3e41-4588-97d1-9cb05bc00d78
                      - img [ref=e490]
                    - button "Descargar PDF" [ref=e492] [cursor=pointer]:
                      - img [ref=e493]
                - generic [ref=e495]:
                  - img [ref=e497]
                  - generic [ref=e499]:
                    - paragraph [ref=e500]: Certificado de impacto
                    - paragraph [ref=e501]:
                      - text: Emitido el 20 de jun de 2026 ·
                      - code [ref=e502]: RCO2-6A3C-F8AF
                  - generic [ref=e503]: 1110.50 kg CO₂
                  - generic [ref=e504]:
                    - link "Ver en línea" [ref=e505] [cursor=pointer]:
                      - /url: /verificar/6a3cf8af-5e93-4f95-ad2b-e44a78c44118
                      - img [ref=e506]
                    - button "Descargar PDF" [ref=e508] [cursor=pointer]:
                      - img [ref=e509]
                - generic [ref=e511]:
                  - img [ref=e513]
                  - generic [ref=e515]:
                    - paragraph [ref=e516]: Informe de impacto
                    - paragraph [ref=e517]:
                      - text: 31 de dic de 2023 — 30 de dic de 2024 ·
                      - code [ref=e518]: RCO2-B551-5EB0
                  - generic [ref=e519]: 0.00 kg CO₂
                  - generic [ref=e520]:
                    - link "Ver en línea" [ref=e521] [cursor=pointer]:
                      - /url: /verificar/b5515eb0-9f25-4e7a-85d8-ad9fe27abaac
                      - img [ref=e522]
                    - button "Descargar PDF" [ref=e524] [cursor=pointer]:
                      - img [ref=e525]
                - generic [ref=e527]:
                  - img [ref=e529]
                  - generic [ref=e531]:
                    - paragraph [ref=e532]: Certificado de impacto
                    - paragraph [ref=e533]:
                      - text: Emitido el 20 de jun de 2026 ·
                      - code [ref=e534]: RCO2-F712-3E66
                  - generic [ref=e535]: 1110.50 kg CO₂
                  - generic [ref=e536]:
                    - link "Ver en línea" [ref=e537] [cursor=pointer]:
                      - /url: /verificar/f7123e66-4989-42fe-b30e-a20a2d74c5ba
                      - img [ref=e538]
                    - button "Descargar PDF" [ref=e540] [cursor=pointer]:
                      - img [ref=e541]
                - generic [ref=e543]:
                  - img [ref=e545]
                  - generic [ref=e547]:
                    - paragraph [ref=e548]: Informe de impacto
                    - paragraph [ref=e549]:
                      - text: 31 de dic de 2023 — 30 de dic de 2024 ·
                      - code [ref=e550]: RCO2-BAF8-64AB
                  - generic [ref=e551]: 0.00 kg CO₂
                  - generic [ref=e552]:
                    - link "Ver en línea" [ref=e553] [cursor=pointer]:
                      - /url: /verificar/baf864ab-8979-42f3-9594-3be7b0456fdb
                      - img [ref=e554]
                    - button "Descargar PDF" [ref=e556] [cursor=pointer]:
                      - img [ref=e557]
                - generic [ref=e559]:
                  - img [ref=e561]
                  - generic [ref=e563]:
                    - paragraph [ref=e564]: Certificado de impacto
                    - paragraph [ref=e565]:
                      - text: Emitido el 19 de jun de 2026 ·
                      - code [ref=e566]: RCO2-B609-296B
                  - generic [ref=e567]: 1080.00 kg CO₂
                  - generic [ref=e568]:
                    - link "Ver en línea" [ref=e569] [cursor=pointer]:
                      - /url: /verificar/b609296b-fb1c-43cc-98ff-7d77720ef5bb
                      - img [ref=e570]
                    - button "Descargar PDF" [ref=e572] [cursor=pointer]:
                      - img [ref=e573]
                - generic [ref=e575]:
                  - img [ref=e577]
                  - generic [ref=e579]:
                    - paragraph [ref=e580]: Certificado de impacto
                    - paragraph [ref=e581]:
                      - text: Emitido el 19 de jun de 2026 ·
                      - code [ref=e582]: RCO2-DC0B-B978
                  - generic [ref=e583]: 1049.50 kg CO₂
                  - generic [ref=e584]:
                    - link "Ver en línea" [ref=e585] [cursor=pointer]:
                      - /url: /verificar/dc0bb978-fb21-4308-b9c3-ad45d46efdd7
                      - img [ref=e586]
                    - button "Descargar PDF" [ref=e588] [cursor=pointer]:
                      - img [ref=e589]
                - generic [ref=e591]:
                  - img [ref=e593]
                  - generic [ref=e595]:
                    - paragraph [ref=e596]: Informe de impacto
                    - paragraph [ref=e597]:
                      - text: 31 de dic de 2023 — 30 de dic de 2024 ·
                      - code [ref=e598]: RCO2-3475-2C47
                  - generic [ref=e599]: 0.00 kg CO₂
                  - generic [ref=e600]:
                    - link "Ver en línea" [ref=e601] [cursor=pointer]:
                      - /url: /verificar/34752c47-5bd6-40c3-99d8-a641502e4a52
                      - img [ref=e602]
                    - button "Descargar PDF" [ref=e604] [cursor=pointer]:
                      - img [ref=e605]
                - generic [ref=e607]:
                  - img [ref=e609]
                  - generic [ref=e611]:
                    - paragraph [ref=e612]: Certificado de impacto
                    - paragraph [ref=e613]:
                      - text: Emitido el 19 de jun de 2026 ·
                      - code [ref=e614]: RCO2-010D-7A32
                  - generic [ref=e615]: 1049.50 kg CO₂
                  - generic [ref=e616]:
                    - link "Ver en línea" [ref=e617] [cursor=pointer]:
                      - /url: /verificar/010d7a32-647d-430c-9bac-d238a32a35cc
                      - img [ref=e618]
                    - button "Descargar PDF" [ref=e620] [cursor=pointer]:
                      - img [ref=e621]
                - generic [ref=e623]:
                  - img [ref=e625]
                  - generic [ref=e627]:
                    - paragraph [ref=e628]: Certificado de impacto
                    - paragraph [ref=e629]:
                      - text: Emitido el 19 de jun de 2026 ·
                      - code [ref=e630]: RCO2-3885-79F8
                  - generic [ref=e631]: 1019.00 kg CO₂
                  - generic [ref=e632]:
                    - link "Ver en línea" [ref=e633] [cursor=pointer]:
                      - /url: /verificar/388579f8-f8dd-4521-8da8-ea4653db826c
                      - img [ref=e634]
                    - button "Descargar PDF" [ref=e636] [cursor=pointer]:
                      - img [ref=e637]
                - generic [ref=e639]:
                  - img [ref=e641]
                  - generic [ref=e643]:
                    - paragraph [ref=e644]: Certificado de impacto
                    - paragraph [ref=e645]:
                      - text: Emitido el 19 de jun de 2026 ·
                      - code [ref=e646]: RCO2-5518-4253
                  - generic [ref=e647]: 1019.00 kg CO₂
                  - generic [ref=e648]:
                    - link "Ver en línea" [ref=e649] [cursor=pointer]:
                      - /url: /verificar/55184253-5f5f-49ac-b051-0851099776ad
                      - img [ref=e650]
                    - button "Descargar PDF" [ref=e652] [cursor=pointer]:
                      - img [ref=e653]
                - generic [ref=e655]:
                  - img [ref=e657]
                  - generic [ref=e659]:
                    - paragraph [ref=e660]: Informe de impacto
                    - paragraph [ref=e661]:
                      - text: 31 de dic de 2023 — 30 de dic de 2024 ·
                      - code [ref=e662]: RCO2-3FD8-9997
                  - generic [ref=e663]: 0.00 kg CO₂
                  - generic [ref=e664]:
                    - link "Ver en línea" [ref=e665] [cursor=pointer]:
                      - /url: /verificar/3fd89997-118d-459c-9049-26d87e1686c1
                      - img [ref=e666]
                    - button "Descargar PDF" [ref=e668] [cursor=pointer]:
                      - img [ref=e669]
                - generic [ref=e671]:
                  - img [ref=e673]
                  - generic [ref=e675]:
                    - paragraph [ref=e676]: Certificado de impacto
                    - paragraph [ref=e677]:
                      - text: Emitido el 19 de jun de 2026 ·
                      - code [ref=e678]: RCO2-BCA4-D3CC
                  - generic [ref=e679]: 1019.00 kg CO₂
                  - generic [ref=e680]:
                    - link "Ver en línea" [ref=e681] [cursor=pointer]:
                      - /url: /verificar/bca4d3cc-afc7-40fd-95d0-283aa445bac8
                      - img [ref=e682]
                    - button "Descargar PDF" [ref=e684] [cursor=pointer]:
                      - img [ref=e685]
                - generic [ref=e687]:
                  - img [ref=e689]
                  - generic [ref=e691]:
                    - paragraph [ref=e692]: Certificado de impacto
                    - paragraph [ref=e693]:
                      - text: Emitido el 19 de jun de 2026 ·
                      - code [ref=e694]: RCO2-B55C-3657
                  - generic [ref=e695]: 988.50 kg CO₂
                  - generic [ref=e696]:
                    - link "Ver en línea" [ref=e697] [cursor=pointer]:
                      - /url: /verificar/b55c3657-98bd-4b04-a22b-7dc33d4c6bfb
                      - img [ref=e698]
                    - button "Descargar PDF" [ref=e700] [cursor=pointer]:
                      - img [ref=e701]
                - generic [ref=e703]:
                  - img [ref=e705]
                  - generic [ref=e707]:
                    - paragraph [ref=e708]: Informe de impacto
                    - paragraph [ref=e709]:
                      - text: 31 de dic de 2023 — 30 de dic de 2024 ·
                      - code [ref=e710]: RCO2-6952-97E0
                  - generic [ref=e711]: 0.00 kg CO₂
                  - generic [ref=e712]:
                    - link "Ver en línea" [ref=e713] [cursor=pointer]:
                      - /url: /verificar/695297e0-c6dd-419f-9f8f-f4bfaee134f7
                      - img [ref=e714]
                    - button "Descargar PDF" [ref=e716] [cursor=pointer]:
                      - img [ref=e717]
                - generic [ref=e719]:
                  - img [ref=e721]
                  - generic [ref=e723]:
                    - paragraph [ref=e724]: Certificado de impacto
                    - paragraph [ref=e725]:
                      - text: Emitido el 19 de jun de 2026 ·
                      - code [ref=e726]: RCO2-2304-0C13
                  - generic [ref=e727]: 988.50 kg CO₂
                  - generic [ref=e728]:
                    - link "Ver en línea" [ref=e729] [cursor=pointer]:
                      - /url: /verificar/23040c13-6744-4a4b-b7b2-c823d009c982
                      - img [ref=e730]
                    - button "Descargar PDF" [ref=e732] [cursor=pointer]:
                      - img [ref=e733]
                - generic [ref=e735]:
                  - img [ref=e737]
                  - generic [ref=e739]:
                    - paragraph [ref=e740]: Informe de impacto
                    - paragraph [ref=e741]:
                      - text: 31 de dic de 2023 — 30 de dic de 2024 ·
                      - code [ref=e742]: RCO2-D960-FB0D
                  - generic [ref=e743]: 0.00 kg CO₂
                  - generic [ref=e744]:
                    - link "Ver en línea" [ref=e745] [cursor=pointer]:
                      - /url: /verificar/d960fb0d-c94f-46e4-bdbb-0b9bca20ba4f
                      - img [ref=e746]
                    - button "Descargar PDF" [ref=e748] [cursor=pointer]:
                      - img [ref=e749]
                - generic [ref=e751]:
                  - img [ref=e753]
                  - generic [ref=e755]:
                    - paragraph [ref=e756]: Informe de impacto
                    - paragraph [ref=e757]:
                      - text: 31 de dic de 2023 — 30 de dic de 2024 ·
                      - code [ref=e758]: RCO2-1B50-0B0B
                  - generic [ref=e759]: 0.00 kg CO₂
                  - generic [ref=e760]:
                    - link "Ver en línea" [ref=e761] [cursor=pointer]:
                      - /url: /verificar/1b500b0b-72e4-4fa7-a656-7587cecf3e2c
                      - img [ref=e762]
                    - button "Descargar PDF" [ref=e764] [cursor=pointer]:
                      - img [ref=e765]
            - button "Exportar CSV" [ref=e769] [cursor=pointer]:
              - img [ref=e770]
              - text: Exportar CSV
        - contentinfo [ref=e773]:
          - generic [ref=e774]:
            - generic [ref=e775]:
              - img "Grupo MLP" [ref=e776]
              - generic [ref=e778]:
                - paragraph [ref=e779]: © 2026 · Todos los derechos reservados.
                - paragraph [ref=e780]: Tecnología con propósito para un futuro sostenible.
            - generic [ref=e781]:
              - generic [ref=e782]:
                - link "Sobre la medición" [ref=e783] [cursor=pointer]:
                  - /url: /legal/medicion
                - generic [ref=e784]: •
                - link "Reglamento" [ref=e785] [cursor=pointer]:
                  - /url: /legal/reglamento
                - generic [ref=e786]: •
                - link "Política de privacidad" [ref=e787] [cursor=pointer]:
                  - /url: /legal/privacidad
              - generic [ref=e788]:
                - generic [ref=e789]:
                  - generic "186.121.98.145" [ref=e790]: "Dirección IP: 186.121.98.145"
                  - generic [ref=e791]: "|"
                  - generic [ref=e792]: "Última visita: sábado, 20 de junio de 2026, 5:41 a.m."
                - button "ES" [ref=e794] [cursor=pointer]:
                  - text: ES
                  - img [ref=e795]
  - alert [ref=e797]
  - generic [ref=e798]: "0"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | 
  3   | test.describe('empresa_admin', () => {
  4   |   test.use({ storageState: 'playwright/.auth/empresa-admin.json' })
  5   | 
  6   |   test.beforeEach(async ({ page }) => {
  7   |     await page.goto('/empresa', { waitUntil: 'domcontentloaded' })
  8   |   })
  9   | 
  10  |   test('emp-01 - login aterriza en /empresa con KPI visible', async ({ page }) => {
  11  |     await expect(page).toHaveURL(/\/empresa/)
  12  |     await expect(page.locator('text=/CO₂|impacto|equipo/i').first()).toBeVisible({ timeout: 10_000 })
  13  |   })
  14  | 
  15  |   test('emp-02 - cálculo persiste en /empresa/calculos tras recargar', async ({ page }) => {
  16  |     const boton = page.locator('button').filter({ hasText: /Ropa y Textiles|Muebles/i }).first()
  17  |     await expect(boton).toBeVisible({ timeout: 10_000 })
  18  |     await boton.click()
  19  |     const input = page.locator('input[type="number"]').first()
  20  |     await input.click({ clickCount: 3 })
  21  |     await page.keyboard.type('5')
> 22  |     await page.locator('button:has-text("Guardar cálculo")').click()
      |                                                              ^ Error: locator.click: Test timeout of 60000ms exceeded.
  23  |     await expect(page.getByText('¡Cálculo guardado!')).toBeVisible({ timeout: 15_000 })
  24  | 
  25  |     await page.goto('/empresa/calculos')
  26  |     await page.waitForLoadState('load')
  27  |     await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 })
  28  |   })
  29  | 
  30  |   test('emp-03 - certificado generado es verificable en /verificar', async ({ page }) => {
  31  |     const botonCert = page.locator('button:has-text("Generar certificado")').first()
  32  |     await expect(botonCert).toBeVisible({ timeout: 10_000 })
  33  | 
  34  |     const responsePromise = page.waitForResponse('/api/certificados/generar', { timeout: 50_000 })
  35  |     await botonCert.click()
  36  |     const response = await responsePromise
  37  |     const data = await response.json() as { codigo_verificacion?: string }
  38  |     expect(data.codigo_verificacion).toBeTruthy()
  39  |     const uuid = data.codigo_verificacion!
  40  |     const codigo = `RCO2-${uuid.slice(0, 4).toUpperCase()}-${uuid.slice(4, 8).toUpperCase()}`
  41  | 
  42  |     await page.goto(`/verificar/${codigo}`)
  43  |     await page.waitForLoadState('load')
  44  |     await expect(page.getByText(codigo)).toBeVisible({ timeout: 15_000 })
  45  |     await expect(page.getByText(/kilogramos CO₂-eq/i).first()).toBeVisible({ timeout: 5_000 })
  46  |   })
  47  | 
  48  |   test('emp-04 - informe generado con fechas es verificable en /verificar', async ({ page }) => {
  49  |     const botonInforme = page.locator('button:has-text("Generar informe")').first()
  50  |     await expect(botonInforme).toBeVisible({ timeout: 10_000 })
  51  |     await botonInforme.click()
  52  |     await expect(page.getByText('Elige el período a incluir')).toBeVisible({ timeout: 8_000 })
  53  |     const modal = page.locator('[style*="z-index: 51"]').first()
  54  |     await modal.locator('input[type="date"]').first().fill('2024-01-01')
  55  |     await modal.locator('input[type="date"]').last().fill('2024-12-31')
  56  | 
  57  |     const responsePromise = page.waitForResponse('/api/certificados/generar', { timeout: 50_000 })
  58  |     await page.locator('button:has-text("Generar informe")').last().click()
  59  |     const response = await responsePromise
  60  |     const data = await response.json() as { codigo_verificacion?: string }
  61  |     expect(data.codigo_verificacion).toBeTruthy()
  62  |     const uuid = data.codigo_verificacion!
  63  |     const codigo = `RCO2-${uuid.slice(0, 4).toUpperCase()}-${uuid.slice(4, 8).toUpperCase()}`
  64  | 
  65  |     await page.goto(`/verificar/${codigo}`)
  66  |     await page.waitForLoadState('load')
  67  |     await expect(page.getByText(/Informe de Impacto/i).first()).toBeVisible({ timeout: 10_000 })
  68  |   })
  69  | 
  70  |   test('emp-05 - invitación persiste en lista de equipo', async ({ page }) => {
  71  |     await page.goto('/empresa/equipo')
  72  |     await page.waitForLoadState('load')
  73  |     await page.locator('button:has-text("Invitar")').click()
  74  |     const emailInvitado = `e2e-invitado-${Date.now()}@ejemplo.com`
  75  |     await page.locator('input[type="email"]').fill(emailInvitado)
  76  |     await page.locator('select').selectOption('empleado')
  77  |     await page.locator('button:has-text("Generar invitación")').click()
  78  |     await expect(page.getByText(/copiar|copiado/i)).toBeVisible({ timeout: 15_000 })
  79  | 
  80  |     await page.reload()
  81  |     await page.waitForLoadState('load')
  82  |     await expect(page.getByText(emailInvitado)).toBeVisible({ timeout: 10_000 })
  83  |   })
  84  | 
  85  |   test('emp-06 - nombre de empresa persiste tras guardar y recargar', async ({ page }) => {
  86  |     await page.goto('/empresa/configuracion')
  87  |     await page.waitForLoadState('load')
  88  |     const inputNombre = page.locator('input[name="nombre"]')
  89  |     await expect(inputNombre).toBeVisible({ timeout: 10_000 })
  90  |     const nombreOriginal = await inputNombre.inputValue()
  91  | 
  92  |     const nombreTest = `Empresa Test ${Date.now()}`
  93  |     await inputNombre.click({ clickCount: 3 })
  94  |     await page.keyboard.type(nombreTest)
  95  |     await page.locator('button:has-text("Guardar cambios")').click()
  96  |     await expect(page.getByText(/guardado|éxito/i)).toBeVisible({ timeout: 10_000 })
  97  | 
  98  |     await page.reload()
  99  |     await page.waitForLoadState('load')
  100 |     const inputDespues = page.locator('input[name="nombre"]')
  101 |     await expect(inputDespues).toHaveValue(nombreTest, { timeout: 8_000 })
  102 | 
  103 |     await inputDespues.click({ clickCount: 3 })
  104 |     await page.keyboard.type(nombreOriginal)
  105 |     await page.locator('button:has-text("Guardar cambios")').click()
  106 |   })
  107 | 
  108 |   test('emp-07 - meta persiste tras crear y desaparece tras eliminar', async ({ page }) => {
  109 |     await page.goto('/empresa')
  110 |     await page.waitForLoadState('load')
  111 | 
  112 |     const tituloMeta = `Meta E2E ${Date.now()}`
  113 |     await page.locator('button:has-text("Crear Meta")').click()
  114 |     await page.getByPlaceholder(/título|meta|reducción/i).fill(tituloMeta)
  115 |     await page.locator('select').first().selectOption('co2_kg')
  116 |     await page.getByPlaceholder(/500|objetivo|numeral/i).fill('100')
  117 |     const hoy = new Date().toISOString().slice(0, 10)
  118 |     const fin = new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10)
  119 |     await page.locator('input[type="date"]').first().fill(hoy)
  120 |     await page.locator('input[type="date"]').nth(1).fill(fin)
  121 |     await page.locator('button[type="submit"]').filter({ hasText: /^Guardar$/ }).click()
  122 | 
```