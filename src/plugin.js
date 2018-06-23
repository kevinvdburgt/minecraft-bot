export default class Plugin {
  state = {};

  constructor (instance) {
    this.bot = instance.bot;
    setImmediate(() => this.bind());
  }

  bind = () => {
    // Handle chat events
    if (typeof this.onCommand === 'function') {
      this.bot.on('chat', (username, message) => {
        if (username === this.bot.username) {
          return;
        }

        const args = message.split(' ');

        if (args.shift() !== this.bot.username) {
          return;
        }

        this.onCommand(username, args.shift(), args);
      });
    }

    // Handle navigation events
    if (typeof this.onNavigate === 'function') {
      this.bot.navigate.on('pathPartFound', (path) => this.onNavigate('pathPartFound', path));
      this.bot.navigate.on('pathFound', (path) => this.onNavigate('pathFound', path));
      this.bot.navigate.on('cannotFind', (path) => this.onNavigate('cannotFind', path));
      this.bot.navigate.on('arrived', () => this.onNavigate('arrived', null));
      this.bot.navigate.on('interrupted', () => this.onNavigate('interrupted', null));
    }

    // Handle block updates
    if (typeof this.onBlockUpdate === 'function') {
      this.bot.on('blockUpdate', this.onBlockUpdate);
    }
  };

  setState = (obj) => {
    const old = this.state;

    this.state = {
      ...this.state,
      ...obj,
    };

    console.log('stateChange', old, this.state);
  };
};
