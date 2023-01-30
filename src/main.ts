import * as os from 'os'
import * as core from '@actions/core'
import * as cache from '@actions/tool-cache'
import * as exec from '@actions/exec'
import * as semver from 'semver'
import path from 'path'

const toolNames = ['tailscale', 'tailscaled'] as const

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

    let tailscale
    let tailscaled

    // is this version already in our cache
    tailscale = cache.find(toolNames[0], version)
    tailscaled = cache.find(toolNames[1], version)

    // download if one is missing
    if (!tailscale || !tailscaled) {
      const paths = await downloadCLI(version)
      tailscale = paths[0]
      tailscaled = paths[1]
    }

    // add both to path for this and future actions to use
    core.addPath(tailscale)
    core.addPath(tailscaled)

    // start tailscaled
    await exec.exec('tailscaled')

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

export async function downloadCLI(version: string): Promise<[string, string]> {
  const url = getReleaseURL(version)
  const artifactPath = await cache.downloadTool(url)
  const dirPath = await cache.extractTar(artifactPath)
  return Promise.all([
    cache.cacheFile(
      path.join(dirPath, toolNames[0]),
      toolNames[0],
      toolNames[0],
      version
    ),
    cache.cacheFile(
      path.join(dirPath, toolNames[1]),
      toolNames[1],
      toolNames[1],
      version
    )
  ])
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
