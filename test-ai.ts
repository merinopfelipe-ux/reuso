import { buscarPesosMaterialesItem } from './src/lib/ia/peso-materiales-item'
import { buscarPesoInsumo } from './src/lib/ia/peso-insumo'


async function runTests() {
  console.log("=== PRUEBA DE IA: PESO MATERIALES ITEM ===")
  for (let i = 1; i <= 3; i++) {
    console.log(`Prueba ${i}/3 - Materiales Item`)
    try {
      const res = await buscarPesosMaterialesItem("Silla de comedor rústica", "Sillas", [
        "Madera pino", "Tela jacquard", "Espuma densidad 26"
      ])
      console.log(res)
    } catch (e) {
      console.error(e)
    }
  }

  console.log("\n=== PRUEBA DE IA: PESO INSUMO ===")
  for (let i = 1; i <= 2; i++) {
    console.log(`Prueba ${i}/2 - Peso Insumo`)
    try {
      const res = await buscarPesoInsumo("Pegante para madera", "litros")
      console.log(res)
    } catch (e) {
      console.error(e)
    }
  }
}

runTests()
