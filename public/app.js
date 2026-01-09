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
let displayLimit = 'all'; // Display limit: 'all' or number
let isFetchingAllPages = false; // Track if we're fetching all pages
let displayedCount = 0; // Track how many results are currently displayed
let previousDisplayedCount = 0; // Track previous displayed count for appending
let isLoadingMore = false; // Track if we're loading more results

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
            displayedCount = 0; // Reset displayed count when filter changes
            filterAndDisplayResults();
        });
    }
    
    // Display limit dropdown
    const displayLimitSelect = document.getElementById('displayLimit');
    if (displayLimitSelect) {
        displayLimitSelect.addEventListener('change', (e) => {
            displayLimit = e.target.value;
            displayedCount = 0; // Reset displayed count when filter changes
            filterAndDisplayResults();
        });
    }
    
    // Download button
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadExcel);
    }
    
    // Display limit dropdown
    const displayLimit = document.getElementById('displayLimit');
    if (displayLimit) {
        displayLimit.addEventListener('change', () => {
            filterAndDisplayResults();
        });
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
                response = await searchNearby();
            } else {
                throw new Error('Please provide either a Location Name or both Latitude and Longitude');
            }
        } else if (type === 'textsearch') {
            response = await searchText();
        } else if (type === 'details') {
            response = await searchDetails();
        }
        
        // Display first page results immediately
        displayResults(response, type);
        
        // Then automatically fetch all remaining pages in background (for nearby and textsearch only)
        if (type !== 'details' && currentNextPageToken) {
            // Fetch all pages automatically (non-blocking)
            fetchAllPagesAutomatically(type).catch(err => {
                console.error('Error fetching all pages:', err);
                const fetchingStatus = document.getElementById('fetchingStatus');
                if (fetchingStatus) {
                    fetchingStatus.textContent = '⚠️ Error fetching all pages';
                    fetchingStatus.style.color = 'var(--danger-color)';
                }
            });
        } else {
            // No more pages, hide fetching status
            const autoFetchInfo = document.querySelector('.auto-fetch-info');
            if (autoFetchInfo) autoFetchInfo.style.display = 'none';
        }
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
        if (!isFetchingAllPages) {
            showError(error.message);
        } else {
            console.error('Error loading next page:', error);
        }
    } finally {
        if (!isFetchingAllPages) {
            setLoading(false);
        }
    }
}

// Fetch All Pages Automatically
async function fetchAllPagesAutomatically(type) {
    isFetchingAllPages = true;
    const maxPages = 10; // Limit to prevent infinite loops
    let pageCount = 0;
    const fetchingStatus = document.getElementById('fetchingStatus');
    
    try {
        while (currentNextPageToken && pageCount < maxPages) {
            // Wait 2 seconds before next request (Google requirement)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            await loadNextPage();
            pageCount++;
            
            // Update status
            if (fetchingStatus) {
                fetchingStatus.textContent = `⏳ Fetching all results... (${allPlacesData.length} found so far)`;
            }
        }
        
        // All pages fetched
        if (fetchingStatus) {
            fetchingStatus.textContent = `✅ All ${allPlacesData.length} results loaded!`;
            fetchingStatus.style.color = 'var(--secondary-color)';
        }
        
        // Hide status after 3 seconds
        setTimeout(() => {
            const autoFetchInfo = document.querySelector('.auto-fetch-info');
            if (autoFetchInfo) autoFetchInfo.style.display = 'none';
        }, 3000);
        
    } catch (error) {
        console.error('Error in fetchAllPagesAutomatically:', error);
        if (fetchingStatus) {
            fetchingStatus.textContent = '⚠️ Error fetching all pages';
            fetchingStatus.style.color = 'var(--danger-color)';
        }
    } finally {
        isFetchingAllPages = false;
    }
}

// Fetch All Pages Automatically
async function fetchAllPagesAutomatically(type) {
    isFetchingAllPages = true;
    const maxPages = 10; // Limit to prevent infinite loops
    let pageCount = 0;
    const fetchingStatus = document.getElementById('fetchingStatus');
    const autoFetchInfo = document.querySelector('.auto-fetch-info');
    
    try {
        while (currentNextPageToken && pageCount < maxPages) {
            // Wait 2 seconds before next request (Google requirement)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            await loadNextPage();
            pageCount++;
            
            // Update status
            if (fetchingStatus) {
                fetchingStatus.textContent = `⏳ Fetching all results... (${allPlacesData.length} found so far)`;
            }
        }
        
        // All pages fetched
        if (fetchingStatus) {
            fetchingStatus.textContent = `✅ All ${allPlacesData.length} results loaded!`;
            fetchingStatus.style.color = 'var(--secondary-color)';
        }
        
        // Hide status after 3 seconds
        setTimeout(() => {
            if (autoFetchInfo) autoFetchInfo.style.display = 'none';
        }, 3000);
        
    } catch (error) {
        console.error('Error in fetchAllPagesAutomatically:', error);
        if (fetchingStatus) {
            fetchingStatus.textContent = '⚠️ Error fetching all pages';
            fetchingStatus.style.color = 'var(--danger-color)';
        }
    } finally {
        isFetchingAllPages = false;
    }
}

