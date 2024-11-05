const mapFrame = document.getElementById('mapFrame');

document.getElementById('showResearchMap').addEventListener('click', function () {
    mapFrame.src = 'map_research.html';
});

document.getElementById('showGovernmentMap').addEventListener('click', function () {
    mapFrame.src = 'map_government.html';
});

// Load the research map by default
mapFrame.src = 'map_research.html';
