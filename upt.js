const http = require('http');

const PORT = Number(process.env.PORT || 8000);

const server = http.createServer((req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store'
    });
    res.end('OK\n');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`upt server listening on http://0.0.0.0:${PORT}`);
});
