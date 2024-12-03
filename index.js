const http = require('http');
const { exec } = require('child_process');
const { argv } = require('process');

const host = 'localhost';
const port = argv[2];

const requestListener = function (req, res) {
    res.setHeader("Content-Type", "application/json");
    switch (req.url) {
        case "/webhook":
            res.writeHead(200);

            let bufferedBody = [];
            let body = null;


            req.on('data', chunk => {
                bufferedBody.push(chunk);
            }).on('end', () => {
                body = JSON.parse(Buffer.concat(bufferedBody).toString());

                if (!body?.push_data || !body?.repository) {
                    return res.end(JSON.stringify({ error: "Invalid body" }));
                }

                const repo = body.repository.repo_name;
                const name = body.repository.name;
                const tag = body.push_data.tag;

                exec(`docker pull ${repo}:${tag}`, (err, stdout, stderr) => {
                    if (err) {
                        console.error(`Error: ${err.message}`);
                        return res.end(JSON.stringify({ error: "Error while executing command" }));
                    }

                    if (stderr) {
                        console.error(`Stderr:\n${stderr}`);
                    }

                    console.log(`[OK] Pulled image ${repo}:${tag}`);

                    exec(`docker stop ${name}`, (err, stdout, stderr) => {
                        if (err) {
                            console.error(`Error: ${err.message}`);
                            return res.end(JSON.stringify({ error: "Error while executing command" }));
                        }

                        if (stderr) {
                            console.error(`Stderr:\n${stderr}`);
                        }

                        console.log(`[OK] Stopped container ${name}`);

                        exec(`docker rm ${name}`, (err, stdout, stderr) => {

                            if (err) {
                                console.error(`Error: ${err.message}`);
                                return res.end(JSON.stringify({ error: "Error while executing command" }));
                            }

                            if (stderr) {
                                console.error(`Stderr:\n${stderr}`);
                            }

                            console.log(`[OK] Removed container ${name}`);

                            exec(`docker compose up -d`, (err, stdout, stderr) => {
                                if (err) {
                                    console.error(`Error: ${err.message}`);
                                    return res.end(JSON.stringify({ error: "Error while executing command" }));
                                }

                                if (stderr) {
                                    console.error(`Stderr:\n${stderr}`);
                                }

                                console.log(`[OK] Started containers`);

                                exec(`docker image prune -f`, (err, stdout, stderr) => {
                                    if (err) {
                                        console.error(`Error: ${err.message}`);
                                        return res.end(JSON.stringify({ error: "Error while executing command" }));
                                    }

                                    if (stderr) {
                                        console.error(`Stderr:\n${stderr}`);
                                    }

                                    console.log(`[OK] Pruned images`);
                                })

                                res.end(JSON.stringify({ message: "Containers updated" }));

                            })

                        })

                    })

                })
            });

            break
        default:
            res.writeHead(404);
            res.end(JSON.stringify({ error: "Resource not found" }));
    }
}

http.createServer(requestListener).listen(port, host, () => {
    console.log(`Webhook url on http://${host}:${port}/webhook`);
});
