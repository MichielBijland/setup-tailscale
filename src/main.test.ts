import {expect, test} from '@jest/globals'
import {getReleaseURL} from './main'

jest.mock('os')
import os from 'os'

test('release url x64', () => {
  os.platform = jest.fn().mockReturnValue('linux')
  os.arch = jest.fn().mockReturnValue('x64')

  const stable = getReleaseURL('v1.36.0')
  expect(stable).toBe(
    'https://pkgs.tailscale.com/stable/tailscale_1.36.0_amd64.tgz'
  )

  const unstable = getReleaseURL('v1.37.0')
  expect(unstable).toBe(
    'https://pkgs.tailscale.com/unstable/tailscale_1.37.0_amd64.tgz'
  )
})

test('release url amd64', () => {
  os.platform = jest.fn().mockReturnValue('linux')
  os.arch = jest.fn().mockReturnValue('amd64')

  const stable = getReleaseURL('v1.36.0')
  expect(stable).toBe(
    'https://pkgs.tailscale.com/stable/tailscale_1.36.0_amd64.tgz'
  )

  const unstable = getReleaseURL('v1.37.0')
  expect(unstable).toBe(
    'https://pkgs.tailscale.com/unstable/tailscale_1.37.0_amd64.tgz'
  )
})

test('release url arm', () => {
  os.platform = jest.fn().mockReturnValue('linux')
  os.arch = jest.fn().mockReturnValue('arm')

  const stable = getReleaseURL('1.36.0')
  expect(stable).toBe(
    'https://pkgs.tailscale.com/stable/tailscale_1.36.0_arm.tgz'
  )

  const unstable = getReleaseURL('v1.37.0')
  expect(unstable).toBe(
    'https://pkgs.tailscale.com/unstable/tailscale_1.37.0_arm.tgz'
  )
})
