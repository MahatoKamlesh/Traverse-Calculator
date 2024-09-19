// Dynamically add input fields for angles and distances
document.getElementById("stations").addEventListener("input", function() {
    let numStations = parseInt(this.value);
    let traverseData = document.getElementById("traverseData");
    traverseData.innerHTML = "";

    for (let i = 0; i < numStations; i++) {
        traverseData.innerHTML += `
            <label for="angle${i}">Angle at Station ${i + 1} (°):</label><br>
            <input type="number" id="angle${i}" placeholder="Enter angle in degrees" required><br><br>
            
            <label for="distance${i}">Distance to Station ${i + 1} (m):</label><br>
            <input type="number" id="distance${i}" placeholder="Enter distance in meters" required><br><br>
        `;
    }
});

function calculateClosingError() {
    // Retrieve known station coordinates
    let station1E = parseFloat(document.getElementById("station1E").value);
    let station1N = parseFloat(document.getElementById("station1N").value);
    let station2E = parseFloat(document.getElementById("station2E").value);
    let station2N = parseFloat(document.getElementById("station2N").value);

    // Calculate the bearing between known stations
    let deltaE = station2E - station1E;
    let deltaN = station2N - station1N;
    let initialBearing = Math.atan2(deltaE, deltaN) * (180 / Math.PI);
    if (initialBearing < 0) initialBearing += 360;

    // Get the number of traverse stations
    let numStations = parseInt(document.getElementById("stations").value);
    let angles = [];
    let distances = [];

    // Collect angles and distances for each traverse station
    for (let i = 0; i < numStations; i++) {
        let angle = parseFloat(document.getElementById(`angle${i}`).value);
        let distance = parseFloat(document.getElementById(`distance${i}`).value);
        angles.push(angle);
        distances.push(distance);
    }

    // Calculate closing error (before correction)
    let angleSum = angles.reduce((a, b) => a + b, 0);
    let expectedSum = (numStations - 2) * 180;
    let closingError = expectedSum - angleSum;

    document.getElementById("closingErrorResult").innerHTML = `Closing Error in Angles: ${closingError.toFixed(2)}°`;

    // Apply correction to angles equally
    let correctedAngles = angles.map(angle => angle + (closingError / numStations));
    let correctedAnglesResult = "Corrected Angles: <br>";
    correctedAngles.forEach((angle, i) => {
        correctedAnglesResult += `Station ${i + 1}: ${angle.toFixed(2)}°<br>`;
    });
    document.getElementById("correctedAnglesResult").innerHTML = correctedAnglesResult;

    calculateBearingsAndLatDep(initialBearing, correctedAngles, distances, station2E, station2N);
}

function calculateBearingsAndLatDep(initialBearing, correctedAngles, distances, startE, startN) {
    let bearings = [];
    let latitudes = [];
    let departures = [];

    // Calculate bearings and latitudes/departures for each station
    correctedAngles.forEach((angle, i) => {
        let bearing = initialBearing + angle;
        bearings.push(bearing);

        // Calculate latitude and departure for the current station
        let lat = distances[i] * Math.cos(bearing * Math.PI / 180);
        let dep = distances[i] * Math.sin(bearing * Math.PI / 180);
        latitudes.push(lat);
        departures.push(dep);
    });

    // Display bearings
    let bearingsResult = "Bearings: <br>";
    bearings.forEach((bearing, i) => {
        bearingsResult += `Station ${i + 1}: ${bearing.toFixed(2)}°<br>`;
    });
    document.getElementById("bearingsResult").innerHTML = bearingsResult;

    // Display latitude and departure
    let latDepResult = "Latitudes and Departures: <br>";
    latitudes.forEach((lat, i) => {
        latDepResult += `Station ${i + 1}: Latitude = ${lat.toFixed(2)}, Departure = ${departures[i].toFixed(2)}<br>`;
    });
    document.getElementById("latitudesDeparturesResult").innerHTML = latDepResult;

    // Correct latitudes and departures using Bowditch Rule
    applyBowditchCorrection(latitudes, departures, distances, startE, startN);
}

function applyBowditchCorrection(latitudes, departures, distances, startE, startN) {
    let totalLatitude = latitudes.reduce((a, b) => a + b, 0);
    let totalDeparture = departures.reduce((a, b) => a + b, 0);

    let totalDistance = distances.reduce((a, b) => a + b, 0);

    // Apply Bowditch correction
    let correctedLatitudes = [];
    let correctedDepartures = [];

    latitudes.forEach((lat, i) => {
        let correctionFactor = distances[i] / totalDistance;
        correctedLatitudes.push(lat - correctionFactor * totalLatitude);
        correctedDepartures.push(departures[i] - correctionFactor * totalDeparture);
    });

    // Display corrected latitudes and departures
    let correctedLatDepResult = "Corrected Latitudes and Departures: <br>";
    correctedLatitudes.forEach((lat, i) => {
        correctedLatDepResult += `Station ${i + 1}: Latitude = ${lat.toFixed(2)}, Departure = ${correctedDepartures[i].toFixed(2)}<br>`;
    });
    document.getElementById("correctedLatDepResult").innerHTML = correctedLatDepResult;

    calculateCorrectedCoordinates(correctedLatitudes, correctedDepartures, startE, startN);
}

function calculateCorrectedCoordinates(latitudes, departures, startE, startN) {
    let coordinates = [{ E: startE, N: startN }];

    latitudes.forEach((lat, i) => {
        let newE = coordinates[i].E + departures[i];
        let newN = coordinates[i].N + lat;
        coordinates.push({ E: newE, N: newN });
    });

    let coordinatesResult = "Corrected Coordinates:<br>";
    coordinates.forEach((coord, i) => {
        coordinatesResult += `Station ${i + 1}: Easting = ${coord.E.toFixed(2)}, Northing = ${coord.N.toFixed(2)}<br>`;
    });
    document.getElementById("correctedCoordinatesResult").innerHTML = coordinatesResult;

    // Show the accuracy button
    document.getElementById("accuracyButton").style.display = "block";
}

function showAccuracy() {
    // Retrieve known station coordinates
    let station1E = parseFloat(document.getElementById("station1E").value);
    let station1N = parseFloat(document.getElementById("station1N").value);

    // Get the last station's corrected coordinates
    let correctedCoordinates = document.getElementById("correctedCoordinatesResult").innerText;
    let lastCoordinates = correctedCoordinates.match(/Station \d+: Easting = (.*), Northing = (.*)/g).pop();
    let [lastE, lastN] = lastCoordinates.match(/Easting = (.*), Northing = (.*)/).slice(1, 3).map(parseFloat);

    // Calculate closing error
    let closingErrorE = lastE - station1E;
    let closingErrorN = lastN - station1N;
    let closingError = Math.sqrt(Math.pow(closingErrorE, 2) + Math.pow(closingErrorN, 2));

    // Calculate accuracy
    let traverseLength = parseFloat(document.getElementById("stations").value);
    let accuracy = traverseLength / closingError;

    // Display closing error and accuracy
    document.getElementById("closingErrorResult").innerHTML = `Final Closing Error: ${closingError.toFixed(4)} meters`;
    document.getElementById("correctedCoordinatesResult").innerHTML += `Accuracy: 1/${accuracy.toFixed(4)}`;
}
