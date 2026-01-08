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
    
    const params = new URLSearchParams({ query });
    
    const response = await fetch(`${API_BASE_URL}/places/textsearch?${params}`);
    const data = await response.json();
    
    if (data.error) {
        throw new Error(data.error);
    }
    
    currentNextPageToken = data.next_page_token || null;
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
            const params = new URLSearchParams({
                ...currentSearchParams,
                pageToken: currentNextPageToken
            });
            
            const apiResponse = await fetch(`${API_BASE_URL}/places/nearby?${params}`);
            response = await apiResponse.json();
        } else if (type === 'textsearch') {
            const query = document.getElementById('query').value;
            const params = new URLSearchParams({
                query,
                pageToken: currentNextPageToken
            });
            
            const apiResponse = await fetch(`${API_BASE_URL}/places/textsearch?${params}`);
            response = await apiResponse.json();
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
function displayResults(data, type) {
    resultsSection.style.display = 'block';
    resultsContainer.innerHTML = '';
    
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
        return;
    }
    
    places.forEach(place => {
        resultsContainer.appendChild(createPlaceCard(place));
    });
    
    updatePaginationButton();
}

// Append Results
function appendResults(places) {
    places.forEach(place => {
        resultsContainer.appendChild(createPlaceCard(place));
    });
    
    const currentCount = parseInt(resultsCount.textContent);
    resultsCount.textContent = currentCount + places.length;
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
    
    const phoneHtml = place.phone ? `
        <div class="detail-item">
            <span class="detail-label">📞 Phone:</span>
            <span class="detail-value">${place.phone}</span>
        </div>
    ` : '';
    
    const websiteHtml = place.website ? `
        <div class="detail-item">
            <span class="detail-label">🌐 Website:</span>
            <a href="${place.website}" target="_blank" class="detail-value">${place.website}</a>
        </div>
    ` : '';
    
    const hoursHtml = place.opening_hours ? `
        <div class="detail-item">
            <span class="detail-label">🕐 Hours:</span>
            <span class="detail-value">${place.opening_hours.open_now ? 'Open Now' : 'Closed'}</span>
        </div>
    ` : '';
    
    card.innerHTML = `
        <div class="place-header">
            <div>
                <div class="place-name">${place.name || 'N/A'}</div>
                <div class="place-address">${place.address || 'Address not available'}</div>
            </div>
            ${ratingHtml}
        </div>
        <div class="place-details">
            ${locationHtml}
            ${phoneHtml}
            ${websiteHtml}
            ${hoursHtml}
        </div>
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
    paginationContainer.style.display = 'none';
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

