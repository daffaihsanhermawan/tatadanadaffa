const { Client } = require('ssh2');
const net = require('net');

const conn = new Client();

console.log('Connecting to ssh.localhost.run on port 443 via ssh2...');

conn.on('ready', () => {
  console.log('SSH Client :: ready');

  // Request remote port forwarding: remote port 80 -> local port 3000
  conn.forwardIn('0.0.0.0', 80, (err, port) => {
    if (err) {
      console.error('forwardIn error:', err.message);
      return;
    }
    console.log(`Remote forwarded port: ${port}`);
  });

  // Handle incoming connections from the remote tunnel
  conn.on('tcp connection', (info, accept, reject) => {
    console.log('Incoming TCP connection from tunnel!');
    const channel = accept();
    const local = net.connect(3000, '127.0.0.1');

    channel.pipe(local).pipe(channel);

    channel.on('error', e => console.log('Channel error:', e.message));
    local.on('error', e => console.log('Local error:', e.message));
  });

  // Open an interactive shell/exec to read the banner containing the public URL
  conn.shell((err, stream) => {
    if (err) {
      console.error('shell error:', err.message);
      return;
    }
    stream.on('data', (data) => {
      const text = data.toString();
      console.log('BANNER DATA:\n' + text);
    });
    stream.on('close', () => {
      console.log('Stream closed');
      conn.end();
    });
  });
});

conn.on('error', (err) => {
  console.error('SSH Connection error:', err.message);
});

conn.on('close', () => {
  console.log('SSH Connection closed');
});

// Connect without password or key (localhost.run uses 'nokey' user)
conn.connect({
  host: 'ssh.localhost.run',
  port: 443,
  username: 'nokey',
  tryKeyboard: true,
  algorithms: {
    serverHostKey: ['ssh-ed25519', 'ecdsa-sha2-nistp256', 'rsa-sha2-512', 'rsa-sha2-256', 'ssh-rsa']
  }
});
