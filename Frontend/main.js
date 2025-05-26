const apiUrl = "/api/shelters";
  // Adding a map using leaflet, set at Toronto coordinates
  const map = L.map("map").setView([43.65107, -79.347015], 11);

document.addEventListener("DOMContentLoaded", () => {


  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);
});

// Fetching data from the local server
fetch(apiUrl)
  .then((response) => response.json())
  .then((data) => {
    const records = data;
    const list = document.getElementById("shelter-list");

    // Step 1: Group by LOCATION_NAME
    const grouped = {};
    for (const record of records) {
      const name = record["LOCATION_NAME"];
      if (!name) continue;
      if (!grouped[name]) grouped[name] = [];
      grouped[name].push(record);
    }

    // Step 2–3: Filter based on most recent record and room availability
    const likelyAvailable = [];

    for (const shelterName in grouped) {
      const entries = grouped[shelterName];

      // Sort by date 
      entries.sort(
        (a, b) => new Date(b["OCCUPANCY_DATE"]) - new Date(a["OCCUPANCY_DATE"])
      );
      const latest = entries[0];

      const cap = parseInt(latest["CAPACITY_ACTUAL_ROOM"]) || 0;
      const occ = parseInt(latest["OCCUPIED_ROOMS"]) || 0;

      if (cap > occ) {
        likelyAvailable.push(latest);
      }
    }

    // Display available shelters
    likelyAvailable.forEach((record) => {
      const li = document.createElement("li");
      li.innerHTML = `
          ${record["LOCATION_NAME"] || "Unknown Shelter"}<br>
          Program: ${record["PROGRAM_NAME"] || "N/A"}<br>
          Address: ${record["LOCATION_ADDRESS"] || "N/A"}<br>
          Capacity: ${record["CAPACITY_ACTUAL_ROOM"] || "?"} | Occupied: ${
        record["OCCUPIED_ROOMS"] || "?"
      }<br>
          Program Area: ${record["PROGRAM_AREA"] || "N/A"}<br>
          Date: ${record["OCCUPANCY_DATE"]}<br>
          Sector: ${record["SECTOR"] || "N/A"}
        `;
      list.appendChild(li);
    });

    // Helper to delay between geocode calls
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Add markers to map using Nominatim geocoding
const geocodeAndAddMarkers = async () => {
  for (let i = 0; i < likelyAvailable.length; i++) {
    const shelter = likelyAvailable[i];
    const address = shelter["LOCATION_ADDRESS"];

    if (!address) continue;

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', Toronto, ON')}`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'TorontoShelterApp/1.0'
        }
      });
      const data = await response.json();

      if (data.length > 0) {
        const lat = data[0].lat;
        const lon = data[0].lon;

        const marker = L.marker([lat, lon]).addTo(map);
        marker.bindPopup(`
          <b>${shelter["LOCATION_NAME"]}</b><br>
          ${address}<br>
          Capacity: ${shelter["CAPACITY_ACTUAL_ROOM"]} | Occupied: ${shelter["OCCUPIED_ROOMS"]}
        `);
      } else {
        console.warn("No results for:", address);
      }
    } catch (error) {
      console.error("Geocoding failed for", address, error);
    }

    // Respect Nominatim rate limit
    await sleep(1000);
  }
};

geocodeAndAddMarkers();


    // Optional: log to verify
    console.log(`Found ${likelyAvailable.length} shelters likely available`);
  })
  .catch((error) => {
    console.error("Error fetching data:", error);
  });
