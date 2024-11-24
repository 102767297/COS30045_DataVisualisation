const svg = d3.select("#chart"),
    margin = { top: 40, right: 60, bottom: 60, left: 70 },
    width = +svg.attr("width") - margin.left - margin.right,
    height = +svg.attr("height") - margin.top - margin.bottom;

// Add country configuration
const countries = [
    { id: 'TWN', name: 'Taiwan' },
    { id: 'JPN', name: 'Japan' },
    { id: 'KOR', name: 'South Korea' },
    { id: 'MNG', name: 'Mongolia' },
    { id: 'CHN', name: 'China' }
];

// Create country selection checkboxes
const locationFilters = d3.select("#location-filters");
countries.forEach(country => {
    const filterItem = locationFilters
        .append("div")
        .attr("class", "filter-item")
        .style("padding-right", "10px")
        .style("padding", "10px");
        //.style("padding-right", "10px");
    
    filterItem.append("input")
        .attr("type", "checkbox")
        .attr("id", `country-${country.id}`)
        .attr("value", country.id)
        .attr("checked", true)  // All countries selected by default
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
    .range(['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
        '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf']);

const tooltip = d3.select("#tooltip");

const zoom = d3.zoom()
    .scaleExtent([1, 10])
    .translateExtent([[0, 0], [width, height]])
    .on("zoom", zoomed);

svg.call(zoom);

function zoomed(event) {
    const transform = event.transform;
    g.attr("transform", transform);
    g.selectAll("circle").attr("r", 4 / transform.k);
    g.selectAll(".axis-label").attr("font-size", 14 / transform.k);
}

// Function to get selected countries
function getSelectedCountries() {
    return countries
        .filter(country => d3.select(`#country-${country.id}`).property("checked"))
        .map(country => country.id);
}

// Function to get current measurement
function getCurrentMeasurement() {
    return d3.select("#measurement-select").property("value") || "PC_RESEARCHER";
}

const measurementLabels = {
    'PC_RESEARCHER': 'Percentage of Researchers',
    'PC_NATIONAL': 'Percentage of National Total',
    'HEADCOUNT': 'Number of Researchers',
    '1000EMPLOYED': 'Researchers per 1000 Employed'
};

const updateChart = (measurement) => {
    d3.csv("New_OECD_RenewableEnergy.csv").then(data => {
        g.selectAll("*").remove();

        const selectedCountries = getSelectedCountries();

        // 过滤数据
        const filteredData = data.filter(d =>
            (d.INDICATOR === 'RESEARCHER' || d.INDICATOR === 'GOVRESEARCHER') &&
            selectedCountries.includes(d.LOCATION) &&
            (d.TIME_PERIOD >= 2015 && d.TIME_PERIOD <= 2024) &&
            d.MEASURE === measurement
        );

        // 汇总相同指标的数据
        const aggregatedData = d3.rollups(
            filteredData,
            v => d3.sum(v, d => +d.OBS_VALUE), // 对 OBS_VALUE 求和
            d => d.LOCATION,                  // 按 LOCATION 分组
            d => d.TIME_PERIOD                // 按 TIME_PERIOD 分组
        );

        // 将数据展平成适合绘制的格式
        const flattenedData = aggregatedData.flatMap(([location, years]) => 
            years.map(([year, obs_value]) => ({
                LOCATION: location,
                TIME_PERIOD: year,
                OBS_VALUE: obs_value
            }))
        );

        // 处理空数据
        if (flattenedData.length === 0) {
            g.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .text("Please select at least one country to display data");
            return;
        }

        const uniqueYears = [...new Set(flattenedData.map(d => +d.TIME_PERIOD))];

        x.domain(d3.extent(uniqueYears));
        y.domain([0, d3.max(flattenedData, d => +d.OBS_VALUE) * 1.1]);

        // 添加 X 轴
        g.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x)
                .tickFormat(d3.format("d")));

        // 添加 Y 轴
        g.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(y));

        // 添加 X 轴标签
        g.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height + 40) // 调整标签距离 X 轴的距离
            .text("Year");

        // 添加 Y 轴标签
        g.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("transform", `rotate(-90)`)
            .attr("y", -52) // 调整标签远离 Y 轴的距离
            .attr("x", -height / 2)
            .text(measurementLabels[measurement]);

        // 绘制每个国家的点
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
                        ${measurementLabels[measurement]}: ${d.OBS_VALUE}
                    `)
                        .style("left", (event.pageX + 5) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", () => {
                    tooltip.transition().duration(200).style("opacity", 0);
                });
        });

        // 创建图例
        const legend = d3.select("#legend");
        legend.selectAll("*").remove();
        selectedCountries.forEach(country => {
            const legendItem = legend.append("div")
                .attr("class", "legend-item");

            legendItem.append("div")
                .attr("class", "legend-color-box")
                .style("background-color", color(country));

            legendItem.append("span").text(countries.find(c => c.id === country).name);
        });
    });
};


// Initial update
updateChart(getCurrentMeasurement());

// Update chart when measurement changes
d3.select("#measurement-select").on("change", () => {
    updateChart(getCurrentMeasurement());
});
