import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("skin-proxy", "routes/skin-proxy.tsx"),
] satisfies RouteConfig;
