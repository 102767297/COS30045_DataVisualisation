const svg = d3.select("#mapSvg");
const projection = d3.geoMercator()
    .center([105, 35])
    .scale(600)
    .translate([svg.attr("width") / 2, svg.attr("height") / 2]);

const path = d3.geoPath().projection(projection);

const countryCodes = {
    "JPN": "Japan",
    "KOR": "Korea",
    "TWN": "Taiwan",
    "MNG": "Mongolia",
    "CHN": "China"
};

let currentMeasure = "PC_NATIONAL";
let currentYear = 2015;

d3.json("data/Asia_GEO.json").then(function (mapData) {
    let filteredFeatures = mapData.features.filter(feature =>
        ["China", "Mongolia", "Japan", "South Korea", "North Korea", "Taiwan"].includes(feature.properties.name));

    const southKorea = filteredFeatures.find(f => f.properties.name === "South Korea");
    const northKorea = filteredFeatures.find(f => f.properties.name === "North Korea");

    if (southKorea && northKorea) {
        const koreaGeometry = {
            type: "Feature",
            properties: { name: "Korea" },
            geometry: {
                type: "MultiPolygon",
                coordinates: []
            }
        };

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

        filteredFeatures = filteredFeatures.filter(f => f.properties.name !== "South Korea" && f.properties.name !== "North Korea");
        filteredFeatures.push(koreaGeometry);
    }

    mapData.features = filteredFeatures;

    d3.csv("data/cleaned/New_OECD_RenewableEnergy.csv").then(function (data) {
        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        const colorScaleNational = d3.scaleSequential(d3.interpolateCividis)
            .domain([0, d3.max(data, d => d.INDICATOR === "GOVRESEARCHER" && d.MEASURE === "PC_NATIONAL" ? +d.OBS_VALUE : 0)]);

        const colorScaleHeadcount = d3.scaleSequential(d3.interpolateCividis)
            .domain([0, d3.max(data, d => d.INDICATOR === "GOVRESEARCHER" && d.MEASURE === "HEADCOUNT" ? +d.OBS_VALUE : 0)]);

        const updateMap = (measure, year) => {
            const filteredData = d3.rollups(data.filter(d => d.INDICATOR === "GOVRESEARCHER" && d.MEASURE === measure && +d.TIME_PERIOD === year),
                v => d3.sum(v, d => +d.OBS_VALUE),
                d => d.LOCATION);

            const dataMap = new Map(filteredData);

            let colorScale;
            if (measure === "PC_NATIONAL") {
                colorScale = colorScaleNational;
            } else {
                colorScale = colorScaleHeadcount;
            }

            let highestValue = 0;
            let highestCountry = 'N/A';
            
            dataMap.forEach((value, countryCode) => {
                if (value > highestValue) {
                    highestValue = value;
                    highestCountry = countryCodes[countryCode] || 'N/A'; // Map country code to name
                }
            });

            // Format the highest value based on the measure type
            let formattedHighestValue;
            if (currentMeasure === "HEADCOUNT") {
                formattedHighestValue = d3.format(",.0f")(highestValue); // Format with commas and no decimal places
            } else {
                formattedHighestValue = highestValue.toFixed(2); // Format with two decimal places
            }

            // Update DOM elements to display highest country and value
            d3.select("#highestCountry").text(`Highest Country: ${highestCountry}`);
            d3.select("#highestValue").text(`Value: ${formattedHighestValue}`);

            svg.selectAll("path")
                .data(mapData.features)
                .join("path")
                .attr("d", path)
                .attr("fill", d => {
                    const countryCode = Object.keys(countryCodes).find(code => countryCodes[code] === d.properties.name);
                    return dataMap.has(countryCode) ? colorScale(dataMap.get(countryCode)) : "#ccc";
                })
                .attr("stroke", "#999")
                .attr("stroke-width", 0.5)
                .on("mouseover", function (event, d) {
                    d3.select(this).style("opacity", 0.8);
                    const countryCode = Object.keys(countryCodes).find(code => countryCodes[code] === d.properties.name);
                    const value = dataMap.get(countryCode) || 0;

                    tooltip.transition().duration(200).style("opacity", 1);
                    tooltip.html(`${d.properties.name}<br/>${measure}: ${value.toFixed(2)}`)
                        .style("left", (event.pageX + 5) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", function () {
                    d3.select(this).style("opacity", 1);
                    tooltip.transition().duration(500).style("opacity", 0);
                });

            // Update legend with current min and max values
            const minValue = 0;
            const maxValue = measure === "PC_NATIONAL" ? d3.max(data, d => d.INDICATOR === "GOVRESEARCHER" && d.MEASURE === "PC_NATIONAL" ? +d.OBS_VALUE : 0)
                : d3.max(data, d => d.INDICATOR === "GOVRESEARCHER" && d.MEASURE === "HEADCOUNT" ? +d.OBS_VALUE : 0);
                
            updateLegend(minValue, maxValue, colorScale);
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

        updateMap(currentMeasure, currentYear);

        // Slider event listener
        const yearSlider = d3.select("#year-slider");
        const yearLabel = d3.select("#year-label");

        yearSlider.on("input", function() {
            currentYear = +this.value;
            yearLabel.text(currentYear);
            d3.select("#yearDisplay").text(currentYear);
            updateMap(currentMeasure, currentYear);
        });

        // Measure buttons event listeners
        d3.select("#pcResearcherBtn").on("click", function () {
            currentMeasure = "PC_NATIONAL";
            updateMap(currentMeasure, currentYear);
        });

        d3.select("#headcountBtn").on("click", function () {
            currentMeasure = "HEADCOUNT";
            updateMap(currentMeasure, currentYear);
        });
    });
});
