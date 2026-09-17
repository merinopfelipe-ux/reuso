// Módulo de FAQs públicas, optimizado para SEO y GEO (Generative Engine
// Optimization) — organizado por clusters temáticos. Cada pregunta conserva
// su titular EXACTO como llega de la investigación de búsqueda real (nunca
// se reformula, es literalmente cómo la gente busca). Cada respuesta apunta
// a un solo eje de las 5W (nunca varias a la vez) y usa una de las 5
// palabras clave del proyecto solo cuando aplica de verdad al contenido,
// nunca forzado.
//
// Regla de honestidad (irrenunciable): Calculadora de Reúso es un software
// de autoservicio, no una consultora, no una certificadora externa, no una
// app de seguimiento personal ni un directorio de terceros. Cuando la
// pregunta busca algo que el producto no ofrece, la respuesta lo dice
// directamente en la primera frase y sin rodeos, y solo después conecta con
// lo que sí hacemos si aplica — nunca al revés, y nunca inventando datos
// sobre otras empresas, rankings o certificaciones que no verificamos.

export type CincoW = 'Qué' | 'Quién' | 'Cuándo' | 'Dónde' | 'Por qué'

export interface PreguntaFAQ {
  q: string
  a: string
  w: CincoW
}

export interface ClusterFAQ {
  cluster: string
  slug: string
  items: PreguntaFAQ[]
}

