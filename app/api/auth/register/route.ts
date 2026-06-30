import { hash } from "bcryptjs";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { errorResponse, AppError } from "@/lib/errors";
import { registerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const input = registerSchema.parse(await request.json());
    if (await db.user.findUnique({ where: { email: input.email } })) {
      throw new AppError("An account with this email already exists.", 409, "EMAIL_EXISTS");
    }
    const user = await db.user.create({
      data: { name: input.name, email: input.email, phone: input.phone, passwordHash: await hash(input.password, 12), role: Role.CUSTOMER },
    });
    await createSession({ userId: user.id, name: user.name, email: user.email, role: user.role });
    return Response.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
