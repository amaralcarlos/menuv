export function calcularCicloAtual(diaCiclo: number): { inicio: string; fim: string; mesAno: string } {
  const hoje = new Date()
  const dia   = hoje.getDate()
  const mes   = hoje.getMonth()   // 0-indexed
  const ano   = hoje.getFullYear()

  let inicioMes: number, inicioAno: number
  if (dia >= diaCiclo) {
    // Ciclo corrente começa neste mês
    inicioMes = mes
    inicioAno = ano
  } else {
    // Ciclo corrente começou no mês anterior
    inicioMes = mes - 1
    inicioAno = mes === 0 ? ano - 1 : ano
    if (inicioMes < 0) inicioMes = 11
  }

  const fimMes = inicioMes + 1 > 11 ? 0 : inicioMes + 1
  const fimAno = inicioMes + 1 > 11 ? inicioAno + 1 : inicioAno
  const ultimoDia = new Date(fimAno, fimMes + 1, 0).getDate()
  const diaFim = Math.min(diaCiclo - 1, ultimoDia)

  const pad = (n: number) => String(n).padStart(2, '0')
  const inicio = `${inicioAno}-${pad(inicioMes + 1)}-${pad(diaCiclo)}`
  const fim    = `${fimAno}-${pad(fimMes + 1)}-${pad(diaFim)}`
  const mesAno = `${pad(inicioMes + 1)}/${inicioAno}`

  return { inicio, fim, mesAno }
}
