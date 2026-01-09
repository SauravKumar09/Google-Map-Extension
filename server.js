require("dotenv").config();
const express = require("express");
const axios = require("axios");
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

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

  // Check if API key is configured
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({
      error: "Google Maps API key is not configured. Please set GOOGLE_MAPS_API_KEY environment variable.",
      hint: "Check your Render dashboard → Environment → Add GOOGLE_MAPS_API_KEY"
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

  // Check if API key is configured
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({
      error: "Google Maps API key is not configured. Please set GOOGLE_MAPS_API_KEY environment variable.",
      hint: "Check your Render dashboard → Environment → Add GOOGLE_MAPS_API_KEY"
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

  // Check if API key is configured
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({
      error: "Google Maps API key is not configured. Please set GOOGLE_MAPS_API_KEY environment variable.",
      hint: "Check your Render dashboard → Environment → Add GOOGLE_MAPS_API_KEY"
    });
  }

  try {
    const params = {
      place_id,
      key: process.env.GOOGLE_MAPS_API_KEY,
    };

    // Default fields if not specified (including reviews)
    if (fields) {
      params.fields = fields;
    } else {
      params.fields = "name,formatted_address,formatted_phone_number,website,opening_hours,rating,user_ratings_total,geometry,place_id,types,business_status,price_level,photos,reviews";
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
      reviews: place.reviews ? place.reviews.slice(0, 5).map(review => ({
        author_name: review.author_name,
        rating: review.rating,
        text: review.text,
        time: review.time,
        relative_time_description: review.relative_time_description
      })) : [],
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

// 5. Fetch enriched place details with reviews for multiple places
app.post("/places/enrich", async (req, res) => {
  const { place_ids } = req.body;

  if (!place_ids || !Array.isArray(place_ids)) {
    return res.status(400).json({
      error: "place_ids array is required"
    });
  }

  try {
    // Fetch details in parallel batches (5 at a time to respect rate limits)
    const batchSize = 5;
    const enrichedPlaces = [];
    
    for (let i = 0; i < place_ids.length; i += batchSize) {
      const batch = place_ids.slice(i, i + batchSize);
      
      // Fetch batch in parallel
      const batchPromises = batch.map(async (placeId) => {
        try {
          const params = {
            place_id: placeId,
            key: process.env.GOOGLE_MAPS_API_KEY,
            fields: "name,formatted_address,formatted_phone_number,website,opening_hours,rating,user_ratings_total,geometry,place_id,types,business_status,reviews"
          };

          const response = await axios.get(
            "https://maps.googleapis.com/maps/api/place/details/json",
            { params }
          );

          if (response.data.status === "OK") {
            const place = response.data.result;
            return {
              name: place.name,
              address: place.formatted_address,
              phone: place.formatted_phone_number || "",
              website: place.website || "",
              rating: place.rating,
              total_reviews: place.user_ratings_total,
              location: place.geometry?.location,
              place_id: place.place_id,
              types: place.types,
              reviews: place.reviews ? place.reviews.slice(0, 5).map(review => ({
                author_name: review.author_name,
                rating: review.rating,
                text: review.text,
                time: review.time,
                relative_time_description: review.relative_time_description
              })) : []
            };
          }
          return null;
        } catch (error) {
          console.error(`Error fetching details for ${placeId}:`, error.message);
          return null;
        }
      });
      
      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      enrichedPlaces.push(...batchResults.filter(p => p !== null));
      
      // Small delay between batches to respect rate limits
      if (i + batchSize < place_ids.length) {
        await delay(200);
      }
    }

    res.json({
      status: "OK",
      count: enrichedPlaces.length,
      places: enrichedPlaces
    });

  } catch (error) {
    console.error("Error in enrich places:", error.message);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data 
    });
  }
});

// 6. Export to Excel
app.post("/places/export-excel", async (req, res) => {
  const { places } = req.body;

  if (!places || !Array.isArray(places)) {
    return res.status(400).json({
      error: "places array is required"
    });
  }

  try {
    // Read the template Excel file
    const templatePath = path.join(__dirname, "public", "Google my business data.xlsx");
    
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({
        error: "Excel template not found"
      });
    }

    // Load the template workbook
    const workbook = XLSX.readFile(templatePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Get the header row to understand the structure
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    const headers = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      const cell = worksheet[cellAddress];
      if (cell) {
        headers.push(cell.v);
      }
    }

    // Prepare data rows
    const dataRows = places.map((place, index) => {
      const row = {};
      
      // Map place data to Excel columns based on common field names
      headers.forEach((header, colIndex) => {
        const headerLower = header.toLowerCase();
        
        if (headerLower.includes("name") || headerLower.includes("business")) {
          row[header] = place.name || "";
        } else if (headerLower.includes("address")) {
          row[header] = place.address || "";
        } else if (headerLower.includes("phone") || headerLower.includes("contact")) {
          row[header] = place.phone || "";
        } else if (headerLower.includes("website") || headerLower.includes("url")) {
          row[header] = place.website || "";
        } else if (headerLower.includes("rating")) {
          row[header] = place.rating || "";
        } else if (headerLower.includes("review") && headerLower.includes("count")) {
          row[header] = place.total_reviews || "";
        } else if (headerLower.includes("latitude") || headerLower.includes("lat")) {
          row[header] = place.location?.lat || "";
        } else if (headerLower.includes("longitude") || headerLower.includes("lng") || headerLower.includes("lon")) {
          row[header] = place.location?.lng || "";
        } else if (headerLower.includes("place id") || headerLower.includes("place_id")) {
          row[header] = place.place_id || "";
        } else if (headerLower.includes("google maps") || headerLower.includes("maps link") || headerLower.includes("location link") || headerLower.includes("map link")) {
          // Generate Google Maps link
          let mapsLink = "";
          if (place.place_id) {
            // Use place_id for more accurate location
            mapsLink = `https://www.google.com/maps/place/?q=place_id:${place.place_id}`;
          } else if (place.location?.lat && place.location?.lng) {
            // Fallback to coordinates
            mapsLink = `https://www.google.com/maps?q=${place.location.lat},${place.location.lng}`;
          } else if (place.address) {
            // Fallback to address search
            mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`;
          }
          row[header] = mapsLink;
        } else if (headerLower.includes("type") || headerLower.includes("category")) {
          row[header] = place.types ? place.types.join(", ") : "";
        } else if (headerLower.includes("review") && !headerLower.includes("count")) {
          // For review columns, combine top reviews
          const reviews = place.reviews || [];
          if (reviews.length > 0) {
            const reviewIndex = colIndex - (headers.findIndex(h => h.toLowerCase().includes("review")) || 0);
            if (reviewIndex >= 0 && reviewIndex < reviews.length) {
              row[header] = `${reviews[reviewIndex].author_name}: ${reviews[reviewIndex].text.substring(0, 200)}`;
            }
          }
        } else {
          row[header] = "";
        }
      });
      
      return row;
    });

    // Create a new worksheet with data
    const dataWorksheet = XLSX.utils.json_to_sheet(dataRows, { header: headers });
    
    // Ensure the range is correct
    if (!dataWorksheet["!ref"]) {
      dataWorksheet["!ref"] = XLSX.utils.encode_range({
        s: { c: 0, r: 0 },
        e: { c: headers.length - 1, r: dataRows.length }
      });
    }

    // Replace the sheet
    workbook.Sheets[sheetName] = dataWorksheet;

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Send file
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=google_places_data.xlsx");
    res.send(excelBuffer);

  } catch (error) {
    console.error("Error exporting to Excel:", error.message);
    res.status(500).json({ 
      error: error.message
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

// Root endpoint - Hostinger requires simple response
app.get("/", (req, res) => {
  res.send("API is running");
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
    const server = app.listen(currentPort, "0.0.0.0", () => {
      console.log(`Server running on port ${currentPort}`);
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

// Check API key on startup
if (!process.env.GOOGLE_MAPS_API_KEY) {
  console.error("❌ ERROR: GOOGLE_MAPS_API_KEY environment variable is not set!");
  console.error("💡 Please set GOOGLE_MAPS_API_KEY in your Render dashboard:");
  console.error("   1. Go to Render → Your Service → Environment");
  console.error("   2. Add environment variable: GOOGLE_MAPS_API_KEY");
  console.error("   3. Value: Your Google Maps API key");
  console.error("   4. Save and redeploy");
} else {
  console.log("✅ Google Maps API key is configured");
}

startServer();

