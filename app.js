document.addEventListener("DOMContentLoaded", async function() {
    const map = L.map('map').setView([43.7, -79.4], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let userMarker;
    let routeLine;
    let lastPositions = [];

    function smoothLatLon(lat, lon) {
        lastPositions.push([lat, lon]);
        if (lastPositions.length > 5) lastPositions.shift();
        let sumLat=0, sumLon=0;
        lastPositions.forEach(p => { sumLat+=p[0]; sumLon+=p[1]; });
        return [sumLat/lastPositions.length, sumLon/lastPositions.length];
    }

    const apiKey = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImUwMDJjNzVjMThhOTRiMTJiNDAzZjgwMjQzMWQ3ZWVjIiwiaCI6Im11cm11cjY0In0=";
    let routeCoords = [];

    async function fetchRoute(start, end) {
        try {
            const res = await fetch(`https://api.openrouteservice.org/v2/directions/driving-car?start=${start[0]},${start[1]}&end=${end[0]},${end[1]}`, {
                headers: { "Authorization": apiKey }
            });
            const data = await res.json();
            routeCoords = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
            if(routeLine) map.removeLayer(routeLine);
            routeLine = L.polyline(routeCoords, {color:'blue'}).addTo(map);
        } catch(err) { console.error("Route fetch failed:", err); }
    }

    function snapToRoute(lat, lon) {
        if (!routeCoords.length) return [lat, lon];
        let closest = routeCoords[0], minDist = Infinity;
        routeCoords.forEach(c => {
            let dLat=c[0]-lat, dLon=c[1]-lon;
            let dist=dLat*dLat + dLon*dLon;
            if(dist<minDist){minDist=dist; closest=c;}
        });
        return closest;
    }

    // Track GPS
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(function(pos) {
            let lat = pos.coords.latitude;
            let lon = pos.coords.longitude;

            [lat, lon] = smoothLatLon(lat, lon);
            [lat, lon] = snapToRoute(lat, lon);

            if (userMarker) userMarker.setLatLng([lat, lon]);
            else userMarker = L.marker([lat, lon]).addTo(map);

            map.setView([lat, lon]);
        }, function(err) { console.error("GPS Error:", err); },
        { enableHighAccuracy:true, maximumAge:0, timeout:10000 });
    } else {
        alert("Geolocation not supported.");
    }

    // Choose destination by clicking
    map.on('click', function(e) {
        if (!userMarker) return alert("Waiting for GPS...");
        const start = [userMarker.getLatLng().lng, userMarker.getLatLng().lat];
        const end = [e.latlng.lng, e.latlng.lat];
        fetchRoute(start, end);
    });
});