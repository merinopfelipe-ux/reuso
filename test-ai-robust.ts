import { buscarPesosMaterialesItem } from './src/lib/ia/peso-materiales-item'

async function runTests() {
  console.log("=== PRUEBA ROBUSTA DE IA (15 ITERACIONES) ===")
  let fallos = 0;
  for (let i = 1; i <= 15; i++) {
    console.log(`\nIteración ${i}/15...`)
    try {
      const res = await buscarPesosMaterialesItem("Silla industrial", "Sillas", [
        "Hierro", "Madera pino", "Tornillos"
      ])
      if (res.ok) {
        console.log(`[EXITO]`)
      } else {
        console.error(`[FALLO] ${res.error}`)
        fallos++;
      }
    } catch (e) {
      console.error(e)
      fallos++;
    }
  }
  console.log(`\nCompletado. Fallos: ${fallos}/15`)
}

runTests()
