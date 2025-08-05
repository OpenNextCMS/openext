import { z } from 'zod';

export const registerSchema = z.object({
  siteTitle: z.string().min(3),
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  phoneNo: z.string().min(10),
  role: z.optional(z.string()),
});

export type RegisterInput = z.infer<typeof registerSchema>;
