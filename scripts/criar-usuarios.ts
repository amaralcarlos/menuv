const SUPABASE_URL = 'https://fnyxueovkajmqlbkquuz.supabase.co'
const SERVICE_KEY  = 'SUA_SERVICE_ROLE_KEY_AQUI'

const usuarios = [
  { nome: 'Maysa',               email: 'maysasilva543@hotmail.com',          senha: '142536',          gestor: true  },
  { nome: 'Vitor Bussolo',       email: 'vitorbussolo@gmail.com',             senha: '280103',          gestor: false },
  { nome: 'Thalia',              email: 'thaliaempresa@hotmail.com',          senha: 'Thalia',          gestor: false },
  { nome: 'Renan',               email: 'renandornelles.14@gmail.com',        senha: '1234',            gestor: false },
  { nome: 'Marazzi',             email: 'viny_laguna@hotmail.com',            senha: '1234',            gestor: false },
  { nome: 'Daniel',              email: 'luizdelimadaniel@gmail.com',         senha: 'daniel123*',      gestor: false },
  { nome: 'Felipe Demétrio',     email: 'claudinofelipe@gmail.com',           senha: '1409',            gestor: false },
  { nome: 'Roger',               email: 'roger@cancellier.cc',                senha: 'roger1234',       gestor: false },
  { nome: 'Victor Valentim',     email: 'victorvalentimdarosa1998@gmail.com', senha: 'Boeing747###',    gestor: false },
  { nome: 'Vinicius Saldanha',   email: 'visaldanha25@gmail.com',             senha: '9018',            gestor: false },
  { nome: 'Ulisses',             email: 'ulissesvee@gmail.com',               senha: '3kLLcMC9Amk6Jwy', gestor: false },
  { nome: 'Arthur Niehuns',      email: 'arthur.niehuns@gmail.com',           senha: '2409',            gestor: false },
  { nome: 'Daniel Luiz de Lima', email: 'luizdelimadanielprofi@gmail.com',    senha: 'd3008',           gestor: false },
  { nome: 'Rayane Cosser',       email: 'rayanecosser1@gmail.com',            senha: '2501',            gestor: false },
  { nome: 'Andre Demetrio',      email: 'andrepansera123@gmail.com',          senha: 'AndrePD123',      gestor: false },
  { nome: 'Eduardo Costa',       email: 'eduardocda45@gmail.com',             senha: 'Duducostaf3*',    gestor: false },
  { nome: 'João Vitor de Souza', email: 'joaovitordalbomarketing@gmail.com',  senha: '02062007Jv.',     gestor: false },
  { nome: 'Andre Demetrio',      email: 'andrep_demetrio@hotmail.com',        senha: '609',             gestor: false },
  { nome: 'Anderson Silva',      email: 'anderson@vcametodo.com',             senha: 'Gremio@4565',     gestor: false },
]

async function main() {
  // Busca empresa_id
  const empRes = await fetch(`${SUPABASE_URL}/rest/v1/empresas?nome=ilike.*Acelera*&select=id`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
  })
  const emps = await empRes.json()
  const empresaId = emps[0]?.id
  console.log('Empresa ID:', empresaId)

  for (const u of usuarios) {
    // 1. Cria utilizador no Auth
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: u.email,
        password: u.senha,
        email_confirm: true,
        user_metadata: { nome: u.nome },
        app_metadata: { app_role: 'colaborador' },
      }),
    })
    const authData = await authRes.json()
    if (authData.error) { console.error(`ERRO auth ${u.email}:`, authData.error); continue }
    const authUserId = authData.id
    console.log(`✓ Auth criado: ${u.nome} (${authUserId})`)

    // 2. Cria colaborador na tabela
    const colabRes = await fetch(`${SUPABASE_URL}/rest/v1/colaboradores`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        nome:         u.nome,
        email:        u.email,
        empresa_id:   empresaId,
        auth_user_id: authUserId,
        is_gestor:    u.gestor,
        ativo:        true,
      }),
    })
    if (colabRes.ok) console.log(`✓ Colaborador criado: ${u.nome}`)
    else console.error(`ERRO colab ${u.nome}:`, await colabRes.text())
  }
  console.log('Concluído!')
}

main()
