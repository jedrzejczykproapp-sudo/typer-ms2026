/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        optimizePackageImports: ["@untitledui/icons"],
    },
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default nextConfig;
