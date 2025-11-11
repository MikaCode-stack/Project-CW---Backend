var express = require("express");
let app = express();
const cors = require("cors"); // Cross-Origin Resource Sharing - allows frontend from different domain to access API
app.use(cors({ origin: "http://localhost:5500", credentials: true })); // Enable CORS for all routes
app.use(express.json()); // Middleware to parse JSON request bodies
app.set("json spaces", 3); // Format JSON responses with 3-space indentation for readability

const path = require("path");
let PropertiesReader = require("properties-reader");

// ============================================
// 2. DATABASE CONFIGURATION
// ============================================

// Load database credentials from external properties file (keeps sensitive data separate)
let propertiesPath = path.resolve(__dirname, "./dbconnection.properties");
let properties = PropertiesReader(propertiesPath);

// Extract individual connection parameters
const dbPrefix = properties.get("db.prefix");
const dbHost = properties.get("db.host");
const dbName = properties.get("db.name"); // Database name
const dbUser = properties.get("db.user"); // Username
const dbPassword = properties.get("db.password"); // Password
const dbParams = properties.get("db.params");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// ============================================
// 3. MONGODB CONNECTION
// ============================================

// Construct MongoDB connection string
const uri = `${dbPrefix}${dbUser}:${dbPassword}${dbHost}${dbParams}`;

// Create MongoDB client with Stable API version
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

let db1; // Global variable to hold database connection

// Async function to establish database connection
async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDb");
    db1 = client.db(dbName); // Connect to specific database
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

connectDB(); // Initialize database connection when server starts


// ============================================
// 4. MIDDLEWARE - COLLECTION PARAMETER
// ============================================

/**
 * Middleware that runs whenever :collectionName is in the route
 * Automatically attaches the requested collection to req.collection
 * This allows all routes to access the collection easily
 */
app.param("collectionName", function (req, res, next, collectionName) {
  if (!db1) return next(new Error("Database not initialized"));
  req.collection = db1.collection(collectionName);
  console.log("Middleware set collection:", req.collection.collectionName);
  next();
});


// Define the port on which the server will listen
const PORT = 3000;

// Start the server and log a message to the console when it's ready
server.listen(PORT, () => {
    console.log(`Express server with Morgan is running on port ${PORT}`);
});
