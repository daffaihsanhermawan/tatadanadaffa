async function main() {
  try {
    const tmModule = await import('tunnelmole');
    console.log('Tunnelmole module loaded. Keys:', Object.keys(tmModule));
    const tunnelmole = tmModule.tunnelmole || tmModule.default;
    console.log('Starting tunnelmole for port 3000...');
    const url = await tunnelmole({ port: 3000 });
    console.log('TUNNELMOLE RETURNED URL:', url);
  } catch (err) {
    console.error('Error starting tunnelmole:', err);
  }
}

main();
