// API Base URL
const API_BASE_URL = window.location.origin;

// DOM Elements
const searchForm = document.getElementById('searchForm');
const searchType = document.getElementById('searchType');
const searchBtn = document.getElementById('searchBtn');
const clearBtn = document.getElementById('clearBtn');
const resultsSection = document.getElementById('resultsSection');
const resultsContainer = document.getElementById('resultsContainer');
const resultsCount = document.getElementById('resultsCount');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');
const paginationContainer = document.getElementById('paginationContainer');
const nextPageBtn = document.getElementById('nextPageBtn');
const apiStatus = document.getElementById('apiStatus');

// Field containers
const nearbyFields = document.getElementById('nearbyFields');
const textsearchFields = document.getElementById('textsearchFields');
const detailsFields = document.getElementById('detailsFields');

// State
let currentNextPageToken = null;
let currentSearchParams = null;
let allPlacesData = []; // Store all places data for filtering and export
let currentPage = 1;
let filterNoWebsite = true;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAPIHealth();
    setupEventListeners();
    setupExamples();
});

// Check API Health
async function checkAPIHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        if (data.status === 'OK') {
            apiStatus.textContent = '✅ API Connected';
            apiStatus.className = 'api-status connected';
        } else {
            throw new Error('API not responding');
        }
    } catch (error) {
        apiStatus.textContent = '❌ API Connection Failed';
        apiStatus.className = 'api-status error';
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Search type change
    searchType.addEventListener('change', handleSearchTypeChange);
    
    // Form submit
    searchForm.addEventListener('submit', handleFormSubmit);
    
    // Clear button
    clearBtn.addEventListener('click', clearResults);
    
    // Next page button
    nextPageBtn.addEventListener('click', loadNextPage);
    
    // Filter checkbox
    const filterCheckbox = document.getElementById('filterNoWebsite');
    if (filterCheckbox) {
        filterCheckbox.addEventListener('change', (e) => {
            filterNoWebsite = e.target.checked;
            filterAndDisplayResults();
        });
    }
    
    // Download button
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadExcel);
    }
}

// Handle Search Type Change
function handleSearchTypeChange() {
    const type = searchType.value;
    
    // Hide all fields
    nearbyFields.style.display = 'none';
    textsearchFields.style.display = 'none';
    detailsFields.style.display = 'none';
    
    // Show relevant fields
    if (type === 'nearby') {
        nearbyFields.style.display = 'block';
        document.getElementById('keyword').required = true;
        document.getElementById('lat').required = false;
        document.getElementById('lng').required = false;
        document.getElementById('query').required = false;
        document.getElementById('placeId').required = false;
    } else if (type === 'textsearch') {
        textsearchFields.style.display = 'block';
        document.getElementById('query').required = true;
        document.getElementById('keyword').required = false;
        document.getElementById('lat').required = false;
        document.getElementById('lng').required = false;
        document.getElementById('placeId').required = false;
    } else if (type === 'details') {
        detailsFields.style.display = 'block';
        document.getElementById('placeId').required = true;
        document.getElementById('keyword').required = false;
        document.getElementById('lat').required = false;
        document.getElementById('lng').required = false;
        document.getElementById('query').required = false;
    }
}

// Handle Form Submit
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const type = searchType.value;
    setLoading(true);
    hideError();
    
    try {
        let response;
        
        if (type === 'nearby') {
            const locationName = document.getElementById('locationName').value.trim();
            const lat = document.getElementById('lat').value.trim();
            const lng = document.getElementById('lng').value.trim();
            
            // If location name is provided but no coordinates, use Text Search
            if (locationName && (!lat || !lng)) {
                const keyword = document.getElementById('keyword').value;
                const query = `${keyword} in ${locationName}`;
                document.getElementById('query').value = query;
                response = await searchText();
            } else if (lat && lng) {
                // Use Nearby Search with coordinates
                const fetchAll = document.getElementById('fetchAllPages').checked;
                if (fetchAll) {
                    response = await searchNearbyAll();
                } else {
                    response = await searchNearby();
                }
            } else {
                throw new Error('Please provide either a Location Name or both Latitude and Longitude');
            }
        } else if (type === 'textsearch') {
            response = await searchText();
        } else if (type === 'details') {
            response = await searchDetails();
        }
        
        displayResults(response, type);
    } catch (error) {
        showError(error.message);
    } finally {
        setLoading(false);
    }
}

