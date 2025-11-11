// Import required modules
// express → simplifies creating web servers
// http → built-in Node.js module to create HTTP servers
// morgan → logs HTTP requests (like access logs)
var express = require('express');
var http = require('http');
var morgan = require('morgan');

// Create an instance of an Express application
var app = express();

// Attach the Morgan middleware to log all incoming HTTP requests
// 'combined' format includes method, status, response time, etc.
app.use(morgan('combined'));


// Custom middleware that logs each request manually
// next() passes control to the next middleware in the chain
app.use((req, res, next) => {
    console.log(`Incoming request:` + req.method + `from` + req.url);
    // res.send('Hello, World with Morgan logging!'); // would end the response if uncommented
    next(); // continue processing
});

// Middleware that allows or blocks requests based on the current minute
// If the current minute is even → proceed
// If odd → send a 403 (Forbidden) response
app.use(function(req, res, next) {
    var minute = new Date().getMinutes();
    if (minute % 2 === 0) {
        next(); // continue if even minute
    } else {
        res.status(403).send('Access denied: odd minute'); // block if odd minute
    }
});

// Middleware that handles valid requests (after passing previous checks)
// Sends a final response message to the client
app.use(function(req, res, next) {
    res.end(`Secret info: password is "Jelly!"`);
});


// Create an HTTP server using the Express app as the request handler
const server = http.createServer(app);

// Define the port on which the server will listen
const PORT = 3000;

// Start the server and log a message to the console when it's ready
server.listen(PORT, () => {
    console.log(`Express server with Morgan is running on port ${PORT}`);
});