// Display Results
async function displayResults(data, type) {
    resultsSection.style.display = 'block';
    resultsContainer.innerHTML = '';
    currentPage = 1;
    displayedCount = 0;
    
    let places = [];
    if (type === 'details') {
        places = [data.place];
        resultsCount.textContent = '1';
    } else {
        places = data.places || [];
        // Don't set count here - will be set in filterAndDisplayResults
    }
    
    // Debug: Log the data received
    console.log('Display Results - Data received:', data);
    console.log('Display Results - Places array:', places);
    console.log('Display Results - Places count:', places.length);
    
    if (places.length === 0) {
        resultsContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No places found. Try different search parameters.</p>';
        paginationContainer.style.display = 'none';
        const downloadControls = document.querySelector('.download-controls');
        if (downloadControls) downloadControls.style.display = 'none';
        return;
    }
    
    // Store all places data immediately (without enriched data)
    allPlacesData = places;
    
    console.log('Display Results - All places data stored:', allPlacesData.length);
    
    // Show loading indicator while processing
    showResultsLoading();
    
    // Display first 20 results immediately
    setLoading(false);
    filterAndDisplayResults(20); // Show first 20
    updatePaginationButton();
    
    // Note: Data already has enriched info (phone, website, reviews), so skip background fetch
    // Only fetch if data doesn't have these fields
    const needsEnrichment = places.length > 0 && (!places[0].phone && !places[0].website && !places[0].reviews);
    if (needsEnrichment) {
        fetchEnrichedDataInBackground(places);
    } else {
        // Data is already enriched, just hide loading
        hideResultsLoading();
    }
}

// Fetch enriched data in background and update cards
async function fetchEnrichedDataInBackground(places) {
    const placeIds = places.map(p => p.place_id).filter(id => id);
    if (placeIds.length === 0) return;
    
    try {
        // Fetch enriched data
        const enrichedResponse = await fetch(`${API_BASE_URL}/places/enrich`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ place_ids: placeIds })
        });
        
        const enrichedData = await enrichedResponse.json();
        if (enrichedData.places && enrichedData.places.length > 0) {
            // Update allPlacesData with enriched data
            const enrichedMap = new Map(enrichedData.places.map(p => [p.place_id, p]));
            allPlacesData = allPlacesData.map(place => {
                const enriched = enrichedMap.get(place.place_id);
                return enriched ? { ...place, ...enriched } : place;
            });
            
            // Re-render to show enriched data
            filterAndDisplayResults();
        }
    } catch (error) {
        console.error('Error fetching enriched data:', error);
        // Continue without enriched data - basic info is already displayed
    }
}

