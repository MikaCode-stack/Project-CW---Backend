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

// ============================================
// 5. REST API ROUTES (CRUD OPERATIONS)
// ============================================

// --------------------------------------------
// GET: Retrieve all documents from a collection
// URL: /collections/:collectionName
// Example: GET /collections/products
// --------------------------------------------
app.get("/collections/:collectionName", async function (req, res, next) {
  try {
    console.log("Received request for collection:", req.params.collectionName);
    console.log("Accessing collection: ", req.collection.collectionName);

    // Fetch all documents from the collection
    const results = await req.collection.find({}).toArray();
    console.log("Retrieved data: ", results);

    res.json(results); // Send results as JSON response
  } catch (err) {
    console.log("Error fetching documents: ", err.message);
    next(err); // Pass error to error handling middleware
  }
});

// --------------------------------------------
// GET: Retrieve limited, sorted documents
// URL: /collections1/:collectionName
// Example: GET /collections1/products
// Returns: 3 documents sorted by price (descending)
// --------------------------------------------
app.get("/collections1/:collectionName", async function (req, res, next) {
  try {
    console.log("Received request for collection:", req.params.collectionName);
    console.log("Accessing collection: ", req.collection.collectionName);

    // Fetch documents with limit and sort options
    const results = await req.collection
      .find({}, { limit: 3, sort: { price: -1 } })
      .toArray();
    console.log("Retrieved data: ", results);
    res.status(200).json(results);
  } catch (err) {
    console.log("Error fetching documents: ", err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// --------------------------------------------
// GET: Retrieve documents with dynamic sorting
// URL: /collections2/:collectionName/:max/:sortAspect/:sortAscDesc
// Example: GET /collections2/products/10/price/desc
// Parameters:
//   - max: number of documents to return
//   - sortAspect: field to sort by (e.g., 'price', 'title')
//   - sortAscDesc: 'asc' or 'desc' for sort direction
// --------------------------------------------
app.get(
  "/collections2/:collectionName/:max/:sortAspect/:sortAscDesc",
  async function (req, res, next) {
    try {
      // Check if collection middleware successfully attached collection
      if (!req.collection) {
        return res.status(500).send("Collection not found");
      }

      // Parse max parameter to integer (base 10)
      var max = parseInt(req.params.max, 10);

      // Convert sort direction to MongoDB format: 1 for ascending, -1 for descending
      const sortDirection =
        req.params.sortAscDesc.toLowerCase() === "desc" ? -1 : 1;

      // Query with dynamic sorting using computed property name
      const results = await req.collection
        .find({}) // Empty filter = get all documents
        .limit(max) // Limit number of results
        .sort({ [req.params.sortAspect]: sortDirection }) // Dynamic field sorting
        .toArray();

      return res.status(200).json(results);
    } catch (err) {
      console.log("Error fetching documents: ", err);
      next(err);
    }
  }
);

// --------------------------------------------
// GET: Retrieve a single document by ID
// URL: /collections/:collectionName/:id
// Example: GET /collections/products/507f1f77bcf86cd799439011
// --------------------------------------------
app.get("/collections/:collectionName/:id", async function (req, res, next) {
  try {
    // Validate that the provided ID is a valid MongoDB ObjectId format
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Find document by converting string ID to ObjectId
    const result = await req.collection.findOne({
      _id: new ObjectId(req.params.id),
    });

    // Check if document exists
    if (!result) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json(result);
  } catch (err) {
    console.log("Error fetching document by ID:", err);
    next(err);
  }
});

// Define the port on which the server will listen
const PORT = 3000;

// Start the server and log a message to the console when it's ready
server.listen(PORT, () => {
    console.log(`Express server with Morgan is running on port ${PORT}`);
});
