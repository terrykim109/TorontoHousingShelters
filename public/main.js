const apiUrl = "/api/shelters";

// Fetching data from the local server
fetch(apiUrl)
  .then((response) => response.json())
  .then((data) => {
    const records = data;
    const list = document.getElementById("shelter-list");
  })
  .catch((error) => {
    console.error("Error fetching data:", error);
  });
