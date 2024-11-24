const indicators = ['energy', 'environmentalPolicy', 'researchDevelopment', 'broadbandAccess', 'generalGovernment'];
const indicatorNames = {
	energy: 'Energy',
	environmentalPolicy: 'Environmental Policy',
	researchDevelopment: 'R&D',
	broadbandAccess: 'Broadband Access',
	generalGovernment: 'General Government'
};

//const colors = d3.schemeSet3;
// Using a colorblind-friendly palette
const colors = [
	'#018571', // teal
	'#80cdc1', // light teal
	'#dfc27d', // tan
	'#a6611a', // brown
	'#7b3294'  // purple
];

// Function to process CSV data
function processCSVData(csvData) {
	// Create a map to store aggregated data by country
	const countryMap = new Map();
	
	// Define country mappings
	const countryMappings = {
			'Macau, China': 'China',
			'Hong Kong, China': 'China',
			'China (People\'s Republic of)': 'China',
			'Korea': 'Korea',
			'Japan': 'Japan',
			'Mongolia': 'Mongolia',
			'Chinese Taipei': 'Taipei'
	};
	
	// Debug: Log the unique indicators and subjects in the data
	const uniqueIndicators = new Set(csvData.map(row => row.INDICATOR));
	const uniqueSubjects = new Set(csvData.map(row => row.SUBJECT));
	//console.log('Unique Indicators:', Array.from(uniqueIndicators));
	//console.log('Unique Subjects:', Array.from(uniqueSubjects));

	// First, filter and map the data
	const filteredData = csvData.filter(row => {
			const mappedCountry = countryMappings[row.Country] || row.Country;
			return ['China', 'Japan', 'Korea', 'Mongolia', 'Taipei'].includes(mappedCountry);
	});

	// Initialize country data structure with default values
	for (const country of ['China', 'Japan', 'Korea', 'Mongolia', 'Taipei']) {
			countryMap.set(country, {
					country: country,
					dataPoints: {
							energy: [],
							environmentalPolicy: [],
							researchDevelopment: [],
							broadbandAccess: [],
							generalGovernment: []
					}
			});
	}

	// Process the filtered data with updated indicator mapping
	filteredData.forEach(row => {
			const country = countryMappings[row.Country] || row.Country;
			const value = parseFloat(row.OBS_VALUE);
			
			if (!isNaN(value)) {
					const countryData = countryMap.get(country);
					
					// Debug: Log each data point being processed
					//console.log(`Processing: Country=${country}, Indicator=${row.INDICATOR}, Value=${value}`);
					
					// Simplified indicator mapping based primarily on INDICATOR field
					switch(row.INDICATOR) {
							case 'RENEWABLE':
									countryData.dataPoints.energy.push(value);
									break;
							case 'TAXENV':
							case 'PATENT_ENV':
									countryData.dataPoints.environmentalPolicy.push(value);
									break;
							case 'RESEARCHER':
							case 'GOVRESEARCHER':
									countryData.dataPoints.researchDevelopment.push(value);
									break;
							case 'FIXWIRED':
							case 'WIRELESSWIRED':
									countryData.dataPoints.broadbandAccess.push(value);
									break;
							case 'GGEXP':
							case 'GGNLEND':
							case 'GGWEALTH':
							case 'GGDEBT':
							case 'GGREV':
							case 'GGEXPDEST':
									countryData.dataPoints.generalGovernment.push(value);
									break;
					}
			}
	});

	// Calculate averages with adjusted normalization ranges
	const processedData = Array.from(countryMap.values()).map(country => {
			const result = {
					country: country.country
			};
			
			// Log data availability for each country
			//console.log(`\nData availability for ${country.country}:`);
			
			// Define normalization ranges based on actual data distributions
			const normalizationRanges = {
				energy: { min: 0, max: 50 },              // Renewable energy percentage
				environmentalPolicy: { min: 0, max: 20 }, // Environmental tax and patents
				researchDevelopment: { min: 0, max: 40 }, // Researchers per 1000 employed
				broadbandAccess: { min: 0, max: 150 },    // Fixed + wireless broadband subscriptions
				generalGovernment: { min: -200, max: 100 } // Government financial indicators
		};
			
			// Calculate normalized values for each category
			for (const [category, values] of Object.entries(country.dataPoints)) {
				//console.log(`${category}: ${values.length} data points, values: ${values.join(', ')}`);
				
				if (values.length > 0) {
						const average = values.reduce((a, b) => a + b) / values.length;
						const range = normalizationRanges[category];
						result[category] = normalizeValue(average, range.min, range.max, 0, 100);
				} else {
						//console.log(`Warning: No data available for ${country.country} - ${category}`);
						result[category] = 0;
				}
			}
			
			return result;
	});

	return processedData;
}

