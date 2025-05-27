const apiUrl = "/api/shelters";
const shelterCoords = [];

// Adding a map using leaflet, set at Toronto coordinates
const map = L.map("map").setView([43.65107, -79.347015], 11);

document.addEventListener("DOMContentLoaded", () => {
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);
});

const form = document.getElementById("postal-form");
const submitBtn = form.querySelector("button");
// form.querySelector("button").disabled = true;

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
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            address + ", Toronto, ON"
          )}`;

          const response = await fetch(url, {
            headers: {
              "User-Agent": "TorontoShelterApp/1.0",
            },
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

            shelterCoords.push({
              ...shelter,
              lat,
              lon,
            });
          } else {
            console.warn("No results for:", address);
          }
        } catch (error) {
          console.error("Geocoding failed for", address, error);
        }
        // Respect Nominatim rate limit
        await sleep(1000);
      }
      // submitBtn.disabled = false;
      console.log("Geocoded shelters:", shelterCoords);
    };

    geocodeAndAddMarkers();

    // Optional: log to verify
    console.log(`Found ${likelyAvailable.length} shelters likely available`);
  })
  .catch((error) => {
    console.error("Error fetching data:", error);
  });

// Submit form handler
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const postalCode = document.getElementById("postal").value.trim();

  // Add a space after the first 3 characters if missing
  const formattedPostal =
    postalCode.length === 6
      ? postalCode.slice(0, 3) + " " + postalCode.slice(3)
      : postalCode;

  if (!postalCode) return;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      formattedPostal + ", Toronto, ON"
    )}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "TorontoShelterApp/1.0" },
    });
    const data = await response.json();

    if (data.length === 0) {
      alert("Could not locate that postal code.");
      return;
    }

    const userLat = parseFloat(data[0].lat);
    const userLon = parseFloat(data[0].lon);

    let nearest = null;
    let minDist = Infinity;

    for (const shelter of shelterCoords) {
      const dist = getDistance(userLat, userLon, shelter.lat, shelter.lon);
      if (dist < minDist) {
        minDist = dist;
        nearest = shelter;
      }
    }

    if (nearest) {
      map.setView([nearest.lat, nearest.lon], 14);
      L.popup()
        .setLatLng([nearest.lat, nearest.lon])
        .setContent(
          `
            <b>${nearest["LOCATION_NAME"]}</b><br>
            ${nearest["LOCATION_ADDRESS"]}<br>
            Capacity: ${nearest["CAPACITY_ACTUAL_ROOM"]} | Occupied: ${nearest["OCCUPIED_ROOMS"]}
          `
        )
        .openOn(map);

     
      document.getElementById("map").scrollIntoView({ behavior: "smooth" });
    } else {
      alert("No available shelter found nearby.");
    }
  } catch (err) {
    console.error("Postal code geocoding failed:", err);
    alert("Something went wrong. Try again.");
  }
});

// Listen for user postal code input
// document.getElementById("postal-form").addEventListener("submit", async (e) => {
//   e.preventDefault();
//   const postalCode = document.getElementById("postal").value.trim();
//   if (!postalCode) return;

//   try {
//     // Geocode user postal code
//     const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
//       postalCode + ", Toronto, ON"
//     )}`;
//     const response = await fetch(url, {
//       headers: { "User-Agent": "TorontoShelterApp/1.0" },
//     });
//     const data = await response.json();

//     if (data.length === 0) {
//       alert("Could not locate that postal code. Please try another.");
//       return;
//     }
//     const userLat = parseFloat(data[0].lat);
//     const userLon = parseFloat(data[0].lon);

//     // Find nearest shelter from already geocoded shelterCoords
//     let nearest = null;
//     let minDist = Infinity;

//     for (const shelter of shelterCoords) {
//       const dist = getDistance(userLat, userLon, shelter.lat, shelter.lon);
//       if (dist < minDist) {
//         minDist = dist;
//         nearest = shelter;
//       }
//     }

//     if (nearest) {
//       map.setView([nearest.lat, nearest.lon], 14);
//       L.popup()
//         .setLatLng([nearest.lat, nearest.lon])
//         .setContent(
//           `
//           <b>${nearest["LOCATION_NAME"]}</b><br>
//           ${nearest["LOCATION_ADDRESS"]}<br>
//           Capacity: ${nearest["CAPACITY_ACTUAL_ROOM"]} | Occupied: ${nearest["OCCUPIED_ROOMS"]}
//         `
//         )
//         .openOn(map);
//     } else {
//       alert("No available shelter found nearby.");
//     }
//   } catch (err) {
//     console.error("Postal code lookup failed", err);
//     alert("Something went wrong. Try again.");
//   }
// });

// help function to calculate distance between two coordinates
function getDistance(lat1, lon1, lat2, lon2) {
  const toRad = (val) => (val * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