// Search Nearby
async function searchNearby() {
    const keyword = document.getElementById('keyword').value;
    const lat = document.getElementById('lat').value.trim();
    const lng = document.getElementById('lng').value.trim();
    const radius = document.getElementById('radius').value || 5000;
    
    if (!lat || !lng) {
        throw new Error('Latitude and Longitude are required for Nearby Search');
    }
    
    const params = new URLSearchParams({
        keyword,
        lat,
        lng,
        radius
    });
    
    currentSearchParams = { keyword, lat, lng, radius };
    
    const response = await fetch(`${API_BASE_URL}/places/nearby?${params}`);
    const data = await response.json();
    
    if (data.error) {
        throw new Error(data.error);
    }
    
    currentNextPageToken = data.next_page_token || null;
    return data;
}

// Search Nearby All Pages
async function searchNearbyAll() {
    const keyword = document.getElementById('keyword').value;
    const lat = document.getElementById('lat').value.trim();
    const lng = document.getElementById('lng').value.trim();
    const radius = document.getElementById('radius').value || 5000;
    
    if (!lat || !lng) {
        throw new Error('Latitude and Longitude are required for Nearby Search');
    }
    
    const params = new URLSearchParams({
        keyword,
        lat,
        lng,
        radius,
        maxPages: 3
    });
    
    const response = await fetch(`${API_BASE_URL}/places/nearby/all?${params}`);
    const data = await response.json();
    
    if (data.error) {
        throw new Error(data.error);
    }
    
    currentNextPageToken = null;
    return data;
}

// Search Text
async function searchText() {
    const query = document.getElementById('query').value;
    
    if (!query) {
        throw new Error('Query is required');
    }
    
    const params = new URLSearchParams({ query });
    
    const response = await fetch(`${API_BASE_URL}/places/textsearch?${params}`);
    const data = await response.json();
    
    if (data.error) {
        throw new Error(data.error);
    }
    
    currentNextPageToken = data.next_page_token || null;
    // Store query for pagination reference
    currentSearchParams = { query };
    return data;
}

// Search Details
async function searchDetails() {
    const placeId = document.getElementById('placeId').value;
    const fields = document.getElementById('fields').value;
    
    const params = new URLSearchParams({ place_id: placeId });
    if (fields) {
        params.append('fields', fields);
    }
    
    const response = await fetch(`${API_BASE_URL}/places/details?${params}`);
    const data = await response.json();
    
    if (data.error) {
        throw new Error(data.error);
    }
    
    currentNextPageToken = null;
    return data;
}

// Load Next Page
async function loadNextPage() {
    if (!currentNextPageToken) return;
    
    setLoading(true);
    hideError();
    
    try {
        const type = searchType.value;
        let response;
        
        if (type === 'nearby') {
            // Get parameters from form fields
            const keyword = document.getElementById('keyword').value;
            const lat = document.getElementById('lat').value.trim();
            const lng = document.getElementById('lng').value.trim();
            const radius = document.getElementById('radius').value || 5000;
            const locationName = document.getElementById('locationName').value.trim();
            
            // Check if we're using location name (which means we used text search)
            if (locationName && (!lat || !lng)) {
                // This was actually a text search, use text search for pagination
                const query = `${keyword} in ${locationName}`;
                const params = new URLSearchParams({
                    query,
                    pageToken: currentNextPageToken
                });
                
                const apiResponse = await fetch(`${API_BASE_URL}/places/textsearch?${params}`);
                response = await apiResponse.json();
            } else if (lat && lng && keyword) {
                // Use nearby search with coordinates
                const params = new URLSearchParams({
                    keyword,
                    lat,
                    lng,
                    radius,
                    pageToken: currentNextPageToken
                });
                
                const apiResponse = await fetch(`${API_BASE_URL}/places/nearby?${params}`);
                response = await apiResponse.json();
            } else {
                throw new Error('Missing required parameters for pagination');
            }
        } else if (type === 'textsearch') {
            const query = document.getElementById('query').value;
            if (!query) {
                throw new Error('Query is required for pagination');
            }
            
            const params = new URLSearchParams({
                query,
                pageToken: currentNextPageToken
            });
            
            const apiResponse = await fetch(`${API_BASE_URL}/places/textsearch?${params}`);
            response = await apiResponse.json();
        } else {
            throw new Error('Pagination is not available for this search type');
        }
        
        if (response.error) {
            throw new Error(response.error);
        }
        
        // Append to existing results
        appendResults(response.places || [response.place]);
        currentNextPageToken = response.next_page_token || null;
        updatePaginationButton();
    } catch (error) {
        showError(error.message);
    } finally {
        setLoading(false);
    }
}