// Update the normalizeValue function to add some logarithmic scaling for better distribution
function normalizeValue(value, minInput, maxInput, minOutput, maxOutput) {
	// Ensure the value is within bounds
	const boundedValue = Math.max(minInput, Math.min(maxInput, value));
	
	// Calculate normalized value with slight logarithmic scaling for better distribution
	let normalizedValue;
	if (boundedValue > 0) {
			normalizedValue = Math.min(100, Math.max(0,
					(Math.log(boundedValue + 1) / Math.log(maxInput + 1)) * 100
			));
	} else {
			// Handle negative values (especially for generalGovernment)
			normalizedValue = Math.min(100, Math.max(0,
					((boundedValue - minInput) * (maxOutput - minOutput)) / (maxInput - minInput) + minOutput
			));
	}
	
	// Debug: Log normalization calculation
	// console.log('Normalizing:', {
	// 		originalValue: value,
	// 		boundedValue,
	// 		minInput,
	// 		maxInput,
	// 		minOutput,
	// 		maxOutput,
	// 		result: normalizedValue
	// });
	
	return normalizedValue;
}

function clearChart() {
	d3.select('#chart').html('');
}

function createSortControls() {
	const controls = d3.select('#chart')
			.insert('div', 'svg')
			.attr('class', 'controls')
			.style('margin-bottom', '20px');

	// Add sorting dropdown
	const sortSelect = controls.append('select')
			.on('change', function() {
					sortData(this.value);
			});

	// Add sorting options
	sortSelect.append('option')
			.attr('value', 'country')
			.text('Sort by Country');

	indicators.forEach(indicator => {
			sortSelect.append('option')
					.attr('value', indicator)
					.text(`Sort by ${indicatorNames[indicator]}`);
	});
}

function sortData(criterion) {
	const sortedData = [...data];
	
	if (criterion === 'country') {
			sortedData.sort((a, b) => d3.ascending(a.country, b.country));
	} else {
			sortedData.sort((a, b) => d3.descending(a[criterion], b[criterion]));
	}

	updateChart(sortedData);
}

function updateChart(sortedData) {
	const margin = {top: 80, right: 180, bottom: 60, left: 60};
	const width = 1000 - margin.left - margin.right;
	const height = 600 - margin.top - margin.bottom;

	const svg = d3.select('#chart svg g');

	// Update scales with new data order
	const x = d3.scaleBand()
			.domain(sortedData.map(d => d.country))
			.range([0, width])
			.padding(0.1);

	const stack = d3.stack().keys(indicators);
	const stackedData = stack(sortedData);

	const y = d3.scaleLinear()
			.domain([0, d3.max(stackedData, d => d3.max(d, d => d[1]))])
			.range([height, 0]);

	// Animate x-axis
	svg.select('g.x-axis')
			.transition()
			.duration(750)
			.call(d3.axisBottom(x))
			.selectAll('text')
			.attr("font-size", "11px")
			.style('text-anchor', 'middle');

	// Update bars with animation
	const layers = svg.selectAll('.layer')
			.data(stackedData);

	layers.selectAll('rect')
			.data(d => d)
			.transition()
			.duration(750)
			.attr('x', d => x(d.data.country))
			.attr('y', d => y(d[1]))
			.attr('height', d => y(d[0]) - y(d[1]))
			.attr('width', x.bandwidth());
}

function addComparisonFeature() {
	// Add comparison controls under the existing sort controls
	const controls = d3.select('.controls');
	
	const comparisonDiv = controls.append('div')
			.attr('class', 'comparison-controls')
			.style('margin-top', '10px');
	
	// Add country selection dropdowns
	const country1Select = comparisonDiv.append('select')
			.attr('id', 'country1')
			.style('margin-right', '10px');
	
	const country2Select = comparisonDiv.append('select')
			.attr('id', 'country2')
			.style('margin-right', '10px');
	
	// Add compare button
	const compareButton = comparisonDiv.append('button')
			.text('Compare')
			.on('click', compareCountries);
	
	// Add reset button
	const resetButton = comparisonDiv.append('button')
			.text('Reset')
			.style('margin-left', '10px')
			.on('click', resetComparison);
	
	// Populate dropdowns
	[country1Select, country2Select].forEach(select => {
			select.selectAll('option')
					.data(['Select a country...'].concat(data.map(d => d.country)))
					.enter()
					.append('option')
					.text(d => d)
					.attr('value', d => d);
	});
}

