import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ROTA TEMPORÁRIA — delete após usar
// GET https://app.menuv.com.br/api/admin/fix-produto-id

export async function GET() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Busca pedidos sem produto_id
  const { data: pedidos } = await admin
    .from('pedidos')
    .select('id, empresa_id')
    .is('produto_id', null) as any

  if (!pedidos?.length) return NextResponse.json({ ok: true, atualizados: 0 })

  // Busca todos os empresa_produtos ativos
  const { data: empProdutos } = await admin
    .from('empresa_produtos')
    .select('empresa_id, produto_id, produto:produto_id(id, nome, tipo)')
    .eq('ativo', true)

  // Mapeia empresa → produto (prioriza marmita/buffet)
  const empProdMap: Record<string, string> = {}
  ;(empProdutos ?? []).forEach((ep: any) => {
    const empId   = ep.empresa_id
    const prodId  = ep.produto_id
    const tipo    = ep.produto?.tipo

    // Só seta se ainda não tem, priorizando marmita > buffet > avulso
    if (!empProdMap[empId]) {
      empProdMap[empId] = prodId
    } else if (tipo === 'marmita') {
      empProdMap[empId] = prodId
    }
  })

  let atualizados = 0
  const erros: any[] = []

  for (const p of pedidos) {
    const produtoId = empProdMap[p.empresa_id]
    if (!produtoId) continue

    const { error } = await admin
      .from('pedidos')
      .update({ produto_id: produtoId })
      .eq('id', p.id)

    if (error) erros.push({ id: p.id, error: error.message })
    else atualizados++
  }

  return NextResponse.json({ ok: true, atualizados, erros, total: pedidos.length })
}
