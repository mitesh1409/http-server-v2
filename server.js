import http from 'node:http';
import url from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as Product from './models/product.model.js';

const PORT = 3000;
const HOSTNAME = '127.0.0.1';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    // /, /home
    // Returns an HTML response.
    if (req.method === 'GET' && (pathname === '/' || pathname === '/home')) {
        const homePageHtml = `
            <h1>Node.js HTTP Server | Routing</h1>
            <div>
                <ul>
                    <li>
                        <a href="/">Home</a>
                    </li>
                    <li>
                        <a href="/plain-text">Plain Text</a>
                    </li>
                    <li>
                        <a href="/json">JSON</a>
                    </li>
                    <li>
                        <a href="/echo?input=Node.js">Echo</a>
                    </li>
                    <li>
                        <a href="/mern">MERN</a>
                    </li>
                    <li>
                        <a href="/mongodb">MongoDB</a>
                    </li>
                    <li>
                        <a href="/express">Express</a>
                    </li>
                    <li>
                        <a href="/react">React</a>
                    </li>
                    <li>
                        <a href="/nodejs">Node.js</a>
                    </li>
                </ul>
            </div>
        `;

        return htmlResponse(res, 200, homePageHtml);
    }

    // /plain-text
    // Returns a plain text response.
    if (req.method === 'GET' && pathname === '/plain-text') {
        return textResponse(res, 200, 'This is a plain text response.');
    }

    // /json
    if (req.method === 'GET' && pathname === '/json') {
        return jsonResponse(res, 200, { 'greetings': 'Hello Node.js HTTP Server!' });
    }

    // /echo?input=Node.js
    if (req.method === 'GET' && pathname === '/echo') {
        const input = query.input || 'Hello';
        const echoData = {
            normal: input,
            shouty: input.toUpperCase(),
            characterCount: input.length,
            backwards: input.split('').reverse().join('')
        };
        return jsonResponse(res, 200, echoData);
    }

    if (req.method === 'GET' && pathname.startsWith('/static/')) {
        const filePath = path.join(__dirname, 'public', pathname.replace('/static/', ''));
        return staticFileResponse(res, filePath);
    }

    // Routing APIs.

    // RESTful APIs for the Product resource.
    // Here the resource and route remains the same, we are changing HTTP verbs.
    // GET /products => Get a list of products. R in CRUD.
    // POST /products => Save a product. C in CRUD.
    // GET /products/{product} => Get a product (e.g., by ID). R in CRUD.
    // PUT/PATCH /products/{product} => Update a product (e.g., by ID). U in CRUD.
    // DELETE /products/{product} => Delete a product (e.g., by ID). D in CRUD.

    const reqUrlParts = pathname.split('/');
    const resource = reqUrlParts[1];
    const resourceId = Number(reqUrlParts[2]);

    // GET /products => Get a list of products. R in CRUD.
    if (req.method === 'GET' && reqUrlParts.length === 2 && resource === 'products') {
        return jsonResponse(res, 200, {
            'status': 'OK',
            'products': Product.all()
        });
    }

    // POST /products => Save a product. C in CRUD.
    if (req.method === 'POST' && reqUrlParts.length === 2 && resource === 'products') {
        // Check and validate request data.
        let reqDataChunks = [];

        // Collect all the chunks into an array reqDataChunks.
        req.on('data', chunk => reqDataChunks.push(chunk));

        req.on('end', () => {
            // Concatenate all the Buffer chunks into a single complete Buffer object.
            const bufferRequest = Buffer.concat(reqDataChunks);

            // Explicitly convert the Buffer to a string using UTF-8 encoding.
            const utf8Request = bufferRequest.toString('utf8');

            // Now you have a guaranteed String, which is what JSON.parse expects.
            const productData = JSON.parse(utf8Request);

            // Call Product model's save method to save product data.
            Product.add(productData);

            return jsonResponse(res, 201, {
                'status': 'Created',
                'message': 'Product created successfully'
            });
        });

        return;
    }

    // GET /products/{product} => Get a product (e.g., by ID). R in CRUD.
    if (req.method === 'GET' && reqUrlParts.length === 3 && resource === 'products' && Number.isInteger(resourceId)) {
        const product = Product.getById(resourceId);

        if (!product) {
            return jsonResponse(res, 404, {
                'status': 'Not Found'
            });
        } else {
            return jsonResponse(res, 200, {
                'status': 'OK',
                'product': product
            });
        }
    }

    // PUT/PATCH /products/{product} => Update a product (e.g., by ID). U in CRUD.
    if (req.method === 'PATCH' && reqUrlParts.length === 3 && resource === 'products' && Number.isInteger(resourceId)) {
        // Check and validate request data.
        let reqDataChunks = [];

        // Collect all the chunks into an array reqDataChunks.
        req.on('data', chunk => reqDataChunks.push(chunk));

        req.on('end', () => {
            // Concatenate all the Buffer chunks into a single complete Buffer object.
            const bufferRequest = Buffer.concat(reqDataChunks);

            // Explicitly convert the Buffer to a string using UTF-8 encoding.
            const utf8Request = bufferRequest.toString('utf8');

            // Now you have a guaranteed String, which is what JSON.parse expects.
            const productData = JSON.parse(utf8Request);

            const isUpdated = Product.update(resourceId, productData);

            if (!isUpdated) {
                return jsonResponse(res, 404, {
                    'status': 'Not Found'
                });
            } else {
                return jsonResponse(res, 200, {
                    'status': 'OK'
                });
            }
        });

        return;
    }

    // DELETE /products/{product} => Delete a product (e.g., by ID). D in CRUD.
    if (req.method === 'DELETE' && reqUrlParts.length === 3 && resource === 'products' && Number.isInteger(resourceId)) {
        const removed = Product.remove(resourceId);
        if (!removed) {
            return jsonResponse(res, 404, {
                'status': 'Not Found'
            });
        } else {
            return jsonResponse(res, 200, {
                'status': 'OK'
            });
        }
    }

    // Fallback to 404 Not Found.
    return notFoundResponse(res);
});

