const svg = d3.select("#mapSvg");
        const projection = d3.geoMercator()
            .center([105, 35])  // Center point
            .scale(680)  // Zoom scale
            .translate([svg.attr("width") / 2, svg.attr("height") / 2]);

        const path = d3.geoPath().projection(projection);

        const countryCodes = {
            "JPN": "Japan",
            "KOR": "Korea",  // Merged Korea
            "TWN": "Taiwan",
            "MNG": "Mongolia",
            "CHN": "China"
        };

        let currentMeasure = "PC_RESEARCHER"; // Default MEASURE
        let currentYear = 2015; // Default Year

        // Load GeoJSON data
        d3.json("Asia_GEO.json").then(function (mapData) {
            // 1. Filter to keep only China, Mongolia, Japan, Korea (merged), Taiwan
            let filteredFeatures = mapData.features.filter(feature =>
                ["China", "Mongolia", "Japan", "South Korea", "North Korea", "Taiwan"].includes(feature.properties.name));

            // 2. Merge South Korea and North Korea into one Korea
            const southKorea = filteredFeatures.find(f => f.properties.name === "South Korea");
            const northKorea = filteredFeatures.find(f => f.properties.name === "North Korea");

            if (southKorea && northKorea) {
                const koreaGeometry = {
                    type: "Feature",
                    properties: { name: "Korea" },  // Unified name
                    geometry: {
                        type: "MultiPolygon",
                        coordinates: []
                    }
                };

                // Merge coordinates
                if (southKorea.geometry.type === "MultiPolygon") {
                    koreaGeometry.geometry.coordinates.push(...southKorea.geometry.coordinates);
                } else {
                    koreaGeometry.geometry.coordinates.push(southKorea.geometry.coordinates);
                }

                if (northKorea.geometry.type === "MultiPolygon") {
                    koreaGeometry.geometry.coordinates.push(...northKorea.geometry.coordinates);
                } else {
                    koreaGeometry.geometry.coordinates.push(northKorea.geometry.coordinates);
                }

                // Remove South Korea and North Korea from features
                filteredFeatures = filteredFeatures.filter(f => f.properties.name !== "South Korea" && f.properties.name !== "North Korea");

                // Add merged Korea
                filteredFeatures.push(koreaGeometry);
            }

            mapData.features = filteredFeatures;

            // Load and draw map data
            d3.csv("New_OECD_RenewableEnergy.csv").then(function (data) {
                const tooltip = d3.select("body").append("div")
                    .attr("class", "tooltip")
                    .style("opacity", 0);

            const updateMap = (measure, year) => {
            // Filter data
            const filteredData = d3.rollups(data.filter(d => d.INDICATOR === "RESEARCHER" && d.MEASURE === measure && +d.TIME_PERIOD === year),
                v => d3.sum(v, d => +d.OBS_VALUE),
                d => d.LOCATION);

            const dataMap = new Map(filteredData);

            // Get the min and max values for color scaling
            const values = Array.from(dataMap.values());
            const minValue = d3.min(values);
            const maxValue = d3.max(values);

            // Find highest value and corresponding country
            let highestValue = 0;
            let highestCountry = 'N/A';

            dataMap.forEach((value, countryCode) => {
                if (value > highestValue) {
                    highestValue = value;
                    highestCountry = countryCodes[countryCode] || 'N/A'; // Use countryCodes to get the name
                }
            });

            // Update DOM elements to display highest country and value
            d3.select("#highestCountry").text(`Highest Country: ${highestCountry}`);
            d3.select("#highestValue").text(`Value: ${highestValue}`);

            // Define color scale (colorblind-friendly)
            const colorScale = d3.scaleSequential(d3.interpolateCividis) // Or d3.interpolateViridis
                .domain([minValue, maxValue]); // Define the data range

            // Update legend
            updateLegend(minValue, maxValue, colorScale);

            // Update map
            svg.selectAll("path")
                .data(mapData.features)
                .join("path")
                .attr("d", path)
                .attr("fill", d => {
                    const countryCode = Object.keys(countryCodes).find(code => countryCodes[code] === d.properties.name);
                    const value = dataMap.get(countryCode) || 0; // Default to 0 if not found
                    return value > 0 ? colorScale(value) : "#ccc"; // Apply color scale
                })
                .attr("stroke", "#999")
                .attr("stroke-width", 0.5)
                .on("mouseover", function (event, d) {
                    d3.select(this).style("opacity", 0.8);

                    const countryCode = Object.keys(countryCodes).find(code => countryCodes[code] === d.properties.name);
                    const value = dataMap.get(countryCode) || 0;

                    tooltip.transition().duration(200).style("opacity", 1);
                    tooltip.html(`${d.properties.name}<br/>${measure}: ${value}`)
                        .style("left", (event.pageX + 5) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function () {
                    d3.select(this).style("opacity", 1);
                    tooltip.transition().duration(500).style("opacity", 0);
                });
        };

            const updateLegend = (minValue, maxValue, colorScale) => {
            const legendSvg = d3.select("#legendSvg");

            // Clear existing legend
            legendSvg.selectAll("*").remove();

            // Create color scale bar
            const legendLinear = d3.scaleLinear()
                .domain([minValue, maxValue])
                .range([0, 500]); // Width of the legend

            // Draw rectangles for legend
            legendSvg.selectAll("rect")
                .data(d3.range(minValue, maxValue, (maxValue - minValue) / 10))
                .enter()
                .append("rect")
                .attr("x", (d, i) => i * (500 / 10)) // X position of each rectangle
                .attr("y", 0)
                .attr("width", 500 / 10)
                .attr("height", 25) // Height of rectangles
                .attr("fill", d => colorScale(d));

            // Add value labels
            const legendScale = d3.scaleLinear()
                .domain([0, 9])
                .range([minValue, maxValue]);

            // Add legend labels
            legendSvg.append("text")
                .attr("x", 0) // Position for low label
                .attr("y", 40) // Adjusted position
                .text("Low");

            legendSvg.append("text")
                .attr("x", 500) // Position for high label
                .attr("y", 40) // Adjusted position
                .text("High")
                .attr("text-anchor", "end");
        };

        // Initial map render
        updateMap(currentMeasure, currentYear);

        // Event listeners for changing year or MEASURE
        d3.select("#yearSelect_Research").on("change", function () {
            currentYear = +this.value;
            d3.select("#yearDisplay").text(currentYear); // 更新年份显示
            updateMap(currentMeasure, currentYear);
        });

        d3.select("#pcResearcherBtn").on("click", function () {
            currentMeasure = "PC_RESEARCHER";
            updateMap(currentMeasure, currentYear);
        });

        d3.select("#headcountBtn").on("click", function () {
            currentMeasure = "HEADCOUNT";
            updateMap(currentMeasure, currentYear);
        });
    });
});