'use strict';
const amqp = require('amqplib');

const Execution = global.ExecutionClass;

class amqpExecutor extends Execution {
  constructor(process) {
    super(process);
    this.options = {};
    this.endOptions = { end: 'end' };
  }

  async exec(options) {
    this.options = options;
    //QUEUE or EXANGE is setted:
    try {
      if (this.options.exange) {
        await this.sendMessageToExange();
      } else if (this.options.queue) {
        await this.sendMessageToQueue();
      } else {
        throw new Error('Not found queue or exange.');
      }
      this.end(this.endOptions);
    } catch (err) {
      this.endOptions.end = 'error';
      this.endOptions.messageLog = err.message;
      this.endOptions.err_output = err.message;
      this.end(this.endOptions);
    }
  }

  async connect() {
    const connectOptions = {
      protocol: this.options.protocol,
      hostname: this.options.hostname,
      port: this.options.port,
      username: this.options.username,
      password: this.options.password,
      locale: this.options.locale,
      frameMax: this.options.frameMax,
      heartbeat: this.options.heartbeat,
      vhost: this.options.vhost
    };
    try {
      const connection = await amqp.connect(connectOptions);
      const channel = await connection.createChannel();
      return channel;
    } catch (err) {
      throw new Error(err.message);
    }
  }

  async sendMessageToQueue() {
    const channel = await this.connect();
    await channel.assertQueue(this.options.queue);

    const sendResponse = channel.sendToQueue(
      this.options.queue,
      Buffer.from(this.options.message),
      this.options.options || {}
    );

    if (!sendResponse) {
      throw new Error(`Message not sended: ${this.options.message} to ${this.options.queue} queue.`);
    }
  }

  async sendMessageToExange() {
    if (!this.options.exangeType) throw new Error(`For publish in exange you must set the exangeType.`);

    const channel = await this.connect();
    if (this.options.queue) {
      await channel.assertQueue(this.options.queue);
    }
    await channel.assertExchange(this.options.exange, this.options.exangeType);

    const sendResponse = channel.publish(
      this.options.exange,
      this.options.routingKey || '',
      Buffer.from(this.options.message),
      this.options.options || {}
    );

    if (!sendResponse) {
      throw new Error(`Message not sended: ${this.options.message} to ${this.options.exange} exange.`);
    }
  }
}

module.exports = amqpExecutor;
