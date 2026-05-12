// lib/planos-config.ts
// Constantes puras de planos — sem dependências server

export const PLANO_LANCAMENTO = {
  valor:        49.90,
  valorAnual:   49.90 * 12, // sem desconto
  limiteEmpresas: 25,
  label: 'Lançamento — até 25 empresas',
}

export const FAIXAS_RESTAURANTE = [
  { min: 0,  max: 5,        valor: 99.00,  label: '0 a 5 empresas'       },
  { min: 6,  max: 10,       valor: 149.00, label: '6 a 10 empresas'      },
  { min: 11, max: 15,       valor: 249.00, label: '11 a 15 empresas'     },
  { min: 16, max: Infinity, valor: 349.00, label: 'Acima de 15 empresas' },
]

const DESCONTO_ANUAL = 0.10 // 10%

export function valorMensal(numEmpresas: number, planoLancamento: boolean): number {
  if (planoLancamento && numEmpresas <= PLANO_LANCAMENTO.limiteEmpresas)
    return PLANO_LANCAMENTO.valor
  const faixa = FAIXAS_RESTAURANTE.find(f => numEmpresas >= f.min && numEmpresas <= f.max)
    ?? FAIXAS_RESTAURANTE[FAIXAS_RESTAURANTE.length - 1]
  return faixa.valor
}

export function valorAnual(numEmpresas: number, planoLancamento: boolean): number {
  const mensal = valorMensal(numEmpresas, planoLancamento)
  if (planoLancamento && numEmpresas <= PLANO_LANCAMENTO.limiteEmpresas)
    return parseFloat((mensal * 12).toFixed(2)) // sem desconto
  return parseFloat((mensal * 12 * (1 - DESCONTO_ANUAL)).toFixed(2))
}

export const STATUS_PAGAMENTO: Record<string, { label: string; cor: string }> = {
  PENDING:   { label: 'Aguardando pagamento', cor: 'yellow' },
  RECEIVED:  { label: 'Pago',                 cor: 'green'  },
  CONFIRMED: { label: 'Confirmado',           cor: 'green'  },
  OVERDUE:   { label: 'Vencido',              cor: 'red'    },
  REFUNDED:  { label: 'Estornado',            cor: 'gray'   },
  CANCELED:  { label: 'Cancelado',            cor: 'gray'   },
}
