export { default } from "next-auth/middleware";

export const config = {
    matcher: ["/feed/:path*", "/api/posts/:path*"],
};
