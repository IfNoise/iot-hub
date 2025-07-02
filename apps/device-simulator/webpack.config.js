const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: argv.mode || 'development',
    output: {
      path: join(__dirname, '../../dist/apps/device-simulator'),
      filename: 'main.js',
    },
    plugins: [
      new NxAppWebpackPlugin({
        target: 'node',
        compiler: 'tsc',
        main: './src/main.ts',
        tsConfig: './tsconfig.app.json',
        assets: ['./src/assets'],
        optimization: isProduction,
        outputHashing: 'none',
        generatePackageJson: false, // Отключаем генерацию package.json
      }),
    ],
  };
};
