/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      'tree-sitter',
      'tree-sitter-typescript',
      'tree-sitter-python'
    ],
  },
};

export default nextConfig;
