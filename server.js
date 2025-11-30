// ============================================
// 1. DEPENDENCIES & INITIAL SETUP
// ============================================
require('dotenv').config();
var express = require("express");
let app = express();
const cors = require("cors"); // Cross-Origin Resource Sharing - allows frontend from different domain to access API
const allowed = [
  "http://localhost:5500",    
  "https://mikacode-stack.github.io",      // GitHub Pages production
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
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
});

const path = require("path");

// =======================================
// 2. DATABASE CONFIGURATION
// =======================================

// Extract individual connection parameters
const dbPrefix = process.env.DB_PREFIX;
const dbHost = process.env.DB_HOST;
const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbParams = process.env.DB_PARAMS;

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// ============================================
// 3. MONGODB CONNECTION
// ============================================
const uri = `${dbPrefix}${dbUser}:${dbPassword}${dbHost}${dbParams}`;
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

let db1;

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
// 5. REST API ROUTES
// ============================================
const fs = require('fs');

//Get allowing images retrieving
const fs = require('fs');

app.get('/images/lessons', (req, res) => {
  const folder = path.join(__dirname, 'C:/Users/micha/OneDrive/Desktop/MindForge-final/MindForge-Frontend/images');

  fs.readdir(folder, (err, files) => {
    if (err) return res.status(500).json({ error: 'Unable to read folder' });

    const images = files.filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f));

    const urls = images.map(img => `${req.protocol}://${req.get('host')}/images/lessons/${img}`);

    res.json({ images: urls });
  });
});


// GET: Retrieve all documents from lessons collection
app.get("/lessons", async function (req, res, next) {
  try {
    const lessons = await db1.collection('lessons').find({}).toArray();
    res.json(lessons);
  } catch (err) { next(err); }
});

// Helper - escape regex special chars (prevents RegExp errors / injection)
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

//Search items by subject
app.get("/search", async function (req, res) {
  const collection = db1.collection("lessons");
  const rawQuery = (req.query.query || "").toString().trim();
  if (!rawQuery) {
    const results = await collection.find({}).toArray();
    return res.json(results);
  }

  try {

    const safe = escapeRegex(rawQuery);
    const regex = new RegExp(safe, "i");

    // Search across all required fields
    const results = await collection
      .find({
        $or: [
          { subject: regex },
          { location: regex },
          { price: regex },
        ],
      })
      .toArray();

    res.json(results);
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).json({ error: "Search failed" });
  }
});

//POST Route to create a lesson(only in backend) 
app.post("/lessons", async function (req, res, next) {
  try {
    // Validation: Check if request body exists and is not empty
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "Request body is required" });
    }

    // Validate required fields are present
    const requiredFields = ["subject", "price", "description"];
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
    const result = await db1.collection("lessons").insertOne(req.body);

    // Return inserted document with its new _id
    const insertedDocument = { _id: result.insertedId, ...req.body };

    res.status(201).json(insertedDocument); // 201 = Created
  } catch (err) {
    console.log("Error inserting document:", err);
    next(err);
  }
});

//DELETE a lesson(only in backend)
app.delete("/lessons/delete/:id", async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid ID format" });
    const result = await db1.collection('lessons').deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Document not found" });
    res.status(200).json({ msg: "Document deleted successfully" });
  } catch (err) { next(err); }
});

//PUT: to modify lessons(only in the backend)
app.put("/lessons/:id", async function (req, res, next) {
  try {
      if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ error: "Request body is required" });
    }
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const updateData = { ...req.body };
    delete updateData._id;
    const result = await db1.collection("lessons").updateOne(
      { _id: new ObjectId(req.params.id) }, // Filter
      { $set: updateData }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json({
      msg: "success",
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.log("Error updating document:", err);
    next(err);
  }
});

//Creating an order entry after submission

// Create new order
//Creates an order each time SubmitOrder is performed in front-end
//Contains: customer information(order information), items in the customer's cart and the total of their cart
app.post("/orders", async (req, res) => {
  try {
    const ordersPayload = req.body; 
    if (!ordersPayload || Object.keys(ordersPayload).length === 0) {
      return res.status(400).json({ error: "Order body required" });
    }
    if (
      !Array.isArray(ordersPayload.items) ||
      ordersPayload.items.length === 0
    ) {
      return res.status(400).json({ error: "Order must include items array" });
    }
    ordersPayload.createdAt = new Date();
    ordersPayload.status = ordersPayload.status || "pending";
    // calculate total on server for integrity
    ordersPayload.total = Number(
      ordersPayload.total ||
        ordersPayload.items.reduce(
          (s, i) => s + (i.price || 0) * (i.quantity || 1),
          0
        )
    );

    const result = await db1.collection("orders").insertOne(ordersPayload);
    const inserted = await db1
      .collection("orders")
      .findOne({ _id: result.insertedId });
    return res.status(201).json(inserted);
  } catch (err) {
    console.error("Error creating order:", err);
    return res.status(500).json({ error: "Failed to create order" });
  }
});

// Update order by id (partial updates)
app.put("/orders/:id", async (req, res) => {
  const id = req.params.id;
  const updates = req.body;
  delete updates._id;
  updates.updatedAt = new Date();
  const r = await db1
    .collection("orders")
    .updateOne({ _id: new ObjectId(id) }, { $set: updates });
  const updated = await db1
    .collection("orders")
    .findOne({ _id: new ObjectId(id) });
  res.json(updated);
});

// Delete order by id
app.delete("/orders/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid id" });

    const result = await db1
      .collection("orders")
      .deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0)
      return res.status(404).json({ error: "Order not found" });
    return res.json({ msg: "Order deleted", id });
  } catch (err) {
    console.error("Error deleting order:", err);
    return res.status(500).json({ error: "Failed to delete order" });
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

const port = process.env.PORT || 5500; // Use environment variable or default to 3000

async function startServer() {
  await connectDB();
  app.listen(port, () => console.log(`Listening on ${port}`));
}

startServer();