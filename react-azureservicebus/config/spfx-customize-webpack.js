const webpack = require('webpack');

module.exports = (config) => {
  config.resolve = config.resolve || {};

  // Enable browser field resolution for packages that have browser-specific versions
  config.resolve.aliasFields = config.resolve.aliasFields || [];
  if (!config.resolve.aliasFields.includes('browser')) {
    config.resolve.aliasFields.push('browser');
  }

  config.resolve.fallback = config.resolve.fallback || {};
  config.resolve.fallback.os = require.resolve("os-browserify/browser");
  config.resolve.fallback.path = require.resolve("path-browserify");
  config.resolve.fallback.fs = false;
  config.resolve.fallback.net = false;
  config.resolve.fallback.tls = false;
  config.resolve.fallback.util = require.resolve("util/");
  config.resolve.fallback.buffer = require.resolve("buffer/");
  config.resolve.fallback.stream = require.resolve("stream-browserify");
  config.resolve.fallback.crypto = false;
  config.resolve.fallback.http = false;
  config.resolve.fallback.https = false;

  // Add ProvidePlugin for Buffer
  config.plugins = config.plugins || [];
  config.plugins.push(
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser'
    })
  );

  return config;
};
