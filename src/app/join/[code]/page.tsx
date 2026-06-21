import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, CheckCircle, XCircle, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function JoinClassPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Chưa đăng nhập → redirect login, giữ lại URL để quay về
  if (!user) {
    redirect(`/login?next=/join/${code}`);
  }

  // Gọi RPC join
  const { data, error } = await supabase.rpc("join_class_by_invite_code", {
    p_code: code.toUpperCase(),
  });

  type JoinResult = { class_id: string; class_name: string }[];
  const result = data as JoinResult | null;
  const className = result?.[0]?.class_name ?? null;

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base p-md">
        <Card padding="lg" className="flex max-w-sm flex-col items-center gap-md text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-error-container text-error">
            <XCircle size={32} />
          </span>
          <h1 className="text-headline-md">Không thể vào lớp</h1>
          <p className="text-body-md text-on-surface-variant">{error.message}</p>
          <Link href="/student/listening">
            <Button variant="ghost">Về trang chủ</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base p-md">
      <Card padding="lg" className="flex max-w-sm flex-col items-center gap-md text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-tertiary-fixed text-tertiary">
          <CheckCircle size={32} />
        </span>
        <h1 className="text-headline-md">Tham gia thành công!</h1>
        <div className="flex items-center gap-2 rounded-xl bg-primary-fixed px-4 py-2 text-body-lg font-semibold text-on-primary-fixed">
          <Users size={18} />
          {className ?? "Lớp học"}
        </div>
        <p className="text-body-md text-on-surface-variant">
          Bạn đã được thêm vào lớp. Có thể xem bài giảng và làm bài tập ngay bây giờ.
        </p>
        <Link href="/student/lectures">
          <Button>Vào học ngay</Button>
        </Link>
      </Card>
    </div>
  );
}
