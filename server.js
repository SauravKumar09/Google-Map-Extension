require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static("public"));

// CORS middleware for Chrome extension
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Helper function to delay execution (for pagination)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to format place data
const formatPlace = (place) => ({
  name: place.name,
  address: place.vicinity || place.formatted_address,
  rating: place.rating,
  total_reviews: place.user_ratings_total,
  location: place.geometry.location,
  place_id: place.place_id,
  types: place.types,
  business_status: place.business_status,
  price_level: place.price_level,
  photos: place.photos ? place.photos.map(photo => ({
    photo_reference: photo.photo_reference,
    width: photo.width,
    height: photo.height
  })) : []
});

// 1. Nearby Search (Location + Keyword)
// Example: restaurants near Delhi
app.get("/places/nearby", async (req, res) => {
  const { keyword, lat, lng, radius = 5000, pageToken } = req.query;

  if (!keyword) {
    return res.status(400).json({
      error: "keyword is required"
    });
  }

  if (!lat || !lng) {
    return res.status(400).json({
      error: "lat and lng are required for Nearby Search. Use Text Search endpoint if you only have a location name."
    });
  }

  try {
    const params = {
      location: `${lat},${lng}`,
      radius: parseInt(radius),
      keyword,
      key: process.env.GOOGLE_MAPS_API_KEY,
    };

    // Add page token if provided (for pagination)
    if (pageToken) {
      params.pagetoken = pageToken;
    }

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
      { params }
    );

    if (response.data.status !== "OK" && response.data.status !== "ZERO_RESULTS") {
      return res.status(400).json({
        error: response.data.error_message || response.data.status
      });
    }

    const places = (response.data.results || []).map(formatPlace);

    res.json({
      status: response.data.status,
      count: places.length,
      places,
      next_page_token: response.data.next_page_token || null
    });

  } catch (error) {
    console.error("Error in nearby search:", error.message);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data 
    });
  }
});

// 2. Text Search (City + Keyword)
// Example: cafes in Bangalore
app.get("/places/textsearch", async (req, res) => {
  const { query, pageToken } = req.query;

  if (!query) {
    return res.status(400).json({
      error: "query parameter is required"
    });
  }

  try {
    const params = {
      query,
      key: process.env.GOOGLE_MAPS_API_KEY,
    };

    // Add page token if provided (for pagination)
    if (pageToken) {
      params.pagetoken = pageToken;
    }

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/textsearch/json",
      { params }
    );

    if (response.data.status !== "OK" && response.data.status !== "ZERO_RESULTS") {
      return res.status(400).json({
        error: response.data.error_message || response.data.status
      });
    }

    const places = (response.data.results || []).map(formatPlace);

    res.json({
      status: response.data.status,
      count: places.length,
      places,
      next_page_token: response.data.next_page_token || null
    });

  } catch (error) {
    console.error("Error in text search:", error.message);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data 
    });
  }
});

// 3. Place Details (Phone, Website, Hours, etc.)
app.get("/places/details", async (req, res) => {
  const { place_id, fields } = req.query;

  if (!place_id) {
    return res.status(400).json({
      error: "place_id parameter is required"
    });
  }

  try {
    const params = {
      place_id,
      key: process.env.GOOGLE_MAPS_API_KEY,
    };

    // Default fields if not specified
    if (fields) {
      params.fields = fields;
    } else {
      params.fields = "name,formatted_address,formatted_phone_number,website,opening_hours,rating,user_ratings_total,geometry,place_id,types,business_status,price_level,photos";
    }

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/details/json",
      { params }
    );

    if (response.data.status !== "OK") {
      return res.status(400).json({
        error: response.data.error_message || response.data.status
      });
    }

    const place = response.data.result;
    const formattedPlace = {
      name: place.name,
      address: place.formatted_address,
      phone: place.formatted_phone_number,
      website: place.website,
      rating: place.rating,
      total_reviews: place.user_ratings_total,
      location: place.geometry?.location,
      place_id: place.place_id,
      types: place.types,
      business_status: place.business_status,
      price_level: place.price_level,
      opening_hours: place.opening_hours,
      photos: place.photos ? place.photos.map(photo => ({
        photo_reference: photo.photo_reference,
        width: photo.width,
        height: photo.height
      })) : []
    };

    res.json({
      status: response.data.status,
      place: formattedPlace
    });

  } catch (error) {
    console.error("Error in place details:", error.message);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data 
    });
  }
});