// Filter and Display Results
async function filterAndDisplayResults(initialLimit = null) {
    // Don't clear if we're loading more progressively
    if (!isLoadingMore) {
        resultsContainer.innerHTML = '';
        if (initialLimit === null) {
            displayedCount = 0; // Reset only if not initial load
        }
    }
    
    console.log('Filter and Display - All places data:', allPlacesData.length);
    console.log('Filter and Display - Filter no website:', filterNoWebsite);
    
    // Filter places based on website availability
    let filteredPlaces = allPlacesData;
    if (filterNoWebsite) {
        filteredPlaces = allPlacesData.filter(place => !place.website || place.website === '');
        console.log('Filter and Display - After filtering (no website):', filteredPlaces.length);
    }
    
    // Update counts - show total fetched count
    const totalCount = allPlacesData.length;
    const filteredCount = filteredPlaces.length;
    
    // Show total count (all fetched results) - this is the correct total
    resultsCount.textContent = totalCount;
    
    // Apply progressive loading: show 20 first, then allow loading more
    let placesToDisplay = [];
    if (initialLimit && !isLoadingMore) {
        // Initial load: show first 20
        placesToDisplay = filteredPlaces.slice(0, initialLimit);
        displayedCount = placesToDisplay.length;
    } else {
        // Check display limit from dropdown
        const displayLimitSelect = document.getElementById('displayLimit');
        const displayLimitValue = displayLimitSelect ? displayLimitSelect.value : 'all';
        
        if (displayLimitValue === 'all') {
            if (isLoadingMore) {
                // Progressive loading: show 20 more each time
                previousDisplayedCount = displayedCount;
                const increment = 20;
                const newDisplayCount = Math.min(displayedCount + increment, filteredPlaces.length);
                placesToDisplay = filteredPlaces.slice(0, newDisplayCount);
                displayedCount = newDisplayCount;
            } else {
                // Reset: show first 20
                previousDisplayedCount = 0;
                placesToDisplay = filteredPlaces.slice(0, 20);
                displayedCount = placesToDisplay.length;
            }
        } else {
            // Use dropdown limit
            const limit = parseInt(displayLimitValue);
            if (!isNaN(limit) && limit > 0) {
                placesToDisplay = filteredPlaces.slice(0, limit);
                displayedCount = placesToDisplay.length;
            } else {
                placesToDisplay = filteredPlaces;
                displayedCount = placesToDisplay.length;
            }
        }
    }
    
    // Show display info
    const displayInfo = document.getElementById('displayInfo');
    if (displayedCount < filteredCount) {
        if (!displayInfo) {
            const infoSpan = document.createElement('span');
            infoSpan.id = 'displayInfo';
            infoSpan.className = 'display-info';
            infoSpan.style.marginLeft = '8px';
            infoSpan.style.color = 'var(--text-secondary)';
            infoSpan.style.fontSize = '0.9rem';
            resultsCount.parentElement.appendChild(infoSpan);
        }
        if (displayInfo) {
            displayInfo.textContent = `(Showing ${displayedCount} of ${filteredCount})`;
        }
    } else {
        if (displayInfo) displayInfo.remove();
    }
    
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
    
    // Show/hide download controls
    const downloadControls = document.querySelector('.download-controls');
    if (downloadControls) {
        downloadControls.style.display = filteredPlaces.length > 0 ? 'flex' : 'none';
        updateDownloadOptions(filteredPlaces.length);
    }
    
    // Show/hide display filter
    const displayFilter = document.querySelector('.display-filter');
    if (displayFilter) {
        displayFilter.style.display = filteredPlaces.length > 0 ? 'flex' : 'none';
        updateDisplayOptions(filteredPlaces.length);
    }
    
    console.log('Filter and Display - Places to display:', placesToDisplay.length);
    console.log('Filter and Display - Filtered places:', filteredPlaces.length);
    
    if (filteredPlaces.length === 0) {
        resultsContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No places found matching the filter criteria. Try unchecking "Show only places without website" filter.</p>';
        hideResultsLoading();
        return;
    }
    
    if (placesToDisplay.length === 0) {
        resultsContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No places to display with current filter settings. Try adjusting the display limit.</p>';
        hideResultsLoading();
        return;
    }
    
    // Display filtered and limited places (append if loading more)
    try {
        if (isLoadingMore) {
            // Append only the new cards (skip already displayed ones)
            placesToDisplay.slice(previousDisplayedCount).forEach(place => {
                const card = createPlaceCard(place);
                if (card) {
                    resultsContainer.appendChild(card);
                }
            });
        } else {
            // Display all cards
            placesToDisplay.forEach(place => {
                const card = createPlaceCard(place);
                if (card) {
                    resultsContainer.appendChild(card);
                }
            });
        }
        console.log('Filter and Display - Cards created successfully');
    } catch (error) {
        console.error('Error creating place cards:', error);
        resultsContainer.innerHTML = `<p style="text-align: center; color: var(--danger-color); padding: 40px;">Error displaying results: ${error.message}</p>`;
        hideResultsLoading();
        return;
    }
    
    // Show "Load More" button if there are more results
    showLoadMoreButton(filteredPlaces.length, displayedCount);
    
    // Hide loading indicator
    hideResultsLoading();
    isLoadingMore = false;
}

