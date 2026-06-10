# /api — Tạo API Route Nhanh

**Dùng khi:** Cần tạo API endpoint mới trong Next.js App Router.

**Model nên dùng:** claude-haiku-4-5-20251001

## Pattern chuẩn (copy, đừng nghĩ lại)

```typescript
// src/app/api/[resource]/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  // Kiểm tra role nếu cần
  // Query với RLS tự xử lý phân quyền
  
  const { data, error } = await supabase.from('table').select('col1, col2').limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  
  return NextResponse.json({ data })
}
```

## Checklist bắt buộc

- [ ] Kiểm tra session (auth)
- [ ] Kiểm tra role nếu chỉ 1 vai trò được phép dùng
- [ ] Dùng RLS — không filter thủ công bằng user_id trong code
- [ ] Có error handling
- [ ] Có `LIMIT` khi trả list
- [ ] Không expose thông tin nhạy cảm

## Cách gọi

```
/api [method] [resource] [mô tả ngắn]
```

Ví dụ:
- `/api GET lessons lấy danh sách bài học của class`
- `/api POST attendance điểm danh học sinh`
- `/api PUT submission giáo viên chấm điểm`