function compareCountries() {
	const country1 = d3.select('#country1').node().value;
	const country2 = d3.select('#country2').node().value;
	
	if (country1 === 'Select a country...' || country2 === 'Select a country...') {
			alert('Please select two countries to compare');
			return;
	}
	
	// Highlight selected countries and fade others
	d3.selectAll('.layer rect')
			.style('opacity', function(d) {
					return (d.data.country === country1 || d.data.country === country2) ? 1 : 0.2;
			});
	
	// Create comparison tooltip
	const svg = d3.select('#chart svg g');
	const margin = {top: 80, right: 180, bottom: 60, left: 60};
	const width = 1000 - margin.left - margin.right;
	
	// Remove existing comparison if any
	svg.selectAll('.comparison-text').remove();
	
	// Calculate the vertical position to place comparison text below the legend
	// Number of legend items * height per item + padding
	const legendHeight = indicators.length * 25 + 20;
	
	// Add comparison text
	const comparisonGroup = svg.append('g')
			.attr('class', 'comparison-text')
			.attr('transform', `translate(${width + 20}, ${legendHeight})`);
	
	const country1Data = data.find(d => d.country === country1);
	const country2Data = data.find(d => d.country === country2);
	
	// Add comparison title with padding
	comparisonGroup.append('text')
			.attr('y', 20)
			.style('font-weight', 'bold')
			.text(`${country1} vs ${country2}`);
	
	// Add separator line
	comparisonGroup.append('line')
			.attr('x1', 0)
			.attr('x2', 150)
			.attr('y1', 30)
			.attr('y2', 30)
			.style('stroke', '#ccc')
			.style('stroke-width', 1);
	
	// Add comparison values with increased padding from title
	indicators.forEach((indicator, i) => {
			const diff = country1Data[indicator] - country2Data[indicator];
			const comparisonText = comparisonGroup.append('text')
					.attr('y', i * 20 + 50) // Increased initial offset to 50 to add space after title
					.style('font-size', '12px')
					.style('fill', diff > 0 ? '#2ecc71' : '#e74c3c')
					.text(`${indicatorNames[indicator]}: ${diff > 0 ? '+' : ''}${diff.toFixed(1)}`);
	});
}

function resetComparison() {
	// Reset dropdowns
	d3.select('#country1').node().value = 'Select a country...';
	d3.select('#country2').node().value = 'Select a country...';
	
	// Reset bar opacity
	d3.selectAll('.layer rect')
			.style('opacity', 1);
	
	// Remove comparison text
	d3.select('.comparison-text').remove();
}

let data;

function loadCsvFile() {
	return d3.csv("New_OECD_RenewableEnergy.csv").then(csvData => {
			return processCSVData(csvData);
	}).catch(error => {
			console.error("Error loading the CSV file:", error);
	});
}

// Initialise visualisation
function initialiseVisualisation() {
	loadCsvFile().then(processedData => {
		data = processedData; // Set the global data variable
		renderBarChart(); // Now render with the loaded data
	});
}

