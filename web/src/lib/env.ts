export const env = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== "false",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  r2AccountId: process.env.R2_ACCOUNT_ID,
  r2AccessKey: process.env.R2_ACCESS_KEY_ID,
  r2SecretKey: process.env.R2_SECRET_ACCESS_KEY,
  r2Bucket: process.env.R2_BUCKET ?? "brixer-documents",
  resendKey: process.env.RESEND_API_KEY,
  whatsappEnabled: process.env.WHATSAPP_ENABLED === "true"
};

export const hasSupabase = Boolean(env.supabaseUrl && env.supabaseAnonKey);