// Display Results
async function displayResults(data, type) {
    resultsSection.style.display = 'block';
    resultsContainer.innerHTML = '';
    currentPage = 1;
    
    let places = [];
    if (type === 'details') {
        places = [data.place];
        resultsCount.textContent = '1';
    } else {
        places = data.places || [];
        resultsCount.textContent = data.count || places.length;
    }
    
    if (places.length === 0) {
        resultsContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No places found. Try different search parameters.</p>';
        paginationContainer.style.display = 'none';
        document.getElementById('downloadBtn').style.display = 'none';
        return;
    }
    
    // Fetch enriched data with reviews for all places
    setLoading(true);
    try {
        const placeIds = places.map(p => p.place_id).filter(id => id);
        if (placeIds.length > 0) {
            const enrichedResponse = await fetch(`${API_BASE_URL}/places/enrich`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ place_ids: placeIds })
            });
            
            const enrichedData = await enrichedResponse.json();
            if (enrichedData.places && enrichedData.places.length > 0) {
                // Merge enriched data with original places
                const enrichedMap = new Map(enrichedData.places.map(p => [p.place_id, p]));
                places = places.map(place => {
                    const enriched = enrichedMap.get(place.place_id);
                    return enriched ? { ...place, ...enriched } : place;
                });
            }
        }
    } catch (error) {
        console.error('Error fetching enriched data:', error);
        // Continue with original data if enrichment fails
    } finally {
        setLoading(false);
    }
    
    // Store all places data
    allPlacesData = places;
    
    // Filter and display
    filterAndDisplayResults();
    updatePaginationButton();
}

// Filter and Display Results
async function filterAndDisplayResults() {
    resultsContainer.innerHTML = '';
    
    // Filter places based on website availability
    let filteredPlaces = allPlacesData;
    if (filterNoWebsite) {
        filteredPlaces = allPlacesData.filter(place => !place.website || place.website === '');
    }
    
    // Update counts
    const totalCount = allPlacesData.length;
    const filteredCount = filteredPlaces.length;
    resultsCount.textContent = totalCount;
    
    const filteredCountEl = document.getElementById('filteredNumber');
    const filteredCountSpan = document.getElementById('filteredCount');
    if (filteredCountSpan) {
        if (filterNoWebsite && filteredCount < totalCount) {
            filteredCountSpan.style.display = 'inline';
            if (filteredCountEl) filteredCountEl.textContent = filteredCount;
        } else {
            filteredCountSpan.style.display = 'none';
        }
    }
    
    // Show/hide download button
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.style.display = filteredPlaces.length > 0 ? 'inline-block' : 'none';
    }
    
    if (filteredPlaces.length === 0) {
        resultsContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No places found matching the filter criteria.</p>';
        return;
    }
    
    // Display filtered places
    filteredPlaces.forEach(place => {
        resultsContainer.appendChild(createPlaceCard(place));
    });
}

// Append Results
async function appendResults(places) {
    // Fetch enriched data for new places
    setLoading(true);
    try {
        const placeIds = places.map(p => p.place_id).filter(id => id);
        if (placeIds.length > 0) {
            const enrichedResponse = await fetch(`${API_BASE_URL}/places/enrich`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ place_ids: placeIds })
            });
            
            const enrichedData = await enrichedResponse.json();
            if (enrichedData.places && enrichedData.places.length > 0) {
                const enrichedMap = new Map(enrichedData.places.map(p => [p.place_id, p]));
                places = places.map(place => {
                    const enriched = enrichedMap.get(place.place_id);
                    return enriched ? { ...place, ...enriched } : place;
                });
            }
        }
    } catch (error) {
        console.error('Error fetching enriched data:', error);
    } finally {
        setLoading(false);
    }
    
    // Add to all places data
    allPlacesData = [...allPlacesData, ...places];
    
    // Filter and display
    filterAndDisplayResults();
    
    const currentCount = parseInt(resultsCount.textContent);
    resultsCount.textContent = allPlacesData.length;
    currentPage++;
    updatePageInfo();
}

