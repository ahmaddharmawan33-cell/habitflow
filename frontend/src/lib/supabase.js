import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://jbzipmuxfynwhavuxsvv.supabase.co";
const SUPABASE_KEY = "sb_publishable_eIPZv5wV1fd5VTZSlFzePQ_orgHZcIH";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
