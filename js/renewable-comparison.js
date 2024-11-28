// Create visualization function
function createRenewableEnergyChart() {
    // Set up margins and dimensions
    const margin = { top: 130, right: 160, bottom: 80, left: 80 };
    const width = 1000 - margin.left - margin.right;
    const height = 900 - margin.top - margin.bottom;

    // Clear existing chart
    d3.select('#consumptionProductionChart').html('');
    
    const svg = d3.select('#consumptionProductionChart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Add title for the chart
    svg.append('text')
        .attr('x', (width + margin.left + margin.right) / 2.5)
        .attr('y', -margin.top / 1.5) // Adjusted position
        .attr('text-anchor', 'middle')
        .style('font-size', '24px')
        .style('font-weight', 'bold')
        .text('Renewable Energy Production vs Consumption in East Asia (2015–2021)');

    // Create tooltip
    const tooltip = d3.select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);

    // Load and process data
    Promise.all([d3.csv('data/cleaned/02_cleaned_modern_renewable_consumption.csv'), d3.csv('data/cleaned/03_cleaned_modern_renewable_production.csv')])
        .then(function([consumptionData, productionData]) {
            // Process consumption data - Fixed to ensure proper number conversion
            const consumption = consumptionData.map(d => ({
                year: +d.Year,
                country: d.Entity,
                value: parseFloat(d['Geo Biomass Other - TWh'] || 0) +
                    parseFloat(d['Solar Generation - TWh'] || 0) +
                    parseFloat(d['Wind Generation - TWh'] || 0) +
                    parseFloat(d['Hydro Generation - TWh'] || 0),
                type: 'Consumption'
            })).filter(d => !isNaN(d.value) && !isNaN(d.year));

            // Process production data - Fixed to ensure proper number conversion
            const production = productionData.map(d => ({
                year: +d.Year,
                country: d.Entity,
                value: parseFloat(d['Electricity from wind (TWh)'] || 0) +
                    parseFloat(d['Electricity from hydro (TWh)'] || 0) +
                    parseFloat(d['Electricity from solar (TWh)'] || 0) +
                    parseFloat(d['Other renewables including bioenergy (TWh)'] || 0),
                type: 'Production'
            })).filter(d => !isNaN(d.value) && !isNaN(d.year));

            // Add console logging to debug data processing
            console.log('Consumption data:', consumption.filter(d => d.country === 'China' || d.country === 'Taiwan'));
            console.log('Production data:', production.filter(d => d.country === 'China' || d.country === 'Taiwan'));

            const combinedData = [...consumption, ...production];
            
            const countryColors = d3.scaleOrdinal()
                .domain(['China', 'Japan', 'Korea', 'Mongolia', 'Taiwan'])
                .range(['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00']);

            const countries = [...new Set(combinedData.map(d => d.country))];
            
            // Dimensions for two visualizations per row
            const chartWidth = width / 2 - 20; // Adjust for margin between charts
            const chartHeight = height / 3 - 20; // Three rows total, accounting for spacing

            countries.forEach((country, i) => {
                const xPos = (i % 2) * (chartWidth + 100); // Space between columns
                const yPos = Math.floor(i / 2) * (chartHeight + 60); // Increased vertical spacing

                // Get all data for this country
                const countryData = combinedData.filter(d => d.country === country);
                
                // Debug logging for each country's data
                console.log(`Data for ${country}:`, countryData);

                if (countryData.length === 0) return;

                const xScale = d3.scaleLinear()
                    .domain(d3.extent(countryData, d => d.year))
                    .range([0, chartWidth - 40]);

                const yScale = d3.scaleLinear()
                    .domain([0, d3.max(countryData, d => d.value) * 1.1])
                    .range([chartHeight - 40, 0]);

                const countryChart = svg.append('g')
                    .attr('transform', `translate(${xPos},${yPos})`);

                // Add axes
                countryChart.append('g')
                    .attr('transform', `translate(0,${chartHeight - 40})`)
                    .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.format('d')));

                countryChart.append('g')
                    .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `${d3.format('.0f')(d)} TWh`));

                // Add title
                countryChart.append('text')
                    .attr('x', (chartWidth - 40) / 2)
                    .attr('y', -10)
                    .attr('text-anchor', 'middle')
                    .style('font-size', '14px')
                    .style('font-weight', 'bold')
                    .text(country);

                // Line generator
                const line = d3.line()
                    .defined(d => !isNaN(d.value))
                    .x(d => xScale(d.year))
                    .y(d => yScale(d.value))
                    .curve(d3.curveMonotoneX);

                // Plot lines for consumption and production with improved visibility
                ['Consumption', 'Production'].forEach((type, typeIndex) => {
                    const typeData = countryData
                        .filter(d => d.type === type)
                        .sort((a, b) => a.year - b.year);

                    if (typeData.length > 0) {
                        // Add path with offset for better visibility
                        const path = countryChart.append('path')
                            .datum(typeData)
                            .attr('class', `line-${type.toLowerCase()}-${country.toLowerCase()}`)
                            .attr('d', line)
                            .style('fill', 'none')
                            .style('stroke', countryColors(country))
                            .style('stroke-width', 3) // Increased width
                            .style('stroke-dasharray', type === 'Production' ? '4,4' : '0')
                            .style('opacity', type === 'Production' ? 0.8 : 0.6); // Different opacities
                        
                        // Debug logging for path
                        console.log(`Created path for ${country} ${type}:`, path.node());

                        // Add data points with improved visibility
                        const points = countryChart.selectAll(`.point-${type.toLowerCase()}-${country.toLowerCase()}`)
                            .data(typeData)
                            .enter()
                            .append('circle')
                            .attr('class', `point-${type.toLowerCase()}-${country.toLowerCase()}`)
                            .attr('cx', d => xScale(d.year))
                            .attr('cy', d => yScale(d.value))
                            .attr('r', type === 'Production' ? 4 : 6) // Different sizes
                            .style('fill', type === 'Production' ? countryColors(country) : 'white')
                            .style('stroke', countryColors(country))
                            .style('stroke-width', 2)
                            .style('opacity', 0.9)
                            .on('mouseover', function(event, d) {
                                // Enhanced tooltip
                                tooltip.transition()
                                    .duration(200)
                                    .style('opacity', 0.9);
                                
                                tooltip.html(`
                                    <strong>${d.country}</strong><br/>
                                    Year: ${d.year}<br/>
                                    ${type}: ${d.value.toFixed(2)} TWh<br/>
                                `)
                                .style('left', (event.pageX + 10) + 'px')
                                .style('top', (event.pageY - 28) + 'px');
                            })
                            .on('mouseout', function() {
                                // Reset point
                                d3.select(this)
                                    .transition()
                                    .duration(200)
                                    .attr('r', 3)
                                    .style('opacity', 0.7);

                                // Hide tooltip
                                tooltip.transition()
                                    .duration(500)
                                    .style('opacity', 0);
                            });
                        console.log(`Created points for ${country} ${type}:`, points.nodes());
                    }
                });

                // Add a note about overlapping lines
                countryChart.append('text')
                    .attr('x', 10)
                    .attr('y', 20)
                    .style('font-size', '12px')
                    .style('fill', '#666')
                    .text('Note: Lines overlap due to similar values');
            });

            // Add legend
            const legend = svg.append('g')
                .attr('transform', `translate(${width - 50}, -50)`); // Adjusted position

            // Legend title
            legend.append('text')
                .attr('x', 0)
                .attr('y', -5)
                .style('font-weight', 'bold')
                .text('Legend');

            ['Consumption', 'Production'].forEach((type, i) => {
                const g = legend.append('g')
                    .attr('transform', `translate(0,${i * 20})`);

                g.append('line')
                    .attr('x1', 0)
                    .attr('x2', 20)
                    .attr('y1', 15)
                    .attr('y2', 15)
                    .style('stroke', 'black')
                    .style('stroke-width', 3)
                    .style('stroke-dasharray', type === 'Production' ? '4,4' : '0')
                    .style('opacity', type === 'Production' ? 0.8 : 0.6);
                
                g.append('text')
                    .attr('x', 30)
                    .attr('y', 20)
                    .text(`${type} (${type === 'Production' ? 'dashed' : 'solid'})`);
            });

        }).catch(function(error) {
            console.error('Error loading or processing data:', error);
            d3.select('#chart')
                .append('div')
                .style('color', 'red')
                .style('padding', '20px')
                .text('Error loading or processing data. Please check the console for details.');
        });
}

// Initialize chart
document.addEventListener('DOMContentLoaded', createRenewableEnergyChart);