import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf8");
  envConfig.split("\n").forEach(line => {
    const [key, ...vals] = line.split("=");
    if (key && vals.length > 0) {
      process.env[key.trim()] = vals.join("=").trim().replace(/^["']|["']$/g, "");
    }
  });
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, technician_id")
    .in("status", ["accepted", "in_progress", "working", "arrived"])
    .order("created_at", { ascending: false })
    .limit(1);

  if (!tickets || tickets.length === 0) { return; }
  const ticket = tickets[0];
  
  const { data: tech } = await supabase.from("profiles").select("full_name").eq("id", ticket.technician_id).single();
  
  const { data: otherTechs } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "technician")
    .neq("id", ticket.technician_id)
    .limit(1);

}
run();
