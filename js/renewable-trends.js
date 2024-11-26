// Create the visualization
const margin = { top: 100, right: 150, bottom: 60, left: 100 };
const width = 950 - margin.left - margin.right;
const height = 750 - margin.top - margin.bottom;

// Create SVG container
const svg = d3.select('#chart')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

// Define color scale
const colorScale = d3.scaleOrdinal()
    .domain(['China', 'Japan', 'Korea', 'Taiwan'])
    .range(['#e41a1c', '#377eb8', '#4daf4a', '#984ea3']);

// Load and process data
d3.csv('data/cleaned/01_cleaned_renewable_energy_data.csv').then(function(rawData) {
    const data = rawData.map(d => ({
        year: +d.Year,
        country: d.Entity,
        value: +d['Renewables (% equivalent primary energy)']
    }));

    // Create scales
    const xScale = d3.scaleLinear()
        .domain([2015, 2021])
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.value) * 1.1])
        .range([height, 0]);

    // Add gridlines
    svg.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale)
            .ticks(7)
            .tickSize(-height)
            .tickFormat('')
        );

    svg.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(yScale)
            .tickSize(-width)
            .tickFormat('')
        );

    // Add axes
    svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale)
            .ticks(7)
            .tickFormat(d3.format('d')));

    svg.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(yScale)
            .tickFormat(d => d + '%'));

    // Add axis labels
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 20)
        .attr('x', -height / 2)
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .text('Renewable Energy (%)');

    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .text('Year');

    // Add title
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', -margin.top / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '20px')
        .style('font-weight', 'bold')
        .text('Renewable Energy Trends in East Asia (2015-2021)');

    // Create tooltip
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);

    // Create line generator
    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.value))
        .curve(d3.curveMonotoneX);

    // Group data by country
    const groupedData = d3.group(data, d => d.country);

    // Add lines and points for each country
    groupedData.forEach((values, country) => {
        // Add line
        const path = svg.append('path')
            .datum(values)
            .attr('class', `line ${country}`)
            .attr('d', line)
            .style('fill', 'none')
            .style('stroke', colorScale(country))
            .style('stroke-width', 3)
            .style('opacity', 0.8);

        // Add points
        const points = svg.selectAll(`.point-${country}`)
            .data(values)
            .enter()
            .append('circle')
            .attr('class', `point-${country}`)
            .attr('cx', d => xScale(d.year))
            .attr('cy', d => yScale(d.value))
            .attr('r', 6)
            .style('fill', colorScale(country))
            .style('stroke', '#fff')
            .style('stroke-width', 2)
            .style('opacity', 0.8);

        // Add interactivity
        const mouseOver = function(event, d) {
            // Highlight current line
            d3.selectAll('.line').style('opacity', 0.2);
            d3.select(`.line.${country}`).style('opacity', 1);
            
            // Enlarge point
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 8)
                .style('opacity', 1);

            // Show tooltip
            tooltip.transition()
                .duration(200)
                .style('opacity', 0.9);
            
            tooltip.html(`
                <strong>${d.country}</strong><br/>
                Year: ${d.year}<br/>
                Renewable Energy: ${d.value.toFixed(2)}%
            `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        };

        const mouseOut = function() {
            // Reset lines
            d3.selectAll('.line').style('opacity', 0.8);
            
            // Reset point
            d3.select(this)
                .transition()
                .duration(200)
                .attr('r', 6)
                .style('opacity', 0.8);

            // Hide tooltip
            tooltip.transition()
                .duration(500)
                .style('opacity', 0);
        };

        points.on('mouseover', mouseOver)
            .on('mouseout', mouseOut);
    });

    // Add interactive legend
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width + 20}, 0)`);

    Array.from(groupedData.keys()).forEach((country, i) => {
        const legendGroup = legend.append('g')
            .attr('class', 'legend-item')
            .attr('transform', `translate(0, ${i * 25})`);

        legendGroup.append('rect')
            .attr('width', 15)
            .attr('height', 15)
            .style('fill', colorScale(country));

        legendGroup.append('text')
            .attr('x', 25)
            .attr('y', 12)
            .text(country)
            .style('font-size', '14px');

        // Add legend interactivity
        legendGroup.on('click', function() {
            const opacity = d3.select(`.line.${country}`).style('opacity') === '0.2' ? 0.8 : 0.2;
            d3.select(`.line.${country}`).style('opacity', opacity);
            d3.selectAll(`.point-${country}`).style('opacity', opacity);
            d3.select(this).style('opacity', opacity === 0.2 ? 0.5 : 1);
        });
    });

    // Add annotations for key events
    const annotations = [
        {
            year: 2020,
            value: 14.2,
            text: "China peaks at 14.2%",
            country: "China"
        },
        {
            year: 2019,
            value: 9.6,
            text: "Japan's acceleration begins",
            country: "Japan"
        }
    ];

    annotations.forEach(annotation => {
        svg.append('circle')
            .attr('cx', xScale(annotation.year))
            .attr('cy', yScale(annotation.value))
            .attr('r', 4)
            .attr('fill', 'none')
            .attr('stroke', '#666')
            .attr('stroke-width', 2);

        svg.append('text')
            .attr('class', 'annotation')
            .attr('x', xScale(annotation.year) + 10)
            .attr('y', yScale(annotation.value) - 10)
            .text(annotation.text);
    });
});