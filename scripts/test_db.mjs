import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function test() {
  console.log("Creating new user via auth admin...");
  const email = `debug_user_${Date.now()}@example.com`;
  const password = "DebugPassword123!";
  
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      nombre: 'Debug',
      apellido: 'User'
    }
  });

  if (userError) {
    console.error("❌ Auth admin createUser failed:", userError.message);
    console.error("Full error object:", JSON.stringify(userError, null, 2));
  } else {
    console.log("✅ Auth user created successfully:", userData.user.id);
    // Cleanup
    await supabase.auth.admin.deleteUser(userData.user.id);
  }
}

test();
