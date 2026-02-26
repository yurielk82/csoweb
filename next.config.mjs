/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.kogl.or.kr' },
      { protocol: 'https', hostname: 'mirrors.creativecommons.org' },
    ],
  },
};

export default nextConfig;
