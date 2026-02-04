const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fkkjlkliksnujqsujzae.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZra2psa2xpa3NudWpxc3VqemFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3Njc4NTYsImV4cCI6MjA3ODM0Mzg1Nn0.LIGPH9YfFtZ8d0NOxH0DChBBilpqgcjuXffPTIXGx6Q'
);

async function checkTables() {
  // Try to query common table names to see what exists
  const tables = ['tasks', 'todos', 'items', 'notes', 'users', 'profiles', 'moods', 'pomodoro_sessions'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
      console.log(`✅ Table "${table}" exists`);
      // Get column info by checking the first row or error message
      const { data: sample, error: sampleErr } = await supabase.from(table).select('*').limit(0);
      if (sample !== null) {
        console.log(`   Columns query successful`);
      }
    } else {
      console.log(`❌ Table "${table}": ${error.message}`);
    }
  }
}

checkTables();