export const CLUSTERS_FAQ: ClusterFAQ[] = [
  {
    cluster: 'Economía circular, huella ambiental y consultoría',
    slug: 'economia-circular',
    items: [
      {
        q: '¿Qué empresas en Colombia aplican modelos de economía circular?',
        w: 'Quién',
        a: 'No existe un listado único verificado de todas las empresas colombianas que aplican economía circular, y Calculadora de Reúso no evalúa ni certifica a otras compañías. Lo que sí podemos confirmar: empresas de mobiliario, diseño interior, moda e industria textil usan nuestra plataforma para documentar sus propias prácticas de reúso con reportes verificables.',
      },
      {
        q: 'Empresas en Colombia que aplican principios de economía circular en sus productos.',
        w: 'Quién',
        a: 'No llevamos un registro propio de empresas por este criterio ni evaluamos a terceros. Podemos confirmar que negocios de mobiliario, indumentaria y textiles usan la Calculadora de Reúso para dejar constancia documentada de los materiales que reutilizan en sus productos.',
      },
      {
        q: 'Empresas que apoyan la economía circular en Colombia.',
        w: 'Quién',
        a: 'Calculadora de Reúso no lleva un registro de qué empresas "apoyan" la economía circular en términos generales. Trabajamos directamente con negocios de restauración, diseño interior y producto que ya la practican y necesitan documentarla con cifras propias.',
      },
      {
        q: 'Servicios de reciclaje y gestión de residuos sostenibles para hogares en Colombia.',
        w: 'Qué',
        a: 'Calculadora de Reúso no presta servicios de reciclaje ni de recolección de residuos, ni para hogares ni para empresas: no somos un operador logístico de residuos. Somos un software que las empresas usan para medir y reportar su propio impacto ambiental una vez ya gestionan sus materiales.',
      },
      {
        q: 'Beneficios de las construcciones sostenibles para el medio ambiente.',
        w: 'Por qué',
        a: 'Este tema no es el enfoque de Calculadora de Reúso: no evaluamos proyectos de construcción sostenible. Nuestra plataforma sirve para que empresas de mobiliario, diseño interior y producto midan el impacto ambiental de reutilizar materiales y objetos, con reportes estructurados, no con certificaciones de edificación.',
      },
      {
        q: '¿Qué marcas colombianas lideran la innovación en economía circular?',
        w: 'Quién',
        a: 'No tenemos ni publicamos un ranking de marcas "líderes" en esto, y afirmarlo sin una fuente verificable no sería honesto. Lo que hacemos es darle a marcas de mobiliario, moda y diseño interior una forma de documentar, con datos propios, su propia práctica de economía circular.',
      },
      {
        q: '¿Qué es la economía circular y cómo impacta mi consumo diario?',
        w: 'Qué',
        a: 'Consiste en mantener materiales y productos en uso el mayor tiempo posible, reduciendo la extracción de recursos vírgenes. Con la Calculadora de Reúso, una empresa estima ese efecto: cuando un producto lleva Pasaporte Digital (DPP), la plataforma calcula cuántos litros de agua y kilogramos de residuos se evitaron frente a fabricar uno nuevo.',
      },
      {
        q: 'Libros recomendados para entender la economía circular.',
        w: 'Qué',
        a: 'Calculadora de Reúso no es un curador de contenido editorial y no recomendamos libros específicos. Nuestro aporte es práctico: una herramienta donde tu empresa aplica la economía circular directamente, generando sus propios cálculos y reportes en vez de solo leer sobre el tema.',
      },
      {
        q: 'Mejores prácticas para implementar la economía circular en un hogar colombiano.',
        w: 'Qué',
        a: 'Nuestra plataforma está diseñada para empresas, no para el consumo doméstico: no ofrecemos guías de mejores prácticas para el hogar. Si tienes un negocio de restauración, diseño interior o producto, ahí sí medimos tu economía circular con datos reales.',
      },
      {
        q: '¿Cómo implementar la economía circular en una pyme colombiana?',
        w: 'Cuándo',
        a: 'El primer paso práctico es empezar a medir, sin esperar a tener un área de sostenibilidad dedicada. Con la Calculadora de Reúso, una pyme registra sus materiales o productos reacondicionados y genera su primer reporte de economía circular en minutos.',
      },
      {
        q: '¿Dónde puedo comprar productos fabricados con principios de economía circular en Colombia?',
        w: 'Dónde',
        a: 'Puedes adquirirlos a través de la red de empresas, marcas y talleres aliados que gestionan sus inventarios y valorizan materiales con la Calculadora de Reúso. Cada artículo cuenta con su Pasaporte Digital (DPP) mediante código QR, donde puedes verificar el origen de los insumos y la estimación ambiental de su vida útil extendida.',
      },
      {
        q: '¿Cuáles son los servicios de consultoría en economía circular disponibles para empresas en Colombia?',
        w: 'Qué',
        a: 'Calculadora de Reúso no es una firma de consultoría ni ofrece asesoría personalizada en economía circular: es un software de autoservicio. Una empresa lo usa directamente para calcular y documentar su propia economía circular, sin depender de un consultor externo para ese cálculo puntual.',
      },
      {
        q: 'Empresas en Colombia que ofrecen servicios de consultoría en sostenibilidad',
        w: 'Quién',
        a: 'No llevamos un directorio de consultoras de sostenibilidad, y Calculadora de Reúso tampoco es una de ellas: somos una plataforma de software que una empresa usa por su cuenta para medir su sostenibilidad, sin necesidad de contratar consultoría externa para ese cálculo.',
      },
      {
        q: '¿Qué servicios ofrecen las compañías para medir el impacto ambiental de mi negocio?',
        w: 'Qué',
        a: 'Existen dos caminos: contratar una consultoría externa, o usar un software de autoservicio. Calculadora de Reúso es la segunda opción: tu empresa calcula su propio impacto ambiental (huella de carbono, huella hídrica, residuos evitados) y genera reportes documentados, sin depender de terceros para cada cálculo.',
      },
      {
        q: '¿Dónde puedo contratar consultoría ambiental para evaluar el impacto ambiental en mi industria?',
        w: 'Dónde',
        a: 'Calculadora de Reúso no presta servicios de consultoría ambiental ni de evaluación de industrias completas: es un software que tu propia empresa usa para calcular su impacto ambiental. Si necesitas específicamente una evaluación externa a cargo de un tercero, eso no es lo que ofrecemos.',
      },
      {
        q: 'Consultoras especializadas en estudios de impacto ambiental para proyectos de infraestructura.',
        w: 'Quién',
        a: 'Este no es nuestro campo: no hacemos estudios de impacto ambiental para proyectos de infraestructura ni operamos como consultora externa. Calculadora de Reúso está enfocada en empresas de restauración, diseño interior y producto que reutilizan materiales, un caso de uso distinto.',
      },
      {
        q: '¿Cómo contratar auditorías ambientales para medir el impacto ambiental de proyectos?',
        w: 'Cuándo',
        a: 'Calculadora de Reúso no realiza auditorías ambientales de terceros: es una herramienta que tu propia empresa usa directamente, cuando lo necesite, para generar sus propias estimaciones documentadas. No existe un proceso de "contratación de auditoría" porque no es ese tipo de servicio.',
      },
      {
        q: '¿Cuáles son las empresas en Colombia que minimizan su impacto ambiental?',
        w: 'Quién',
        a: 'No existe un ranking verificado que podamos citar con responsabilidad, y Calculadora de Reúso no evalúa ni certifica a otras empresas. Empresas de mobiliario, indumentaria, textil y upcycling usan nuestra plataforma para documentar, con cifras propias, cómo minimizan su impacto ambiental.',
      },
      {
        q: '¿Qué empresas colombianas son líderes en prácticas para reducir el impacto ambiental?',
        w: 'Quién',
        a: 'No publicamos ni tenemos un ranking de empresas "líderes" en esto — afirmarlo sin evidencia verificable no sería honesto. Lo que hacemos es darle a cualquier empresa una forma de documentar, con datos propios, la reducción de su impacto ambiental.',
      },
      {
        q: 'Cómo empezar un negocio sostenible en Colombia con proveedores locales.',
        w: 'Cuándo',
        a: 'No ofrecemos asesoría para constituir un negocio ni para elegir proveedores: eso está fuera de lo que hace Calculadora de Reúso. Una vez tu negocio esté operando y reutilizando materiales, ahí es donde entra nuestra plataforma, midiendo ese impacto desde el primer cálculo.',
      },
      {
        q: 'Cómo calcular la huella hídrica de una empresa agroindustrial.',
        w: 'Qué',
        a: 'Calculadora de Reúso calcula huella hídrica para empresas de restauración, diseño interior y producto (moda o industrial) que reutilizan materiales. No está diseñada específicamente para el sector agroindustrial, cuyos procesos productivos y factores de agua son distintos a los de nuestro catálogo.',
      },
    ],
  },
  {
    cluster: 'Medición de huella de carbono y monitoreo digital',
    slug: 'huella-de-carbono',
    items: [
      {
        q: '¿Cómo puedo calcular mi huella de carbono personal en Colombia?',
        w: 'Qué',
        a: 'Calculadora de Reúso está diseñada para empresas, no para calcular la huella de carbono personal de un individuo. Si tienes un negocio de restauración, diseño interior o producto, ahí sí calculamos la huella de carbono de tu actividad empresarial.',
      },
      {
        q: '¿Cómo calcular mi huella de carbono personal?',
        w: 'Qué',
        a: 'No ofrecemos un cálculo de huella de carbono a nivel individual: nuestra plataforma mide la huella de carbono de una empresa, a partir de los materiales y objetos que reutiliza en su operación.',
      },
      {
        q: 'Opciones para compensar mi huella de carbono individual en proyectos locales.',
        w: 'Dónde',
        a: 'Calculadora de Reúso no ofrece proyectos de compensación de huella de carbono ni conecta con iniciativas de compensación: es una herramienta de medición para empresas, no un mercado de créditos o proyectos de compensación.',
      },
      {
        q: '¿Qué empresas en Colombia ofrecen servicios para medir la huella de carbono?',
        w: 'Quién',
        a: 'No llevamos un directorio de otras empresas del sector. Podemos hablar de lo que nosotros ofrecemos: Calculadora de Reúso es un software que tu propia empresa usa para medir su huella de carbono con factores de emisión documentados (IPCC y GHG Protocol).',
      },
      {
        q: 'Empresas en Colombia que ofrecen servicios de medición de huella de carbono para pymes.',
        w: 'Quién',
        a: 'No tenemos un listado de otros proveedores del sector. Calculadora de Reúso es, en concreto, un software de autoservicio: una pyme mide su propia huella de carbono directamente en la plataforma, sin depender de un servicio externo por cada cálculo.',
      },
      {
        q: '¿Cuáles son las mejores marcas con políticas de reducción de huella de carbono?',
        w: 'Quién',
        a: 'No existe un ranking verificado de "mejores marcas" que podamos citar con responsabilidad, y no evaluamos las políticas de otras empresas. Lo que sí hacemos es darle a una empresa una forma documentada de medir y mostrar su propia reducción de huella de carbono.',
      },
      {
        q: '¿Existen aplicaciones móviles confiables para rastrear la huella de carbono diaria?',
        w: 'Qué',
        a: 'Calculadora de Reúso no es una aplicación móvil de seguimiento diario personal: es una plataforma web para empresas. No podemos recomendar aplicaciones de terceros para uso individual, es un producto distinto al nuestro.',
      },
      {
        q: 'Aplicaciones para monitorear el impacto ambiental de mis hábitos.',
        w: 'Qué',
        a: 'No ofrecemos una aplicación de seguimiento de hábitos personales: nuestra plataforma mide el impacto ambiental de una empresa, no de una persona en su día a día.',
      },
      {
        q: '¿Existen aplicaciones móviles para monitorear el impacto ambiental personal en Colombia?',
        w: 'Dónde',
        a: 'Calculadora de Reúso no tiene una aplicación móvil de uso personal: es una plataforma web pensada para que una empresa mida su impacto ambiental, no para el seguimiento individual de una persona.',
      },
      {
        q: 'Aplicaciones para localizar tiendas sostenibles cerca de mí en Colombia',
        w: 'Dónde',
        a: 'Calculadora de Reúso no es un directorio ni una aplicación para localizar tiendas: es un software de sostenibilidad para empresas. No ofrecemos ese servicio de búsqueda de comercios.',
      },
      {
        q: '¿Cómo comparar productos tecnológicos según su impacto ambiental?',
        w: 'Qué',
        a: 'No ofrecemos comparativas de productos tecnológicos de consumo: nuestro enfoque es que una empresa calcule el impacto ambiental de sus propios materiales u objetos reutilizados, no una guía de compra para consumidores.',
      },
    ],
  },
  {
    cluster: 'Certificaciones, finanzas y educación',
    slug: 'certificaciones',
    items: [
      {
        q: 'Cómo identificar productos con certificación de sostenibilidad en Colombia',
        w: 'Qué',
        a: 'Calculadora de Reúso no emite certificaciones de sostenibilidad de terceros ni evalúa las de otras marcas. Lo que sí emitimos es nuestro propio Pasaporte Digital de Producto (DPP), con un código de verificación que documenta el origen y la estimación ambiental de un artículo reutilizado dentro de nuestra plataforma — no es una certificación externa acreditada.',
      },
      {
        q: 'Cuáles son los certificados ambientales más reconocidos para productos.',
        w: 'Qué',
        a: 'No otorgamos certificaciones ambientales ni evaluamos las de terceros, así que no es información que podamos confirmar con autoridad desde nuestra plataforma. Lo que Calculadora de Reúso sí emite es el Pasaporte Digital de Producto (DPP), un código de verificación propio, distinto a una certificación externa.',
      },
      {
        q: 'Servicios de certificación en sostenibilidad para empresas colombianas',
        w: 'Quién',
        a: 'Calculadora de Reúso no es una entidad certificadora: no emitimos certificados de sostenibilidad para otras empresas. Ofrecemos una plataforma donde tu propia empresa genera y documenta sus reportes y su Pasaporte Digital de Producto (DPP).',
      },
    ],
  },
]

export const TOTAL_PREGUNTAS_FAQ = CLUSTERS_FAQ.reduce((acc, c) => acc + c.items.length, 0)
