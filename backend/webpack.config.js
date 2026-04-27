const path = require('path');

module.exports = (options, webpack) => {
  return {
    ...options,
    externals: [
      ...(Array.isArray(options.externals) ? options.externals : [options.externals].filter(Boolean)),
      // Exclude generated Prisma client from bundling — use absolute path so Node
      // can find the WASM engine relative to its own directory at runtime.
      function ({ request }, callback) {
        if (request && (request.includes('generated/prisma') || request === 'pg' || request === '@prisma/adapter-pg')) {
          if (request.includes('generated/prisma')) {
            const abs = path.resolve(__dirname, 'generated/prisma/index.js');
            return callback(null, 'commonjs ' + abs);
          }
          return callback(null, 'commonjs ' + request);
        }
        callback();
      },
    ],
    resolve: {
      ...options.resolve,
      extensionAlias: {
        '.js': ['.ts', '.js'],
      },
    },
  };
};
