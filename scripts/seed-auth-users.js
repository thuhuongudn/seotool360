import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

// Initialize Supabase client with service role key (bypass RLS)
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createOrGetUser(email, password, userData) {
  console.log(`Checking for existing user: ${email}`)
  
  // Check if user already exists by email
  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    throw new Error(`Failed to list users: ${listError.message}`)
  }
  
  let authUser = existingUsers.users.find(user => user.email === email)
  
  if (authUser) {
    console.log(`✅ User already exists: ${authUser.id}`)
  } else {
    console.log(`Creating new user: ${email}`)
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })
    
    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`)
    }
    
    authUser = newUser.user
    console.log(`✅ User created: ${authUser.id}`)
  }
  
  // Upsert profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      user_id: authUser.id,
      username: userData.username,
      role: userData.role,
      is_active: true
    }, { 
      onConflict: 'user_id',
      ignoreDuplicates: false 
    })

  if (profileError) {
    throw new Error(`Failed to upsert profile: ${profileError.message}`)
  }
  
  console.log(`✅ Profile upserted for ${userData.username}`)
  return authUser
}

async function seedUsers() {
  console.log('🌱 Starting user seeding...')
  
  try {
    // Admin User  
    const adminUser = await createOrGetUser(
      'nhathuocvietnhatdn@gmail.com',
      'Vietnhat@123',
      { username: 'nhathuocvietnhatdn', role: 'admin' }
    )

    // Regular User
    const regularUser = await createOrGetUser(
      'anhnhan@nhathuocvietnhat.vn', 
      'Annhan@123',
      { username: 'anhnhan', role: 'member' }
    )

    // Log admin creation (idempotent)
    const { error: adminLogError } = await supabase
      .from('admin_audit_log')
      .upsert({
        actor_id: adminUser.id,
        action: 'create_user',
        subject_user_id: adminUser.id,
        metadata: { 
          role: 'admin', 
          username: 'nhathuocvietnhatdn',
          created_by: 'seed_script'
        }
      }, {
        onConflict: 'actor_id,action,subject_user_id',
        ignoreDuplicates: true
      })

    if (adminLogError) {
      console.warn('Admin audit log warning:', adminLogError.message)
    } else {
      console.log('✅ Admin audit log recorded')
    }

    // Log user creation (idempotent)
    const { error: userLogError } = await supabase
      .from('admin_audit_log')
      .upsert({
        actor_id: adminUser.id,
        action: 'create_user', 
        subject_user_id: regularUser.id,
        metadata: { 
          role: 'member', 
          username: 'anhnhan',
          created_by: 'seed_script'
        }
      }, {
        onConflict: 'actor_id,action,subject_user_id',
        ignoreDuplicates: true
      })

    if (userLogError) {
      console.warn('User audit log warning:', userLogError.message)
    } else {
      console.log('✅ User audit log recorded')
    }

    // Grant tool permissions (idempotent) - using actual UUID tool IDs
    console.log('Granting tool permissions to user...')
    const { error: permissionError } = await supabase
      .from('user_tool_access')
      .upsert([
        {
          user_id: regularUser.id,
          tool_id: 'cea68a24-6ea1-4764-90a6-ca3284d67a41', // social-media tool UUID
          permission: 'use',
          granted_by: adminUser.id
        },
        {
          user_id: regularUser.id,
          tool_id: '03a6e711-aa9f-4118-a9f7-89b10db8a129', // internal-link-helper tool UUID
          permission: 'use', 
          granted_by: adminUser.id
        }
      ], {
        onConflict: 'user_id,tool_id',
        ignoreDuplicates: false
      })

    if (permissionError) {
      console.warn('Tool permissions warning:', permissionError.message)
    } else {
      console.log('✅ Tool permissions granted')
    }

    console.log('\n🎉 User seeding completed successfully!')
    console.log('\n📋 Available accounts:')
    console.log('Admin: nhathuocvietnhatdn@gmail.com / Vietnhat@123')
    console.log('User:  anhnhan@nhathuocvietnhat.vn / Annhan@123')
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message)
    process.exit(1)
  }
}

// Run the seeding
seedUsers()