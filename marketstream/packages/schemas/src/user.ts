import { z } from "zod";

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(1),
  createdAt: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;
