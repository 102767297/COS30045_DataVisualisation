const svg = d3.select("#chart"),
    margin = { top: 40, right: 60, bottom: 60, left: 60 },
    width = +svg.attr("width") - margin.left - margin.right,
    height = +svg.attr("height") - margin.top - margin.bottom;

// Country configuration
const countries = [
    { id: 'TWN', name: 'Taiwan' },
    { id: 'JPN', name: 'Japan' },
    { id: 'KOR', name: 'Korea' },
    { id: 'MNG', name: 'Mongolia' },
    { id: 'CHN', name: 'China' }
];

// Create country selection checkboxes
const locationFilters = d3.select("#location-filters");
countries.forEach(country => {
    const filterItem = locationFilters
        .append("div")
        .attr("class", "filter-item")
        .style("padding", "10px");

    filterItem.append("input")
        .attr("type", "checkbox")
        .attr("id", `country-${country.id}`)
        .attr("value", country.id)
        .attr("checked", true) // All countries selected by default
        .on("change", () => updateChart(getCurrentMeasurement()));

    filterItem.append("label")
        .attr("for", `country-${country.id}`)
        .text(country.name);
});

const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const x = d3.scaleLinear().range([0, width]);
const y = d3.scaleLinear().range([height, 0]);

const color = d3.scaleOrdinal()
    .domain(countries.map(c => c.id))
    .range(['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd']);

const tooltip = d3.select("#tooltip");

const zoom = d3.zoom()
    .scaleExtent([1, 10])
    .translateExtent([[0, 0], [width, height]])
    .on("zoom", zoomed);

svg.call(zoom);

function zoomed(event) {
    const transform = event.transform;
    g.attr("transform", transform);
    //g.selectAll("circle").attr("r", 4 / transform.k);
    g.selectAll(".axis-label").attr("font-size", 14 / transform.k);
}

// Get selected countries
function getSelectedCountries() {
    return countries
        .filter(country => d3.select(`#country-${country.id}`).property("checked"))
        .map(country => country.id);
}

// Get current measurement
function getCurrentMeasurement() {
    return d3.select("#measurement-select").property("value") || "PC_RESEARCHER";
}

// Update the chart with new data
const updateChart = (measurement) => {
    d3.csv("data/cleaned/New_OECD_RenewableEnergy.csv").then(data => {
        console.log("Loaded Data:", data);  // Log to check if data is loaded correctly
        g.selectAll("*").remove();

        const selectedCountries = getSelectedCountries();

        // Filter and aggregate data
        const filteredData = data.filter(d =>
            (d.INDICATOR === 'RESEARCHER' || d.INDICATOR === 'GOVRESEARCHER') &&
            selectedCountries.includes(d.LOCATION) &&
            (d.TIME_PERIOD >= 2015 && d.TIME_PERIOD <= 2024) &&
            d.MEASURE === measurement &&
            !isNaN(+d.OBS_VALUE) // Ensure OBS_VALUE is a valid number
        );

        // Check the filtered data
        console.log("Filtered Data:", filteredData);

        const aggregatedData = d3.rollups(
            filteredData,
            v => d3.sum(v, d => +d.OBS_VALUE),
            d => d.LOCATION,
            d => d.TIME_PERIOD
        );

        const flattenedData = aggregatedData.flatMap(([location, years]) =>
            years.map(([year, obs_value]) => ({
                LOCATION: location,
                TIME_PERIOD: year,
                OBS_VALUE: +obs_value // Ensure it's a number
            }))
        );

        // Check the flattened data
        console.log("Flattened Data:", flattenedData);

        if (flattenedData.length === 0) {
            g.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .text("Please select at least one country to display data");
            return;
        }

        const uniqueYears = [...new Set(flattenedData.map(d => +d.TIME_PERIOD))];

        x.domain([d3.min(uniqueYears), d3.max(uniqueYears)]);
        y.domain([0, d3.max(flattenedData, d => +d.OBS_VALUE) * 1.1]);

        // Add X axis
        g.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x)
                .tickValues(uniqueYears) // Use only unique years
                .tickFormat(d3.format("d")) // Format years as integers
            );

        // Add Y axis
        g.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(y));

        // X axis label
        g.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + 40)
            .text("Year");

        // Y axis label
        //g.append("text")
        //    .attr("class", "axis-label")
        //    .attr("text-anchor", "middle")
        //    .attr("transform", `rotate(-90)`)
        //    .attr("y", -52)
        //    .attr("x", -height / 2)
        //    .text("Value"); // Use the correct label

        // Draw points for each country
        selectedCountries.forEach(country => {
            const countryData = flattenedData.filter(d => d.LOCATION === country);

            g.selectAll(`circle.${country}`)
                .data(countryData)
                .enter()
                .append("circle")
                .attr("class", country)
                .attr("cx", d => x(+d.TIME_PERIOD))
                .attr("cy", d => y(+d.OBS_VALUE))
                .attr("r", 6)
                .attr("fill", color(country))
                .on("mouseover", (event, d) => {
                    tooltip.transition().duration(200).style("opacity", .9);
                    tooltip.html(`
                        <strong>${countries.find(c => c.id === country).name}</strong><br>
                        Year: ${d.TIME_PERIOD}<br>
                        Percentage of Researchers: ${d.OBS_VALUE.toFixed(2)}
                    `)
                        .style("left", (event.pageX + 5) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", () => {
                    tooltip.transition().duration(200).style("opacity", 0);
                });
        });

        // Create legend
        const legend = d3.select("#legend");
        legend.selectAll("*").remove();
        selectedCountries.forEach(country => {
            const legendItem = legend.append("div").attr("class", "legend-item");

            legendItem.append("div")
                .attr("class", "legend-color-box")
                .style("background-color", color(country));

            legendItem.append("span").text(countries.find(c => c.id === country).name);
        });
    }).catch(error => {
        console.error("Error loading or processing CSV:", error);
    });
};

// Initial update
updateChart(getCurrentMeasurement());

// Update chart on measurement change
d3.select("#measurement-select").on("change", () => {
    updateChart(getCurrentMeasurement());
});
