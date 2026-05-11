// ============================================================
// MENUV — lib/status-empresa.ts
// Utilitário de status de empresa — usado pelas rotas de API
// ============================================================

import { supabaseAdmin } from '@/lib/api-helpers'
import { PLANO_LANCAMENTO, FAIXAS_RESTAURANTE } from '@/lib/planos-config'

export type StatusPlano = 'trial' | 'conversao' | 'ativo' | 'bloqueado' | 'gratuito' | 'free'

export interface EmpresaStatus {
  id: string
  status_plano: StatusPlano
  trial_inicio: string | null
  diasDecorridos: number
  diasRestantesTrial: number    // > 0 = ainda em trial
  diasRestantesConversao: number // > 0 = em período de conversão
}

// ── Calcula o status que a empresa deveria ter hoje ──────────
function calcularStatus(trialInicio: string | null, statusAtual: StatusPlano): StatusPlano {
  // Statuses finais — admin definiu, não alterar automaticamente
  if (statusAtual === 'ativo' || statusAtual === 'gratuito' || statusAtual === 'free') return statusAtual

  if (!trialInicio) return 'trial'

  const inicio = new Date(trialInicio)
  const hoje   = new Date()
  hoje.setHours(0, 0, 0, 0)
  inicio.setHours(0, 0, 0, 0)

  const dias = Math.floor((hoje.getTime() - inicio.getTime()) / 86_400_000)

  if (dias <= 30)  return 'trial'
  if (dias <= 40)  return 'conversao'
  return 'bloqueado'
}

// ── Sincroniza status de empresas em trial/conversao no banco ─
// Chamado nas rotas de listagem para manter status atualizado
// sem precisar de cron job externo
export async function syncStatusEmpresas(restauranteId?: string) {
  const admin = supabaseAdmin()

  let query = admin
    .from('empresas')
    .select('id, trial_inicio, status_plano')
    .in('status_plano', ['trial', 'conversao']) // só empresas que ainda podem mudar

  if (restauranteId) {
    query = query.eq('restaurante_id', restauranteId)
  }

  const { data: empresas }: { data: any } = await query as any
  if (!empresas?.length) return

  const atualizacoes: { id: string; status_plano: StatusPlano }[] = []

  for (const emp of empresas) {
    const novoStatus = calcularStatus(emp.trial_inicio, emp.status_plano as StatusPlano)
    if (novoStatus !== emp.status_plano) {
      atualizacoes.push({ id: emp.id, status_plano: novoStatus })
    }
  }

  if (!atualizacoes.length) return

  // Atualiza em paralelo
  await Promise.all(
    atualizacoes.map(({ id, status_plano }) =>
      admin.from('empresas').update({ status_plano }).eq('id', id)
    )
  )
}

// ── Monta info detalhada de status para exibição ─────────────
export function detalhesStatus(trialInicio: string | null, statusPlano: StatusPlano): EmpresaStatus & { label: string; cor: string } {
  const inicio = trialInicio ? new Date(trialInicio) : new Date()
  const hoje   = new Date()
  hoje.setHours(0, 0, 0, 0)
  inicio.setHours(0, 0, 0, 0)

  const dias = Math.floor((hoje.getTime() - inicio.getTime()) / 86_400_000)

  const labels: Record<StatusPlano, string> = {
    trial:     'Trial',
    conversao: 'Aguardando conversão',
    ativo:     'Ativo',
    bloqueado: 'Bloqueado',
    gratuito:  'Gratuito',
  }
  const cores: Record<StatusPlano, string> = {
    trial:     'yellow',
    conversao: 'yellow',
    ativo:     'green',
    bloqueado: 'red',
    gratuito:  'green',
  }

  return {
    id: '',
    status_plano: statusPlano,
    trial_inicio: trialInicio,
    diasDecorridos: dias,
    diasRestantesTrial:     Math.max(0, 30 - dias),
    diasRestantesConversao: Math.max(0, 40 - dias),
    label: labels[statusPlano] ?? statusPlano,
    cor:   cores[statusPlano]  ?? 'gray',
  }
}

// ── Faixas e plano de lançamento → ver lib/planos-config.ts ─

export function faixaAtual(numEmpresas: number) {
  return FAIXAS_RESTAURANTE.find(f => numEmpresas >= f.min && numEmpresas <= f.max)
    ?? FAIXAS_RESTAURANTE[FAIXAS_RESTAURANTE.length - 1]
}

export function proximaFaixa(numEmpresas: number) {
  const idx = FAIXAS_RESTAURANTE.findIndex(f => numEmpresas >= f.min && numEmpresas <= f.max)
  return FAIXAS_RESTAURANTE[idx + 1] ?? null
}

// ── Calcula a fatura mensal do restaurante ───────────────────
export interface FaturaRestaurante {
  totalEmpresas:         number
  numEmpresasAtivas:     number
  numEmpresasTrial:      number
  numEmpresasConversao:  number
  numEmpresasBloqueadas: number
  planoLancamento:       boolean
  faixaLabel:            string
  totalAPagar:           number
  proximaFaixaLabel:     string | null
  proximaFaixaValor:     number | null
  empresasParaProxima:   number | null
}

export function calcularFatura(
  empresas: Array<{ status_plano: string }>,
  planoLancamento = false
): FaturaRestaurante {
  const numAtivas     = empresas.filter(e => ['ativo','gratuito','free'].includes(e.status_plano)).length
  const numTrial      = empresas.filter(e => e.status_plano === 'trial').length
  const numConversao  = empresas.filter(e => e.status_plano === 'conversao').length
  const numBloqueadas = empresas.filter(e => e.status_plano === 'bloqueado').length
  const totalEmpresas = empresas.length

  // Plano de lançamento sobrepõe as faixas normais (até o limite de empresas)
  if (planoLancamento && totalEmpresas <= PLANO_LANCAMENTO.limiteEmpresas) {
    return {
      totalEmpresas,
      numEmpresasAtivas:     numAtivas,
      numEmpresasTrial:      numTrial,
      numEmpresasConversao:  numConversao,
      numEmpresasBloqueadas: numBloqueadas,
      planoLancamento:       true,
      faixaLabel:            PLANO_LANCAMENTO.label,
      totalAPagar:           PLANO_LANCAMENTO.valor,
      proximaFaixaLabel:     null,
      proximaFaixaValor:     null,
      empresasParaProxima:   null,
    }
  }

  const faixa   = faixaAtual(totalEmpresas)
  const proxima = proximaFaixa(totalEmpresas)

  return {
    totalEmpresas,
    numEmpresasAtivas:     numAtivas,
    numEmpresasTrial:      numTrial,
    numEmpresasConversao:  numConversao,
    numEmpresasBloqueadas: numBloqueadas,
    planoLancamento:       false,
    faixaLabel:            faixa.label,
    totalAPagar:           faixa.valor,
    proximaFaixaLabel:     proxima?.label ?? null,
    proximaFaixaValor:     proxima?.valor ?? null,
    empresasParaProxima:   proxima ? proxima.min - totalEmpresas : null,
  }
}
