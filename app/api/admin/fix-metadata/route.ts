import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ROTA TEMPORÁRIA — delete após usar
// Acesse: GET https://app.menuv.com.br/api/admin/fix-metadata

export async function GET() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const updates = [
    {
      id: 'b1989235-5807-4293-9c06-f137b0bf87cf', // oamaralcarlos@gmail.com
      app_metadata: { app_role: 'colaborador', is_gestor: true, colaborador_id: '3112096b-6219-458c-8ec0-18aa6b632d0b', empresa_id: '3696b88d-6528-424b-aa25-c4b4ec4af688' }
    },
    {
      id: '93f95ea1-e062-49da-9f3a-c4e396cb7d7a', // financeiromoresco@gmail.com
      app_metadata: { app_role: 'restaurante', restaurante_id: '7791b1cc-1688-4e7f-8b36-95fb15ab58c9' }
    },
    {
      id: 'f6b7492f-8a6b-4689-a2d7-edda4f1ba98c', // restaurante@menuv.com.br
      app_metadata: { app_role: 'restaurante', restaurante_id: '901088d9-16cc-46d2-a130-f9f0bffbfa4c' }
    },
    {
      id: '3e11c7b5-f087-4be0-9e08-c9a5a43f3e3e', // maysasilva543@hotmail.com
      app_metadata: { app_role: 'colaborador', is_gestor: true, colaborador_id: '3ce339c4-6b0d-49d8-9ec3-825f9abd4223', empresa_id: '3696b88d-6528-424b-aa25-c4b4ec4af688' }
    },
    {
      id: '917b427f-ab0a-4717-b882-207364915614', // anderson@vcametodo.com
      app_metadata: { app_role: 'colaborador', is_gestor: false, colaborador_id: '7118b81a-9569-4051-bdf7-9594925bc362', empresa_id: '3696b88d-6528-424b-aa25-c4b4ec4af688' }
    },
    {
      id: '2168e7d9-cc7f-44fa-bb24-4cf156eca8a6', // andrepansera123@gmail.com
      app_metadata: { app_role: 'colaborador', is_gestor: false, colaborador_id: '5eac699f-b38c-49f0-87e9-910216cc85af', empresa_id: '3696b88d-6528-424b-aa25-c4b4ec4af688' }
    },
    {
      id: '432d2dd2-7cc2-4176-8324-36dd89329543', // arthur.niehuns@gmail.com
      app_metadata: { app_role: 'colaborador', is_gestor: false, colaborador_id: 'ae6b4152-08c2-447d-82e0-dd06cb521424', empresa_id: '3696b88d-6528-424b-aa25-c4b4ec4af688' }
    },
    {
      id: '7834a996-309c-4d7a-8468-1e61617ced11', // claudinofelipe@gmail.com
      app_metadata: { app_role: 'colaborador', is_gestor: false, colaborador_id: '2addf80b-82cc-4190-abe8-195e59e61a81', empresa_id: '3696b88d-6528-424b-aa25-c4b4ec4af688' }
    },
    {
      id: 'd97b6491-4436-4063-b18f-31762ee03367', // eduardocda45@gmail.com
      app_metadata: { app_role: 'colaborador', is_gestor: false, colaborador_id: 'edfa8ed1-2e50-4b4f-b95a-5797a9792637', empresa_id: '3696b88d-6528-424b-aa25-c4b4ec4af688' }
    },
    {
      id: '7b1895bd-2e36-4346-80c4-379bd20714ab', // joaovitordalbomarketing@gmail.com
      app_metadata: { app_role: 'colaborador', is_gestor: false, colaborador_id: '00ea8cd0-52a7-4635-934a-76b3661c1a5f', empresa_id: '3696b88d-6528-424b-aa25-c4b4ec4af688' }
    },
    {
      id: '506c754d-f4fe-4271-b725-82e60f59cc22', // luizdelimadanielprofi@gmail.com
      app_metadata: { app_role: 'colaborador', is_gestor: false, colaborador_id: '14d98281-aad3-4148-afdb-bb3b57b80265', empresa_id: '3696b88d-6528-424b-aa25-c4b4ec4af688' }
    },
    {
      id: 'c5745605-6063-4fcc-bf6c-ad47e3847d22', // mateuswesleisds@gmail.com
      app_metadata: { app_role: 'colaborador', is_gestor: false, colaborador_id: '9a96bd4e-bc3f-4c59-bce1-0e409af260f2', empresa_id: '3696b88d-6528-424b-aa25-c4b4ec4af688' }
    },
    {
      id: 'd9596b9d-8135-41a0-907f-1a78b7e037d5', // rayanecosser1@gmail.com
      app_metadata: { app_role: 'colaborador', is_gestor: false, colaborador_id: '0428e6bf-f242-4b02-83d7-c85d1f92b19e', empresa_id: '3696b88d-6528-424b-aa25-c4b4ec4af688' }
    },
    {
      id: '6592ebd5-c332-405d-80fe-d177ce129b06', // renandornelles.14@gmail.com
      app_metadata: { app_role: 'colaborador', is_gestor: false, colaborador_id: '2c6a40e8-09de-4dc5-9ff0-27f3555684d5', empresa_id: '3696b88d-6528-424b-aa25-c4b4ec4af688' }
    },
    {
      id: 'fa58de4f-92a1-4c74-b12b-b06e35f6817c', // roger@cancellier.cc
      app_metadata: { app_role: 'colaborador', is_gestor: false, colaborador_id: '97964972-4d16-4ef5-bbba-aa04743779a2', empresa_id: '3696b88d-6528-424b-aa25-c4b4ec4af688' }
    },
    {
      id: '98154267-1152-4961-9a5c-fae7bfe722de', // ulissesvee@gmail.com
      app_metadata: { app_role: 'colaborador', is_gestor: false, colaborador_id: '52872bf1-8404-413e-8e28-eb405f8078f5', empresa_id: '3696b88d-6528-424b-aa25-c4b4ec4af688' }
    },
    {
      id: '9f90f262-6c97-4861-8a4f-f16d83c360db', // victorvalentimdarosa1998@gmail.com
      app_metadata: { app_role: 'colaborador', is_gestor: false, colaborador_id: 'b5fb1d02-3c81-45f3-b1bc-4825413c3358', empresa_id: '3696b88d-6528-424b-aa25-c4b4ec4af688' }
    },
    {
      id: 'c74c63f7-a72d-4c61-9cab-c8bc1c9f2800', // visaldanha25@gmail.com
      app_metadata: { app_role: 'colaborador', is_gestor: false, colaborador_id: '50d9e6a8-b981-4fcc-86d4-0dc09d1e8027', empresa_id: '3696b88d-6528-424b-aa25-c4b4ec4af688' }
    },
    {
      id: 'e80dac44-feab-425c-aae1-32d7bd274b15', // vitorbussolo@gmail.com
      app_metadata: { app_role: 'colaborador', is_gestor: false, colaborador_id: '8091b9e9-25d9-491c-9d0b-605c05d4903b', empresa_id: '3696b88d-6528-424b-aa25-c4b4ec4af688' }
    },
  ]

  const results: any[] = []
  for (const u of updates) {
    const { error } = await admin.auth.admin.updateUserById(u.id, { app_metadata: u.app_metadata })
    results.push({ id: u.id, ok: !error, error: error?.message })
  }

  const ok    = results.filter(r => r.ok).length
  const erros = results.filter(r => !r.ok)

  return NextResponse.json({ ok, total: results.length, erros })
}
