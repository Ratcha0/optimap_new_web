import { createClient } from '@supabase/supabase-js';
const supabase = createClient('', '');
async function test() {
  const { data, error } = await supabase.from('trips').select('*').limit(1);
 
}
test();
