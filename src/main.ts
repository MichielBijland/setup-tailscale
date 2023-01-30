import * as os from 'os'
import * as core from '@actions/core'
import * as cache from '@actions/tool-cache'
import * as exec from '@actions/exec'
import * as semver from 'semver'
import path from 'path'

const tailscale = 'tailscale'

async function run(): Promise<void> {
  // check os as we only support linux
  if (os.platform() !== 'linux') {
    core.setFailed('Only linux is currently supported.')
  }

  // get authkey
  let authkey: string
  const client_id: string = core.getInput('client_id')
  const client_secret: string = core.getInput('client_secret')
  if (client_id && client_secret) {
    /* get a access token from client_id and client_secret
    curl -d "client_id=${client_id}" -d "client_secret=${client_secret}" \
     "https://api.tailscale.com/api/v2/oauth/token"
    */
    /* create a short lived access token for devices
    curl --location --request POST 'https://api.tailscale.com/api/v2/tailnet/-/keys' \
    --header 'Authorization: Bearer tskey-api-***' \
    --header 'Content-Type: application/json' \
    --data-raw '{
      "capabilities": {
        "devices": {
          "create": {
            "reusable": false,
            "ephemeral": true,
            "preauthorized": true,
            "tags": [ "tag:github" ]
          }
        }
      },
      "expirySeconds": 90
    }'
    */
    authkey = 'replace'
  } else {
    authkey = core.getInput('authkey')
  }

  try {
    const version: string = core.getInput('version')

    // is this version already in our cache
    let toolPath = cache.find(tailscale, version)

    // download if one is missing
    if (!toolPath) {
      core.info('downloading tailscale')
      toolPath = await downloadCLI(version)
    } else {
      core.info('using cached directory')
    }

    core.info(`toolPath: ${toolPath}`)

    // add both to path for this and future actions to use
    core.addPath(toolPath)

    core.info('added paths')

    // start tailscaled
    await exec.exec(
      'sudo tailscaled --state=tailscaled.state --socket=tailscaled.sock'
    )

    const args: string = core.getInput('args')
    const final_args: string[] = ['up', '--authkey', authkey].concat(
      args.split(' ')
    )

    // tailscale up??
    await exec.exec('tailscale', final_args)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

function getArch(): string {
  let val = os.arch()
  if (val === 'x64') {
    val = 'amd64'
  }
  return val
}

export async function downloadCLI(version: string): Promise<string> {
  const url = getReleaseURL(version)

  core.info(`downloading ${url}`)
  const artifactPath = await cache.downloadTool(url)

  core.info(`artifactPath: ${artifactPath}`)
  const dirPath = await cache.extractTar(artifactPath)

  core.info(`dirPath: ${dirPath}`)
  const binPath = path.join(dirPath, path.parse(url).name)

  core.info(`binPath: ${binPath}`)
  return await cache.cacheDir(binPath, tailscale, version)
}

export function getReleaseURL(version: string): string {
  const cleanVersion = semver.clean(version) || ''
  const arch = getArch()
  const minor = semver.minor(cleanVersion)
  if (minor % 2 === 0) {
    return encodeURI(
      `https://pkgs.tailscale.com/stable/tailscale_${cleanVersion}_${arch}.tgz`
    )
  }
  return encodeURI(
    `https://pkgs.tailscale.com/unstable/tailscale_${cleanVersion}_${arch}.tgz`
  )
}

run()
