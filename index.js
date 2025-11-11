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


// Create an HTTP server using the Express app as the request handler
const server = http.createServer(app);

// Define the port on which the server will listen
const PORT = 3000;

// Start the server and log a message to the console when it's ready
server.listen(PORT, () => {
    console.log(`Express server with Morgan is running on port ${PORT}`);
});