function renderBarChart() {
	clearChart();
	createSortControls();

	// Create container div for better size control
	const container = d3.select('#chart')
			.append('div')
			.style('width', '100%')
			.style('position', 'relative');

	// Fixed dimensions for the viewBox
	const viewBoxWidth = 1000;
	const viewBoxHeight = 600;
	const margin = {top: 80, right: 180, bottom: 60, left: 60};
	const width = viewBoxWidth - margin.left - margin.right;
	const height = viewBoxHeight - margin.top - margin.bottom;

	// Create SVG with fixed height
	const svg = container
			.append('svg')
			.style('width', '100%')
			.style('height', `${viewBoxHeight}px`) // Fixed height instead of 100%
			.attr('preserveAspectRatio', 'xMidYMid meet')
			.attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
			.append('g')
			.attr('transform', `translate(${margin.left},${margin.top})`);

	// Add chart title
	svg.append('text')
			.attr('class', 'chart-title')
			.attr('x', width / 2)
			.attr('y', -margin.top / 2)
			.attr('text-anchor', 'middle')
			.text('East Asian Countries Development Indicators');

	// Stack the data
	const stack = d3.stack().keys(indicators);
	const stackedData = stack(data);

	// Create scales
	const x = d3.scaleBand()
			.domain(data.map(d => d.country))
			.range([0, width])
			.padding(0.1);

	const y = d3.scaleLinear()
			.domain([0, d3.max(stackedData, d => d3.max(d, d => d[1]))])
			.range([height, 0]);

	// Create tooltip with responsive positioning
	const tooltip = d3.select('body')
			.append('div')
			.attr('class', 'tooltip')
			.style('opacity', 0);

	// Create bars
	const layer = svg.selectAll('.layer')
			.data(stackedData)
			.enter().append('g')
			.attr('class', 'layer')
			.style('fill', (d, i) => colors[i]);

	layer.selectAll('rect')
			.data(d => d)
			.enter().append('rect')
			.attr('class', 'bar')
			.attr('x', d => x(d.data.country))
			.attr('y', d => y(d[1]))
			.attr('height', d => y(d[0]) - y(d[1]))
			.attr('width', x.bandwidth())
			.on('mouseover', function(event, d) {
					const indicator = d3.select(this.parentNode).datum().key;
					const value = d.data[indicator].toFixed(1); // Round to 1 decimal place
					const total = indicators.reduce((sum, key) => sum + d.data[key], 0).toFixed(1);
					const percentage = ((value / total) * 100).toFixed(1);

					// Get container's position for accurate tooltip positioning
					const containerRect = container.node().getBoundingClientRect();
					const svgPoint = this.getBoundingClientRect();
					
					tooltip.transition()
							.duration(200)
							.style('opacity', 1);
					
					tooltip.html(`
							<div class="tooltip-title">${d.data.country}</div>
							<div class="tooltip-value">
									<span>${indicatorNames[indicator]}:</span>
									<span>${value}</span>
							</div>
							<div class="tooltip-value">
									<span>Percentage of Total:</span>
									<span>${percentage}%</span>
							</div>
							<div class="tooltip-value">
									<span>Total Score:</span>
									<span>${total}</span>
							</div>
					`)
					.style('left', `${svgPoint.left + svgPoint.width/2}px`)
					.style('top', `${svgPoint.top - 10}px`);

					d3.select(this)
							.style('opacity', 0.8)
							.style('stroke', '#333')
							.style('stroke-width', 2);
			})
			.on('mouseout', function() {
					tooltip.transition()
							.duration(500)
							.style('opacity', 0);
					
					d3.select(this)
							.style('opacity', 1)
							.style('stroke', 'none');
			});

	// Add axes
	svg.append('g')
			.attr('class', 'x-axis')
			.attr('transform', `translate(0,${height})`)
			.call(d3.axisBottom(x))
			.selectAll('text')
			.attr("font-size", "12px")
			.style('text-anchor', 'middle');

	svg.append('g')
			.attr('class', 'y-axis')
			.call(d3.axisLeft(y));

	// Add axis labels
	svg.append('text')
			.attr('class', 'axis-label')
			.attr('text-anchor', 'middle')
			.attr('transform', `translate(${-margin.left/2},${height/2})rotate(-90)`)
			.text('Score');

	// Add legend with responsive positioning
	const legend = svg.append('g')
			.attr('class', 'legend')
			.attr('transform', `translate(${width + 20}, 0)`);

	const legendItems = legend.selectAll('.legend-item')
			.data(indicators)
			.enter()
			.append('g')
			.attr('class', 'legend-item')
			.attr('transform', (d, i) => `translate(0,${i * 25})`);

	legendItems.append('rect')
			.attr('width', 18)
			.attr('height', 18)
			.style('fill', (d, i) => colors[i]);

	legendItems.append('text')
			.attr('x', 24)
			.attr('y', 9)
			.attr('dy', '.35em')
			.text(d => indicatorNames[d]);

	 // Update resize handler to maintain fixed height
	const resize = () => {
	// Get the container's new width
	const containerWidth = container.node().getBoundingClientRect().width;
	
	// Update SVG width only, keep height fixed
	container.select('svg')
			.style('width', `${containerWidth}px`);
	};

	// Add resize listener
	window.addEventListener('resize', resize);
	
	// Initial resize
	resize();

	addComparisonFeature();
}

function createLineChart() {
	clearChart();

	// Load and process the CSV data first
	d3.csv("New_OECD_RenewableEnergy.csv").then(csvData => {
			const processedData = processCSVData(csvData);
			renderLineChart(processedData);
	}).catch(error => {
			console.error("Error loading the CSV file:", error);
	});
}

