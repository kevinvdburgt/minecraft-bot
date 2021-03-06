import mineflayer from 'mineflayer';
import mineflayerNavigationFactory from 'mineflayer-navigate';
import fs from 'fs';
import path from 'path';
import { readCache, writeCache, log } from './utils';
import { authenticate } from './api/auth';
import { realmsCookieString, realmsAcceptTOS, realmsWorlds, realmsJoin } from './api/realms';

const mineflayerNavigate = mineflayerNavigationFactory(mineflayer);

export default class Bot {
  plugin = [];
  state = {};

  constructor (config) {
    this.config = config;
    this.cache = readCache(`bot-${config.username}`);
    this.setup();
  }

  setup = async () => {
    // Get the auth session
    const session = await this.getSession();
    if (session === null) {
      console.error(`Could not create a session for bot '${this.config.username}'`);
      return;
    }

    // Get the server host and port
    const server = await this.getServer(session);
    if (server === null) {
      console.error(`Could not find the server for bot '${this.config.username}'`);
      return;
    }

    // Create the bot itself
    this.bot = mineflayer.createBot({
      session,
      host: server.host,
      port: server.port,
    });

    // Add mineflayer plugins
    mineflayerNavigate(this.bot);

    // Add custom plugins
    this.plugins = fs.readdirSync(path.resolve(__dirname, 'plugins')).map((file) => {
      const plugin = require(path.resolve(__dirname, 'plugins', file)).default;
      return new plugin(this);
    });
  };

  getSession = async () => {
    if (this.cache.session) {
      // @TODO: Validate this cached session
      return this.cache.session;
    } else {
      // Create a new session
      let response = null;

      try {
        response = await authenticate(this.config.username, this.config.password);
      } catch (e) {
        console.error(e);
        return null;
      }

      const session = {
        accessToken: response.accessToken,
        clientToken: response.clientToken,
        selectedProfile: {
          id: response.selectedProfile.id,
          name: response.selectedProfile.name,
        },
      };

      this.updateCache({ session });

      return session;
    }
  };

  getServer = async (session) => {
    if (!this.config.realm) {
      return {
        host: this.config.host,
        port: this.config.port,
      };
    }

    const cookieString = realmsCookieString(
      session.accessToken,
      session.selectedProfile.id,
      session.selectedProfile.name,
      this.config.version
    );

    await realmsAcceptTOS(cookieString);

    const worlds = await realmsWorlds(cookieString);

    const world = worlds.servers.find((server) =>
      server.name === this.config.realm,
    );

    if (!world) {
      console.error(`Could not find realm '${this.config.realm}'`);
      return null;
    }

    const server = await realmsJoin(cookieString, world.id);

    const address = server.address.split(':');

    return {
      host: address[0],
      port: address[1],
    };
  };

  updateCache = (obj) => {
    this.cache = {
      ...this.cache,
      ...obj,
    };

    writeCache(`bot-${this.config.username}`, this.cache);
  };
}
