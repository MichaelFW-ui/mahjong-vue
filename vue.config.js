module.exports = {
  publicPath: '/mahjong/',
  chainWebpack: config => {
    config.plugin('html').tap(args => {
      args[0].title = '日麻工具'
      return args
    })
  }
}
