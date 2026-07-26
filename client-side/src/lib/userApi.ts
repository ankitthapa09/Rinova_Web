import { request, type ApiUser } from "@/lib/api";

/** Admin-only user management, both endpoints are gated by requireRole('admin')
 * on the server, so calls only succeed for a signed-in admin. */
export const userApi = {
  async list(): Promise<ApiUser[]> {
    const { users } = await request<{ users: ApiUser[] }>("/users");
    return users;
  },

  async remove(id: string): Promise<void> {
    await request<null>(`/users/${id}`, { method: "DELETE" });
  },
};
