import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Error: Missing Supabase env variables in process.env");
  console.error("Run with: node --env-file=.env.local <script>");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function registerAdmin() {
  const email = 'admin@reuso.co';
  const password = 'Password123!';
  
  console.log(`📡 Intentando registrar usuario super_admin: ${email}...`);
  
  // 1. Create auth user with email confirmed
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      nombre: 'Administrador',
      apellido: 'Local',
      rol: 'super_admin'
    }
  });

  if (userError) {
    if (userError.message.includes('already exists') || userError.message.includes('email_exists')) {
      console.log(`ℹ️ El usuario ${email} ya existe en Auth. Buscando perfil para asegurar que es super_admin...`);
      // Find the user to get their ID
      const { data: users, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error("❌ Error al listar usuarios:", listError.message);
        return;
      }
      const existingUser = users.users.find(u => u.email === email);
      if (!existingUser) {
        console.error("❌ No se encontró el usuario existente.");
        return;
      }
      
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ rol: 'super_admin' })
        .eq('user_id', existingUser.id);

      if (profileError) {
        console.error("❌ Error al actualizar rol del perfil existente:", profileError.message);
      } else {
        console.log(`✅ ¡Perfil verificado! El usuario ${email} tiene rol super_admin.`);
        console.log(`🔑 Puedes iniciar sesión con:\n   - Correo: ${email}\n   - Contraseña: (La contraseña existente de esa cuenta)`);
      }
      return;
    }

    console.error("❌ Error al crear usuario en Auth:", userError.message);
    return;
  }

  const userId = userData.user.id;
  console.log(`✅ Usuario creado en Auth con ID: ${userId}`);

  // Wait a brief moment for the DB trigger to create the profile
  await new Promise(resolve => setTimeout(resolve, 1500));

  // 2. Set profile role to super_admin
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ 
      rol: 'super_admin',
      nombre: 'Administrador',
      apellido: 'Local'
    })
    .eq('user_id', userId);

  if (profileError) {
    console.error("❌ Error al actualizar el rol en profiles:", profileError.message);
    // Let's check if profile exists
    const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
    if (!profile) {
      console.log("ℹ️ El perfil no fue creado por el trigger. Creándolo manualmente...");
      const { error: insertError } = await supabase.from('profiles').insert([{
        user_id: userId,
        email: email,
        nombre: 'Administrador',
        apellido: 'Local',
        rol: 'super_admin'
      }]);
      if (insertError) {
        console.error("❌ Error al insertar perfil manualmente:", insertError.message);
      } else {
        console.log("✅ Perfil creado manualmente con rol super_admin.");
      }
    }
  } else {
    console.log("✅ Perfil actualizado con rol super_admin.");
  }

  console.log(`\n🎉 ¡Registro completado con éxito!`);
  console.log(`🔑 Inicia sesión con:\n   - Correo: ${email}\n   - Contraseña: ${password}`);
}

registerAdmin();
