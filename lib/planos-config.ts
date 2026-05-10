// lib/planos-config.ts
// Constantes puras de planos — sem dependências server
// Pode ser importado tanto por Client Components quanto por Server Components

export const PLANO_LANCAMENTO = {
  valor: 49.90,
  limiteEmpresas: 25,
  label: 'Lançamento — até 25 empresas',
}

export const FAIXAS_RESTAURANTE = [
  { min: 0,  max: 5,        valor: 99.00,  label: '0 a 5 empresas'       },
  { min: 6,  max: 10,       valor: 149.00, label: '6 a 10 empresas'      },
  { min: 11, max: 15,       valor: 249.00, label: '11 a 15 empresas'     },
  { min: 16, max: Infinity, valor: 349.00, label: 'Acima de 15 empresas' },
]