function textResponse(res, statusCode, data) {
    res.setHeaders(new Headers({
        'Content-Type': 'text/plain'
    }));
    res.statusCode = statusCode;
    res.end(data);
}

function htmlResponse(res, statusCode, data) {
    res.setHeaders(new Headers({
        'Content-Type': 'text/html'
    }));
    res.statusCode = statusCode;
    res.end(data);
}

function jsonResponse(res, statusCode, data) {
    res.setHeaders(new Headers({
        'Content-Type': 'application/json'
    }));
    res.statusCode = statusCode;
    res.end(JSON.stringify(data));
}

function notFoundResponse(res) {
    htmlResponse(res, 404, '<h1>404 | Not Found</h1>');
}

function staticFileResponse(res, filePath) {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return notFoundResponse(res);
    }

    // Determine content type
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'text/plain';
    switch (ext) {
        case '.html':
            contentType = 'text/html';
            break;
        case '.jpg':
        case '.jpeg':
            contentType = 'image/jpeg';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.js':
            contentType = 'application/javascript';
            break;
        case '.pdf':
            contentType = 'application/pdf';
            break;
        case '.csv':
            contentType = 'text/csv';
            break;
        case '.txt':
            contentType = 'text/plain';
            break;
        default: // Fall back to octet stream
            contentType = 'application/octet-stream';
            break;
    }

    // Read file and send response
    const readStream = fs.createReadStream(filePath);

    // Handle read stream events, especially error
    readStream.on('error', () => {
        console.log('Error while reading file');
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.write('<h1>500 | Internal Server Error</h1>');
        res.end();
    });

    res.writeHead(200, { 'Content-Type': contentType });
    readStream.pipe(res);
}

server.listen(
    PORT,
    HOSTNAME,
    () => console.log(`Server up and running at http://${HOSTNAME}:${PORT}`)
);
