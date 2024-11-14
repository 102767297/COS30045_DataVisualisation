const svg = d3.select("#chart"),
      margin = { top: 20, right: 30, bottom: 30, left: 40 },
      width = +svg.attr("width") - margin.left - margin.right,
      height = +svg.attr("height") - margin.top - margin.bottom;

const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

const x = d3.scaleLinear().range([0, width]);
const y = d3.scaleLinear().range([height, 0]);

const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.value));

const color = d3.scaleOrdinal(d3.schemeCategory10);

d3.csv("New_OECD_RenewableEnergy.csv").then(data => {
    // 过滤数据
    const filteredData = data.filter(d => 
        (d.INDICATOR === 'RESEARCHER' || d.INDICATOR === 'GOVRESEARCHER') &&
        d.MEASURE === 'HEADCOUNT'
    );

    // 按年份和指标分组数据
    const nestedData = d3.group(filteredData, d => d.INDICATOR, d => d.TIME_PERIOD);

    // 将数据转换为可绘制的格式
    const lineData = Array.from(nestedData, ([indicator, values]) => {
        return {
            indicator,
            values: Array.from(values, ([year, entries]) => {
                return {
                    year: +year,
                    value: d3.sum(entries, e => +e.OBS_VALUE) // 计算每年的总和
                };
            })
        };
    });

    // 设置 x 和 y 轴的域
    x.domain(d3.extent(lineData.flatMap(d => d.values), d => d.year));
    y.domain([0, d3.max(lineData.flatMap(d => d.values), d => d.value)]);

    // 绘制 x 轴
    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    // 绘制 y 轴
    g.append("g")
        .call(d3.axisLeft(y));

    // 绘制每条线
    lineData.forEach((d, i) => {
        g.append("path")
            .datum(d.values)
            .attr("fill", "none")
            .attr("class", "line")
            .attr("stroke", color(i))
            .attr("d", line)
            .on("mouseover", function() {
                d3.select(this).attr("stroke-width", 4);
            })
            .on("mouseout", function() {
                d3.select(this).attr("stroke-width", 2);
            });

        // 添加图例
        g.append("text")
            .attr("x", width - 100)
            .attr("y", 20 + i * 20)
            .text(d.indicator)
            .style("fill", color(i));
    });

    // 添加鼠标悬停工具提示
    const tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

    g.selectAll(".line").on("mouseover", function(event, d) {
        tooltip.transition().duration(200).style("opacity", .9);
        tooltip.html(`Indicator: ${d.indicator}<br>Value: ${d.value}`)
            .style("left", (event.pageX + 5) + "px")
            .style("top", (event.pageY - 28) + "px");
    }).on("mouseout", function(d) {
        tooltip.transition().duration(500).style("opacity", 0);
    });
});
