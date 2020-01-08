class Chart {
  constructor(dataset = [], chart_id = "chart", params = {}) {
    this.dataset = dataset;
    this.chart_id = chart_id;

    this.params = params;
    this.width = this.checkParam("width", document.documentElement.clientWidth - 100);
    this.height = this.checkParam("height", document.documentElement.clientHeight - 100);
    this.margin = this.checkParam("margin", {top: 50, right: 30, bottom: 50, left: 30});

    this.svg = d3.select(`#${chart_id}`).append("svg")
      .attr("width", this.width)
      .attr("height", this.height)
      .style("background-color", "antiquewhite")
  }

  checkParam(param_name, value) {
    return this.params.hasOwnProperty(param_name) ? this.params[param_name] : value;
  }

  getColor(field_name) {
    const colors = {
      "dtp": "lightgrey",
      "pogibli": "red",
      "raneni": "yellow"
    }
    return colors[field_name];
  }

  xScale() {
    return d3.scaleTime()
      .domain(d3.extent(this.dataset, row => row.date_obj))
      .range([this.margin.left, this.width - this.margin.right])
  }

  yScale() {
    var max_min_arr = [
      ...d3.extent(this.dataset, row => row.dtp),
      ...d3.extent(this.dataset, row => row.pogibli),
      ...d3.extent(this.dataset, row => row.raneni),
    ]

    return d3.scaleLinear()
      .domain([0, d3.max(max_min_arr)])
      .range([this.height - this.margin.bottom, 3 * this.margin.top]);
  }

  draw() {
    this.drawBars("raneni");
    this.drawBars("dtp");
    this.drawBars("pogibli");

    this.drawDatesAsTicks();
    this.drawLegend();
  }

  getBarWidth() {
    var bar_width = 30;
    var number_of_bars_on_chart = +this.width/bar_width
    return number_of_bars_on_chart < this.dataset.length - 1 ? this.width/this.dataset.length : bar_width;
  }

  drawBars(field_name) {
    var bars = this.svg.selectAll(`rect.bar.${field_name}`).data(this.dataset)

    bars.enter()
      .append("rect")
      .classed("bar", true)
      .classed(field_name, true)
      .attr("x", (row, index) => index * this.getBarWidth())
      .attr("y", row => this.yScale()(row[field_name]))
      .attr("width", this.getBarWidth())
      .attr("height", row => this.height - this.margin.bottom - this.yScale()(row[field_name]))
      .attr("fill", this.getColor(field_name))
      .attr("stroke", "black")

    bars.exit().remove();

    this.drawBarsText(field_name)
  }

  drawBarsText(field_name) {
    var bars_text = this.svg.selectAll(`text.bar-text.${field_name}`).data(this.dataset)

    const self = this;
    bars_text.enter()
      .append("text")
      .classed("bar-text", true)
      .classed(field_name, true)
      .attr("x", (row, index) => index * this.getBarWidth() + 3)
      .attr("y", row => this.yScale()(row[field_name]) - 3)
      .text(row => row[field_name])
      .attr("stroke", "black")
      .attr("fill", this.getColor(field_name))
      .style("cursor", "pointer")
      .on("mouseenter", function(row) {
        if(field_name === "raneni" || field_name === "pogibli") {

          self.svg.append("rect")
            .classed("bar-text-info", true)
            .attr("x", +this.getAttribute("x")+self.getBarWidth())
            .attr("y", +this.getAttribute("y")-15)
            .attr("width", 80)
            .attr("height", 20)
            .attr("fill", "white")

          self.svg.append("text")
            .classed("bar-text-info", true)
            .attr("x", +this.getAttribute("x")+self.getBarWidth()+3)
            .attr("y", +this.getAttribute("y"))
            .style("font", "bold 17px sans-serif")
            .text(`Детей ${row[field_name.substr(0, field_name.length-1)+"o_detei"]}`)

        }
      })
      .on("mouseleave", function() {
        self.svg.selectAll(".bar-text-info").remove();
      })

    bars_text.exit().remove();
  }

  drawDatesAsTicks() {
    var dates = this.svg.selectAll("text.date").data(this.dataset)

    const self = this;
    var texts = dates.enter()
      .append("text")
      .attr("x", (date, index) => index * this.getBarWidth())
      .attr("y", this.height-this.margin.bottom - 3)
      .attr("fill", row => {
        return ["Saturday", "Sunday"].includes(row.date_obj.toLocaleDateString("en-US", {weekday: "long"})) ? "rgba(226, 43, 43, 0.72)" : ""
      })
      .on("mouseenter", function(row) {
        self.svg.append("rect")
          .classed("tick-date", true)
          .attr("x", this.getAttribute("x"))
          .attr("y", this.getAttribute("y"))
          .attr("width", 80)
          .attr("height", 20)
          .attr("fill", "aquamarine")
          .attr("rx", 10)

        self.svg.append("text")
          .classed("tick-date", true)
          .attr("x", +this.getAttribute("x")+3)
          .attr("y", +this.getAttribute("y")+17)
          .text(row.date)
      })
      .on("mouseleave", function() {
        self.svg.selectAll(".tick-date").remove();
      })

    texts.selectAll("tspan")
      .data(row => row.date.split(".")).enter()
      .append("tspan")
      .attr("dy", "1em")
      .attr("dx", (str, index) => index === 0 ? 0 : "-1em")
      .text(str => str.substr(-2))

  }

  drawLegend() {
    var legend_items = [
      { name_en: "dtp", name_ru: "ДТП", color: this.getColor("dtp") },
      { name_en: "pogibli", name_ru: "Погибли", color: this.getColor("pogibli") },
      { name_en: "raneni", name_ru: "Ранены", color: this.getColor("raneni") },
    ]
    var x = this.width / 3;

    this.svg.selectAll("rect.legend-rect")
      .data(legend_items).enter()
      .append("rect")
      .classed("legend-rect", true)
      .attr("name_en", item => item.name_en)
      .attr("x", x)
      .attr("y", (item, index) => 10 + index * 20)
      .attr("width", 40)
      .attr("height", 15)
      .style("fill", item => item.color)
      .style("cursor", "pointer")
      .on("mouseenter", showOnlyChecked)
      .on("mouseleave", showAllBars)

    this.svg.selectAll("text.legend-text")
      .data(legend_items).enter()
      .append("text")
      .classed("legend-text", true)
      .attr("name_en", item => item.name_en)
      .attr("x", x + 50)
      .attr("y", (item, index) => 23 + index * 20)
      .text(item => item.name_ru)
      .style("cursor", "pointer")
      .on("mouseenter", showOnlyChecked)
      .on("mouseleave", showAllBars)


    function showOnlyChecked() {
      var checked_elem = d3.select(this)

      d3.selectAll(".bar, .bar-text").each(function () {
        var elem = d3.select(this)
        elem
          .transition()
          .duration(1000)
          .styleTween("opacity", function(row) {
            if(!elem.classed(checked_elem.attr("name_en"))) {
              return d3.interpolate(1, 0.3)
            }
          })
      })
    }

    function showAllBars() {
      d3.selectAll(".bar, .bar-text").style("opacity", 1)
    }


  }

}