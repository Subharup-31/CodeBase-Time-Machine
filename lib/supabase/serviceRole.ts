import { createClient } from "@supabase/supabase-js";

// Service role client bypasses RLS. Never use this on the client-side.
// Only use it in background jobs or secure API routes where you manually enforce authorization.
export const createAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
};

 
 

                                                                                                                                                                              