// Append Results
async function appendResults(places) {
    // Add to all places data immediately (without enriched data)
    allPlacesData = [...allPlacesData, ...places];
    
    // Display immediately
    setLoading(false);
    filterAndDisplayResults();
    
    resultsCount.textContent = allPlacesData.length;
    currentPage++;
    updatePageInfo();
    
    // Fetch enriched data in background for new places
    fetchEnrichedDataInBackground(places);
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

// Update Display Options
function updateDisplayOptions(totalCount) {
    const displayLimit = document.getElementById('displayLimit');
    if (!displayLimit) return;
    
    // Clear existing options except "All Results"
    displayLimit.innerHTML = '<option value="all">All Results</option>';
    
    // Add options: 10, 20, 30, 40, 50, 100, 200, 500, 1000, etc.
    const options = [10, 20, 30, 40, 50, 100, 200, 500, 1000];
    
    options.forEach(option => {
        if (option <= totalCount) {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = `Show ${option}`;
            displayLimit.appendChild(optionElement);
        }
    });
    
    // If total is not in standard options and less than 1000, add it
    if (totalCount > 0 && !options.includes(totalCount) && totalCount < 1000) {
        const optionElement = document.createElement('option');
        optionElement.value = totalCount;
        optionElement.textContent = `Show All ${totalCount}`;
        displayLimit.appendChild(optionElement);
    }
}

// Update Download Options
function updateDownloadOptions(totalCount) {
    const downloadLimit = document.getElementById('downloadLimit');
    if (!downloadLimit) return;
    
    // Clear existing options except "All Results"
    downloadLimit.innerHTML = '<option value="all">All Results</option>';
    
    // Add options: 10, 20, 30, 40, 50, etc. up to total count
    const options = [10, 20, 30, 40, 50, 100, 200, 500];
    
    options.forEach(option => {
        if (option <= totalCount) {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = `First ${option} Results`;
            downloadLimit.appendChild(optionElement);
        }
    });
    
    // If total is not in standard options, add it
    if (totalCount > 0 && !options.includes(totalCount) && totalCount < 500) {
        const optionElement = document.createElement('option');
        optionElement.value = totalCount;
        optionElement.textContent = `All ${totalCount} Results`;
        downloadLimit.appendChild(optionElement);
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
    
    // Get download limit from dropdown
    const downloadLimit = document.getElementById('downloadLimit');
    const limitValue = downloadLimit ? downloadLimit.value : 'all';
    
    // Apply limit if not "all"
    if (limitValue !== 'all') {
        const limit = parseInt(limitValue);
        if (!isNaN(limit) && limit > 0) {
            placesToExport = placesToExport.slice(0, limit);
        }
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
        
        const limitText = limitValue === 'all' ? 'all' : `first ${placesToExport.length}`;
        alert(`Successfully exported ${limitText} places to Excel!\n\nThe file has been downloaded and should open automatically in your spreadsheet application.`);
    } catch (error) {
        console.error('Export error:', error);
        alert(`Export failed: ${error.message}`);
    } finally {
        setLoading(false);
        downloadBtn.disabled = false;
        downloadBtn.textContent = '📥 Download Excel';
    }
}

// Show Results Loading Indicator
function showResultsLoading() {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'resultsLoading';
    loadingDiv.className = 'results-loading';
    loadingDiv.innerHTML = `
        <div class="loading-spinner"></div>
        <p>Loading results...</p>
    `;
    resultsContainer.appendChild(loadingDiv);
}

// Hide Results Loading Indicator
function hideResultsLoading() {
    const loadingDiv = document.getElementById('resultsLoading');
    if (loadingDiv) {
        loadingDiv.remove();
    }
}

// Show Load More Button
function showLoadMoreButton(totalCount, displayedCount) {
    // Remove existing button
    const existingBtn = document.getElementById('loadMoreBtn');
    if (existingBtn) {
        existingBtn.remove();
    }
    
    // Show button if there are more results to display
    if (displayedCount < totalCount) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.id = 'loadMoreBtn';
        loadMoreBtn.className = 'btn btn-secondary load-more-btn';
        loadMoreBtn.textContent = `Load More (${totalCount - displayedCount} remaining)`;
        loadMoreBtn.addEventListener('click', loadMoreResults);
        resultsContainer.appendChild(loadMoreBtn);
    }
}

// Load More Results
async function loadMoreResults() {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.textContent = 'Loading...';
    }
    
    isLoadingMore = true;
    
    // Filter places
    let filteredPlaces = allPlacesData;
    if (filterNoWebsite) {
        filteredPlaces = allPlacesData.filter(place => !place.website || place.website === '');
    }
    
    // Check if we need to fetch more data from API
    if (displayedCount >= filteredPlaces.length && currentNextPageToken) {
        // Need to fetch next page from API
        try {
            await loadNextPage();
        } catch (error) {
            console.error('Error loading next page:', error);
            isLoadingMore = false;
            if (loadMoreBtn) {
                loadMoreBtn.disabled = false;
                loadMoreBtn.textContent = `Load More (${filteredPlaces.length - displayedCount} remaining)`;
            }
            return;
        }
    }
    
    // Display 20 more results
    setTimeout(() => {
        filterAndDisplayResults();
    }, 100);
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
    const downloadControls = document.querySelector('.download-controls');
    if (downloadControls) downloadControls.style.display = 'none';
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

