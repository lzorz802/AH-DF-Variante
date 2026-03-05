// FILE: src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://fvlfjkmjmbxomjmqsurz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2bGZqa21qbWJ4b21qbXFzdXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MDU5OTgsImV4cCI6MjA4ODI4MTk5OH0.rBpTgf0zZ3oS9Gr8zlfhmhgtCSIafDuCM2Ko65mZ5NY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
