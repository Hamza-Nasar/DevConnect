import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username?: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
    };
  }

  interface User {
    id: string;
    username?: string | null;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    avatar?: string | null;
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    sub?: string;
    username?: string | null;
    email?: string | null;
    name?: string | null;
    picture?: string | null;
    image?: string | null;
    r?: string; // role
    d?: string; // id
    e?: string | null; // email
    n?: string | null; // name
    u?: string | null; // username
    p?: string | null; // picture
    a?: string; // access token
  }
}







