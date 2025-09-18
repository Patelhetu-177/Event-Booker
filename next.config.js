/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    // Enables the styled-components SWC transform
    // Remove this if you're not using styled-components
    // https://nextjs.org/docs/architecture/nextjs-compiler#styled-components
    // styledComponents: true,
  },
};

module.exports = nextConfig;
