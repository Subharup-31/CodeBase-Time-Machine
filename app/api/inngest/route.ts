import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { indexRepository } from "@/lib/inngest/functions/indexRepo";

// Create an API that serves zero-downtime background functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    indexRepository, // We will create this next
  ],
});
