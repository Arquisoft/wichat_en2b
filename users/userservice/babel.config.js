export default {
    presets: [
      ['@babel/preset-env', { targets: { node: 'current' } }],
      '@babel/preset-react', // Si estás usando React
    ],
    plugins: [
      '@babel/plugin-transform-runtime', // Si es necesario
    ],
  };
  