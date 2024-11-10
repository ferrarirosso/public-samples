'use strict';

const gulp = require('gulp');
const build = require('@microsoft/sp-build-web');
const webpack = require('webpack');

build.addSuppression(`Warning - [sass] The local CSS class 'ms-Grid' is not camelCase and will not be type-safe.`);

var getTasks = build.rig.getTasks;
build.rig.getTasks = function () {
  var result = getTasks.call(build.rig);

  result.set('serve', result.get('serve-deprecated'));

  return result;
};

build.configureWebpack.mergeConfig({
  additionalConfiguration: (generatedConfiguration) => {
    generatedConfiguration.plugins.push(
      new webpack.ProvidePlugin({
        process: 'process/browser',
      }),
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      })
    );

    generatedConfiguration.resolve.fallback = {
      buffer: require.resolve('buffer/'),
      os: require.resolve('os-browserify'),
      path: require.resolve('path-browserify'),
      util: require.resolve('util/'), 
    };

    return generatedConfiguration;
  },
});

build.initialize(gulp);