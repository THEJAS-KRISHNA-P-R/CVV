#!/usr/bin/env node

/**
 * Database Initialization Script
 * Runs all Supabase migrations in order
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv/config')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
  },
})

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')

async function runMigration(fileName) {
  console.log(`\n🔄 Running migration: ${fileName}`)
  
  const filePath = path.join(migrationsDir, fileName)
  const sql = fs.readFileSync(filePath, 'utf8')
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_string: sql })
    
    if (error) {
      // If RPC doesn't exist, try direct query (won't work for all operations)
      const { error: queryError } = await supabase.from('_migrations').insert({
        name: fileName,
        executed_at: new Date().toISOString(),
      })
      
      if (queryError && queryError.code !== '42P01') {
        throw queryError
      }
      
      console.log(`⚠️  Note: Direct migration execution not fully supported.`)
      console.log(`   Please run migrations manually via Supabase SQL Editor:`)
      console.log(`   ${filePath}`)
      return false
    }
    
    console.log(`✅ Migration ${fileName} completed successfully`)
    return true
  } catch (error) {
    console.error(`❌ Error running migration ${fileName}:`, error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Nirman Database Initialization')
  console.log('================================\n')
  console.log(`📡 Supabase URL: ${supabaseUrl}`)
  
  const migrations = [
    '00001_initial_schema.sql',
    '00002_rls_policies.sql',
    '00003_functions.sql',
    '00004_realtime.sql',
  ]
  
  console.log(`\n📋 Found ${migrations.length} migrations to run\n`)
  
  let successCount = 0
  let failCount = 0
  
  for (const migration of migrations) {
    const success = await runMigration(migration)
    if (success) {
      successCount++
    } else {
      failCount++
    }
  }
  
  console.log('\n================================')
  console.log('📊 Migration Summary')
  console.log('================================')
  console.log(`✅ Successful: ${successCount}`)
  console.log(`❌ Failed: ${failCount}`)
  console.log(`📝 Total: ${migrations.length}`)
  
  if (failCount > 0) {
    console.log('\n⚠️  Some migrations failed.')
    console.log('   Please run them manually via Supabase SQL Editor.')
    console.log('   See: supabase/README.md for instructions')
  } else {
    console.log('\n✨ All migrations completed successfully!')
  }
  
  console.log('\n📚 Next Steps:')
  console.log('   1. Verify tables created in Supabase Dashboard')
  console.log('   2. Check RLS policies are enabled')
  console.log('   3. Test API endpoints')
  console.log('   4. (Optional) Run seed.sql for test data')
}

main().catch(console.error)
