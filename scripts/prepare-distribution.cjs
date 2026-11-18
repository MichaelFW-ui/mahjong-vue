const { execFileSync } = require('node:child_process')
const { copyFileSync, mkdirSync, writeFileSync } = require('node:fs')
const path = require('node:path')
const packageInfo = require('../package.json')
const projectInfo = require('../project-info.json')

const root = path.resolve(__dirname, '..')
const publicDirectory = path.join(root, 'public')
const licenseDirectory = path.join(publicDirectory, 'licenses')
mkdirSync(licenseDirectory, { recursive: true })
copyFileSync(path.join(root, 'LICENSE'), path.join(licenseDirectory, 'GPL-3.0.txt'))
copyFileSync(path.join(root, 'licenses/MPlus.txt'), path.join(licenseDirectory, 'MPlus.txt'))
copyFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), path.join(licenseDirectory, 'THIRD_PARTY_NOTICES.txt'))

const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
const buildInfo = {
  ...projectInfo,
  version: packageInfo.version,
  commit,
  sourceUrl: `${projectInfo.repository}/tree/${commit}`,
  upstreamUrl: `${projectInfo.upstreamRepository}/commit/${projectInfo.upstreamCommit}`
}
const json = JSON.stringify(buildInfo, null, 2) + '\n'
writeFileSync(path.join(root, 'src/build-info.json'), json)
writeFileSync(path.join(publicDirectory, 'version.json'), json)
execFileSync('git', [
  'archive', '--format=tar.gz',
  `--output=${path.join(publicDirectory, 'source.tar.gz')}`, 'HEAD'
], { cwd: root })
console.log(`Prepared v${buildInfo.version} (${commit.slice(0, 7)}) with licenses and source archive.`)
