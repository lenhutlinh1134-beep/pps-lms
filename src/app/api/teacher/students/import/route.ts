import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRole } from "@/lib/supabase/auth";

// Initialize a supabase client with the service role key to bypass RLS and create users directly
function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY trên server.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function generateRandomPassword() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let pwd = "";
  for (let i = 0; i < 6; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

export async function POST(req: Request) {
  try {
    const teacher = await requireRole("teacher");

    const body = await req.json();
    const { classId, students, commonPassword } = body;

    if (!classId || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json({ error: "Thiếu thông tin classId hoặc danh sách học sinh." }, { status: 400 });
    }

    // Verify teacher owns the class (or is demo, but demo won't reach here because BulkImport is hidden in demo)
    const adminSupabase = getAdminSupabase();

    const { data: classData, error: classError } = await adminSupabase
      .from("class_teachers")
      .select("class_id")
      .eq("class_id", classId)
      .eq("teacher_id", teacher.id)
      .single();

    if (classError || !classData) {
      return NextResponse.json({ error: "Lớp học không tồn tại hoặc bạn không có quyền." }, { status: 403 });
    }

    const results = [];
    const sharedRandomPassword = generateRandomPassword();

    for (const student of students) {
      const { fullName, username } = student;
      if (!fullName || !username) {
        results.push({ fullName, username, status: "error", message: "Tên hoặc Tên đăng nhập trống." });
        continue;
      }

      // Format email to avoid collision and meet requirements
      const formattedUsername = username.toLowerCase().replace(/\s+/g, "");
      const email = formattedUsername.includes("@") ? formattedUsername : `${formattedUsername}@pps.vn`;
      const password = commonPassword || sharedRandomPassword;

      // Try to create user
      const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: "student",
        },
      });

      let userId = authData?.user?.id;

      if (authError) {
        // If user already exists, fetch their ID
        if (authError.message.includes("already registered") || authError.status === 422) {
          // We can't fetch user id securely via RPC if it doesn't exist, so we will use admin api to list users
          const { data: usersData, error: usersError } = await adminSupabase.auth.admin.listUsers();
          if (!usersError && usersData.users) {
            const existingUser = usersData.users.find(u => u.email === email);
            if (existingUser) {
              userId = existingUser.id;
              results.push({ fullName, username, status: "success", message: "Đã có tài khoản. Đã thêm vào lớp.", password: "***" });
            } else {
              results.push({ fullName, username, status: "error", message: "Đã tồn tại nhưng không tìm thấy ID." });
              continue;
            }
          } else {
            results.push({ fullName, username, status: "error", message: "Email đã tồn tại (hoặc trùng lặp)." });
            continue;
          }
        } else {
          results.push({ fullName, username, status: "error", message: authError.message });
          continue;
        }
      } else {
        results.push({ fullName, username, password, status: "success" });
      }

      if (userId) {
        // Insert into class_students
        await adminSupabase.from("class_students").upsert({
          class_id: classId,
          student_id: userId,
        }, { onConflict: "class_id,student_id" });
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Bulk Import Error:", error);
    return NextResponse.json({ error: error.message || "Lỗi Server" }, { status: 500 });
  }
}