// 4. Get all pages (with pagination)
// This endpoint automatically fetches all pages
app.get("/places/nearby/all", async (req, res) => {
  const { keyword, lat, lng, radius = 5000, maxPages = 3 } = req.query;

  if (!keyword) {
    return res.status(400).json({
      error: "keyword is required"
    });
  }

  if (!lat || !lng) {
    return res.status(400).json({
      error: "lat and lng are required for Nearby Search. Use Text Search endpoint if you only have a location name."
    });
  }

  try {
    let allPlaces = [];
    let nextPageToken = null;
    let pageCount = 0;
    const maxPagesInt = parseInt(maxPages);

    do {
      const params = {
        location: `${lat},${lng}`,
        radius: parseInt(radius),
        keyword,
        key: process.env.GOOGLE_MAPS_API_KEY,
      };

      if (nextPageToken) {
        params.pagetoken = nextPageToken;
        // Wait 2 seconds before next request (Google requirement)
        await delay(2000);
      }

      const response = await axios.get(
        "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
        { params }
      );

      if (response.data.status !== "OK" && response.data.status !== "ZERO_RESULTS") {
        return res.status(400).json({
          error: response.data.error_message || response.data.status
        });
      }

      const places = (response.data.results || []).map(formatPlace);
      allPlaces = allPlaces.concat(places);

      nextPageToken = response.data.next_page_token;
      pageCount++;

      // Break if no more pages or max pages reached
      if (!nextPageToken || pageCount >= maxPagesInt) {
        break;
      }

    } while (nextPageToken && pageCount < maxPagesInt);

    res.json({
      status: "OK",
      count: allPlaces.length,
      pages_fetched: pageCount,
      places: allPlaces
    });

  } catch (error) {
    console.error("Error in nearby search (all pages):", error.message);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data 
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Google Maps Places API service is running",
    api_key_configured: !!process.env.GOOGLE_MAPS_API_KEY
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Google Maps Places API Service",
    endpoints: {
      "GET /places/nearby": "Search places near a location (requires: keyword, lat, lng, optional: radius, pageToken). Note: UI allows location name as alternative to coordinates.",
      "GET /places/textsearch": "Text search for places (requires: query, optional: pageToken)",
      "GET /places/details": "Get detailed information about a place (requires: place_id, optional: fields)",
      "GET /places/nearby/all": "Get all pages of nearby search (requires: keyword, lat, lng, optional: radius, maxPages). Note: UI allows location name as alternative to coordinates.",
      "GET /health": "Health check endpoint"
    },
    examples: {
      nearby: "/places/nearby?keyword=restaurant&lat=28.6139&lng=77.2090&radius=3000",
      textsearch: "/places/textsearch?query=cafes in Bangalore",
      details: "/places/details?place_id=ChIJN1t_tDeuEmsRUsoyG83frY4"
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server with port conflict handling
function startServer() {
  let port = parseInt(process.env.PORT) || 3000;
  const maxAttempts = 10;
  let attempts = 0;

  function tryListen(currentPort) {
    const server = app.listen(currentPort, () => {
      console.log(`🚀 Server running on http://localhost:${currentPort}`);
      console.log(`📍 Google Maps Places API service ready`);
      if (!process.env.GOOGLE_MAPS_API_KEY) {
        console.warn("⚠️  WARNING: GOOGLE_MAPS_API_KEY not found in environment variables");
      }
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        attempts++;
        if (attempts < maxAttempts) {
          console.warn(`⚠️  Port ${currentPort} is already in use, trying port ${currentPort + 1}...`);
          tryListen(currentPort + 1);
        } else {
          console.error(`❌ Could not find an available port after ${maxAttempts} attempts`);
          console.error(`💡 Try setting a different PORT in your .env file or kill the process using port ${port}`);
          process.exit(1);
        }
      } else {
        console.error('❌ Server error:', err);
        process.exit(1);
      }
    });
  }

  tryListen(port);
}

startServer();

