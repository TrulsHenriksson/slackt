import { createClient } from '@supabase/supabase-js';
import type { Database } from './supabasetypes.ts';

const supabaseUrl = 'https://wabfzuyvvxielwwsnvck.supabase.co';
const supabaseKey = 'sb_publishable_y1SSHA3E-E-3xmtAIFZ7mg_W4-w4OQg';

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
