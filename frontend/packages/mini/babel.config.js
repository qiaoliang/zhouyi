module.exports = {
  presets: [
    ['@babel/preset-env', {
      modules: false
    }],
    ['@babel/preset-typescript', {
      isTSX: true,
      allExtensions: true
    }],
    ['@babel/preset-react', {
      runtime: 'automatic'
    }]
  ]
}
