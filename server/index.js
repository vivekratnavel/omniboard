import app from './app';

const PORT = process.env.PORT || 9000;

const startServer = (port) => {
  app.listen(port, () => {
    console.log(`Omniboard is listening on port ${port}!`);
  }).on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      const newPort = Number(port) + 1;
      console.log(`Error: Port ${port} is already in use. Retrying with port ${newPort}...`);
      startServer(newPort);
    } else {
      console.error(e);
    }
  });
};

startServer(PORT);
