const apiUrl = "/api/shelters";

// Fetching data from the local server
fetch(apiUrl)
  .then((response) => response.json())
  .then((data) => {
    const records = data;
    const list = document.getElementById("shelter-list");

    records.forEach((record) => {
      const li = document.createElement("li");
      li.innerHTML = `
        ${record["LOCATION_NAME"] || "Unknown Shelter"}<br>
        Program: ${record["PROGRAM_NAME"] || "N/A"}<br>
        Address: ${record["LOCATION_ADDRESS"] || "N/A"}<br>
        Capacity (Rooms): ${
          record["CAPACITY_ACTUAL_ROOM"] || "?"
        } | Occupied: ${record["OCCUPIED_ROOMS"] || "?"}<br>
        Program Area: ${record["PROGRAM_AREA"] || "N/A"}<br>
        Date: ${record["OCCUPANCY_DATE"]}<br>
        Sector: ${record["SECTOR"] || "N/A"}
      `;
      list.appendChild(li);
    });

    const grouped = {};

    records.forEach((record) => {
      const key = record["LOCATION_NAME"];
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(record);
    });
  })
  .catch((error) => {
    console.error("Error fetching data:", error);
  });