function renderLineChart(data) {
	const margin = { top: 80, right: 180, bottom: 100, left: 60 };
	const width = 1000 - margin.left - margin.right;
	const height = 600 - margin.top - margin.bottom;

	// Create SVG container
	const svg = d3.select('#lineChart')
			.append('svg')
			.attr('width', width + margin.left + margin.right)
			.attr('height', height + margin.top + margin.bottom)
			.append('g')
			.attr('transform', `translate(${margin.left},${margin.top})`);

	// Add chart title
	svg.append('text')
			.attr('class', 'chart-title')
			.attr('x', width / 2)
			.attr('y', -margin.top / 2)
			.attr('text-anchor', 'middle')
			.text('East Asian Countries Development Indicators (2015 - 2022)');

	// Create scales
	const x = d3.scalePoint()
			.domain(indicators.map(d => indicatorNames[d]))
			.range([0, width])
			.padding(0.5);

	const y = d3.scaleLinear()
			.domain([0, 100])
			.range([height, 0]);

	// Create line generator
	const line = d3.line()
			.x(d => x(indicatorNames[d.indicator]))
			.y(d => y(d.value));

	// Create tooltip
	const tooltip = d3.select('body')
			.append('div')
			.attr('class', 'tooltip')
			.style('opacity', 0)
			.style('position', 'absolute')
			.style('pointer-events', 'none')
			.style('background', 'white')
			.style('padding', '10px')
			.style('border', '1px solid #ccc')
			.style('border-radius', '5px');

	// Process data for line chart
	const lineData = data.map(country => {
			const values = indicators.map(indicator => ({
					country: country.country,
					indicator: indicator,
					value: country[indicator]
			}));
			return {
					country: country.country,
					values: values
			};
	});

	// Add lines
	lineData.forEach((d, i) => {
			// Add the line
			svg.append('path')
					.datum(d.values)
					.attr('class', 'line')
					.attr('d', line)
					.style('fill', 'none')
					.style('stroke', colors[i])
					.style('stroke-width', 2)
					.on('mouseover', function(event) {
							d3.select(this)
									.style('stroke-width', 4);

							// Highlight corresponding legend item
							legend.selectAll('text')
									.filter(legendD => legendD === d.country)
									.style('font-weight', 'bold');
					})
					.on('mouseout', function() {
							d3.select(this)
									.style('stroke-width', 2);

							// Reset legend item
							legend.selectAll('text')
									.style('font-weight', 'normal');
							
							tooltip.style('opacity', 0);
					});

			// Add dots for each data point
			svg.selectAll(`.dot-${i}`)
					.data(d.values)
					.enter()
					.append('circle')
					.attr('class', `dot-${i}`)
					.attr('cx', d => x(indicatorNames[d.indicator]))
					.attr('cy', d => y(d.value))
					.attr('r', 4)
					.style('fill', colors[i])
					.on('mouseover', function(event, d) {
							d3.select(this)
									.attr('r', 6);

							tooltip.html(`
									<strong>${d.country}</strong><br/>
									${indicatorNames[d.indicator]}: ${d.value.toFixed(1)}
							`)
									.style('opacity', 0.9)
									.style('left', (event.pageX + 10) + 'px')
									.style('top', (event.pageY - 28) + 'px');
					})
					.on('mouseout', function() {
							d3.select(this)
									.attr('r', 4);
							
							tooltip.style('opacity', 0);
					});
	});

	// Add X axis
	svg.append('g')
			.attr('class', 'x-axis')
			.attr('transform', `translate(0,${height})`)
			.call(d3.axisBottom(x))
			.selectAll('text')
			.attr("font-size", "12px")
			;

	// Add Y axis
	svg.append('g')
			.attr('class', 'y-axis')
			.call(d3.axisLeft(y));

	// Add axis labels
	svg.append('text')
			.attr('class', 'axis-label')
			.attr('text-anchor', 'middle')
			.attr('transform', `translate(${-margin.left/2},${height/2})rotate(-90)`)
			.text('Score');

	// Add legend
	const legend = svg.append('g')
			.attr('class', 'legend')
			.attr('transform', `translate(${width + 20}, 0)`);

	lineData.forEach((d, i) => {
			const legendRow = legend.append('g')
					.attr('transform', `translate(0, ${i * 20})`);
			
			legendRow.append('rect')
					.attr('width', 18)
					.attr('height', 18)
					.style('fill', colors[i]);
			
			legendRow.append('text')
					.attr('x', 24)
					.attr('y', 9)
					.attr('dy', '.35em')
					.text(d.country)
					.style('cursor', 'pointer')
					.on('mouseover', function() {
							// Highlight corresponding line
							d3.selectAll('.line')
									.style('opacity', 0.2);
							d3.select(`.line:nth-child(${i + 1})`)
									.style('opacity', 1)
									.style('stroke-width', 4);
							d3.select(this)
									.style('font-weight', 'bold');
					})
					.on('mouseout', function() {
							// Reset lines
							d3.selectAll('.line')
									.style('opacity', 1)
									.style('stroke-width', 2);
							d3.select(this)
									.style('font-weight', 'normal');
					});
	});
}


// Initialise the bar chart visualisation when the page loads
initialiseVisualisation();

// This creates the line chart
createLineChart();