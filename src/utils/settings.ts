import fs from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { mergeDeepRight } from 'ramda'

import { createLogger } from '../factories/logger-factory'
import { EventKinds } from '../constants/base'
import { ISettings } from '../@types/settings'
import packageJson from '../../package.json'
import settingsSampleJson from '../../settings.sample.json'

const debug = createLogger('settings')

export class SettingsStatic {
  static _settings: ISettings

  public static getSettingsFilePath(filename = 'settings.json') {
    return join(
      process.env.NOSTR_CONFIG_DIR ?? join(homedir(), '.nostr'),
      filename
    )
  }

  public static getDefaultSettings(): ISettings {
    return {
      info: {
        relay_url: 'wss://nostr-ts-relay.your-domain.com',
        name: `${packageJson.name}.your-domain.com`,
        description: packageJson.description,
        pubkey: 'replace-with-your-pubkey',
        contact: 'operator@your-domain.com',
      },
      workers: {
        count: 0,
      },
      limits: {
        event: {
          eventId: {
            minLeadingZeroBits: 0,
          },
          kind: {
            whitelist: [],
            blacklist: [],
          },
          pubkey: {
            minLeadingZeroBits: 0,
            whitelist: [],
            blacklist: [],
          },
          createdAt: {
            maxPositiveDelta: 900,
            maxNegativeDelta: 0, // disabled
          },
          content: {
            maxLength: 1048576,
          },
          rateLimits: [
            {
              kinds: [
                EventKinds.SET_METADATA,
                EventKinds.CONTACT_LIST,
                EventKinds.CHANNEL_CREATION,
                EventKinds.CHANNEL_METADATA,
              ],
              period: 60000,
              rate: 6,
            },
            {
              kinds: [
                EventKinds.TEXT_NOTE,
                EventKinds.RECOMMEND_SERVER,
                EventKinds.ENCRYPTED_DIRECT_MESSAGE,
                EventKinds.CHANNEL_MESSAGE,
              ],
              period: 60000,
               rate: 12,
            },
            {
              kinds: [
                EventKinds.TEXT_NOTE,
                EventKinds.RECOMMEND_SERVER,
                EventKinds.ENCRYPTED_DIRECT_MESSAGE,
                EventKinds.CHANNEL_MESSAGE,
              ],
              period: 3600000,
              rate: 360,
            },
            {
              kinds: [
                [EventKinds.DELETE, EventKinds.REACTION],
                [EventKinds.CHANNEL_HIDE_MESSAGE, EventKinds.CHANNEL_RESERVED_LAST],
              ],
              period: 60000,
              rate: 30,
            },
            {
              kinds: [
                [EventKinds.REPLACEABLE_FIRST, EventKinds.REPLACEABLE_LAST],
                [EventKinds.PARAMETERIZED_REPLACEABLE_FIRST, EventKinds.PARAMETERIZED_REPLACEABLE_LAST],
              ],
              period: 60000,
              rate: 24,
            },
            {
              kinds: [[EventKinds.EPHEMERAL_FIRST, EventKinds.EPHEMERAL_LAST]],
              period: 60000,
              rate: 60,
            },
            {
              period: 3600000,
              rate: 720,
            },
            {
              period: 86400000,
              rate: 2880,
            },
          ],
        },
        client: {
          subscription: {
            maxSubscriptions: 10,
            maxFilters: 10,
          },
        },
        message: {
          rateLimits: [
            {
              period: 60000,
              rate: 120,
            },
            {
              period: 3600000,
              rate: 3600,
            },
            {
              period: 86400000,
              rate: 86400,
            },
          ],
          ipWhitelist: [
            '::1', // local host
            '::ffff:10.10.10.1', // host running docker
          ],
        },
      },
    }
  }

  public static loadSettings(path: string) {
    debug('loading settings from %s', path)
    return JSON.parse(
      fs.readFileSync(
        path,
        { encoding: 'utf-8' }
      )
    )
  }

  public static createSettings(): ISettings {
    if (SettingsStatic._settings) {
      return SettingsStatic._settings
    }
    debug('creating settings')
    const path = SettingsStatic.getSettingsFilePath()
    const defaults = settingsSampleJson as ISettings
    try {

      if (fs.existsSync(path)) {
        SettingsStatic._settings = mergeDeepRight(
          defaults,
          SettingsStatic.loadSettings(path)
        )
      } else {
        SettingsStatic.saveSettings(path, defaults)
        SettingsStatic._settings = mergeDeepRight({}, defaults)
      }

      return SettingsStatic._settings
    } catch (error) {
      debug('error reading config file at %s: %o', path, error)

      return defaults
    }
  }

  public static saveSettings(path: string, settings: ISettings) {
    debug('saving settings to %s: %o', path, settings)
    return fs.writeFileSync(
      path,
      JSON.stringify(settings, null, 2),
      { encoding: 'utf-8' }
    )
  }
}
