// ============================================
// 1. DEPENDENCIES & INITIAL SETUP
// ============================================

var express = require("express");
let app = express();
const cors = require("cors"); // Cross-Origin Resource Sharing - allows frontend from different domain to access API
const allowed = [
  "http://localhost:5500",           // local dev
  "https://mikacode-stack.github.io/ProjexCw",      // GitHub Pages production
];

app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (e.g. curl, mobile clients)
    if (!origin) return callback(null, true);
    if (allowed.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'), false);
    }
  },
  credentials: false
}));

app.use(express.json()); // Middleware to parse JSON request bodies
app.set("json spaces", 3); // Format JSON responses with 3-space indentation for readability

const path = require("path");
let PropertiesReader = require("properties-reader");

// =======================================
// 2. DATABASE CONFIGURATION
// =======================================

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

// Helper - escape regex special chars (prevents RegExp errors / injection)
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

app.get("/search", async function(req, res) {
  // Use a normalized variable name
  const rawQuery = (req.query.query || "").toString().trim();
  if (!rawQuery) {
    return res.status(400).json({ message: "Search query is missing" });
  }

  try {
    
    const collection = db1.collection("products"); 
    // Escape user input so special regex chars don't break the RegExp
    const safe = escapeRegex(rawQuery);
    const regex = new RegExp(safe, "i"); // case-insensitive

    // Use $or to search across fields
    const results = await collection
      .find({ title : regex })
      // .limit(100) // optional: limit for performance
      .toArray();

    console.log(`Search for "${rawQuery}" returned ${results.length} results`);
    res.json(results);
  } catch (err) {
    console.error("Search error:", err);
    // return a JSON error so fetch() can parse it easily
    return res.status(500).json({ error: "Search failed" });
  }
});


// --------------------------------------------
// POST: Create a new document
// URL: /collections/:collectionName
// Example: POST /collections/products
// Body: JSON with title, price, description, etc.
// --------------------------------------------
app.post("/products", async function (req, res, next) {
  try {
    // Validation: Check if request body exists and is not empty
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "Request body is required" });
    }

    // Validate required fields are present
    const requiredFields = ["title", "price", "description"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Validate data types and business rules
    if (typeof req.body.price !== "number" || req.body.price < 0) {
      return res.status(400).json({ error: "Price must be a positive number" });
    }

    // Insert document into collection
    const result = await db1.collection('products').insertOne(req.body);

    // Return inserted document with its new _id
    const insertedDocument = { _id: result.insertedId, ...req.body };

    res.status(201).json(insertedDocument); // 201 = Created
  } catch (err) {
    console.log("Error inserting document:", err);
    next(err);
  }
});
// --------------------------------------------
// DELETE: Remove a document by ID
// URL: /collections/:collectionName/:id
// --------------------------------------------
app.delete("/products/:collectionName/:id", async function (req, res, next) {
  try {
    // Validate ObjectId format
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Delete document matching the ID
    const result = await req.collection.deleteOne({
      _id: new ObjectId(req.params.id),
    });

    // Check if document was found and deleted
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    console.log("Deleted document with ID:", req.params.id);
    res.status(200).json({ msg: "Document deleted successfully" });
  } catch (err) {
    console.log("Error deleting document:", err);
    return res.status(500).json({ error: "Failed to delete" });
  }
});

// --------------------------------------------
// PUT: Update a document by ID
// URL: /collections/:collectionName/:id
// Example: PUT /collections/products/507f1f77bcf86cd799439011
// Body: JSON with fields to update
// --------------------------------------------
app.put("/products/:id", async function (req, res, next) {
  try {
    // Validation: Check if request body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "Request body is required" });
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const updateData = { ...req.body };
    delete updateData._id;

    // Update document using $set operator (only updates specified fields)
    const result = await db1.collection("products").updateOne(
      { _id: new ObjectId(req.params.id) }, // Filter
      { $set: updateData } // Update operation
    );

    // Check if document was found
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Return success with modification count
    res.status(200).json({
      msg: "success",
      modifiedCount: result.modifiedCount, // Number of fields actually changed
    });
  } catch (err) {
    console.log("Error updating document:", err);
    next(err);
  }
});


//Creating an order entry after submission

// Create new order
app.post('/orders', async (req, res) => {
  try {
    const ordersPayload = req.body; // expect an object with order fields
    // basic validation
    if (!ordersPayload || Object.keys(ordersPayload).length === 0) {
      return res.status(400).json({ error: 'Order body required' });
    }
    // Example required fields: firstName, lastName, items (array)
    if (!Array.isArray(ordersPayload.items) || ordersPayload.items.length === 0) {
      return res.status(400).json({ error: 'Order must include items array' });
    }

    // Add server-side metadata
    ordersPayload.createdAt = new Date();
    ordersPayload.status = ordersPayload.status || 'pending';
    // calculate total on server for integrity 
    ordersPayload.total = Number(ordersPayload.total || ordersPayload.items.reduce((s,i)=> s + ((i.price||0)*(i.quantity||1)), 0));

    const result = await db1.collection('orders').insertOne(ordersPayload);
    const inserted = await db1.collection('orders').findOne({ _id: result.insertedId });
    return res.status(201).json(inserted);
  } catch(err) {
    console.error('Error creating order:', err);
    return res.status(500).json({ error: 'Failed to create order' });
  }
});


// Update order by id (partial updates)
app.put('/orders/:id', async (req, res) => {
   const id = req.params.id;
  const updates = req.body;
  delete updates._id;
  updates.updatedAt = new Date();
  const r = await db1.collection('orders').updateOne(
    { _id: new ObjectId(id) },
    { $set: updates }
  );
  const updated = await db1.collection('orders').findOne({ _id: new ObjectId(id) });
  res.json(updated);
});

// Delete order by id
app.delete('/orders/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid id' });

    const result = await db1.collection('orders').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Order not found' });
    return res.json({ msg: 'Order deleted', id });
  } catch(err) {
    console.error('Error deleting order:', err);
    return res.status(500).json({ error: 'Failed to delete order' });
  }
});

//admin logging(fetches users from the database and cross-checks for authentication)
app.get('/users', async (req, res) => {
  try {const db = req.app.locals.db;
    const users = await db.collection('users').find({}).toArray();
    
    // Remove passwords from response for security
    const usersWithoutPasswords = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    res.json(usersWithoutPasswords);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }
    
    const db = req.app.locals.db;
    
    // Find user by email
    const user = await db1.collection('users').findOne({ email });
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }
    
    // Check password
    if (user.password !== password) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }
    
    // Login successful - return user info without password
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      message: 'Login successful',
      user: userWithoutPassword
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});
// ============================================
// 6. GLOBAL ERROR HANDLER MIDDLEWARE
// ============================================

/**
 * Catches all errors passed via next(err)
 * Must be defined after all routes
 * Has 4 parameters (err, req, res, next) to identify it as error handler
 */
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(500).json({ error: "An error occurred" });
});

// ============================================
// 7. START SERVER
// ============================================

const port = process.env.PORT || 3000; // Use environment variable or default to 3000

async function startServer() {
  await connectDB();
  app.listen(port, () => console.log(`Listening on ${port}`));
}

startServer();
