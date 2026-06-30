import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { errorResponse, AppError } from "@/lib/errors";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const user = await db.user.findUnique({ where: { email: input.email } });
    if (!user || !user.active || !(await compare(input.password, user.passwordHash))) {
      throw new AppError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
    }
    await createSession({ userId: user.id, name: user.name, email: user.email, role: user.role });
    return Response.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    return errorResponse(error);
  }
}
