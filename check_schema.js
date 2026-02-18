import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase
    .from('car_status')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error fetching car_status:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Columns in car_status:', Object.keys(data[0]));
  } else {
    console.log('No data in car_status to check columns.');
  }
}

checkSchema();
