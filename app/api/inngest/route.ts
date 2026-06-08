import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { indexRepository, syncRepository } from "@/lib/inngest/functions/indexRepo";

// Create an API that serves zero-downtime background functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    indexRepository,
    syncRepository, // Incremental sync triggered by GitHub webhooks
  ],
});

                                                                                                                                                                                        
