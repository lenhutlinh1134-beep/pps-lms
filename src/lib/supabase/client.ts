import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client cho phía trình duyệt (Client Components).
 * Gọi hàm này BÊN TRONG event handler / useEffect, không gọi ở top-level component
 * để tránh lỗi khi build/SSR lúc chưa cấu hình biến môi trường.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
