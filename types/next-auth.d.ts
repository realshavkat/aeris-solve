import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      status?: string;
    };
  }

  interface User {
    id: string;
    status?: string;
  }
}
