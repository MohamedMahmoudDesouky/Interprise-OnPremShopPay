/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  async rewrites() {
    const apiTarget =
      process.env.INTERNAL_API_BASE_URL ||
      "http://kong-gateway-proxy.shoppay-gateway.svc.cluster.local";

    return [
      {
        source: "/api/:path*",
        destination: `${apiTarget}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