// Create Place Card
function createPlaceCard(place) {
    const card = document.createElement('div');
    card.className = 'place-card';
    
    const ratingHtml = place.rating ? `
        <div class="rating">
            ⭐ ${place.rating} (${place.total_reviews || 0} reviews)
        </div>
    ` : '';
    
    const typesHtml = place.types ? `
        <div class="types">
            ${place.types.slice(0, 5).map(type => 
                `<span class="type-badge">${type.replace(/_/g, ' ')}</span>`
            ).join('')}
        </div>
    ` : '';
    
    const locationHtml = place.location ? `
        <div class="detail-item">
            <span class="detail-label">📍 Location:</span>
            <span class="detail-value">${place.location.lat}, ${place.location.lng}</span>
        </div>
    ` : '';
    
    // Phone number - prominently displayed
    const phoneHtml = place.phone ? `
        <div class="detail-item phone-highlight">
            <span class="detail-label">📞 Phone:</span>
            <span class="detail-value phone-number">${place.phone}</span>
        </div>
    ` : `
        <div class="detail-item">
            <span class="detail-label">📞 Phone:</span>
            <span class="detail-value" style="color: #999;">Not available</span>
        </div>
    `;
    
    const websiteHtml = place.website ? `
        <div class="detail-item">
            <span class="detail-label">🌐 Website:</span>
            <a href="${place.website}" target="_blank" class="detail-value">${place.website}</a>
        </div>
    ` : `
        <div class="detail-item">
            <span class="detail-label">🌐 Website:</span>
            <span class="detail-value" style="color: #999;">Not available</span>
        </div>
    `;
    
    // Reviews section - top 5 reviews
    const reviewsHtml = place.reviews && place.reviews.length > 0 ? `
        <div class="reviews-section">
            <h4 class="reviews-title">Top ${Math.min(place.reviews.length, 5)} Reviews:</h4>
            <div class="reviews-list">
                ${place.reviews.slice(0, 5).map((review, index) => `
                    <div class="review-item">
                        <div class="review-header">
                            <span class="review-author">${review.author_name || 'Anonymous'}</span>
                            <span class="review-rating">${'⭐'.repeat(review.rating || 0)}</span>
                            <span class="review-time">${review.relative_time_description || ''}</span>
                        </div>
                        <div class="review-text">${review.text || 'No review text available'}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    ` : `
        <div class="reviews-section">
            <h4 class="reviews-title">Reviews:</h4>
            <p style="color: #999; font-style: italic;">No reviews available</p>
        </div>
    `;
    
    card.innerHTML = `
        <div class="place-header">
            <div>
                <div class="place-name">${place.name || 'N/A'}</div>
                <div class="place-address">${place.address || 'Address not available'}</div>
            </div>
            ${ratingHtml}
        </div>
        <div class="place-details">
            ${phoneHtml}
            ${websiteHtml}
            ${locationHtml}
        </div>
        ${reviewsHtml}
        ${typesHtml}
        <div style="margin-top: 15px;">
            <div class="detail-label">Place ID:</div>
            <div class="place-id">${place.place_id || 'N/A'}</div>
        </div>
    `;
    
    return card;
}

// Update Pagination Button
function updatePaginationButton() {
    if (currentNextPageToken) {
        paginationContainer.style.display = 'block';
    } else {
        paginationContainer.style.display = 'none';
    }
    updatePageInfo();
}

// Update Page Info
function updatePageInfo() {
    const pageInfo = document.getElementById('pageInfo');
    if (pageInfo) {
        pageInfo.textContent = `Page ${currentPage}`;
    }
}

// Download Excel
async function downloadExcel() {
    const downloadBtn = document.getElementById('downloadBtn');
    if (!downloadBtn) return;
    
    // Get filtered places
    let placesToExport = allPlacesData;
    if (filterNoWebsite) {
        placesToExport = allPlacesData.filter(place => !place.website || place.website === '');
    }
    
    if (placesToExport.length === 0) {
        alert('No places to export');
        return;
    }
    
    setLoading(true);
    downloadBtn.disabled = true;
    downloadBtn.textContent = '⏳ Exporting...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/places/export-excel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ places: placesToExport })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Export failed');
        }
        
        // Get the blob and create URLs
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        // First, download the file
        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        downloadLink.download = 'google_places_data.xlsx';
        downloadLink.style.display = 'none';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        
        // Then try to open it in the default application
        // Create a new blob URL for opening (some browsers need a fresh URL)
        const openUrl = window.URL.createObjectURL(blob);
        
        // Try to open with the default application
        // This will work if the browser is configured to open .xlsx files externally
        try {
            const openWindow = window.open(openUrl, '_blank');
            
            // If popup was blocked or failed, try alternative method
            if (!openWindow || openWindow.closed || typeof openWindow.closed === 'undefined') {
                // Fallback: create a temporary link and click it
                const openLink = document.createElement('a');
                openLink.href = openUrl;
                openLink.target = '_blank';
                openLink.style.display = 'none';
                document.body.appendChild(openLink);
                openLink.click();
                
                // Clean up after a short delay
                setTimeout(() => {
                    document.body.removeChild(openLink);
                }, 100);
            }
        } catch (error) {
            console.log('Could not auto-open file, but download was successful');
        }
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(downloadLink);
            window.URL.revokeObjectURL(blobUrl);
            window.URL.revokeObjectURL(openUrl);
        }, 2000);
        
        alert(`Successfully exported ${placesToExport.length} places to Excel!\n\nThe file has been downloaded and should open automatically in your spreadsheet application.`);
    } catch (error) {
        console.error('Export error:', error);
        alert(`Export failed: ${error.message}`);
    } finally {
        setLoading(false);
        downloadBtn.disabled = false;
        downloadBtn.textContent = '📥 Download Excel';
    }
}

// Set Loading State
function setLoading(loading) {
    searchBtn.disabled = loading;
    const btnText = searchBtn.querySelector('.btn-text');
    const btnLoader = searchBtn.querySelector('.btn-loader');
    
    if (loading) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline';
    } else {
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

// Show Error
function showError(message) {
    errorSection.style.display = 'block';
    errorMessage.textContent = message;
    resultsSection.style.display = 'none';
}

// Hide Error
function hideError() {
    errorSection.style.display = 'none';
}

// Clear Results
function clearResults() {
    resultsSection.style.display = 'none';
    resultsContainer.innerHTML = '';
    errorSection.style.display = 'none';
    currentNextPageToken = null;
    currentSearchParams = null;
    allPlacesData = [];
    currentPage = 1;
    paginationContainer.style.display = 'none';
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) downloadBtn.style.display = 'none';
    const filteredCountSpan = document.getElementById('filteredCount');
    if (filteredCountSpan) filteredCountSpan.style.display = 'none';
}

// Setup Examples
function setupExamples() {
    const exampleButtons = document.querySelectorAll('.example-btn');
    
    exampleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const example = btn.dataset.example;
            loadExample(example);
        });
    });
}

// Load Example
function loadExample(example) {
    clearResults();
    
    switch(example) {
        case 'nearby-delhi':
            searchType.value = 'nearby';
            document.getElementById('keyword').value = 'restaurant';
            document.getElementById('locationName').value = 'Delhi';
            document.getElementById('lat').value = '';
            document.getElementById('lng').value = '';
            document.getElementById('radius').value = '5000';
            handleSearchTypeChange();
            break;
            
        case 'nearby-bangalore':
            searchType.value = 'nearby';
            document.getElementById('keyword').value = 'hospital';
            document.getElementById('locationName').value = 'Bangalore';
            document.getElementById('lat').value = '';
            document.getElementById('lng').value = '';
            document.getElementById('radius').value = '5000';
            handleSearchTypeChange();
            break;
            
        case 'textsearch-cafes':
            searchType.value = 'textsearch';
            document.getElementById('query').value = 'cafes in Mumbai';
            handleSearchTypeChange();
            break;
            
        case 'textsearch-pharmacies':
            searchType.value = 'textsearch';
            document.getElementById('query').value = 'pharmacies in Chennai';
            handleSearchTypeChange();
            break;
    }
}

