import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Delete all posts (cascades to reactions)
    const { error: deleteErr } = await supabase.from("posts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (deleteErr) throw deleteErr;

    // Empty storage bucket
    const { data: files } = await supabase.storage.from("weekend_media").list("", { limit: 1000 });
    if (files && files.length > 0) {
      // List all folders (user IDs)
      for (const folder of files) {
        const { data: innerFiles } = await supabase.storage.from("weekend_media").list(folder.name, { limit: 1000 });
        if (innerFiles && innerFiles.length > 0) {
          const paths = innerFiles.map((f) => `${folder.name}/${f.name}`);
          await supabase.storage.from("weekend_media").remove(paths);
        }
      }
    }

    // Delete anonymous users
    // Note: Supabase admin API can be used here, but for now we just clean data

    return new Response(JSON.stringify({ success: true, message: "Nuked everything. Fresh start." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
